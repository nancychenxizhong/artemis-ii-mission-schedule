import test from "node:test";
import assert from "node:assert/strict";
import { fetchSchedule, formatScheduleTimestamp } from "../lib/artemis-client";
import { ScheduleResponse } from "../lib/artemis-data";

const sampleSchedule: ScheduleResponse = {
  milestones: [],
  checkedAt: "2026-04-04T10:15:00.000Z",
  live: true,
  syncMessage: "Live NASA sync succeeded for 7/7 sources.",
  sources: [],
};

test("fetchSchedule requests the local schedule endpoint without caching", async () => {
  const calls: Array<{ input: string; init?: RequestInit }> = [];

  const data = await fetchSchedule(async (input, init) => {
    calls.push({ input, init });

    return {
      ok: true,
      status: 200,
      async json() {
        return sampleSchedule;
      },
    };
  });

  assert.deepEqual(data, sampleSchedule);
  assert.equal(calls.length, 1);
  assert.equal(calls[0]?.input, "/api/artemis-schedule");
  assert.equal(calls[0]?.init?.cache, "no-store");
});

test("fetchSchedule throws a helpful error when refresh fails", async () => {
  await assert.rejects(
    () =>
      fetchSchedule(async () => ({
        ok: false,
        status: 503,
        async json() {
          return sampleSchedule;
        },
      })),
    /HTTP 503/
  );
});

test("formatScheduleTimestamp preserves invalid values", () => {
  assert.equal(formatScheduleTimestamp("not-a-date"), "not-a-date");
});
