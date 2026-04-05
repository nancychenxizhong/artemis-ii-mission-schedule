import test from "node:test";
import assert from "node:assert/strict";
import { buildScheduleWithDeps } from "../lib/artemis-sync";

const NOW = new Date("2026-04-04T12:00:00.000Z");

function makeHtml(body: string) {
  return `<html><body>${body}</body></html>`;
}

test("buildScheduleWithDeps applies live page updates into the bundled schedule", async () => {
  const pages = new Map<string, string>([
    [
      "https://www.nasa.gov/missions/artemis/artemis-2/nasa-sets-coverage-for-artemis-ii-moon-mission/",
      makeHtml(`
        Updated: April 4, 2026 7:00 PM
        Outbound trajectory correction-2 burn
        Closest approach to the Moon
        Splashdown
      `),
    ],
    [
      "https://www.nasa.gov/missions/artemis/nasas-artemis-ii-moon-mission-daily-agenda/",
      makeHtml(`Published: March 13, 2026 8:00 AM`),
    ],
    [
      "https://www.nasa.gov/mission/artemis-ii/",
      makeHtml(`
        <a href="/blogs/missions/2026/04/04/artemis-ii-flight-day-4-crew-completes-manual-piloting-demonstration/">Day 4</a>
        <a href="/blogs/missions/2026/04/04/artemis-ii-flight-day-3-crew-prepares-cabin-for-lunar-flyby/">Day 3</a>
        <a href="/blogs/missions/2026/04/02/artemis-ii-flight-day-2-orion-completes-tli-burn-crew-begins-journey-to-the-moon/">Day 2</a>
      `),
    ],
    [
      "https://www.nasa.gov/artemis-ii-news-and-updates/",
      makeHtml(`
        Published: April 4, 2026 11:30 AM
        <a href="/blogs/missions/2026/04/03/artemis-ii-flight-day-3-outbound-trajectory-correction-burn-update/">OTC-1</a>
      `),
    ],
    [
      "https://www.nasa.gov/artemis-ii-media-resources/",
      makeHtml(`
        <a href="/blogs/missions/2026/04/01/live-artemis-ii-launch-day-updates/">Launch</a>
      `),
    ],
    [
      "https://www.nasa.gov/blogs/missions/2026/04/03/artemis-ii-flight-day-3-outbound-trajectory-correction-burn-update/",
      makeHtml(`Updated: April 3, 2026 9:00 PM NASA canceled the spacecraft's first outbound trajectory correction burn.`),
    ],
    [
      "https://www.nasa.gov/blogs/missions/2026/04/04/artemis-ii-flight-day-4-deep-space-flying-lunar-flyby-prep/",
      makeHtml(`Updated: April 4, 2026 2:33 PM The crew reviewed its lunar flyby plan and continued deep-space operations.`),
    ],
    [
      "https://www.nasa.gov/blogs/missions/2026/04/04/artemis-ii-flight-day-4-crew-completes-manual-piloting-demonstration/",
      makeHtml(`Updated: April 4, 2026 10:44 PM The crew completed a manual piloting demonstration, manually controlling the spacecraft for 41 minutes.`),
    ],
    [
      "https://www.nasa.gov/blogs/missions/2026/04/04/artemis-ii-flight-day-3-crew-prepares-cabin-for-lunar-flyby/",
      makeHtml(`Updated: April 4, 2026 10:00 AM The crew is testing the spacecraft's emergency communications system in deep space.`),
    ],
    [
      "https://www.nasa.gov/blogs/missions/2026/04/02/artemis-ii-flight-day-2-orion-completes-tli-burn-crew-begins-journey-to-the-moon/",
      makeHtml(`Updated: April 2, 2026 8:15 PM Orion completes TLI burn and begins the trip to the Moon.`),
    ],
    [
      "https://www.nasa.gov/blogs/missions/2026/04/01/live-artemis-ii-launch-day-updates/",
      makeHtml(`Updated: April 1, 2026 6:45 PM Live launch day updates confirm liftoff.`),
    ],
  ]);

  const schedule = await buildScheduleWithDeps({
    fetchImpl: async (input) => ({
      ok: true,
      status: 200,
      async text() {
        return pages.get(input) ?? "";
      },
    }),
    now: () => NOW,
  });

  assert.equal(schedule.checkedAt, NOW.toISOString());
  assert.equal(schedule.live, true);
  assert.equal(schedule.syncMessage, "Live NASA sync succeeded for 11/11 sources.");
  assert.equal(schedule.sources.length, 11);
  assert(schedule.sources.every((source) => source.ok));
  assert(schedule.sources.every((source) => source.checkedAt === NOW.toISOString()));

  const otc1 = schedule.milestones.find((milestone) => milestone.id === "otc1");
  const commsTest = schedule.milestones.find((milestone) => milestone.id === "comms-test");
  const manualPilotingDemo = schedule.milestones.find((milestone) => milestone.id === "manual-piloting-demo");
  const tli = schedule.milestones.find((milestone) => milestone.id === "tli");
  const crewSuitTest = schedule.milestones.find((milestone) => milestone.id === "crew-suit-test");
  const splashdown = schedule.milestones.find((milestone) => milestone.id === "splashdown");

  assert.equal(otc1?.status, "canceled");
  assert.match(otc1?.latest ?? "", /right flight path/i);
  assert.match(commsTest?.latest ?? "", /emergency communications system testing confirmed/i);
  assert.equal(manualPilotingDemo?.status, "completed");
  assert.match(manualPilotingDemo?.latest ?? "", /41 minutes/i);
  assert.equal(tli?.status, "completed");
  assert.match(tli?.latest ?? "", /journey to the Moon/i);
  assert.equal(crewSuitTest?.latest, "Scheduled");
  assert.equal(splashdown?.latest, "Scheduled");
  assert.equal(splashdown?.sourceFreshness, "April 4, 2026 7:00 PM");
});

test("buildScheduleWithDeps falls back cleanly when live fetches fail", async () => {
  const schedule = await buildScheduleWithDeps({
    fetchImpl: async () => {
      throw new Error("network down");
    },
    now: () => NOW,
  });

  assert.equal(schedule.live, false);
  assert.equal(schedule.syncMessage, "Live NASA sync failed. Showing bundled fallback schedule.");
  assert(schedule.sources.every((source) => source.ok === false));
  assert(schedule.sources.every((source) => source.note === "network down"));
});
