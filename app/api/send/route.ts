import { NextResponse } from "next/server";
import { z } from "zod";
import { setJob, updateJob, getJob } from "@/app/lib/store";
import { sendBatch } from "@/app/lib/resend";
import { sendSmtpBatch } from "@/app/lib/smtp";
import type { JobProgress, Recipient } from "@/app/types";

const recipientSchema = z.object({
  email: z.string().email("Invalid email address"),
  name: z.string().optional(),
});

const baseSendSchema = z.object({
  from: z.string().email("Invalid sender email"),
  subject: z.string().min(1, "Subject is required"),
  body: z.string().min(1, "Email body is required"),
  recipients: z
    .array(recipientSchema)
    .min(1, "At least one recipient is required")
    .max(10000, "Maximum 10,000 recipients per batch"),
});

const resendSchema = baseSendSchema.extend({
  provider: z.literal("resend"),
  resendApiKey: z.string().min(1, "Resend API key is required"),
});

const gmailSchema = baseSendSchema.extend({
  provider: z.literal("gmail"),
  gmailAppPassword: z.string().min(1, "Gmail App Password is required"),
});

const sendSchema = z.discriminatedUnion("provider", [resendSchema, gmailSchema]);

function chunkArray<T>(arr: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < arr.length; i += size) {
    chunks.push(arr.slice(i, i + size));
  }
  return chunks;
}

function buildEmails(
  recipients: Recipient[],
  from: string,
  subject: string,
  body: string
) {
  return recipients.map((r) => ({
    from,
    to: r.email,
    subject: r.name ? subject.replace(/\{\{name\}\}/g, r.name) : subject,
    html: r.name ? body.replace(/\{\{name\}\}/g, r.name) : body,
  }));
}

async function processDirectly(
  jobId: string,
  from: string,
  subject: string,
  body: string,
  recipients: Recipient[],
  sendFn: (
    emails: Array<{ from: string; to: string; subject: string; html: string }>
  ) => Promise<{ sent: number; failed: number; errors: Array<{ email: string; error: string }> }>
) {
  await updateJob(jobId, { status: "processing" });

  // Gmail SMTP: smaller batches (10) to avoid rate limits
  // Resend: larger batches (50) via batch API
  const chunkSize = 50;
  const chunks = chunkArray(recipients, chunkSize);

  for (const chunk of chunks) {
    const emails = buildEmails(chunk, from, subject, body);
    const result = await sendFn(emails);
    const current = await getJob(jobId);

    await updateJob(jobId, {
      sent: (current?.sent ?? 0) + result.sent,
      failed: (current?.failed ?? 0) + result.failed,
      errors: result.errors,
    });
  }

  const final = await getJob(jobId);
  await updateJob(jobId, {
    status: "completed",
    completedAt: Date.now(),
    sent: final?.sent ?? 0,
    failed: final?.failed ?? 0,
    errors: [],
  });
}

export async function POST(request: Request) {
  try {
    const raw = await request.json();
    const parsed = sendSchema.safeParse(raw);

    if (!parsed.success) {
      const errors = parsed.error.flatten();
      return NextResponse.json(
        { error: "Validation failed", details: errors },
        { status: 400 }
      );
    }

    const { provider, from, subject, body, recipients } = parsed.data;
    const jobId = crypto.randomUUID();

    const initial: JobProgress = {
      jobId,
      status: "pending",
      total: recipients.length,
      sent: 0,
      failed: 0,
      errors: [],
      startedAt: Date.now(),
    };

    await setJob(jobId, initial);

    // Build provider-specific send function
    let sendFn: (
      emails: Array<{ from: string; to: string; subject: string; html: string }>
    ) => Promise<{ sent: number; failed: number; errors: Array<{ email: string; error: string }> }>;

    if (provider === "gmail") {
      const { gmailAppPassword } = parsed.data;
      sendFn = (emails) => sendSmtpBatch(from, gmailAppPassword, emails);
    } else {
      const { resendApiKey } = parsed.data;
      sendFn = (emails) => sendBatch(resendApiKey, emails);
    }

    // Try Inngest first (production), fall back to direct processing (local dev)
    let useInngest = false;
    try {
      const { inngest } = await import("@/app/lib/inngest");
      await inngest.send({
        name: "email/send.bulk",
        data: { jobId, ...parsed.data },
      });
      useInngest = true;
    } catch {
      console.log(
        `[mass-mailer] Inngest not available, processing directly via ${provider}`
      );
    }

    if (!useInngest) {
      processDirectly(jobId, from, subject, body, recipients, sendFn).catch(
        (err) => {
          console.error("[mass-mailer] Direct processing error:", err);
          updateJob(jobId, { status: "failed" });
        }
      );
    }

    return NextResponse.json({ jobId }, { status: 202 });
  } catch (err) {
    console.error("[mass-mailer] Send route error:", err);
    return NextResponse.json(
      { error: "Failed to process request. Check server logs." },
      { status: 500 }
    );
  }
}
