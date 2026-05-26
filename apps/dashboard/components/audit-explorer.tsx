"use client";

import { useQuery } from "@tanstack/react-query";
import { Database, Search } from "lucide-react";
import { useState } from "react";
import { fetchSubmissions } from "../lib/ground-station";
import { Button } from "./ui/button";

function short(value: string, head = 14, tail = 8) {
  if (value.length <= head + tail) return value;
  return `${value.slice(0, head)}...${value.slice(-tail)}`;
}

export function AuditExplorer() {
  const [query, setQuery] = useState('project="espresso-ns05-arkiv" && kind="submission"');
  const [activeQuery, setActiveQuery] = useState(query);
  const { data, isFetching, error } = useQuery({
    queryKey: ["audit", activeQuery],
    queryFn: () => fetchSubmissions(activeQuery),
  });

  return (
    <section className="grid gap-4 border-zinc-800 border-t py-4">
      <div className="flex items-center gap-3">
        <Database className="text-emerald-300" size={18} />
        <div>
          <h2 className="font-semibold text-base">Arkiv audit log</h2>
          <p className="text-sm text-zinc-500">{data?.arkiv.length ?? 0} matching entities</p>
        </div>
      </div>

      <form
        className="flex flex-col gap-2 sm:flex-row"
        onSubmit={(event) => {
          event.preventDefault();
          setActiveQuery(query);
        }}
      >
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          className="min-h-9 flex-1 rounded-md border border-zinc-800 bg-zinc-950 px-3 font-mono text-sm text-zinc-100 outline-none transition-colors focus:border-emerald-400"
          aria-label="Arkiv query"
        />
        <Button type="submit" disabled={isFetching}>
          <Search size={16} />
          Query
        </Button>
      </form>

      <div className="divide-y divide-zinc-900 border-zinc-800 border-t">
        {error ? <div className="py-4 text-red-300 text-sm">{(error as Error).message}</div> : null}
        {data?.arkiv.map((record) => (
          <div key={record.key} className="grid gap-1 py-3 text-sm">
            <span className="font-mono text-zinc-200">{short(record.key, 18, 12)}</span>
            <span className="font-mono text-zinc-500">{short(record.value, 28, 18)}</span>
          </div>
        ))}
        {data && data.arkiv.length === 0 ? (
          <div className="py-8 text-center text-sm text-zinc-500">No audit entities matched</div>
        ) : null}
      </div>
    </section>
  );
}
