export type Status = "completed" | "scheduled" | "changed" | "canceled" | "inferred";

export type MilestoneTimeSpec =
  | {
      kind: "instant";
      instantUtc: string;
      approximate?: boolean;
    }
  | {
      kind: "range";
      startUtc: string;
      endUtc: string;
      approximate?: boolean;
    };

export type Milestone = {
  id: string;
  title: string;
  phase: "launch" | "outbound" | "lunar" | "return";
  optional?: boolean;
  optionalKind?: "demo" | "test";
  status: Status;
  edt?: string;
  timeSpec?: MilestoneTimeSpec;
  baseline?: string;
  latest?: string;
  latestDetail?: string;
  /** Literal phrase matched against the NASA coverage page to confirm this milestone. */
  coveragePhrase?: string;
  /**
   * latestDetail to set when the coverage phrase is found and the milestone time has passed.
   * Defaults to "confirmed on NASA coverage page; exact time not posted" when absent.
   */
  coverageCompletedDetail?: string;
  /**
   * Keywords used to detect this milestone in NASA blog posts.
   * When absent, derived automatically from the milestone title.
   * Override when the title terms don't match how NASA writes about the event in blogs
   * (e.g. "first outbound trajectory correction" rather than "outbound trajectory correction-1").
   */
  blogKeywords?: string[];
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
    timeSpec: { kind: "instant", instantUtc: "2026-04-01T22:35:00Z" },
    baseline: "Launch window opened 6:24 PM EDT",
    latestDetail: "at 6:35 PM EDT",
    blogKeywords: ["liftoff", "lifted off", "launched"],
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
    timeSpec: { kind: "instant", instantUtc: "2026-04-01T23:24:00Z", approximate: true },
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
    timeSpec: { kind: "instant", instantUtc: "2026-04-02T00:24:00Z", approximate: true },
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
    timeSpec: { kind: "instant", instantUtc: "2026-04-02T01:35:00Z", approximate: true },
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
    edt: "Apr 2, 12:00 AM-11:59 AM EDT",
    // Product convention: "Early" maps to the first half of the NASA day.
    timeSpec: {
      kind: "range",
      startUtc: "2026-04-02T04:00:00Z",
      endUtc: "2026-04-02T15:59:00Z",
    },
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
    timeSpec: { kind: "instant", instantUtc: "2026-04-02T23:49:00Z" },
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
    edt: "Apr 3, 12:00 PM-11:59 PM EDT",
    // Product convention: "second half of day" maps to 12:00 PM-11:59 PM NASA time.
    timeSpec: {
      kind: "range",
      startUtc: "2026-04-03T16:00:00Z",
      endUtc: "2026-04-04T03:59:00Z",
    },
    baseline: "Scheduled during Flight Day 3",
    latestDetail: "emergency comms test and optical link activity publicly confirmed, exact wall-clock time not posted",
    blogKeywords: ["emergency communications system", "optical link", "optical communications"],
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
    timeSpec: { kind: "instant", instantUtc: "2026-04-03T22:49:00Z" },
    baseline: "Planned burn",
    latestDetail: "Orion already on the right path",
    blogKeywords: ["outbound trajectory correction-1", "otc-1", "first outbound trajectory correction"],
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
    timeSpec: { kind: "instant", instantUtc: "2026-04-04T23:49:00Z" },
    baseline: "Planned burn",
    coveragePhrase: "Outbound trajectory correction-2 burn",
    coverageCompletedDetail: "burn confirmed on NASA coverage page; exact time not posted",
    blogKeywords: ["outbound trajectory correction-2", "otc-2", "second outbound trajectory correction"],
    source: "Coverage page",
    sourceFreshness: "Updated Apr 3",
    confidence: "high",
  },
  {
    id: "manual-piloting-demo",
    title: "Manual Piloting Demonstration",
    phase: "outbound",
    optional: true,
    optionalKind: "demo",
    status: "completed",
    edt: "Apr 4, 9:09 PM EDT",
    timeSpec: { kind: "instant", instantUtc: "2026-04-05T01:09:00Z" },
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
    optionalKind: "test",
    status: "scheduled",
    edt: "Apr 5, 2:20 PM EDT",
    timeSpec: { kind: "instant", instantUtc: "2026-04-05T18:20:00Z" },
    baseline: "Detailed flight test objective",
    coveragePhrase: "Orion Crew Survival System Suit detailed flight test objectives",
    coverageCompletedDetail: "test confirmed on NASA coverage page; exact time not posted",
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
    timeSpec: { kind: "instant", instantUtc: "2026-04-06T03:03:00Z" },
    baseline: "Planned burn",
    coveragePhrase: "Outbound trajectory correction-3 burn",
    coverageCompletedDetail: "burn confirmed on NASA coverage page; exact time not posted",
    blogKeywords: ["outbound trajectory correction-3", "otc-3", "third outbound trajectory correction"],
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
    timeSpec: { kind: "instant", instantUtc: "2026-04-06T04:41:00Z" },
    baseline: "Planned",
    coveragePhrase: "Orion enters lunar sphere of influence",
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
    timeSpec: { kind: "instant", instantUtc: "2026-04-06T23:02:00Z" },
    baseline: "Planned",
    coveragePhrase: "Closest approach to the Moon",
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
    timeSpec: { kind: "instant", instantUtc: "2026-04-06T23:05:00Z" },
    baseline: "Planned",
    coveragePhrase: "Maximum distance from Earth",
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
    timeSpec: { kind: "instant", instantUtc: "2026-04-07T17:28:00Z" },
    baseline: "Planned",
    coveragePhrase: "Orion departs lunar sphere of influence",
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
    timeSpec: { kind: "instant", instantUtc: "2026-04-08T01:03:00Z" },
    baseline: "Planned",
    coveragePhrase: "Return trajectory correction-1 burn",
    coverageCompletedDetail: "burn confirmed on NASA coverage page; exact time not posted",
    blogKeywords: ["return trajectory correction-1", "rtc-1", "first return trajectory correction"],
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
    timeSpec: { kind: "instant", instantUtc: "2026-04-10T02:53:00Z" },
    baseline: "Planned",
    coveragePhrase: "Return trajectory correction-2 burn",
    coverageCompletedDetail: "burn confirmed on NASA coverage page; exact time not posted",
    blogKeywords: ["return trajectory correction-2", "rtc-2", "second return trajectory correction"],
    source: "Coverage page",
    sourceFreshness: "Updated Apr 3",
    confidence: "high",
  },
  {
    id: "radiation-shield-demo",
    title: "Radiation Shielding Deployment Demo",
    phase: "return",
    optional: true,
    optionalKind: "demo",
    status: "scheduled",
    edt: "Apr 8, 8:15 PM EDT",
    timeSpec: { kind: "instant", instantUtc: "2026-04-09T00:15:00Z" },
    baseline: "Planned flight demonstration",
    coveragePhrase: "Radiation shielding deployment demonstration",
    coverageCompletedDetail: "demo confirmed on NASA coverage page; exact time not posted",
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
    timeSpec: { kind: "instant", instantUtc: "2026-04-10T18:53:00Z" },
    baseline: "Planned",
    coveragePhrase: "Return trajectory correction-3 burn",
    coverageCompletedDetail: "burn confirmed on NASA coverage page; exact time not posted",
    blogKeywords: ["return trajectory correction-3", "rtc-3", "third return trajectory correction"],
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
    timeSpec: { kind: "instant", instantUtc: "2026-04-10T23:53:00Z" },
    baseline: "Planned",
    coveragePhrase: "Entry interface",
    // "entry interface" appears in pre-entry planning docs; use phrasing that confirms the event.
    blogKeywords: ["reached entry interface", "entry interface at", "entered the atmosphere"],
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
    timeSpec: { kind: "instant", instantUtc: "2026-04-11T00:07:00Z" },
    baseline: "Planned",
    coveragePhrase: "Splashdown",
    // "splashdown" as a noun appears throughout mission docs ("after splashdown", "during splashdown").
    // Use past-tense verb forms that only appear when the event actually occurred.
    blogKeywords: ["splashed down", "orion splashed", "crew has splashed", "spacecraft splashed"],
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

function formatMonthDay(date: Date, timeZone: string) {
  return new Intl.DateTimeFormat("en-US", {
    timeZone,
    month: "short",
    day: "numeric",
  }).format(date);
}

function formatExactTime(date: Date, timeZone: string) {
  return new Intl.DateTimeFormat("en-US", {
    timeZone,
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
    timeZoneName: "short",
  }).format(date);
}

function formatTimeOnly(date: Date, timeZone: string) {
  return new Intl.DateTimeFormat("en-US", {
    timeZone,
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
    timeZoneName: "short",
  }).format(date);
}

export function formatMilestoneTimeInZone(timeSpec: MilestoneTimeSpec | undefined, timeZone = "UTC") {
  if (!timeSpec) {
    return "—";
  }

  if (timeSpec.kind === "instant") {
    const formatted = formatExactTime(new Date(timeSpec.instantUtc), timeZone);
    return timeSpec.approximate ? `~${formatted}` : formatted;
  }

  if (timeSpec.kind === "range") {
    const start = new Date(timeSpec.startUtc);
    const end = new Date(timeSpec.endUtc);
    const startDate = formatMonthDay(start, timeZone);
    const endDate = formatMonthDay(end, timeZone);

    if (startDate === endDate) {
      const formatted = `${startDate}, ${formatTimeOnly(start, timeZone)}-${formatTimeOnly(end, timeZone)}`;
      return timeSpec.approximate ? `~${formatted}` : formatted;
    }

    const formatted = `${formatExactTime(start, timeZone)}-${formatExactTime(end, timeZone)}`;
    return timeSpec.approximate ? `~${formatted}` : formatted;
  }
}
