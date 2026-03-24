"use client";

import { useState, useEffect, useRef } from "react";
import type { JobProgress } from "@/app/types";

interface ProgressDashboardProps {
  jobId: string | null;
}

function formatElapsed(ms: number): string {
  const s = Math.floor(ms / 1000);
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return m > 0 ? `${m}m ${sec}s` : `${sec}s`;
}

const statusColors: Record<string, string> = {
  pending: "bg-amber-500/20 text-amber-400 border-amber-500/30",
  processing: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  completed: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
  failed: "bg-red-500/20 text-red-400 border-red-500/30",
};

export default function ProgressDashboard({ jobId }: ProgressDashboardProps) {
  const [progress, setProgress] = useState<JobProgress | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval>>();
  const timerRef = useRef<ReturnType<typeof setInterval>>();

  useEffect(() => {
    if (!jobId) {
      setProgress(null);
      return;
    }

    const poll = async () => {
      try {
        const res = await fetch(`/api/status/${jobId}`);
        if (res.ok) {
          const data: JobProgress = await res.json();
          setProgress(data);
          if (data.status === "completed" || data.status === "failed") {
            clearInterval(intervalRef.current);
            clearInterval(timerRef.current);
          }
        }
      } catch {
        // Silently retry on next poll
      }
    };

    poll();
    intervalRef.current = setInterval(poll, 2000);

    const start = Date.now();
    timerRef.current = setInterval(() => {
      setElapsed(Date.now() - start);
    }, 1000);

    return () => {
      clearInterval(intervalRef.current);
      clearInterval(timerRef.current);
    };
  }, [jobId]);

  if (!jobId || !progress) return null;

  const pct =
    progress.total > 0
      ? Math.round(((progress.sent + progress.failed) / progress.total) * 100)
      : 0;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-white">Sending Progress</h3>
        <span
          className={`px-3 py-1 rounded-full text-xs font-medium border ${
            statusColors[progress.status] || ""
          }`}
        >
          {progress.status.charAt(0).toUpperCase() + progress.status.slice(1)}
        </span>
      </div>

      {/* Progress bar */}
      <div className="w-full bg-slate-800 rounded-full h-4 overflow-hidden">
        <div
          className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-violet-500 transition-all duration-500 ease-out flex items-center justify-center"
          style={{ width: `${pct}%` }}
        >
          {pct > 10 && (
            <span className="text-[10px] font-bold text-white">{pct}%</span>
          )}
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-3">
        <div className="bg-slate-900 rounded-lg p-3 text-center border border-slate-800">
          <div className="text-xl font-bold text-emerald-400">
            {progress.sent}
          </div>
          <div className="text-xs text-slate-500">Sent</div>
        </div>
        <div className="bg-slate-900 rounded-lg p-3 text-center border border-slate-800">
          <div className="text-xl font-bold text-red-400">
            {progress.failed}
          </div>
          <div className="text-xs text-slate-500">Failed</div>
        </div>
        <div className="bg-slate-900 rounded-lg p-3 text-center border border-slate-800">
          <div className="text-xl font-bold text-slate-300">
            {progress.total}
          </div>
          <div className="text-xs text-slate-500">Total</div>
        </div>
        <div className="bg-slate-900 rounded-lg p-3 text-center border border-slate-800">
          <div className="text-xl font-bold text-slate-300">
            {formatElapsed(elapsed)}
          </div>
          <div className="text-xs text-slate-500">Elapsed</div>
        </div>
      </div>

      {/* Completion message */}
      {progress.status === "completed" && (
        <div className="p-4 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-sm font-medium text-center">
          All emails processed! {progress.sent} sent successfully
          {progress.failed > 0 && `, ${progress.failed} failed`}.
        </div>
      )}

      {progress.status === "failed" && (
        <div className="p-4 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm font-medium text-center">
          Job failed. Check the error log below for details.
        </div>
      )}

      {/* Error log */}
      {progress.errors.length > 0 && (
        <div>
          <h4 className="text-sm font-medium text-slate-400 mb-2">
            Failed Emails ({progress.errors.length})
          </h4>
          <div className="max-h-48 overflow-y-auto rounded-lg border border-slate-800 bg-slate-900">
            {progress.errors.map((err, i) => (
              <div
                key={i}
                className="flex items-start gap-3 px-4 py-2 border-b border-slate-800/50 last:border-b-0 text-sm"
              >
                <span className="text-red-400 shrink-0">{err.email}</span>
                <span className="text-slate-500">{err.error}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
