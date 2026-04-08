import { Milestone, ScheduleResponse, SourceCheck, cloneBaseMilestones, finalizeMilestoneLatest } from "./artemis-data";

const COVERAGE_URL = "https://www.nasa.gov/missions/artemis/artemis-2/nasa-sets-coverage-for-artemis-ii-moon-mission/";
const DAILY_AGENDA_URL = "https://www.nasa.gov/missions/artemis/nasas-artemis-ii-moon-mission-daily-agenda/";
const MISSION_PAGE_URL = "https://www.nasa.gov/mission/artemis-ii/";
const NEWS_UPDATES_URL = "https://www.nasa.gov/artemis-ii-news-and-updates/";
const MEDIA_RESOURCES_URL = "https://www.nasa.gov/artemis-ii-media-resources/";

const FALLBACK_BLOG_URLS = [
  "https://www.nasa.gov/blogs/missions/2026/04/04/artemis-ii-flight-day-4-crew-completes-manual-piloting-demonstration/",
  "https://www.nasa.gov/blogs/missions/2026/04/04/artemis-ii-flight-day-4-deep-space-flying-lunar-flyby-prep/",
  "https://www.nasa.gov/blogs/missions/2026/04/03/artemis-ii-flight-day-3-outbound-trajectory-correction-burn-update/",
  "https://www.nasa.gov/blogs/missions/2026/04/04/artemis-ii-flight-day-3-crew-prepares-cabin-for-lunar-flyby/",
  "https://www.nasa.gov/blogs/missions/2026/04/02/artemis-ii-flight-day-2-orion-completes-tli-burn-crew-begins-journey-to-the-moon/",
  "https://www.nasa.gov/blogs/missions/2026/04/01/live-artemis-ii-launch-day-updates/",
] as const;

const MAX_DISCOVERED_BLOGS = 6;

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

function decodeHtmlEntities(value: string) {
  return value
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#x27;/g, "'")
    .replace(/&nbsp;/g, " ");
}

function toAbsoluteNasaUrl(href: string) {
  const decoded = decodeHtmlEntities(href.trim());

  if (!decoded) return null;
  if (decoded.startsWith("http://") || decoded.startsWith("https://")) {
    return decoded;
  }
  if (decoded.startsWith("//")) {
    return `https:${decoded}`;
  }
  if (decoded.startsWith("/")) {
    return `https://www.nasa.gov${decoded}`;
  }

  return null;
}

function isArtemisMissionBlogUrl(url: string) {
  return /https:\/\/www\.nasa\.gov\/blogs\/missions\/\d{4}\/\d{2}\/\d{2}\/[^"'?#\s]*artemis-ii[^"'?#\s]*/i.test(url);
}

function extractArtemisMissionBlogUrls(html: string) {
  const urls = new Set<string>();
  const hrefPattern = /href=["']([^"']+)["']/gi;

  for (const match of html.matchAll(hrefPattern)) {
    const absoluteUrl = toAbsoluteNasaUrl(match[1] ?? "");
    if (absoluteUrl && isArtemisMissionBlogUrl(absoluteUrl)) {
      urls.add(absoluteUrl);
    }
  }

  return Array.from(urls);
}

function blogUrlTimestamp(url: string) {
  const match = url.match(/\/(\d{4})\/(\d{2})\/(\d{2})\//);
  if (!match) return Number.NEGATIVE_INFINITY;

  const [, year, month, day] = match;
  return Date.UTC(Number(year), Number(month) - 1, Number(day));
}

function selectRecentBlogUrls(urls: Iterable<string>) {
  return Array.from(new Set(urls))
    .sort((left, right) => blogUrlTimestamp(right) - blogUrlTimestamp(left) || right.localeCompare(left))
    .slice(0, MAX_DISCOVERED_BLOGS);
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
    [
      "otc2",
      "otc3",
      "soi-in",
      "closest-approach",
      "max-distance",
      "soi-out",
      "rtc1",
      "rtc2",
      "crew-suit-test",
      "radiation-shield-demo",
      "rtc3",
      "entry-interface",
      "splashdown",
    ],
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
    { id: "crew-suit-test", phrase: "Orion Crew Survival System Suit detailed flight test objectives" },
    { id: "radiation-shield-demo", phrase: "Radiation shielding deployment demonstration" },
    { id: "rtc3", phrase: "Return trajectory correction-3 burn" },
    { id: "entry-interface", phrase: "Entry interface" },
    { id: "splashdown", phrase: "Splashdown" },
  ];

  for (const item of lineChecks) {
    const milestone = milestones.find((row) => row.id === item.id);
    if (!milestone) continue;
    if (page.text.includes(item.phrase)) {
      milestone.status = "scheduled";
      milestone.latestDetail = undefined;
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
    milestone.latestDetail = "Orion already on the right flight path";
  }
}

function updateCommsTest(milestones: Milestone[], page: PageResult) {
  if (!page.ok || !page.text || !page.html) return;
  const milestone = milestones.find((row) => row.id === "comms-test");
  if (!milestone) return;
  milestone.sourceFreshness = extractFreshness(page.html, "Checked live from Flight Day 3 update");
  if (/testing\s+the\s+spacecraft'?s\s+emergency\s+communications\s+system/i.test(page.text)) {
    milestone.status = "completed";
    milestone.latestDetail = "emergency communications system and optical link activity publicly confirmed, exact wall-clock time not posted";
  }
}

function updateTli(milestones: Milestone[], page: PageResult) {
  if (!page.ok || !page.text || !page.html) return;
  const milestone = milestones.find((row) => row.id === "tli");
  if (!milestone) return;
  milestone.sourceFreshness = extractFreshness(page.html, "Checked live from TLI update");
  if (/completes?\s+TLI\s+burn|translunar\s+injection\s+burn/i.test(page.text)) {
    milestone.status = "completed";
    milestone.latestDetail = "crew began journey to the Moon";
  }
}

function updateLaunch(milestones: Milestone[], page: PageResult) {
  if (!page.ok || !page.text || !page.html) return;
  const milestone = milestones.find((row) => row.id === "launch");
  if (!milestone) return;
  milestone.sourceFreshness = extractFreshness(page.html, "Checked live from launch-day updates");
  if (/Live launch day updates/i.test(page.text)) {
    milestone.status = "completed";
    milestone.latestDetail = "at 6:35 PM EDT";
  }
}

function updateDailyAgendaBackfill(milestones: Milestone[], page: PageResult) {
  if (!page.ok || !page.html) return;
  const freshness = extractFreshness(page.html, "Checked live from Daily Agenda");
  setManyFreshness(milestones, ["perigee-raise-icps", "apogee-raise", "proximity-ops"], freshness);
}

function updateManualPilotingDemo(milestones: Milestone[], page: PageResult) {
  if (!page.ok || !page.text || !page.html) return;
  const milestone = milestones.find((row) => row.id === "manual-piloting-demo");
  if (!milestone) return;

  milestone.sourceFreshness = extractFreshness(page.html, "Checked live from Flight Day 4 update");
  if (/manual\s+piloting\s+demonstration|controlling\s+the\s+spacecraft/i.test(page.text)) {
    milestone.status = "completed";
    milestone.latestDetail = "crew manually piloted Orion for 41 minutes in deep space";
  }
}

function inferPastMilestones(milestones: Milestone[], now: Date) {
  const nowMs = now.getTime();
  for (const milestone of milestones) {
    if (milestone.status !== "scheduled") continue;
    if (!milestone.timeSpec) continue;

    const endMs =
      milestone.timeSpec.kind === "instant"
        ? new Date(milestone.timeSpec.instantUtc).getTime()
        : new Date(milestone.timeSpec.endUtc).getTime();

    if (endMs < nowMs) {
      milestone.status = "inferred";
      milestone.latestDetail = "scheduled time has passed; awaiting confirmation";
    }
  }
}

function applyMissionUpdatePage(milestones: Milestone[], page: PageResult) {
  if (!page.ok || !page.text) return;

  const lowerUrl = page.url.toLowerCase();
  const lowerText = page.text.toLowerCase();

  if (lowerUrl.includes("launch-day") || lowerText.includes("live launch day updates")) {
    updateLaunch(milestones, page);
  }

  if (lowerUrl.includes("tli-burn") || /completes?\s+tli\s+burn|translunar\s+injection\s+burn/i.test(page.text)) {
    updateTli(milestones, page);
  }

  if (
    lowerUrl.includes("outbound-trajectory-correction-burn-update") ||
    /outbound\s+trajectory\s+correction\s+burn/i.test(page.text)
  ) {
    updateOtc1(milestones, page);
  }

  if (
    lowerUrl.includes("crew-prepares-cabin-for-lunar-flyby") ||
    /emergency\s+communications\s+system/i.test(page.text) ||
    /optical\s+communications?/i.test(page.text)
  ) {
    updateCommsTest(milestones, page);
  }

  if (
    lowerUrl.includes("manual-piloting-demonstration") ||
    /manual\s+piloting\s+demonstration/i.test(page.text) ||
    /controlling\s+the\s+spacecraft/i.test(page.text)
  ) {
    updateManualPilotingDemo(milestones, page);
  }
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
  const milestones = cloneBaseMilestones();

  const [coverage, dailyAgenda, missionPage, newsUpdates, mediaResources] = await Promise.all([
    fetchPage(COVERAGE_URL, fetchImpl),
    fetchPage(DAILY_AGENDA_URL, fetchImpl),
    fetchPage(MISSION_PAGE_URL, fetchImpl),
    fetchPage(NEWS_UPDATES_URL, fetchImpl),
    fetchPage(MEDIA_RESOURCES_URL, fetchImpl),
  ]);

  const discoveredBlogUrls = selectRecentBlogUrls([
    ...(missionPage.html ? extractArtemisMissionBlogUrls(missionPage.html) : []),
    ...(newsUpdates.html ? extractArtemisMissionBlogUrls(newsUpdates.html) : []),
    ...(mediaResources.html ? extractArtemisMissionBlogUrls(mediaResources.html) : []),
    ...FALLBACK_BLOG_URLS,
  ]);

  const missionUpdatePages = await Promise.all(discoveredBlogUrls.map((url) => fetchPage(url, fetchImpl)));

  updateCoverageMilestones(milestones, coverage);
  updateDailyAgendaBackfill(milestones, dailyAgenda);
  for (const missionUpdatePage of missionUpdatePages) {
    applyMissionUpdatePage(milestones, missionUpdatePage);
  }
  inferPastMilestones(milestones, now());
  finalizeMilestoneLatest(milestones);

  const sources = [
    makeSourceCheck("Coverage page", coverage, now),
    makeSourceCheck("Daily Agenda", dailyAgenda, now),
    makeSourceCheck("Mission page", missionPage, now),
    makeSourceCheck("Artemis II News and Updates", newsUpdates, now),
    makeSourceCheck("Media resources", mediaResources, now),
    ...missionUpdatePages.map((page) => makeSourceCheck(`Mission update: ${page.url.split("/").filter(Boolean).pop() ?? "blog"}`, page, now)),
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
