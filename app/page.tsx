"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, Filter, RefreshCw } from "lucide-react";
import { fetchSchedule, formatScheduleTimestamp } from "@/lib/artemis-client";
import { BASE_MILESTONES, Milestone, ScheduleResponse, Status } from "@/lib/artemis-data";

function statusTone(status: Status) {
  switch (status) {
    case "completed":
      return "!bg-slate-100 !text-emerald-700 !border-slate-200";
    case "scheduled":
      return "!bg-slate-100 !text-slate-800 !border-slate-200";
    case "changed":
      return "!bg-slate-100 !text-slate-800 !border-slate-200";
    case "canceled":
      return "!bg-slate-100 !text-slate-800 !border-slate-200";
    case "inferred":
      return "!bg-slate-100 !text-slate-800 !border-slate-200";
  }
}

export default function ArtemisMiniAppPrototype() {
  const [milestones, setMilestones] = useState<Milestone[]>(BASE_MILESTONES);
  const [query, setQuery] = useState("");
  const [phase, setPhase] = useState<string>("all");
  const [showOnlyChanges, setShowOnlyChanges] = useState(false);
  const [showOptionalEvents, setShowOptionalEvents] = useState(false);
  const [lastUpdated, setLastUpdated] = useState("Bundled schedule");
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [live, setLive] = useState(false);
  const [refreshError, setRefreshError] = useState<string | null>(null);
  const refreshingRef = useRef(false);
  const refreshDataRef = useRef<() => Promise<void>>(async () => {});

  function applySchedule(data: ScheduleResponse) {
    setMilestones(data.milestones);
    setLastUpdated(formatScheduleTimestamp(data.checkedAt));
    setLive(data.live);
    setRefreshError(null);
  }

  refreshDataRef.current = async () => {
    if (refreshingRef.current) return;

    refreshingRef.current = true;
    setIsRefreshing(true);
    setRefreshError(null);
    console.info("[Artemis schedule] Refresh started");

    try {
      const data = await fetchSchedule();
      applySchedule(data);
      console.info("[Artemis schedule] Refresh succeeded", {
        checkedAt: data.checkedAt,
        live: data.live,
        sourceCount: data.sources.length,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Refresh failed";
      setRefreshError(message);
      console.error("[Artemis schedule] Refresh failed", {
        message,
      });
    } finally {
      refreshingRef.current = false;
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    void refreshDataRef.current();
  }, []);

  const visibleMilestones = useMemo(() => milestones.filter((m) => showOptionalEvents || !m.optional), [milestones, showOptionalEvents]);

  const filtered = useMemo(() => {
    return visibleMilestones.filter((m) => {
      const haystack = [m.title, m.latest, m.baseline, m.source, m.note, m.phase]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      const matchesQuery = !query || haystack.includes(query.toLowerCase());
      const matchesPhase = phase === "all" || m.phase === phase;
      const matchesChange = !showOnlyChanges || ["changed", "canceled", "inferred"].includes(m.status);
      return matchesQuery && matchesPhase && matchesChange;
    });
  }, [visibleMilestones, query, phase, showOnlyChanges]);

  const counts = useMemo(
    () => ({
      completed: visibleMilestones.filter((m) => m.status === "completed").length,
      scheduled: visibleMilestones.filter((m) => m.status === "scheduled").length,
      changed: visibleMilestones.filter((m) => ["changed", "canceled", "inferred"].includes(m.status)).length,
    }),
    [visibleMilestones]
  );

  return (
    <div className="min-h-screen bg-white p-4 md:p-8">
      <div className="mx-auto max-w-7xl space-y-6">
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="outline" className="rounded-full">
              Artemis II
            </Badge>
            <Badge variant="outline" className="rounded-full">
              NASA time + UTC
            </Badge>
            <Badge variant="outline" className="rounded-full">
              Baseline vs latest
            </Badge>
          </div>
          <h1 className="text-3xl font-semibold tracking-tight text-slate-900">Artemis II mission schedule</h1>
          <p className="max-w-3xl text-sm leading-6 text-slate-600">
            A simple, shareable view of key mission milestones with NASA time, UTC, baseline plan, latest public status,
            and source freshness.
          </p>
        </div>

        <div className="grid gap-3 md:grid-cols-3">
          <SummaryCard label="Completed" value={counts.completed} />
          <SummaryCard label="Upcoming" value={counts.scheduled} />
          <SummaryCard label="Changed / inferred" value={counts.changed} />
        </div>

        <Card className="rounded-2xl shadow-sm">
          <CardContent className="flex flex-col gap-3 p-4 pt-4 md:flex-row md:items-center md:justify-between">
            <div className="grid gap-3 text-sm text-slate-600 md:grid-cols-3 md:gap-6">
              <div>
                Last updated: {lastUpdated}
              </div>
              <div>
                Refresh: Manual
              </div>
              <div>
                Data mode: {live ? "Live NASA public sources" : "Bundled fallback schedule"}
              </div>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" className="rounded-full" onClick={() => void refreshDataRef.current()} disabled={isRefreshing}>
                <RefreshCw className={`mr-2 h-4 w-4 ${isRefreshing ? "animate-spin" : ""}`} />
                {isRefreshing ? "Refreshing" : "Refresh"}
              </Button>
            </div>
          </CardContent>
        </Card>

        {refreshError ? (
          <Card className="rounded-2xl shadow-sm">
            <CardContent className="p-4 text-sm text-red-700">{refreshError}</CardContent>
          </Card>
        ) : null}

        <Card className="rounded-2xl shadow-sm">
          <CardHeader className="space-y-4">
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <CardTitle className="text-xl">Milestone table</CardTitle>
              <div className="text-sm text-slate-500">Live schedule from NASA public updates, with bundled fallback data</div>
            </div>

            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div className="relative w-full max-w-md">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search milestones" className="pl-9" />
              </div>

              <div className="flex flex-wrap gap-2">
                {[
                  ["all", "All"],
                  ["launch", "Launch"],
                  ["outbound", "Outbound"],
                  ["lunar", "Lunar"],
                  ["return", "Return"],
                ].map(([value, label]) => (
                  <Button key={value} variant={phase === value ? "default" : "outline"} className="rounded-full" onClick={() => setPhase(value)}>
                    {label}
                  </Button>
                ))}
                <Button
                  variant={showOnlyChanges ? "default" : "outline"}
                  className="rounded-full"
                  onClick={() => setShowOnlyChanges((v) => !v)}
                >
                  <Filter className="mr-2 h-4 w-4" /> Changed only
                </Button>
                <Button
                  variant={showOptionalEvents ? "default" : "outline"}
                  className="rounded-full"
                  onClick={() => setShowOptionalEvents((v) => !v)}
                >
                  {showOptionalEvents ? "Optional events on" : "Show demos / tests"}
                </Button>
              </div>
            </div>

            <div className="rounded-xl bg-slate-50 px-4 py-3 text-sm text-slate-600">
              <span className="font-medium text-slate-900">Reading guide:</span> “Inferred” means the milestone is publicly
              confirmed, but the exact wall-clock timestamp was not published in the source used here.
            </div>
          </CardHeader>

          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1100px] border-separate border-spacing-0 text-sm">
                <thead>
                  <tr className="border-b border-slate-200">
                    <th className="sticky top-0 bg-white px-4 py-3 text-left font-semibold text-slate-900">Milestone</th>
                    <th className="sticky top-0 bg-white px-4 py-3 text-left font-semibold text-slate-900">Status</th>
                    <th className="sticky top-0 bg-white px-4 py-3 text-left font-semibold text-slate-900">NASA time</th>
                    <th className="sticky top-0 bg-white px-4 py-3 text-left font-semibold text-slate-900">UTC</th>
                    <th className="sticky top-0 bg-white px-4 py-3 text-left font-semibold text-slate-900">Baseline plan</th>
                    <th className="sticky top-0 bg-white px-4 py-3 text-left font-semibold text-slate-900">Latest public status</th>
                    <th className="sticky top-0 bg-white px-4 py-3 text-left font-semibold text-slate-900">Source freshness</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((m) => (
                    <tr key={m.id} className="align-top odd:bg-slate-50/60">
                      <td className="border-t border-slate-200 px-4 py-4">
                        <div className="font-medium text-slate-900">{m.title}</div>
                        <div className="mt-1 text-xs uppercase tracking-wide text-slate-500">{m.phase}</div>
                        {m.note ? <div className="mt-2 text-xs text-slate-500">{m.note}</div> : null}
                      </td>
                      <td className="border-t border-slate-200 px-4 py-4">
                        <div className="flex flex-col gap-2">
                          <Badge variant="outline" className={`w-fit rounded-full ${statusTone(m.status)}`}>
                            {m.status}
                          </Badge>
                          <span className="text-xs text-slate-500">{m.confidence} confidence</span>
                        </div>
                      </td>
                      <td className="border-t border-slate-200 px-4 py-4 text-slate-700">{m.edt || "—"}</td>
                      <td className="border-t border-slate-200 px-4 py-4 text-slate-700">{m.utc || "—"}</td>
                      <td className="border-t border-slate-200 px-4 py-4 text-slate-700">{m.baseline || "—"}</td>
                      <td className="border-t border-slate-200 px-4 py-4 text-slate-700">{m.latest || "—"}</td>
                      <td className="border-t border-slate-200 px-4 py-4">
                        <div className="text-slate-900">{m.source}</div>
                        <div className="mt-1 text-xs text-slate-500">{m.sourceFreshness}</div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function SummaryCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-5">
      <div className="text-sm text-slate-500">{label}</div>
      <div className="mt-1 text-3xl font-semibold text-slate-900">{value}</div>
    </div>
  );
}
