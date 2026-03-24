"use client";

import { useState, useCallback } from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Link from "@tiptap/extension-link";
import type { EmailProvider } from "@/app/types";

interface ComposeFormProps {
  provider: EmailProvider;
  setProvider: (v: EmailProvider) => void;
  from: string;
  setFrom: (v: string) => void;
  subject: string;
  setSubject: (v: string) => void;
  body: string;
  setBody: (v: string) => void;
  resendApiKey: string;
  setResendApiKey: (v: string) => void;
  gmailAppPassword: string;
  setGmailAppPassword: (v: string) => void;
}

function ToolbarButton({
  onClick,
  active,
  children,
  title,
}: {
  onClick: () => void;
  active?: boolean;
  children: React.ReactNode;
  title: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      className={`px-2.5 py-1.5 rounded text-sm font-medium transition-colors ${
        active
          ? "bg-indigo-600 text-white"
          : "text-slate-400 hover:text-white hover:bg-slate-700"
      }`}
    >
      {children}
    </button>
  );
}

function GuidePanel({
  provider,
  expanded,
  onToggle,
}: {
  provider: EmailProvider;
  expanded: boolean;
  onToggle: () => void;
}) {
  return (
    <div className="rounded-lg border border-slate-700 bg-slate-800/40 overflow-hidden">
      <button
        type="button"
        onClick={onToggle}
        className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-slate-800/60 transition-colors"
      >
        <span className="flex items-center gap-2 text-sm font-medium text-amber-400">
          <svg
            className="w-4 h-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          {provider === "gmail"
            ? "How to get your Gmail App Password"
            : "How to set up Resend"}
        </span>
        <svg
          className={`w-4 h-4 text-slate-400 transition-transform ${
            expanded ? "rotate-180" : ""
          }`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M19 9l-7 7-7-7"
          />
        </svg>
      </button>

      {expanded && (
        <div className="px-4 pb-4 text-sm text-slate-300 space-y-3 border-t border-slate-700/50">
          {provider === "gmail" ? (
            <>
              <div className="pt-3">
                <p className="text-slate-400 mb-3">
                  Gmail doesn&apos;t let apps use your real password. You need
                  an <strong className="text-white">App Password</strong> — a
                  special 16-character code just for this app.
                </p>

                <ol className="space-y-2.5 list-none">
                  <li className="flex gap-3">
                    <span className="shrink-0 w-6 h-6 rounded-full bg-indigo-500/20 text-indigo-400 flex items-center justify-center text-xs font-bold">
                      1
                    </span>
                    <div>
                      <strong className="text-white">
                        Enable 2-Step Verification
                      </strong>{" "}
                      (if not already on)
                      <br />
                      <span className="text-slate-400">
                        Go to{" "}
                        <a
                          href="https://myaccount.google.com/security"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-indigo-400 underline hover:text-indigo-300"
                        >
                          Google Account → Security
                        </a>{" "}
                        → Turn on 2-Step Verification
                      </span>
                    </div>
                  </li>
                  <li className="flex gap-3">
                    <span className="shrink-0 w-6 h-6 rounded-full bg-indigo-500/20 text-indigo-400 flex items-center justify-center text-xs font-bold">
                      2
                    </span>
                    <div>
                      <strong className="text-white">
                        Generate App Password
                      </strong>
                      <br />
                      <span className="text-slate-400">
                        Go to{" "}
                        <a
                          href="https://myaccount.google.com/apppasswords"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-indigo-400 underline hover:text-indigo-300"
                        >
                          myaccount.google.com/apppasswords
                        </a>
                        <br />
                        Name it anything (e.g. &quot;Mass Mailer&quot;) → Click{" "}
                        <strong className="text-white">Create</strong>
                      </span>
                    </div>
                  </li>
                  <li className="flex gap-3">
                    <span className="shrink-0 w-6 h-6 rounded-full bg-indigo-500/20 text-indigo-400 flex items-center justify-center text-xs font-bold">
                      3
                    </span>
                    <div>
                      <strong className="text-white">
                        Copy the 16-character code
                      </strong>
                      <br />
                      <span className="text-slate-400">
                        Paste it below. It looks like:{" "}
                        <code className="bg-slate-900 px-1.5 py-0.5 rounded text-xs text-emerald-400">
                          abcd efgh ijkl mnop
                        </code>
                      </span>
                    </div>
                  </li>
                </ol>

                <div className="mt-3 p-3 rounded-lg bg-amber-500/5 border border-amber-500/20">
                  <p className="text-amber-400 text-xs">
                    <strong>Limits:</strong> Gmail allows ~500 emails/day
                    (personal) or ~2,000/day (Google Workspace). Sending too
                    many too fast may trigger a temporary block.
                  </p>
                </div>
              </div>
            </>
          ) : (
            <>
              <div className="pt-3">
                <p className="text-slate-400 mb-3">
                  Resend is a developer email API. It&apos;s more reliable for
                  bulk sending but requires a{" "}
                  <strong className="text-white">verified domain</strong> — you
                  can&apos;t send from a Gmail address.
                </p>

                <ol className="space-y-2.5 list-none">
                  <li className="flex gap-3">
                    <span className="shrink-0 w-6 h-6 rounded-full bg-indigo-500/20 text-indigo-400 flex items-center justify-center text-xs font-bold">
                      1
                    </span>
                    <div>
                      <strong className="text-white">Create an account</strong>
                      <br />
                      <span className="text-slate-400">
                        Sign up at{" "}
                        <a
                          href="https://resend.com"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-indigo-400 underline hover:text-indigo-300"
                        >
                          resend.com
                        </a>{" "}
                        (free tier: 100 emails/day, 3,000/month)
                      </span>
                    </div>
                  </li>
                  <li className="flex gap-3">
                    <span className="shrink-0 w-6 h-6 rounded-full bg-indigo-500/20 text-indigo-400 flex items-center justify-center text-xs font-bold">
                      2
                    </span>
                    <div>
                      <strong className="text-white">
                        Verify your domain
                      </strong>
                      <br />
                      <span className="text-slate-400">
                        Go to Domains → Add Domain → Add DNS records your
                        registrar provides. Takes 5-10 minutes to verify.
                      </span>
                    </div>
                  </li>
                  <li className="flex gap-3">
                    <span className="shrink-0 w-6 h-6 rounded-full bg-indigo-500/20 text-indigo-400 flex items-center justify-center text-xs font-bold">
                      3
                    </span>
                    <div>
                      <strong className="text-white">Get your API key</strong>
                      <br />
                      <span className="text-slate-400">
                        Go to API Keys → Create API Key → Copy the key starting
                        with{" "}
                        <code className="bg-slate-900 px-1.5 py-0.5 rounded text-xs text-emerald-400">
                          re_
                        </code>
                      </span>
                    </div>
                  </li>
                </ol>

                <div className="mt-3 p-3 rounded-lg bg-blue-500/5 border border-blue-500/20">
                  <p className="text-blue-400 text-xs">
                    <strong>Why Resend?</strong> Better deliverability (less
                    likely to land in spam), higher limits, and proper email
                    infrastructure. Best for professional/business use.
                  </p>
                </div>

                <div className="mt-2 p-3 rounded-lg bg-slate-800 border border-slate-700">
                  <p className="text-slate-400 text-xs">
                    <strong className="text-white">Quick test:</strong> Use{" "}
                    <code className="text-emerald-400">
                      onboarding@resend.dev
                    </code>{" "}
                    as the &quot;From Email&quot; to test without verifying a
                    domain (emails only go to your own Resend account email).
                  </p>
                </div>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}

export default function ComposeForm({
  provider,
  setProvider,
  from,
  setFrom,
  subject,
  setSubject,
  setBody,
  resendApiKey,
  setResendApiKey,
  gmailAppPassword,
  setGmailAppPassword,
}: ComposeFormProps) {
  const [showSecret, setShowSecret] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [guideOpen, setGuideOpen] = useState(true);

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit,
      Link.configure({
        openOnClick: false,
        HTMLAttributes: { class: "text-indigo-400 underline" },
      }),
    ],
    content: "",
    onUpdate: ({ editor }) => {
      setBody(editor.getHTML());
    },
    editorProps: {
      attributes: { class: "prose prose-invert max-w-none" },
    },
  });

  const setLink = useCallback(() => {
    if (!editor) return;
    const url = window.prompt("URL:");
    if (url) {
      editor.chain().focus().setLink({ href: url }).run();
    }
  }, [editor]);

  const inputCls =
    "w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-3 text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all";

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold text-white flex items-center gap-2">
        <svg
          className="w-5 h-5 text-indigo-400"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"
          />
        </svg>
        Compose Email
      </h2>

      {/* Provider selector */}
      <div>
        <label className="block text-sm font-medium text-slate-300 mb-2">
          Send via
        </label>
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => setProvider("gmail")}
            className={`flex items-center justify-center gap-2 py-3 px-4 rounded-lg border text-sm font-medium transition-all ${
              provider === "gmail"
                ? "bg-indigo-600/20 border-indigo-500 text-indigo-300 shadow-[0_0_10px_rgba(99,102,241,0.15)]"
                : "bg-slate-900 border-slate-700 text-slate-400 hover:border-slate-600 hover:text-slate-300"
            }`}
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
              <path d="M24 5.457v13.909c0 .904-.732 1.636-1.636 1.636h-3.819V11.73L12 16.64l-6.545-4.91v9.273H1.636A1.636 1.636 0 0 1 0 19.366V5.457c0-2.023 2.309-3.178 3.927-1.964L5.455 4.64 12 9.548l6.545-4.91 1.528-1.145C21.69 2.28 24 3.434 24 5.457z" />
            </svg>
            Gmail SMTP
          </button>
          <button
            type="button"
            onClick={() => setProvider("resend")}
            className={`flex items-center justify-center gap-2 py-3 px-4 rounded-lg border text-sm font-medium transition-all ${
              provider === "resend"
                ? "bg-indigo-600/20 border-indigo-500 text-indigo-300 shadow-[0_0_10px_rgba(99,102,241,0.15)]"
                : "bg-slate-900 border-slate-700 text-slate-400 hover:border-slate-600 hover:text-slate-300"
            }`}
          >
            <svg
              className="w-4 h-4"
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
            Resend API
          </button>
        </div>
      </div>

      {/* Setup guide */}
      <GuidePanel
        provider={provider}
        expanded={guideOpen}
        onToggle={() => setGuideOpen(!guideOpen)}
      />

      {/* Provider-specific credentials */}
      {provider === "gmail" ? (
        <>
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1.5">
              Gmail Address
            </label>
            <input
              type="email"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
              className={inputCls}
              placeholder="you@gmail.com or you@company.com"
            />
            <p className="mt-1 text-xs text-slate-500">
              Your Gmail or Google Workspace email
            </p>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1.5">
              App Password
            </label>
            <div className="relative">
              <input
                type={showSecret ? "text" : "password"}
                value={gmailAppPassword}
                onChange={(e) => setGmailAppPassword(e.target.value)}
                className={inputCls}
                placeholder="xxxx xxxx xxxx xxxx"
              />
              <button
                type="button"
                onClick={() => setShowSecret(!showSecret)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white text-sm"
              >
                {showSecret ? "Hide" : "Show"}
              </button>
            </div>
            <p className="mt-1 text-xs text-slate-500">
              16-character code from Google App Passwords (not your Gmail
              password)
            </p>
          </div>
        </>
      ) : (
        <>
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1.5">
              Resend API Key
            </label>
            <div className="relative">
              <input
                type={showSecret ? "text" : "password"}
                value={resendApiKey}
                onChange={(e) => setResendApiKey(e.target.value)}
                className={inputCls}
                placeholder="re_xxxxxxxxxxxx"
              />
              <button
                type="button"
                onClick={() => setShowSecret(!showSecret)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white text-sm"
              >
                {showSecret ? "Hide" : "Show"}
              </button>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1.5">
              From Email
            </label>
            <input
              type="email"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
              className={inputCls}
              placeholder="you@yourdomain.com"
            />
            <p className="mt-1 text-xs text-slate-500">
              Must use a domain verified in your Resend account
            </p>
          </div>
        </>
      )}

      {/* Subject */}
      <div>
        <label className="block text-sm font-medium text-slate-300 mb-1.5">
          Subject
        </label>
        <input
          type="text"
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          className={inputCls}
          placeholder="Your subject line (use {{name}} for personalization)"
        />
      </div>

      {/* Rich text editor */}
      <div>
        <label className="block text-sm font-medium text-slate-300 mb-1.5">
          Email Body
        </label>
        <div
          className={`tiptap-editor border border-slate-700 rounded-lg overflow-hidden bg-slate-900 transition-all ${
            expanded ? "expanded" : ""
          }`}
        >
          {editor && (
            <div className="flex flex-wrap items-center gap-1 border-b border-slate-700 p-2 bg-slate-800/50">
              <ToolbarButton
                onClick={() => editor.chain().focus().toggleBold().run()}
                active={editor.isActive("bold")}
                title="Bold"
              >
                <strong>B</strong>
              </ToolbarButton>
              <ToolbarButton
                onClick={() => editor.chain().focus().toggleItalic().run()}
                active={editor.isActive("italic")}
                title="Italic"
              >
                <em>I</em>
              </ToolbarButton>
              <ToolbarButton
                onClick={() => editor.chain().focus().toggleStrike().run()}
                active={editor.isActive("strike")}
                title="Strikethrough"
              >
                <s>S</s>
              </ToolbarButton>
              <div className="w-px bg-slate-700 mx-1" />
              <ToolbarButton
                onClick={() =>
                  editor.chain().focus().toggleHeading({ level: 1 }).run()
                }
                active={editor.isActive("heading", { level: 1 })}
                title="Heading 1"
              >
                H1
              </ToolbarButton>
              <ToolbarButton
                onClick={() =>
                  editor.chain().focus().toggleHeading({ level: 2 }).run()
                }
                active={editor.isActive("heading", { level: 2 })}
                title="Heading 2"
              >
                H2
              </ToolbarButton>
              <div className="w-px bg-slate-700 mx-1" />
              <ToolbarButton
                onClick={() =>
                  editor.chain().focus().toggleBulletList().run()
                }
                active={editor.isActive("bulletList")}
                title="Bullet List"
              >
                &#8226; List
              </ToolbarButton>
              <ToolbarButton
                onClick={() =>
                  editor.chain().focus().toggleOrderedList().run()
                }
                active={editor.isActive("orderedList")}
                title="Ordered List"
              >
                1. List
              </ToolbarButton>
              <div className="w-px bg-slate-700 mx-1" />
              <ToolbarButton
                onClick={setLink}
                active={editor.isActive("link")}
                title="Add Link"
              >
                Link
              </ToolbarButton>
              <div className="w-px bg-slate-700 mx-1" />
              <ToolbarButton
                onClick={() => editor.chain().focus().undo().run()}
                title="Undo"
              >
                Undo
              </ToolbarButton>
              <ToolbarButton
                onClick={() => editor.chain().focus().redo().run()}
                title="Redo"
              >
                Redo
              </ToolbarButton>
              <div className="flex-1" />
              <button
                type="button"
                onClick={() => setExpanded(!expanded)}
                title={expanded ? "Collapse editor" : "Expand editor"}
                className="px-2 py-1.5 rounded text-slate-400 hover:text-white hover:bg-slate-700 transition-colors"
              >
                {expanded ? (
                  <svg
                    className="w-4 h-4"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M4 14h6m0 0v6m0-6L3 21M20 10h-6m0 0V4m0 6l7-7"
                    />
                  </svg>
                ) : (
                  <svg
                    className="w-4 h-4"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4"
                    />
                  </svg>
                )}
              </button>
            </div>
          )}
          <div className="editor-wrapper">
            <EditorContent editor={editor} />
          </div>
          <div className="flex justify-center py-1 border-t border-slate-800 cursor-row-resize select-none">
            <svg
              className="w-8 h-2 text-slate-600"
              viewBox="0 0 32 8"
              fill="currentColor"
            >
              <circle cx="10" cy="4" r="1.5" />
              <circle cx="16" cy="4" r="1.5" />
              <circle cx="22" cy="4" r="1.5" />
            </svg>
          </div>
        </div>
        <p className="mt-1 text-xs text-slate-500">
          Use {"{{name}}"} to personalize with recipient names
        </p>
      </div>
    </div>
  );
}
