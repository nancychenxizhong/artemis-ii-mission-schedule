export type Status = "completed" | "scheduled" | "changed" | "canceled" | "inferred";

export type Milestone = {
  id: string;
  title: string;
  phase: "launch" | "outbound" | "lunar" | "return";
  optional?: boolean;
  status: Status;
  edt?: string;
  utc?: string;
  baseline?: string;
  latest?: string;
  latestDetail?: string;
  note?: string;
  source: string;
  sourceFreshness: string;
  confidence: "high" | "medium" | "low";
};

export type SourceCheck = {
  name: string;
  url: string;
  ok: boolean;
  checkedAt: string;
  note?: string;
};

export type ScheduleResponse = {
  milestones: Milestone[];
  checkedAt: string;
  live: boolean;
  syncMessage: string;
  sources: SourceCheck[];
};

export const BASE_MILESTONES: Milestone[] = [
  {
    id: "launch",
    title: "Liftoff",
    phase: "launch",
    status: "completed",
    edt: "Apr 1, 6:35 PM EDT",
    utc: "Apr 1, 10:35 PM UTC",
    baseline: "Launch window opened 6:24 PM EDT",
    latestDetail: "at 6:35 PM EDT",
    source: "Launch day live updates",
    sourceFreshness: "Apr 1–2",
    confidence: "high",
  },
  {
    id: "perigee-raise-icps",
    title: "Perigee Raise Maneuver (ICPS)",
    phase: "launch",
    status: "completed",
    edt: "~Apr 1, 7:24 PM EDT",
    utc: "~Apr 1, 11:24 PM UTC",
    baseline: "About 49 minutes after launch",
    latestDetail: "public post confirms milestone, not exact event timestamp",
    note: "Estimated from relative timing in NASA planning docs.",
    source: "Daily Agenda + mission update",
    sourceFreshness: "Mar 13 baseline / Apr 1 update",
    confidence: "medium",
  },
  {
    id: "apogee-raise",
    title: "Apogee Raise Burn",
    phase: "launch",
    status: "completed",
    edt: "~Apr 1, 8:24 PM EDT",
    utc: "~Apr 2, 12:24 AM UTC",
    baseline: "About an hour after perigee raise",
    latestDetail: "exact timestamp not publicly surfaced",
    source: "Daily Agenda + mission update",
    sourceFreshness: "Mar 13 baseline / Apr 1 update",
    confidence: "medium",
  },
  {
    id: "proximity-ops",
    title: "Proximity Operations Demo",
    phase: "launch",
    status: "completed",
    edt: "~Apr 1, 9:35 PM EDT",
    utc: "~Apr 2, 1:35 AM UTC",
    baseline: "Around 3 hours into the mission",
    latestDetail: "duration publicly described, exact start/end time not pinned down",
    source: "Daily Agenda + mission update",
    sourceFreshness: "Mar 13 baseline / Apr 1–2 update",
    confidence: "medium",
  },
  {
    id: "perigee-raise-orion",
    title: "Perigee Raise Burn (Orion)",
    phase: "outbound",
    status: "completed",
    edt: "Early Apr 2",
    utc: "Early Apr 2",
    baseline: "Flight Day 2 morning sequence",
    latestDetail: "exact burn clock time not publicly timestamped",
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
    latestDetail: "at scheduled time",
    source: "TLI mission update",
    sourceFreshness: "Apr 2",
    confidence: "high",
  },
  {
    id: "comms-test",
    title: "Emergency + Optical Comms Testing",
    phase: "outbound",
    status: "completed",
    edt: "Apr 3, second half of day",
    utc: "Apr 3, second half of day +4h",
    baseline: "Scheduled during Flight Day 3",
    latestDetail: "emergency comms test and optical link activity publicly confirmed, exact wall-clock time not posted",
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
    latestDetail: "Orion already on the right path",
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
    source: "Coverage page",
    sourceFreshness: "Updated Apr 3",
    confidence: "high",
  },
  {
    id: "manual-piloting-demo",
    title: "Manual Piloting Demonstration",
    phase: "outbound",
    optional: true,
    status: "completed",
    edt: "Apr 4, 9:09 PM EDT",
    utc: "Apr 5, 1:09 AM UTC",
    baseline: "Flight Day 4 deep-space piloting objective",
    latestDetail: "crew manually piloted Orion for 41 minutes in deep space",
    source: "Flight Day 4 update",
    sourceFreshness: "Apr 4",
    confidence: "high",
  },
  {
    id: "crew-suit-test",
    title: "Crew Survival System Suit Flight Test",
    phase: "outbound",
    optional: true,
    status: "scheduled",
    edt: "Apr 5, 2:20 PM EDT",
    utc: "Apr 5, 6:20 PM UTC",
    baseline: "Detailed flight test objective",
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
    source: "Coverage page",
    sourceFreshness: "Updated Apr 3",
    confidence: "high",
  },
  {
    id: "radiation-shield-demo",
    title: "Radiation Shielding Deployment Demo",
    phase: "return",
    optional: true,
    status: "scheduled",
    edt: "Apr 8, 8:15 PM EDT",
    utc: "Apr 9, 12:15 AM UTC",
    baseline: "Planned flight demonstration",
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
    source: "Coverage page",
    sourceFreshness: "Updated Apr 3",
    confidence: "high",
  },
];

export function cloneBaseMilestones(): Milestone[] {
  return JSON.parse(JSON.stringify(BASE_MILESTONES)) as Milestone[];
}

export function formatLatest(status: Status, latestDetail?: string) {
  if (status === "scheduled" && !latestDetail) {
    return "Scheduled";
  }

  const statusLabel = status.charAt(0).toUpperCase() + status.slice(1);
  if (!latestDetail) {
    return statusLabel;
  }

  if (/^(at|during)\b/i.test(latestDetail)) {
    return `${statusLabel} ${latestDetail}`;
  }

  return `${statusLabel}; ${latestDetail}`;
}

export function finalizeMilestoneLatest(milestones: Milestone[]) {
  for (const milestone of milestones) {
    milestone.latest = formatLatest(milestone.status, milestone.latestDetail);
  }

  return milestones;
}

export function createBundledMilestones() {
  return finalizeMilestoneLatest(cloneBaseMilestones());
}
