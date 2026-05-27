export type Submission = {
  id: string;
  rawTx: string;
  txHash: string;
  from: string;
  chainId: number;
  status: "received" | "queued" | "submitted" | "confirmed" | "failed";
  createdAt: string;
  submitAfter?: number;
  auditEntityKey?: string;
  auditTxHash?: string;
  error?: string;
};

export type ArkivAuditRecord = {
  key: string;
  value: string;
};

export type SubmissionsResponse = {
  local: Submission[];
  arkiv: ArkivAuditRecord[];
  arkivError?: string;
};

export const groundStationBaseUrl =
  process.env.NEXT_PUBLIC_GROUND_STATION_URL?.replace(/\/$/, "") ?? "http://localhost:8787";

export async function fetchSubmissions(query?: string): Promise<SubmissionsResponse> {
  const url = new URL("/submissions", groundStationBaseUrl);
  if (query) url.searchParams.set("query", query);
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Ground station returned HTTP ${response.status}`);
  return response.json() as Promise<SubmissionsResponse>;
}

export function eventSourceUrl(): string {
  return new URL("/events", groundStationBaseUrl).toString();
}
