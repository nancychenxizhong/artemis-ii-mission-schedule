import { ScheduleResponse } from "./artemis-data";

type FetchJsonResponse = {
  ok: boolean;
  status: number;
  json(): Promise<ScheduleResponse>;
};

type FetchLike = (input: string, init?: RequestInit) => Promise<FetchJsonResponse>;

export async function fetchSchedule(fetchImpl: FetchLike = fetch as FetchLike): Promise<ScheduleResponse> {
  const response = await fetchImpl("/api/artemis-schedule", {
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(`Schedule refresh failed with HTTP ${response.status}`);
  }

  return response.json();
}

export function formatScheduleTimestamp(isoTimestamp: string): string {
  const parsed = new Date(isoTimestamp);

  if (Number.isNaN(parsed.getTime())) {
    return isoTimestamp;
  }

  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(parsed);
}
