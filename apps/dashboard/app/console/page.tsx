import { Suspense } from "react";
import { AuditExplorer } from "../../components/audit-explorer";
import { LiveSubmissions } from "../../components/live-submissions";
import { SiteNav } from "../../components/site-nav";
import { SubmissionDetail } from "../../components/submission-detail";
import { WalletConnect } from "../../components/wallet-connect";

export default function ConsolePage() {
  return (
    <main className="min-h-screen bg-zinc-950 text-zinc-100">
      <SiteNav actions={<WalletConnect />} />
      <section className="mx-auto flex w-full max-w-7xl flex-col px-6 py-6">
        <div className="grid gap-6 py-2">
          <div className="grid gap-1">
            <p className="font-medium text-emerald-300 text-sm uppercase tracking-[0.18em]">Operator view</p>
            <h2 className="font-semibold text-3xl">Signed transaction relay</h2>
            <p className="max-w-2xl text-sm text-zinc-400">
              Monitor raw transaction submissions as they move from satellite ingest to RPC submission and
              Arkiv audit.
            </p>
          </div>
          <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
            <LiveSubmissions />
            <div className="grid content-start gap-6">
              <AuditExplorer />
              <Suspense
                fallback={
                  <div className="border-zinc-800 border-t py-4 text-sm text-zinc-500">Loading detail</div>
                }
              >
                <SubmissionDetail />
              </Suspense>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
