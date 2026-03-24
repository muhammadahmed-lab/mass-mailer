export type EmailProvider = "resend" | "gmail";

export interface Recipient {
  email: string;
  name?: string;
}

export interface EmailJob {
  jobId: string;
  provider: EmailProvider;
  from: string;
  subject: string;
  body: string;
  recipients: Recipient[];
  // Resend
  resendApiKey?: string;
  // Gmail SMTP
  gmailAppPassword?: string;
}

export interface JobProgress {
  jobId: string;
  status: "pending" | "processing" | "completed" | "failed";
  total: number;
  sent: number;
  failed: number;
  errors: Array<{ email: string; error: string }>;
  startedAt: number;
  completedAt?: number;
}
