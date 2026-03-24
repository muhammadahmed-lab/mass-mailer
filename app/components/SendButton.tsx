"use client";

interface SendButtonProps {
  disabled: boolean;
  isSending: boolean;
  onClick: () => void;
  recipientCount: number;
}

export default function SendButton({
  disabled,
  isSending,
  onClick,
  recipientCount,
}: SendButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled || isSending}
      className={`w-full flex items-center justify-center gap-3 py-4 px-6 rounded-xl font-semibold text-lg transition-all ${
        disabled || isSending
          ? "bg-slate-800 text-slate-500 cursor-not-allowed"
          : "bg-gradient-to-r from-indigo-600 to-violet-600 text-white hover:from-indigo-500 hover:to-violet-500 shadow-lg shadow-indigo-500/25 hover:shadow-indigo-500/40"
      }`}
    >
      {isSending ? (
        <>
          <svg
            className="animate-spin w-5 h-5"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
            />
          </svg>
          Sending...
        </>
      ) : (
        <>
          <svg
            className="w-5 h-5"
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
          Send to {recipientCount} recipient{recipientCount !== 1 ? "s" : ""}
        </>
      )}
    </button>
  );
}
