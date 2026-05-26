import {
  ArrowRight,
  Cpu,
  Database,
  DollarSign,
  Globe,
  Link2,
  Radio,
  Satellite,
  ShieldCheck,
  Watch,
  Zap,
} from "lucide-react";
import Link from "next/link";
import { SiteNav } from "../../components/site-nav";

const deviceSpecs = [
  ["Ultra cheap ~$5", <DollarSign key="cost" size={20} />],
  ["Low power", <Zap key="power" size={20} />],
  ["LoRa 15 km RF", <Radio key="rf" size={20} />],
  ["DeFi gateway", <Link2 key="defi" size={20} />],
] as const;

const impactCards = [
  [<ShieldCheck key="disaster" size={24} />, "Disaster proof liquidity in remote villages or blackouts."],
  [<Globe key="censor" size={24} />, "Censorship resistant trades from anywhere on Earth."],
  [<Watch key="future" size={24} />, "Future: smartwatches to global emergency finance."],
] as const;

export default function PitchPage() {
  return (
    <main className="min-h-screen bg-[#060708] text-zinc-100">
      <SiteNav />

      <section id="title" className="relative grid min-h-screen overflow-hidden px-6">
        <div className="absolute inset-0 opacity-70">
          <div className="absolute inset-x-[-10%] top-24 h-px bg-emerald-300/30" />
          <div className="absolute top-1/2 left-1/2 h-[44rem] w-[44rem] -translate-x-1/2 -translate-y-1/2 rounded-full border border-emerald-300/20" />
          <div className="absolute top-1/2 left-1/2 h-[28rem] w-[28rem] -translate-x-1/2 -translate-y-1/2 rounded-full border border-zinc-700" />
          <div className="absolute top-[42%] left-[18%] h-3 w-3 rounded-full bg-emerald-300 shadow-[0_0_36px_rgba(16,224,162,0.7)]" />
          <div className="absolute top-[36%] right-[22%] h-2 w-2 rounded-full bg-zinc-200" />
          <div className="absolute right-[18%] bottom-[22%] h-px w-[32rem] rotate-[-18deg] bg-gradient-to-r from-transparent via-emerald-300/70 to-transparent" />
        </div>
        <div className="relative mx-auto grid w-full max-w-7xl content-center gap-10">
          <div className="grid max-w-4xl gap-6">
            <div className="flex items-center gap-3 text-emerald-300 text-sm uppercase tracking-[0.22em]">
              <Satellite size={18} />
              Satellite blockchain broadcast
            </div>
            <h1 className="font-semibold text-6xl leading-[0.95] tracking-normal md:text-8xl">Espresso</h1>
            <p className="max-w-3xl text-2xl text-zinc-300 leading-snug">
              Sign a DeFi transaction on an offline, low cost ESP32 and beam it to the chain over a satellite
              network, from a remote village, a disaster zone, or a censored network, with no internet and no
              cell coverage.
            </p>
          </div>
        </div>
      </section>

      <PitchSection
        id="problem"
        kicker="02 The problem"
        title="Signing is solved. Getting the signed bytes out is not."
      >
        <p className="max-w-4xl text-2xl text-zinc-300 leading-snug">
          No internet means no access to on chain capital, so billions stay locked out of DeFi. Wallets
          assume the internet is nearby. Ships at sea, disaster zones, remote villages, and censored networks
          have a clear view of the sky long before they have any IP connectivity. A satellite can reach them
          when nothing else can.
        </p>
      </PitchSection>

      <PitchSection
        id="solution"
        kicker="03 The solution"
        title="Sign → Beam → Transact"
      >
        <div className="grid gap-8 lg:grid-cols-[0.8fr_1fr]">
          <div className="grid grid-cols-[auto_1fr_auto_1fr_auto] items-center gap-4 text-sm">
            <Node icon={<ShieldCheck size={20} />} label="ESP32 signs" />
            <ArrowRight className="text-zinc-600" />
            <Node icon={<Satellite size={20} />} label="Beams via satellite" />
            <ArrowRight className="text-zinc-600" />
            <Node icon={<Database size={20} />} label="RPC plus Arkiv audit" />
          </div>
          <p className="text-2xl text-zinc-300 leading-snug">
            The user signs a normal EVM transaction offline. Espresso only transports and submits the
            serialized transaction. Audit is separate, queryable, and signed by the station.
          </p>
        </div>
      </PitchSection>

      <PitchSection
        id="device"
        kicker="04 The device"
        title="Turns any device into a remote control for DeFi."
      >
        <div className="grid gap-12">
          <div className="flex items-center justify-center gap-4 sm:gap-6">
            <IconTile icon={<Satellite size={22} />} />
            <div className="h-px w-10 bg-zinc-700 sm:w-16" />
            <div className="grid h-28 w-28 place-items-center rounded-2xl border border-emerald-300/50 bg-emerald-300/5 text-emerald-300 shadow-[0_0_48px_rgba(16,224,162,0.25)]">
              <Cpu size={44} />
            </div>
            <div className="h-px w-10 bg-zinc-700 sm:w-16" />
            <IconTile icon={<Link2 size={22} />} />
          </div>
          <p className="mx-auto max-w-3xl text-center text-2xl text-zinc-300 leading-snug">
            An ultra cheap ESP32 turns any device into a remote control for Uniswap, Aave, or Polygon, even in
            deserts or blackouts.
          </p>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {deviceSpecs.map(([label, icon]) => (
              <Spec key={label} icon={icon} label={label} />
            ))}
          </div>
        </div>
      </PitchSection>

      <PitchSection
        id="arkiv-depth"
        kicker="05 Arkiv integration"
        title="Arkiv holds the signed tx, not just the receipt."
      >
        <div className="grid gap-10">
          <p className="max-w-4xl text-2xl text-zinc-300 leading-snug">
            A scheduled tx is written to Arkiv as a queued entity before it broadcasts, so the signed tx is
            durable and queryable. On restart the station reloads its queued entities and relays each when due.
          </p>
          <div className="grid gap-4 md:grid-cols-3">
            <Plane
              title="Durable queue"
              body="Queued entities live on Arkiv, so received → queued → submitted → confirmed survives a restart."
            />
            <Plane
              title="Queried by attribute"
              body="arkiv_query filters on project and kind. Recovery adds status=queued and trusts only the station wallet's entities."
            />
            <Plane
              title="Expiring history"
              body="Entities carry a 30 day time to live, so the trail stays recent history, not permanent storage."
            />
          </div>
        </div>
      </PitchSection>

      <PitchSection id="transport" kicker="06 Transport" title="Built for the satellite network.">
        <div className="grid gap-4 md:grid-cols-3">
          <Plane
            title="Primary satellite uplink"
            body="The device sends binary payloads up to the satellite network and reads downlink frames back. Global coverage, pole to pole, with only sky in view."
          />
          <Plane
            title="LoRa SX1276 fallback"
            body="When a ground receiver is in range, the same frames go over a 915 MHz long range link with kilometres of reach below the 192 byte MTU, reassembled with CRC16 checks. The radio rides on a low cost, low power ESP32."
          />
          <Plane
            title="Serial bridge"
            body="A receiver ESP32 forwards decoded satellite or LoRa frames to the ground station."
          />
        </div>
      </PitchSection>

      <PitchSection
        id="impact"
        kicker="07 Impact"
        title="Activating finance for the world's remote users."
      >
        <div className="grid gap-4 md:grid-cols-3">
          {impactCards.map(([icon, text]) => (
            <ImpactCard key={text} icon={icon} text={text} />
          ))}
        </div>
      </PitchSection>

      <section id="close" className="grid min-h-screen content-center px-6 py-24">
        <div className="mx-auto grid w-full max-w-7xl gap-8">
          <p className="text-emerald-300 text-sm uppercase tracking-[0.22em]">08 Close</p>
          <h2 className="max-w-5xl font-semibold text-5xl leading-tight md:text-7xl">
            Espresso turns a satellite link into a blockchain broadcast path. Sign anywhere on Earth,
            broadcast from anywhere on Earth, no internet required.
          </h2>
          <div className="flex flex-wrap gap-3">
            <Link
              href="/console"
              className="rounded-md bg-emerald-400 px-4 py-2 font-medium text-black hover:bg-emerald-300"
            >
              Open console
            </Link>
            <a
              href="https://braga.hoodi.arkiv.network/rpc"
              className="rounded-md border border-zinc-700 px-4 py-2 font-medium text-zinc-100 hover:bg-zinc-900"
            >
              Arkiv Braga RPC
            </a>
          </div>
        </div>
      </section>
    </main>
  );
}

function PitchSection({
  id,
  kicker,
  title,
  children,
}: {
  id: string;
  kicker: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section id={id} className="grid min-h-screen content-center border-zinc-900 border-t px-6 py-24">
      <div className="mx-auto grid w-full max-w-7xl gap-10">
        <div className="grid gap-4">
          <p className="text-emerald-300 text-sm uppercase tracking-[0.22em]">{kicker}</p>
          <h2 className="max-w-5xl font-semibold text-4xl leading-tight md:text-6xl">{title}</h2>
        </div>
        {children}
      </div>
    </section>
  );
}

function Node({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <div className="grid min-h-32 place-items-center gap-3 border border-zinc-800 bg-zinc-950/50 p-4 text-center">
      <span className="text-emerald-300">{icon}</span>
      <span className="font-medium">{label}</span>
    </div>
  );
}

function IconTile({ icon }: { icon: React.ReactNode }) {
  return (
    <div className="grid h-14 w-14 place-items-center rounded-xl border border-zinc-800 bg-zinc-950/60 text-zinc-300">
      {icon}
    </div>
  );
}

function Spec({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <div className="grid place-items-center gap-3 rounded-xl border border-zinc-800 bg-zinc-950/50 px-4 py-6 text-center">
      <span className="text-emerald-300">{icon}</span>
      <span className="font-medium text-sm">{label}</span>
    </div>
  );
}

function ImpactCard({ icon, text }: { icon: React.ReactNode; text: string }) {
  return (
    <div className="grid place-items-center gap-4 rounded-xl border border-zinc-800 bg-zinc-950/50 px-6 py-10 text-center">
      <span className="text-emerald-300">{icon}</span>
      <p className="max-w-xs text-zinc-300 leading-7">{text}</p>
    </div>
  );
}

function Plane({ title, body }: { title: string; body: string }) {
  return (
    <div className="border-zinc-800 border-t py-6">
      <h3 className="font-semibold text-2xl">{title}</h3>
      <p className="mt-4 text-zinc-400 leading-7">{body}</p>
    </div>
  );
}
