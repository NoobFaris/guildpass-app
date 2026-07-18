"use client";

import { useState } from "react";

type TruncatedWalletProps = {
  address: string;
  prefixLength?: number;
  suffixLength?: number;
};

export default function TruncatedWallet({
  address,
  prefixLength = 6,
  suffixLength = 4,
}: TruncatedWalletProps) {
  const [copied, setCopied] = useState(false);

  const truncated =
    address.length > prefixLength + suffixLength
      ? `${address.slice(0, prefixLength)}…${address.slice(-suffixLength)}`
      : address;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(address);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    } catch (error) {
      console.warn("Failed to copy wallet address:", error);
    }
  };

  return (
    <span className="relative inline-flex items-center gap-1.5 font-mono text-sm text-slate-600">
      <span title={address}>{truncated}</span>
      <button
        type="button"
        onClick={handleCopy}
        aria-label="Copy wallet address"
        className="rounded p-1 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
          className="h-3.5 w-3.5"
        >
          <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
          <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
        </svg>
      </button>

      {copied && (
        <span className="absolute -top-7 left-0 rounded bg-slate-800 px-2 py-1 text-xs font-medium text-white shadow-sm">
          Copied!
        </span>
      )}
    </span>
  );
}