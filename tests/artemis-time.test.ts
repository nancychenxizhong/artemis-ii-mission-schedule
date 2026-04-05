import test from "node:test";
import assert from "node:assert/strict";
import { BASE_MILESTONES, formatMilestoneTimeInZone, MilestoneTimeSpec } from "../lib/artemis-data";

test("formatMilestoneTimeInZone formats exact UTC timestamps", () => {
  const timeSpec: MilestoneTimeSpec = {
    kind: "instant",
    instantUtc: "2026-04-02T23:49:00Z",
  };

  assert.equal(formatMilestoneTimeInZone(timeSpec, "UTC"), "Apr 2, 11:49 PM UTC");
  assert.equal(formatMilestoneTimeInZone(timeSpec, "Australia/Melbourne"), "Apr 3, 10:49 AM GMT+11");
});

test("formatMilestoneTimeInZone preserves approximate exact times", () => {
  const timeSpec: MilestoneTimeSpec = {
    kind: "instant",
    instantUtc: "2026-04-02T00:24:00Z",
    approximate: true,
  };

  assert.equal(formatMilestoneTimeInZone(timeSpec, "UTC"), "~Apr 2, 12:24 AM UTC");
});

test("formatMilestoneTimeInZone converts same-day ranges", () => {
  const timeSpec: MilestoneTimeSpec = {
    kind: "range",
    startUtc: "2026-04-02T04:00:00Z",
    endUtc: "2026-04-02T15:59:00Z",
  };

  assert.equal(formatMilestoneTimeInZone(timeSpec, "UTC"), "Apr 2, 4:00 AM UTC-3:59 PM UTC");
});

test("formatMilestoneTimeInZone converts ranges across day boundaries", () => {
  const timeSpec: MilestoneTimeSpec = {
    kind: "range",
    startUtc: "2026-04-03T16:00:00Z",
    endUtc: "2026-04-04T03:59:00Z",
  };

  assert.equal(
    formatMilestoneTimeInZone(timeSpec, "UTC"),
    "Apr 3, 4:00 PM UTC-Apr 4, 3:59 AM UTC"
  );
});

test("every milestone has a structured time spec that can render in UTC", () => {
  for (const milestone of BASE_MILESTONES) {
    assert.ok(milestone.timeSpec, `missing timeSpec for ${milestone.id}`);
    assert.notEqual(formatMilestoneTimeInZone(milestone.timeSpec, "UTC"), "—", `unrenderable UTC for ${milestone.id}`);
  }
});
