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
const MAX_RESPONSE_BYTES = 2 * 1024 * 1024; // 2 MB

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

// TODO: stripHtml is a regex approximation, not a real HTML parser. It handles the common
// entities and tag patterns NASA uses today, but silently produces wrong text on malformed
// markup or entity sequences it doesn't know about. If matching reliability becomes a
// problem, replace with a lightweight parser (e.g. node-html-parser or DOMParser in a
// server context) rather than extending the regex list further.
function stripHtml(html: string) {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&#8217;|&#x2019;|\u2019/g, "'")
    .replace(/&#8216;|&#x2018;|\u2018/g, "'")
    .replace(/&#8211;|&#x2013;|\u2013/g, "-")
    .replace(/&#8212;|&#x2014;|\u2014/g, "-")
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

    const raw = await response.text();
    const html = raw.length > MAX_RESPONSE_BYTES ? raw.slice(0, MAX_RESPONSE_BYTES) : raw;
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

function milestoneEndMs(milestone: Milestone): number | null {
  if (!milestone.timeSpec) return null;
  return milestone.timeSpec.kind === "instant"
    ? new Date(milestone.timeSpec.instantUtc).getTime()
    : new Date(milestone.timeSpec.endUtc).getTime();
}

function updateCoverageMilestones(milestones: Milestone[], page: PageResult, now: Date) {
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

  const lineChecks: Array<{ id: string; phrase: string; completedDetail: string }> = [
    { id: "otc2", phrase: "Outbound trajectory correction-2 burn", completedDetail: "burn confirmed on NASA coverage page; exact time not posted" },
    { id: "otc3", phrase: "Outbound trajectory correction-3 burn", completedDetail: "burn confirmed on NASA coverage page; exact time not posted" },
    { id: "soi-in", phrase: "Orion enters lunar sphere of influence", completedDetail: "confirmed on NASA coverage page; exact time not posted" },
    { id: "closest-approach", phrase: "Closest approach to the Moon", completedDetail: "confirmed on NASA coverage page; exact time not posted" },
    { id: "max-distance", phrase: "Maximum distance from Earth", completedDetail: "confirmed on NASA coverage page; exact time not posted" },
    { id: "soi-out", phrase: "Orion departs lunar sphere of influence", completedDetail: "confirmed on NASA coverage page; exact time not posted" },
    { id: "rtc1", phrase: "Return trajectory correction-1 burn", completedDetail: "burn confirmed on NASA coverage page; exact time not posted" },
    { id: "rtc2", phrase: "Return trajectory correction-2 burn", completedDetail: "burn confirmed on NASA coverage page; exact time not posted" },
    { id: "crew-suit-test", phrase: "Orion Crew Survival System Suit detailed flight test objectives", completedDetail: "test confirmed on NASA coverage page; exact time not posted" },
    { id: "radiation-shield-demo", phrase: "Radiation shielding deployment demonstration", completedDetail: "demo confirmed on NASA coverage page; exact time not posted" },
    { id: "rtc3", phrase: "Return trajectory correction-3 burn", completedDetail: "burn confirmed on NASA coverage page; exact time not posted" },
    { id: "entry-interface", phrase: "Entry interface", completedDetail: "confirmed on NASA coverage page; exact time not posted" },
    { id: "splashdown", phrase: "Splashdown", completedDetail: "confirmed on NASA coverage page; exact time not posted" },
  ];

  const nowMs = now.getTime();
  for (const item of lineChecks) {
    const milestone = milestones.find((row) => row.id === item.id);
    if (!milestone) continue;
    if (page.text.includes(item.phrase)) {
      const endMs = milestoneEndMs(milestone);
      if (endMs !== null) {
        if (endMs < nowMs) {
          milestone.status = "completed";
          milestone.latestDetail = item.completedDetail;
        } else {
          milestone.status = "scheduled";
          milestone.latestDetail = undefined;
        }
      }
    }
  }
}

type BlogMilestoneConfig = {
  id: string;
  urlHint?: string;
  /** Broad match used for routing: URL contains urlHint OR page text matches triggerText. */
  triggerText: RegExp;
  /** Specific confirmation check. Defaults to triggerText when absent. */
  confirmText?: RegExp;
  status: Status;
  latestDetail: string;
  freshnessLabel: string;
};

const BLOG_MILESTONE_CONFIGS: BlogMilestoneConfig[] = [
  {
    id: "launch",
    urlHint: "launch-day",
    triggerText: /Live launch day updates/i,
    status: "completed",
    latestDetail: "at 6:35 PM EDT",
    freshnessLabel: "Checked live from launch-day updates",
  },
  {
    id: "tli",
    urlHint: "tli-burn",
    triggerText: /completes?\s+TLI\s+burn|translunar\s+injection\s+burn/i,
    status: "completed",
    latestDetail: "crew began journey to the Moon",
    freshnessLabel: "Checked live from TLI update",
  },
  {
    id: "otc1",
    urlHint: "outbound-trajectory-correction-burn-update",
    triggerText: /outbound\s+trajectory\s+correction\s+burn/i,
    confirmText: /cancel(?:l?ed)?\s+the\s+spacecraft[\u2019']s\s+first\s+outbound\s+trajectory\s+correction\s+burn/i,
    status: "canceled",
    latestDetail: "Orion already on the right flight path",
    freshnessLabel: "Checked live from OTC-1 update",
  },
  {
    id: "comms-test",
    urlHint: "crew-prepares-cabin-for-lunar-flyby",
    triggerText: /emergency\s+communications?\s+system|optical\s+communications?/i,
    confirmText: /testing\s+the\s+spacecraft[\u2019']s\s+emergency\s+communications?\s+system/i,
    status: "completed",
    latestDetail: "emergency communications system and optical link activity publicly confirmed, exact wall-clock time not posted",
    freshnessLabel: "Checked live from Flight Day 3 update",
  },
  {
    id: "manual-piloting-demo",
    urlHint: "manual-piloting-demonstration",
    triggerText: /manual\s+piloting\s+demonstration|controlling\s+the\s+spacecraft/i,
    status: "completed",
    latestDetail: "crew manually piloted Orion for 41 minutes in deep space",
    freshnessLabel: "Checked live from Flight Day 4 update",
  },
];

function updateDailyAgendaBackfill(milestones: Milestone[], page: PageResult) {
  if (!page.ok || !page.html) return;
  const freshness = extractFreshness(page.html, "Checked live from Daily Agenda");
  setManyFreshness(milestones, ["perigee-raise-icps", "apogee-raise", "proximity-ops"], freshness);
}

function inferPastMilestones(milestones: Milestone[], now: Date) {
  const nowMs = now.getTime();
  for (const milestone of milestones) {
    if (milestone.status !== "scheduled") continue;
    const endMs = milestoneEndMs(milestone);
    if (endMs !== null && endMs < nowMs) {
      milestone.status = "inferred";
      milestone.latestDetail = "scheduled time has passed; awaiting confirmation";
    }
  }
}

function applyMissionUpdatePage(milestones: Milestone[], page: PageResult) {
  if (!page.ok || !page.text || !page.html) return;

  const lowerUrl = page.url.toLowerCase();

  for (const config of BLOG_MILESTONE_CONFIGS) {
    const isRouted =
      (config.urlHint !== undefined && lowerUrl.includes(config.urlHint)) ||
      config.triggerText.test(page.text);
    if (!isRouted) continue;

    const milestone = milestones.find((m) => m.id === config.id);
    if (!milestone) continue;

    milestone.sourceFreshness = extractFreshness(page.html, config.freshnessLabel);

    const confirmPattern = config.confirmText ?? config.triggerText;
    if (confirmPattern.test(page.text)) {
      milestone.status = config.status;
      milestone.latestDetail = config.latestDetail;
    }
    // TODO: there is currently no signal when a config entry's confirmText stops matching
    // a page that was routed to it (i.e. the page is about OTC-1 but the cancel phrase
    // changed wording). The milestone silently stays at its previous status. Consider
    // recording a structured warning in the SourceCheck or a separate diagnostics field
    // so ops can detect when NASA has changed page wording and patterns need updating.
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

  updateCoverageMilestones(milestones, coverage, now());
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
