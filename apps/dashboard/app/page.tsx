import { ArrowRight, Database, Satellite, ShieldCheck } from "lucide-react";
import Link from "next/link";
import { SiteNav } from "../components/site-nav";

const highlights = [
  {
    icon: ShieldCheck,
    title: "Sign offline",
    body: "An ESP32 builds and signs a normal EVM transaction with a key it never exposes — no internet, no cell coverage.",
  },
  {
    icon: Satellite,
    title: "Beam over satellite",
    body: "The signed bytes are framed and sent up to the Iridium satellite network, then relayed to the chain from anywhere on Earth.",
  },
  {
    icon: Database,
    title: "Audit on Arkiv",
    body: "The ground station submits the exact raw transaction and writes a separate, queryable Arkiv audit entity for every relay.",
  },
];

export default function Page() {
  return (
    <main className="min-h-screen bg-zinc-950 text-zinc-100">
      <SiteNav />
      <section className="mx-auto grid w-full max-w-7xl gap-12 px-6 py-20">
        <div className="grid max-w-3xl gap-6">
          <div className="flex items-center gap-3 text-emerald-300 text-sm uppercase tracking-[0.2em]">
            <Satellite size={16} />
            Satellite blockchain broadcast
          </div>
          <h1 className="font-semibold text-5xl leading-[1.05] md:text-6xl">Espresso</h1>
          <p className="text-lg text-zinc-300 leading-relaxed">
            Espresso is a non-custodial relay for broadcasting blockchain transactions from places the
            internet does not reach. You sign a transaction offline on an ESP32, beam it over the Iridium
            satellite network, and a ground station submits the exact signed bytes to the chain — then logs a
            tamper-evident audit trail on Arkiv.
          </p>
          <div className="flex flex-wrap gap-3 pt-2">
            <Link
              href="/console"
              className="inline-flex items-center gap-2 rounded-md bg-emerald-400 px-4 py-2 font-medium text-black hover:bg-emerald-300"
            >
              Open console
              <ArrowRight size={16} />
            </Link>
            <Link
              href="/pitch"
              className="inline-flex items-center gap-2 rounded-md border border-zinc-700 px-4 py-2 font-medium text-zinc-100 hover:bg-zinc-900"
            >
              View pitch
            </Link>
          </div>
        </div>

        <div className="grid gap-6 border-zinc-800 border-t pt-10 md:grid-cols-3">
          {highlights.map(({ icon: Icon, title, body }) => (
            <div key={title} className="grid gap-3">
              <span className="flex h-9 w-9 items-center justify-center rounded-md bg-zinc-900 text-emerald-300">
                <Icon size={18} />
              </span>
              <h2 className="font-semibold text-xl">{title}</h2>
              <p className="text-sm text-zinc-400 leading-6">{body}</p>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
