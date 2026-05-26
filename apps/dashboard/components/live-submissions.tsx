"use client";

import { useQuery } from "@tanstack/react-query";
import { Activity, ExternalLink, RadioTower, RefreshCw } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { eventSourceUrl, fetchSubmissions, type Submission } from "../lib/ground-station";
import { Button } from "./ui/button";

const statusClass: Record<Submission["status"], string> = {
  received: "text-sky-300",
  queued: "text-violet-300",
  submitted: "text-amber-300",
  confirmed: "text-emerald-300",
  failed: "text-red-300",
};

function short(value: string, head = 10, tail = 6) {
  if (value.length <= head + tail) return value;
  return `${value.slice(0, head)}...${value.slice(-tail)}`;
}

function scheduledLabel(submitAfter?: number): string | undefined {
  if (!submitAfter) return undefined;
  return new Date(submitAfter * 1000).toLocaleString();
}

export function LiveSubmissions() {
  const { data, refetch, isFetching } = useQuery({
    queryKey: ["submissions"],
    queryFn: () => fetchSubmissions(undefined),
  });
  const [live, setLive] = useState<Submission[]>([]);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    const source = new EventSource(eventSourceUrl());
    source.addEventListener("ready", () => setConnected(true));
    source.addEventListener("submission", (event) => {
      const next = JSON.parse((event as MessageEvent).data) as Submission;
      setLive((current) => [next, ...current.filter((item) => item.id !== next.id)].slice(0, 50));
    });
    source.onerror = () => setConnected(false);
    return () => source.close();
  }, []);

  const submissions = useMemo(() => {
    const merged = new Map<string, Submission>();
    for (const item of data?.local ?? []) merged.set(item.id, item);
    for (const item of live) merged.set(item.id, item);
    return Array.from(merged.values()).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }, [data?.local, live]);

  return (
    <section className="grid min-h-[520px] grid-rows-[auto_1fr] border-zinc-800 border-t">
      <div className="flex flex-wrap items-center justify-between gap-3 py-4">
        <div className="flex items-center gap-3">
          <Activity className="text-emerald-300" size={18} />
          <div>
            <h2 className="font-semibold text-base">Live submissions</h2>
            <p className="text-sm text-zinc-500">
              {connected ? "SSE connected" : "Waiting for event stream"}
            </p>
          </div>
        </div>
        <Button variant="ghost" onClick={() => void refetch()} disabled={isFetching}>
          <RefreshCw size={16} />
          Refresh
        </Button>
      </div>

      <div className="overflow-hidden border-zinc-800 border-t">
        <div className="grid grid-cols-[120px_150px_160px_1fr_110px] border-zinc-800 border-b px-3 py-2 text-xs text-zinc-500 uppercase tracking-[0.12em]">
          <span>Status</span>
          <span>Chain</span>
          <span>Sender</span>
          <span>Transaction</span>
          <span>Audit</span>
        </div>
        <div className="divide-y divide-zinc-900">
          {submissions.length === 0 ? (
            <div className="grid min-h-72 place-items-center text-zinc-500">
              <div className="flex items-center gap-3">
                <RadioTower size={18} />
                <span>No submissions received yet</span>
              </div>
            </div>
          ) : (
            submissions.map((submission) => (
              <a
                key={submission.id}
                href={`/?tx=${submission.txHash}`}
                className="grid grid-cols-[120px_150px_160px_1fr_110px] items-center px-3 py-3 text-sm transition-colors hover:bg-zinc-900/70"
              >
                <span className="grid gap-0.5">
                  <span className={statusClass[submission.status]}>{submission.status}</span>
                  {submission.status === "queued" && scheduledLabel(submission.submitAfter) ? (
                    <span className="text-[11px] text-zinc-500">{scheduledLabel(submission.submitAfter)}</span>
                  ) : null}
                </span>
                <span className="text-zinc-300">{submission.chainId}</span>
                <span className="font-mono text-zinc-400">{short(submission.from)}</span>
                <span className="font-mono text-zinc-300">{short(submission.txHash, 18, 10)}</span>
                <span className="flex items-center gap-1 text-zinc-500">
                  {submission.auditEntityKey ? "Arkiv" : "Pending"}
                  {submission.auditEntityKey ? <ExternalLink size={13} /> : null}
                </span>
              </a>
            ))
          )}
        </div>
      </div>
    </section>
  );
}
