"use client";

import { useState } from "react";
import toast from "react-hot-toast";
import ComposeForm from "@/app/components/ComposeForm";
import RecipientUpload from "@/app/components/RecipientUpload";
import SendButton from "@/app/components/SendButton";
import ProgressDashboard from "@/app/components/ProgressDashboard";
import type { Recipient, EmailProvider } from "@/app/types";

export default function Home() {
  const [provider, setProvider] = useState<EmailProvider>("gmail");
  const [from, setFrom] = useState("");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [resendApiKey, setResendApiKey] = useState("");
  const [gmailAppPassword, setGmailAppPassword] = useState("");
  const [recipients, setRecipients] = useState<Recipient[]>([]);
  const [jobId, setJobId] = useState<string | null>(null);
  const [isSending, setIsSending] = useState(false);

  const hasCredentials =
    provider === "gmail"
      ? gmailAppPassword.trim() !== ""
      : resendApiKey.trim() !== "";

  const canSend =
    from.trim() !== "" &&
    subject.trim() !== "" &&
    body.trim() !== "" &&
    body !== "<p></p>" &&
    hasCredentials &&
    recipients.length > 0;

  const handleSend = async () => {
    if (!canSend) return;

    setIsSending(true);
    setJobId(null);

    try {
      const res = await fetch("/api/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          provider,
          from: from.trim(),
          subject: subject.trim(),
          body,
          recipients,
          ...(provider === "resend"
            ? { resendApiKey: resendApiKey.trim() }
            : { gmailAppPassword: gmailAppPassword.trim() }),
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        toast.error(data.error || "Failed to start sending");
        return;
      }

      setJobId(data.jobId);
      toast.success(
        `Job started! Sending to ${recipients.length} recipients via ${
          provider === "gmail" ? "Gmail" : "Resend"
        }`
      );
    } catch {
      toast.error("Network error. Please try again.");
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="border-b border-slate-800 bg-slate-950/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center">
              <svg
                className="w-5 h-5 text-white"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                />
              </svg>
            </div>
            <div>
              <h1 className="text-xl font-bold text-white">Mass Mailer</h1>
              <p className="text-sm text-slate-400">
                Send bulk emails via Gmail or Resend
              </p>
            </div>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Left: Compose */}
          <div className="bg-slate-900/50 rounded-2xl border border-slate-800 p-6">
            <ComposeForm
              provider={provider}
              setProvider={setProvider}
              from={from}
              setFrom={setFrom}
              subject={subject}
              setSubject={setSubject}
              body={body}
              setBody={setBody}
              resendApiKey={resendApiKey}
              setResendApiKey={setResendApiKey}
              gmailAppPassword={gmailAppPassword}
              setGmailAppPassword={setGmailAppPassword}
            />
          </div>

          {/* Right: Recipients */}
          <div className="bg-slate-900/50 rounded-2xl border border-slate-800 p-6">
            <RecipientUpload
              recipients={recipients}
              setRecipients={setRecipients}
            />
          </div>
        </div>

        {/* Send button */}
        <div className="mt-8 max-w-md mx-auto">
          <SendButton
            disabled={!canSend}
            isSending={isSending}
            onClick={handleSend}
            recipientCount={recipients.length}
          />
        </div>

        {/* Progress */}
        {jobId && (
          <div className="mt-8 bg-slate-900/50 rounded-2xl border border-slate-800 p-6">
            <ProgressDashboard jobId={jobId} />
          </div>
        )}
      </main>
    </div>
  );
}
