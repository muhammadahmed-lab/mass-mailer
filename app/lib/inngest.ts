import { Inngest } from "inngest";
import { getJob, setJob, updateJob } from "@/app/lib/store";
import { sendBatch } from "@/app/lib/resend";
import type { Recipient, JobProgress } from "@/app/types";

export const inngest = new Inngest({ id: "mass-mailer" });

function chunkArray<T>(arr: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < arr.length; i += size) {
    chunks.push(arr.slice(i, i + size));
  }
  return chunks;
}

export const sendBulkEmail = inngest.createFunction(
  { id: "send-bulk-email", retries: 2 },
  { event: "email/send.bulk" },
  async ({ event, step }) => {
    const { jobId, from, subject, body, recipients, resendApiKey } = event.data;

    await step.run("init-progress", async () => {
      const initial: JobProgress = {
        jobId,
        status: "processing",
        total: recipients.length,
        sent: 0,
        failed: 0,
        errors: [],
        startedAt: Date.now(),
      };
      await setJob(jobId, initial);
    });

    const chunks = chunkArray(recipients as Recipient[], 50);

    for (let i = 0; i < chunks.length; i++) {
      await step.run(`send-batch-${i}`, async () => {
        const emails = chunks[i].map((r) => ({
          from,
          to: r.email,
          subject: r.name
            ? subject.replace(/\{\{name\}\}/g, r.name)
            : subject,
          html: r.name ? body.replace(/\{\{name\}\}/g, r.name) : body,
        }));

        const result = await sendBatch(resendApiKey, emails);
        const current = await getJob(jobId);

        await updateJob(jobId, {
          sent: (current?.sent ?? 0) + result.sent,
          failed: (current?.failed ?? 0) + result.failed,
          errors: result.errors,
        });
      });

      if (i < chunks.length - 1) {
        await step.sleep("rate-limit-pause", "1s");
      }
    }

    await step.run("finalize", async () => {
      const job = await getJob(jobId);
      await updateJob(jobId, {
        status: "completed",
        completedAt: Date.now(),
        sent: job?.sent ?? 0,
        failed: job?.failed ?? 0,
        errors: [],
      });
    });
  }
);
