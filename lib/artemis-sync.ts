import { BASE_MILESTONES, Milestone, ScheduleResponse, SourceCheck } from "./artemis-data";

const COVERAGE_URL = "https://www.nasa.gov/missions/artemis/artemis-2/nasa-sets-coverage-for-artemis-ii-moon-mission/";
const DAILY_AGENDA_URL = "https://www.nasa.gov/missions/artemis/nasas-artemis-ii-moon-mission-daily-agenda/";
const NEWS_UPDATES_URL = "https://www.nasa.gov/artemis-ii-news-and-updates/";
const OTC1_UPDATE_URL = "https://www.nasa.gov/blogs/missions/2026/04/03/artemis-ii-flight-day-3-outbound-trajectory-correction-burn-update/";
const FLIGHT_DAY3_URL = "https://www.nasa.gov/blogs/missions/2026/04/04/artemis-ii-flight-day-3-crew-prepares-cabin-for-lunar-flyby/";
const TLI_URL = "https://www.nasa.gov/blogs/missions/2026/04/02/artemis-ii-flight-day-2-orion-completes-tli-burn-crew-begins-journey-to-the-moon/";
const LAUNCH_DAY_URL = "https://www.nasa.gov/blogs/missions/2026/04/01/live-artemis-ii-launch-day-updates/";

type PageResult = {
  url: string;
  ok: boolean;
  status?: number;
  html?: string;
  text?: string;
  note?: string;
};

type FetchResponseLike = {
  ok: boolean;
  status: number;
  text(): Promise<string>;
};

type FetchLike = (input: string, init?: RequestInit) => Promise<FetchResponseLike>;

type BuildScheduleDeps = {
  fetchImpl?: FetchLike;
  now?: () => Date;
};

function cloneMilestones(): Milestone[] {
  return JSON.parse(JSON.stringify(BASE_MILESTONES)) as Milestone[];
}

function stripHtml(html: string) {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&#8217;/g, "'")
    .replace(/&#8211;/g, "-")
    .replace(/\s+/g, " ")
    .trim();
}

function extractFreshness(html: string, fallback: string) {
  const patterns = [
    /Published:\s*([^<\n]+)/i,
    /Updated:\s*([^<\n]+)/i,
    /article:published_time"\s+content="([^"]+)"/i,
    /article:modified_time"\s+content="([^"]+)"/i,
    /([A-Z][a-z]+\s+\d{1,2},\s+\d{4}\s+\d{1,2}:\d{2}\s*[AP]M)/,
  ];

  for (const pattern of patterns) {
    const match = html.match(pattern);
    if (match?.[1]) {
      return match[1].replace(/\s+/g, " ").trim();
    }
  }

  return fallback;
}

async function fetchPage(url: string, fetchImpl: FetchLike): Promise<PageResult> {
  try {
    const response = await fetchImpl(url, {
      cache: "no-store",
      headers: {
        "user-agent": "Mozilla/5.0 ArtemisScheduleApp/1.0",
        accept: "text/html,application/xhtml+xml",
      },
    });

    const html = await response.text();
    return {
      url,
      ok: response.ok,
      status: response.status,
      html,
      text: stripHtml(html),
      note: response.ok ? undefined : `HTTP ${response.status}`,
    };
  } catch (error) {
    return {
      url,
      ok: false,
      note: error instanceof Error ? error.message : "Unknown fetch error",
    };
  }
}

function setManyFreshness(milestones: Milestone[], ids: string[], freshness: string) {
  for (const id of ids) {
    const milestone = milestones.find((item) => item.id === id);
    if (milestone) {
      milestone.sourceFreshness = freshness;
    }
  }
}

function updateCoverageMilestones(milestones: Milestone[], page: PageResult) {
  if (!page.ok || !page.html || !page.text) return;

  const freshness = extractFreshness(page.html, "Checked live from coverage page");
  setManyFreshness(
    milestones,
    ["otc2", "otc3", "soi-in", "closest-approach", "max-distance", "soi-out", "rtc1", "rtc2", "rtc3", "entry-interface", "splashdown"],
    freshness
  );

  const lineChecks: Array<{ id: string; phrase: string }> = [
    { id: "otc2", phrase: "Outbound trajectory correction-2 burn" },
    { id: "otc3", phrase: "Outbound trajectory correction-3 burn" },
    { id: "soi-in", phrase: "Orion enters lunar sphere of influence" },
    { id: "closest-approach", phrase: "Closest approach to the Moon" },
    { id: "max-distance", phrase: "Maximum distance from Earth" },
    { id: "soi-out", phrase: "Orion departs lunar sphere of influence" },
    { id: "rtc1", phrase: "Return trajectory correction-1 burn" },
    { id: "rtc2", phrase: "Return trajectory correction-2 burn" },
    { id: "rtc3", phrase: "Return trajectory correction-3 burn" },
    { id: "entry-interface", phrase: "Entry interface" },
    { id: "splashdown", phrase: "Splashdown" },
  ];

  for (const item of lineChecks) {
    const milestone = milestones.find((row) => row.id === item.id);
    if (!milestone) continue;
    if (page.text.includes(item.phrase)) {
      milestone.latest = "Scheduled";
    }
  }
}

function updateOtc1(milestones: Milestone[], page: PageResult) {
  if (!page.ok || !page.text || !page.html) return;
  const milestone = milestones.find((row) => row.id === "otc1");
  if (!milestone) return;
  const freshness = extractFreshness(page.html, "Checked live from OTC-1 update");
  milestone.sourceFreshness = freshness;
  if (/cancel(?:ed)?\s+the\s+spacecraft'?s\s+first\s+outbound\s+trajectory\s+correction\s+burn/i.test(page.text)) {
    milestone.status = "canceled";
    milestone.latest = "Canceled; Orion already on the right flight path";
  }
}

function updateCommsTest(milestones: Milestone[], page: PageResult) {
  if (!page.ok || !page.text || !page.html) return;
  const milestone = milestones.find((row) => row.id === "comms-test");
  if (!milestone) return;
  milestone.sourceFreshness = extractFreshness(page.html, "Checked live from Flight Day 3 update");
  if (/testing\s+the\s+spacecraft'?s\s+emergency\s+communications\s+system/i.test(page.text)) {
    milestone.latest = "Emergency communications system testing confirmed in deep space";
  }
}

function updateTli(milestones: Milestone[], page: PageResult) {
  if (!page.ok || !page.text || !page.html) return;
  const milestone = milestones.find((row) => row.id === "tli");
  if (!milestone) return;
  milestone.sourceFreshness = extractFreshness(page.html, "Checked live from TLI update");
  if (/completes?\s+TLI\s+burn|translunar\s+injection\s+burn/i.test(page.text)) {
    milestone.status = "completed";
    milestone.latest = "Completed; crew began journey to the Moon";
  }
}

function updateLaunch(milestones: Milestone[], page: PageResult) {
  if (!page.ok || !page.text || !page.html) return;
  const milestone = milestones.find((row) => row.id === "launch");
  if (!milestone) return;
  milestone.sourceFreshness = extractFreshness(page.html, "Checked live from launch-day updates");
  if (/Live launch day updates/i.test(page.text)) {
    milestone.latest = "Completed at 6:35 PM EDT";
  }
}

function updateDailyAgendaBackfill(milestones: Milestone[], page: PageResult) {
  if (!page.ok || !page.html) return;
  const freshness = extractFreshness(page.html, "Checked live from Daily Agenda");
  setManyFreshness(milestones, ["perigee-raise-icps", "apogee-raise", "proximity-ops"], freshness);
}

function makeSourceCheck(name: string, page: PageResult, now: () => Date): SourceCheck {
  return {
    name,
    url: page.url,
    ok: page.ok,
    checkedAt: now().toISOString(),
    note: page.ok ? page.note : page.note ?? (page.status ? `HTTP ${page.status}` : "Fetch failed"),
  };
}

export async function buildScheduleWithDeps({
  fetchImpl = fetch as FetchLike,
  now = () => new Date(),
}: BuildScheduleDeps = {}): Promise<ScheduleResponse> {
  const checkedAt = now().toISOString();
  const milestones = cloneMilestones();

  const [coverage, dailyAgenda, newsUpdates, otc1, flightDay3, tli, launchDay] = await Promise.all([
    fetchPage(COVERAGE_URL, fetchImpl),
    fetchPage(DAILY_AGENDA_URL, fetchImpl),
    fetchPage(NEWS_UPDATES_URL, fetchImpl),
    fetchPage(OTC1_UPDATE_URL, fetchImpl),
    fetchPage(FLIGHT_DAY3_URL, fetchImpl),
    fetchPage(TLI_URL, fetchImpl),
    fetchPage(LAUNCH_DAY_URL, fetchImpl),
  ]);

  updateCoverageMilestones(milestones, coverage);
  updateDailyAgendaBackfill(milestones, dailyAgenda);
  updateOtc1(milestones, otc1);
  updateCommsTest(milestones, flightDay3);
  updateTli(milestones, tli);
  updateLaunch(milestones, launchDay);

  const sources = [
    makeSourceCheck("Coverage page", coverage, now),
    makeSourceCheck("Daily Agenda", dailyAgenda, now),
    makeSourceCheck("Artemis II News and Updates", newsUpdates, now),
    makeSourceCheck("OTC-1 update", otc1, now),
    makeSourceCheck("Flight Day 3 update", flightDay3, now),
    makeSourceCheck("TLI update", tli, now),
    makeSourceCheck("Launch day updates", launchDay, now),
  ];

  const liveCount = sources.filter((source) => source.ok).length;
  const live = liveCount > 0;
  const syncMessage = live
    ? `Live NASA sync succeeded for ${liveCount}/${sources.length} sources.`
    : "Live NASA sync failed. Showing bundled fallback schedule.";

  return {
    milestones,
    checkedAt,
    live,
    syncMessage,
    sources,
  };
}

export async function buildSchedule(): Promise<ScheduleResponse> {
  return buildScheduleWithDeps();
}
