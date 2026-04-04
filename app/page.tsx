"use client";

import React, { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, Filter, RefreshCw } from "lucide-react";

type Status = "completed" | "scheduled" | "changed" | "canceled" | "inferred";

type Milestone = {
  id: string;
  title: string;
  phase: "launch" | "outbound" | "lunar" | "return";
  status: Status;
  edt?: string;
  utc?: string;
  baseline?: string;
  latest?: string;
  note?: string;
  source: string;
  sourceFreshness: string;
  confidence: "high" | "medium" | "low";
};

const milestones: Milestone[] = [
  {
    id: "launch",
    title: "Liftoff",
    phase: "launch",
    status: "completed",
    edt: "Apr 1, 6:35 PM EDT",
    utc: "Apr 1, 10:35 PM UTC",
    baseline: "Launch window opened 6:24 PM EDT",
    latest: "Completed at 6:35 PM EDT",
    source: "Launch day live updates",
    sourceFreshness: "Apr 1–2",
    confidence: "high",
  },
  {
    id: "perigee-raise-icps",
    title: "Perigee Raise Maneuver (ICPS)",
    phase: "launch",
    status: "inferred",
    edt: "~Apr 1, 7:24 PM EDT",
    utc: "~Apr 1, 11:24 PM UTC",
    baseline: "About 49 minutes after launch",
    latest: "Completed; public post confirms milestone, not exact event timestamp",
    note: "Estimated from relative timing in NASA planning docs.",
    source: "Daily Agenda + mission update",
    sourceFreshness: "Mar 13 baseline / Apr 1 update",
    confidence: "medium",
  },
  {
    id: "apogee-raise",
    title: "Apogee Raise Burn",
    phase: "launch",
    status: "inferred",
    edt: "~Apr 1, 8:24 PM EDT",
    utc: "~Apr 2, 12:24 AM UTC",
    baseline: "About an hour after perigee raise",
    latest: "Completed; exact timestamp not publicly surfaced",
    source: "Daily Agenda + mission update",
    sourceFreshness: "Mar 13 baseline / Apr 1 update",
    confidence: "medium",
  },
  {
    id: "proximity-ops",
    title: "Proximity Operations Demo",
    phase: "launch",
    status: "changed",
    edt: "~Apr 1, 9:35 PM EDT",
    utc: "~Apr 2, 1:35 AM UTC",
    baseline: "Around 3 hours into the mission",
    latest: "Completed; duration publicly described, exact start/end time not pinned down",
    source: "Daily Agenda + mission update",
    sourceFreshness: "Mar 13 baseline / Apr 1–2 update",
    confidence: "medium",
  },
  {
    id: "perigee-raise-orion",
    title: "Perigee Raise Burn (Orion)",
    phase: "outbound",
    status: "changed",
    edt: "Early Apr 2",
    utc: "Early Apr 2",
    baseline: "Flight Day 2 morning sequence",
    latest: "Completed; exact burn clock time not publicly timestamped",
    source: "Apr 2 mission update",
    sourceFreshness: "Apr 2",
    confidence: "medium",
  },
  {
    id: "tli",
    title: "Translunar Injection (TLI)",
    phase: "outbound",
    status: "completed",
    edt: "Apr 2, 7:49 PM EDT",
    utc: "Apr 2, 11:49 PM UTC",
    baseline: "Planned 7:49 PM EDT",
    latest: "Completed at scheduled time",
    source: "TLI mission update",
    sourceFreshness: "Apr 2",
    confidence: "high",
  },
  {
    id: "comms-test",
    title: "Emergency + Optical Comms Testing",
    phase: "outbound",
    status: "changed",
    edt: "Apr 3, second half of day",
    utc: "Apr 3, second half of day +4h",
    baseline: "Scheduled during Flight Day 3",
    latest: "Emergency comms test and optical link activity publicly confirmed, exact wall-clock time not posted",
    source: "Flight Day 3 updates",
    sourceFreshness: "Apr 3–4",
    confidence: "medium",
  },
  {
    id: "otc1",
    title: "Outbound Trajectory Correction-1",
    phase: "outbound",
    status: "canceled",
    edt: "Apr 3, 6:49 PM EDT",
    utc: "Apr 3, 10:49 PM UTC",
    baseline: "Planned burn",
    latest: "Canceled; Orion already on the right path",
    source: "OTC-1 update",
    sourceFreshness: "Apr 3",
    confidence: "high",
  },
  {
    id: "otc2",
    title: "Outbound Trajectory Correction-2",
    phase: "outbound",
    status: "scheduled",
    edt: "Apr 4, 7:49 PM EDT",
    utc: "Apr 4, 11:49 PM UTC",
    baseline: "Planned burn",
    latest: "Scheduled",
    source: "Coverage page",
    sourceFreshness: "Updated Apr 3",
    confidence: "high",
  },
  {
    id: "otc3",
    title: "Outbound Trajectory Correction-3",
    phase: "outbound",
    status: "scheduled",
    edt: "Apr 5, 11:03 PM EDT",
    utc: "Apr 6, 3:03 AM UTC",
    baseline: "Planned burn",
    latest: "Scheduled",
    source: "Coverage page",
    sourceFreshness: "Updated Apr 3",
    confidence: "high",
  },
  {
    id: "soi-in",
    title: "Enter Lunar Sphere of Influence",
    phase: "lunar",
    status: "scheduled",
    edt: "Apr 6, 12:41 AM EDT",
    utc: "Apr 6, 4:41 AM UTC",
    baseline: "Planned",
    latest: "Scheduled",
    source: "Coverage page",
    sourceFreshness: "Updated Apr 3",
    confidence: "high",
  },
  {
    id: "closest-approach",
    title: "Closest Approach to the Moon",
    phase: "lunar",
    status: "scheduled",
    edt: "Apr 6, 7:02 PM EDT",
    utc: "Apr 6, 11:02 PM UTC",
    baseline: "Planned",
    latest: "Scheduled",
    source: "Coverage page",
    sourceFreshness: "Updated Apr 3",
    confidence: "high",
  },
  {
    id: "max-distance",
    title: "Maximum Distance from Earth",
    phase: "lunar",
    status: "scheduled",
    edt: "Apr 6, 7:05 PM EDT",
    utc: "Apr 6, 11:05 PM UTC",
    baseline: "Planned",
    latest: "Scheduled",
    source: "Coverage page",
    sourceFreshness: "Updated Apr 3",
    confidence: "high",
  },
  {
    id: "soi-out",
    title: "Exit Lunar Sphere of Influence",
    phase: "return",
    status: "scheduled",
    edt: "Apr 7, 1:28 PM EDT",
    utc: "Apr 7, 5:28 PM UTC",
    baseline: "Planned",
    latest: "Scheduled",
    source: "Coverage page",
    sourceFreshness: "Updated Apr 3",
    confidence: "high",
  },
  {
    id: "rtc1",
    title: "Return Trajectory Correction-1",
    phase: "return",
    status: "scheduled",
    edt: "Apr 7, 9:03 PM EDT",
    utc: "Apr 8, 1:03 AM UTC",
    baseline: "Planned",
    latest: "Scheduled",
    source: "Coverage page",
    sourceFreshness: "Updated Apr 3",
    confidence: "high",
  },
  {
    id: "rtc2",
    title: "Return Trajectory Correction-2",
    phase: "return",
    status: "scheduled",
    edt: "Apr 9, 10:53 PM EDT",
    utc: "Apr 10, 2:53 AM UTC",
    baseline: "Planned",
    latest: "Scheduled",
    source: "Coverage page",
    sourceFreshness: "Updated Apr 3",
    confidence: "high",
  },
  {
    id: "rtc3",
    title: "Return Trajectory Correction-3",
    phase: "return",
    status: "scheduled",
    edt: "Apr 10, 2:53 PM EDT",
    utc: "Apr 10, 6:53 PM UTC",
    baseline: "Planned",
    latest: "Scheduled",
    source: "Coverage page",
    sourceFreshness: "Updated Apr 3",
    confidence: "high",
  },
  {
    id: "entry-interface",
    title: "Entry Interface",
    phase: "return",
    status: "scheduled",
    edt: "Apr 10, 7:53 PM EDT",
    utc: "Apr 10, 11:53 PM UTC",
    baseline: "Planned",
    latest: "Scheduled",
    source: "Coverage page",
    sourceFreshness: "Updated Apr 3",
    confidence: "high",
  },
  {
    id: "splashdown",
    title: "Splashdown",
    phase: "return",
    status: "scheduled",
    edt: "Apr 10, 8:07 PM EDT",
    utc: "Apr 11, 12:07 AM UTC",
    baseline: "Planned",
    latest: "Scheduled",
    source: "Coverage page",
    sourceFreshness: "Updated Apr 3",
    confidence: "high",
  },
];

function statusTone(status: Status) {
  switch (status) {
    case "completed":
      return "bg-green-100 text-green-800 border-green-200";
    case "scheduled":
      return "bg-blue-100 text-blue-800 border-blue-200";
    case "changed":
      return "bg-amber-100 text-amber-800 border-amber-200";
    case "canceled":
      return "bg-red-100 text-red-800 border-red-200";
    case "inferred":
      return "bg-slate-100 text-slate-800 border-slate-200";
  }
}

export default function ArtemisMiniAppPrototype() {
  const [query, setQuery] = useState("");
  const [phase, setPhase] = useState<string>("all");
  const [showOnlyChanges, setShowOnlyChanges] = useState(false);
  const [lastUpdated, setLastUpdated] = useState("Apr 4, 2026 12:00 AM EDT");
  const [autoRefresh, setAutoRefresh] = useState(false);

  useEffect(() => {
    if (!autoRefresh) return;
    const interval = window.setInterval(() => {
      setLastUpdated(new Date().toLocaleString());
    }, 60000);
    return () => window.clearInterval(interval);
  }, [autoRefresh]);

  const filtered = useMemo(() => {
    return milestones.filter((m) => {
      const haystack = [m.title, m.latest, m.baseline, m.source, m.note, m.phase]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      const matchesQuery = !query || haystack.includes(query.toLowerCase());
      const matchesPhase = phase === "all" || m.phase === phase;
      const matchesChange = !showOnlyChanges || ["changed", "canceled", "inferred"].includes(m.status);
      return matchesQuery && matchesPhase && matchesChange;
    });
  }, [query, phase, showOnlyChanges]);

  const counts = useMemo(
    () => ({
      completed: milestones.filter((m) => m.status === "completed").length,
      scheduled: milestones.filter((m) => m.status === "scheduled").length,
      changed: milestones.filter((m) => ["changed", "canceled", "inferred"].includes(m.status)).length,
    }),
    []
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
          <p className="max-w-3xl text-sm text-slate-600">
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
          <CardContent className="flex flex-col gap-3 p-4 md:flex-row md:items-center md:justify-between">
            <div className="grid gap-3 text-sm text-slate-600 md:grid-cols-3 md:gap-6">
              <div>
                <span className="font-medium text-slate-900">Last updated:</span> {lastUpdated}
              </div>
              <div>
                <span className="font-medium text-slate-900">Refresh:</span>{" "}
                {autoRefresh ? "Every 1 min (demo)" : "Manual / static demo"}
              </div>
              <div>
                <span className="font-medium text-slate-900">Data mode:</span> NASA public update demo
              </div>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" className="rounded-full" onClick={() => setLastUpdated(new Date().toLocaleString())}>
                <RefreshCw className="mr-2 h-4 w-4" /> Refresh
              </Button>
              <Button variant={autoRefresh ? "default" : "outline"} className="rounded-full" onClick={() => setAutoRefresh((v) => !v)}>
                {autoRefresh ? "Auto-refresh on" : "Auto-refresh off"}
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-2xl shadow-sm">
          <CardHeader className="space-y-4">
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <CardTitle className="text-xl">Milestone table</CardTitle>
              <div className="text-sm text-slate-500">Demo data from NASA public updates</div>
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
                          <Badge className={`w-fit rounded-full ${statusTone(m.status)}`}>{m.status}</Badge>
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
