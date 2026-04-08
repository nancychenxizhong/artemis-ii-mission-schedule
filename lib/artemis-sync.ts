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

const MAX_DISCOVERED_BLOGS = 12;
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

function milestoneEndMs(milestone: Milestone): number | null {
  if (!milestone.timeSpec) return null;
  return milestone.timeSpec.kind === "instant"
    ? new Date(milestone.timeSpec.instantUtc).getTime()
    : new Date(milestone.timeSpec.endUtc).getTime();
}

/**
 * Returns the keywords to search for in blog text for this milestone.
 * Uses milestone.blogKeywords when set; otherwise derives terms from the title:
 * - Extracts uppercase acronyms from parentheses: "(TLI)" → "tli"
 * - Uses the main title text (parenthetical content stripped, "+" normalised)
 */
function deriveMilestoneKeywords(milestone: Milestone): string[] {
  if (milestone.blogKeywords && milestone.blogKeywords.length > 0) {
    return milestone.blogKeywords;
  }
  const keywords: string[] = [];
  for (const m of milestone.title.matchAll(/\(([A-Z][A-Z0-9-]{1,5})\)/g)) {
    keywords.push(m[1].toLowerCase());
  }
  const main = milestone.title
    .replace(/\([^)]*\)/g, "")
    .replace(/\+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
  if (main.length >= 4) keywords.push(main);
  return keywords;
}

/**
 * Produces a human-readable source label from a NASA blog URL slug.
 * e.g. "…flight-day-5-otc2-burn…" → "Flight Day 5 update"
 */
function labelFromBlogUrl(url: string): string {
  const slug = url.split("/").filter(Boolean).pop() ?? "";
  const dayMatch = slug.match(/flight-day-(\d+)/i);
  if (dayMatch) return `Flight Day ${dayMatch[1]} update`;
  if (/launch.day/i.test(slug)) return "Launch day update";
  const label = slug.replace(/-/g, " ").replace(/\bartemis\s*ii?\b/gi, "").trim().slice(0, 50);
  return label || "Mission update";
}

// Sentences that plan or describe an upcoming event — not evidence of completion.
const PLANNING_RE = /\b(will|plan(?:ned|ning)?|schedul|upcoming|expect(?:ed)?|intend|shall|slated|targeted|set\s+to|prepar(?:es|ing)|getting\s+ready|ahead\s+of|prior\s+to)\b/i;
// Language indicating an event was canceled or not needed.
const CANCEL_RE = /\b(cancell?(?:ed|ing|ation)?|scrub(?:bed)?|not\s+needed|no\s+longer\s+needed|waived)\b/i;

/**
 * Scans page text sentence-by-sentence for evidence that a milestone occurred.
 * Returns the outcome kind and the raw sentence as the detail, or null if not found.
 *
 * Any sentence that mentions a keyword without future-tense planning language is
 * treated as evidence the event happened — consistent with how NASA mission blog
 * posts are written (present/past tense = it's happening or happened).
 */
function findMilestoneOutcome(
  text: string,
  keywords: string[]
): { kind: "completed" | "canceled"; detail: string } | null {
  const sentences = text.match(/[^.!?]+[.!?]*/g) ?? [];
  for (const raw of sentences) {
    const sentence = raw.trim();
    if (sentence.length < 12) continue;
    const lower = sentence.toLowerCase();
    if (!keywords.some((k) => lower.includes(k))) continue;
    if (PLANNING_RE.test(sentence)) continue;
    if (CANCEL_RE.test(sentence)) {
      return { kind: "canceled", detail: sentence.replace(/\s+/g, " ").slice(0, 250) };
    }
    return { kind: "completed", detail: sentence.replace(/\s+/g, " ").slice(0, 250) };
  }
  return null;
}

const COVERAGE_COMPLETED_DETAIL_DEFAULT = "confirmed on NASA coverage page; exact time not posted";

function updateCoverageMilestones(milestones: Milestone[], page: PageResult, now: Date) {
  if (!page.ok || !page.html || !page.text) return;

  const freshness = extractFreshness(page.html, "Checked live from coverage page");
  const nowMs = now.getTime();

  for (const milestone of milestones) {
    if (!milestone.coveragePhrase) continue;
    milestone.sourceFreshness = freshness;
    if (page.text.includes(milestone.coveragePhrase)) {
      const endMs = milestoneEndMs(milestone);
      if (endMs !== null) {
        if (endMs < nowMs) {
          milestone.status = "completed";
          milestone.latestDetail = milestone.coverageCompletedDetail ?? COVERAGE_COMPLETED_DETAIL_DEFAULT;
        } else {
          milestone.status = "scheduled";
          milestone.latestDetail = undefined;
        }
      }
    }
  }
}

function updateDailyAgendaBackfill(milestones: Milestone[], page: PageResult) {
  if (!page.ok || !page.html) return;
  const freshness = extractFreshness(page.html, "Checked live from Daily Agenda");
  for (const id of ["perigee-raise-icps", "apogee-raise", "proximity-ops"]) {
    const m = milestones.find((item) => item.id === id);
    if (m) m.sourceFreshness = freshness;
  }
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

  const freshness = extractFreshness(page.html, labelFromBlogUrl(page.url));
  const sourceLabel = labelFromBlogUrl(page.url);

  for (const milestone of milestones) {
    const keywords = deriveMilestoneKeywords(milestone);
    const outcome = findMilestoneOutcome(page.text, keywords);
    if (!outcome) continue;
    milestone.sourceFreshness = freshness;
    milestone.source = sourceLabel;
    milestone.status = outcome.kind;
    milestone.latestDetail = outcome.detail;
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
