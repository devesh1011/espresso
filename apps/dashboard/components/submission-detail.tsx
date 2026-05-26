"use client";

import { useQuery } from "@tanstack/react-query";
import { Copy, ExternalLink, FileText } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { fetchSubmissions } from "../lib/ground-station";
import { Button } from "./ui/button";

const explorerByChain: Record<number, string> = {
  11155111: "https://sepolia.etherscan.io/tx/",
  60138453102: "https://explorer.braga.hoodi.arkiv.network/tx/",
};

function label(value: string) {
  return value.length > 28 ? `${value.slice(0, 18)}...${value.slice(-10)}` : value;
}

export function SubmissionDetail() {
  const tx = useSearchParams().get("tx");
  const { data } = useQuery({
    queryKey: ["submissions"],
    queryFn: () => fetchSubmissions(undefined),
  });
  const submission = data?.local.find((item) => item.txHash === tx || item.id === tx);

  return (
    <section className="grid gap-4 border-zinc-800 border-t py-4">
      <div className="flex items-center gap-3">
        <FileText className="text-emerald-300" size={18} />
        <div>
          <h2 className="font-semibold text-base">Submission detail</h2>
          <p className="text-sm text-zinc-500">
            {submission ? label(submission.txHash) : "Select a transaction"}
          </p>
        </div>
      </div>

      {!submission ? (
        <div className="py-12 text-center text-sm text-zinc-500">
          Choose a live submission to inspect the signed payload
        </div>
      ) : (
        <div className="grid gap-3 text-sm">
          <div className="grid grid-cols-[90px_1fr] gap-3">
            <span className="text-zinc-500">Status</span>
            <span className="text-zinc-100">{submission.status}</span>
            <span className="text-zinc-500">Chain</span>
            <span className="text-zinc-100">{submission.chainId}</span>
            <span className="text-zinc-500">Sender</span>
            <span className="font-mono text-zinc-100">{label(submission.from)}</span>
            <span className="text-zinc-500">Audit</span>
            <span className="font-mono text-zinc-100">
              {submission.auditEntityKey ? label(submission.auditEntityKey) : "Pending"}
            </span>
          </div>
          <pre className="max-h-48 overflow-auto rounded-md border border-zinc-800 bg-black p-3 font-mono text-zinc-300 text-xs leading-relaxed">
            {submission.rawTx}
          </pre>
          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              onClick={() => {
                void navigator.clipboard.writeText(submission.rawTx);
              }}
            >
              <Copy size={16} />
              Copy raw tx
            </Button>
            {explorerByChain[submission.chainId] ? (
              <Button asChild variant="ghost">
                <a
                  href={`${explorerByChain[submission.chainId]}${submission.txHash}`}
                  target="_blank"
                  rel="noreferrer"
                >
                  <ExternalLink size={16} />
                  Explorer
                </a>
              </Button>
            ) : null}
          </div>
        </div>
      )}
    </section>
  );
}
