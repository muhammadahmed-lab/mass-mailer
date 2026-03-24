"use client";

import { useState, useRef, useCallback } from "react";
import Papa from "papaparse";
import * as XLSX from "xlsx";
import type { Recipient } from "@/app/types";

interface RecipientUploadProps {
  recipients: Recipient[];
  setRecipients: (r: Recipient[]) => void;
}

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

function findColumn(headers: string[], candidates: string[]): string | null {
  const lower = headers.map((h) => h.toLowerCase().trim());
  for (const c of candidates) {
    const idx = lower.indexOf(c.toLowerCase());
    if (idx !== -1) return headers[idx];
  }
  return null;
}

function parseRecipients(
  rows: Record<string, string>[]
): { valid: Recipient[]; invalid: number; dupes: number } {
  const headers = rows.length > 0 ? Object.keys(rows[0]) : [];
  const emailCol = findColumn(headers, ["email", "e-mail", "email_address", "emailaddress"]);
  const nameCol = findColumn(headers, ["name", "full_name", "fullname", "first_name", "firstname"]);

  if (!emailCol) {
    throw new Error(
      'No "email" column found. Your file must have a column named "email".'
    );
  }

  const seen = new Set<string>();
  const valid: Recipient[] = [];
  let invalid = 0;
  let dupes = 0;

  for (const row of rows) {
    const email = (row[emailCol] || "").trim().toLowerCase();
    if (!email) continue;

    if (!EMAIL_REGEX.test(email)) {
      invalid++;
      continue;
    }

    if (seen.has(email)) {
      dupes++;
      continue;
    }

    seen.add(email);
    valid.push({
      email,
      name: nameCol ? (row[nameCol] || "").trim() || undefined : undefined,
    });
  }

  return { valid, invalid, dupes };
}

export default function RecipientUpload({
  recipients,
  setRecipients,
}: RecipientUploadProps) {
  const [dragOver, setDragOver] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);
  const [stats, setStats] = useState<{
    total: number;
    valid: number;
    invalid: number;
    dupes: number;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const processFile = useCallback(
    async (file: File) => {
      setError(null);
      setStats(null);

      if (file.size > MAX_FILE_SIZE) {
        setError("File exceeds 5MB limit. Please use a smaller file.");
        return;
      }

      setFileName(file.name);
      const ext = file.name.split(".").pop()?.toLowerCase();

      try {
        let rows: Record<string, string>[];

        if (ext === "csv") {
          const text = await file.text();
          const result = Papa.parse<Record<string, string>>(text, {
            header: true,
            skipEmptyLines: true,
          });
          rows = result.data;
        } else if (ext === "xlsx" || ext === "xls") {
          const buffer = await file.arrayBuffer();
          const wb = XLSX.read(buffer, { type: "array" });
          const sheet = wb.Sheets[wb.SheetNames[0]];
          rows = XLSX.utils.sheet_to_json<Record<string, string>>(sheet);
        } else {
          setError("Unsupported file type. Please upload a .csv or .xlsx file.");
          return;
        }

        const { valid, invalid, dupes } = parseRecipients(rows);
        setStats({ total: rows.length, valid: valid.length, invalid, dupes });
        setRecipients(valid);
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Failed to parse file"
        );
        setRecipients([]);
      }
    },
    [setRecipients]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragOver(false);
      const file = e.dataTransfer.files[0];
      if (file) processFile(file);
    },
    [processFile]
  );

  const handleClear = () => {
    setRecipients([]);
    setFileName(null);
    setStats(null);
    setError(null);
    if (fileRef.current) fileRef.current.value = "";
  };

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold text-white flex items-center gap-2">
        <svg className="w-5 h-5 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
        Recipients
      </h2>

      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        className={`relative border-2 border-dashed rounded-xl p-8 text-center transition-all cursor-pointer ${
          dragOver
            ? "border-indigo-500 bg-indigo-500/10"
            : "border-slate-700 hover:border-slate-500 bg-slate-900/50"
        }`}
        onClick={() => fileRef.current?.click()}
      >
        <input
          ref={fileRef}
          type="file"
          accept=".csv,.xlsx,.xls"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) processFile(file);
          }}
        />
        <svg className="w-10 h-10 mx-auto mb-3 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
        </svg>
        <p className="text-slate-300 font-medium">
          {fileName || "Drop CSV or Excel file here"}
        </p>
        <p className="text-slate-500 text-sm mt-1">
          or click to browse (max 5MB)
        </p>
      </div>

      {error && (
        <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
          {error}
        </div>
      )}

      {stats && (
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-slate-900 rounded-lg p-3 text-center border border-slate-800">
            <div className="text-2xl font-bold text-emerald-400">
              {stats.valid}
            </div>
            <div className="text-xs text-slate-500">Valid</div>
          </div>
          <div className="bg-slate-900 rounded-lg p-3 text-center border border-slate-800">
            <div className="text-2xl font-bold text-red-400">
              {stats.invalid}
            </div>
            <div className="text-xs text-slate-500">Invalid</div>
          </div>
          <div className="bg-slate-900 rounded-lg p-3 text-center border border-slate-800">
            <div className="text-2xl font-bold text-amber-400">
              {stats.dupes}
            </div>
            <div className="text-xs text-slate-500">Duplicates</div>
          </div>
        </div>
      )}

      {recipients.length > 0 && (
        <>
          <div className="overflow-hidden rounded-lg border border-slate-800">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-800/50">
                  <th className="text-left px-4 py-2 text-slate-400 font-medium">
                    Email
                  </th>
                  <th className="text-left px-4 py-2 text-slate-400 font-medium">
                    Name
                  </th>
                </tr>
              </thead>
              <tbody>
                {recipients.slice(0, 10).map((r, i) => (
                  <tr
                    key={i}
                    className="border-t border-slate-800/50 hover:bg-slate-800/30"
                  >
                    <td className="px-4 py-2 text-slate-300">{r.email}</td>
                    <td className="px-4 py-2 text-slate-400">
                      {r.name || "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {recipients.length > 10 && (
              <div className="px-4 py-2 text-center text-sm text-slate-500 border-t border-slate-800/50">
                ...and {recipients.length - 10} more
              </div>
            )}
          </div>
          <button
            type="button"
            onClick={handleClear}
            className="text-sm text-slate-400 hover:text-red-400 transition-colors"
          >
            Clear recipients
          </button>
        </>
      )}
    </div>
  );
}
