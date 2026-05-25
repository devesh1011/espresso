"use client";

import { Satellite } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

const links = [
  { href: "/", label: "Home" },
  { href: "/console", label: "Console" },
  { href: "/pitch", label: "Pitch" },
];

export function SiteNav({ actions }: { actions?: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-20 border-zinc-800 border-b bg-zinc-950/80 backdrop-blur">
      <div className="mx-auto grid w-full max-w-7xl grid-cols-[1fr_auto_1fr] items-center gap-4 px-6 py-3">
        <Link href="/" className="flex items-center gap-3">
          <span className="flex h-8 w-8 items-center justify-center rounded-md bg-emerald-400 text-black">
            <Satellite size={16} />
          </span>
          <span className="font-semibold text-zinc-100">Espresso</span>
        </Link>
        <nav className="flex items-center justify-center gap-1 text-sm">
          {links.map((link) => {
            const active = link.href === "/" ? pathname === "/" : pathname.startsWith(link.href);
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`rounded-md px-3 py-1.5 transition-colors ${
                  active
                    ? "bg-emerald-400 font-medium text-black"
                    : "text-zinc-400 hover:bg-zinc-900 hover:text-white"
                }`}
              >
                {link.label}
              </Link>
            );
          })}
        </nav>
        <div className="flex items-center justify-end gap-4">{actions}</div>
      </div>
    </header>
  );
}
