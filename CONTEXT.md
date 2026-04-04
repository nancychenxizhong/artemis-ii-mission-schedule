# Artemis II Mini App — Context

## What this is
A shareable Next.js mini app for tracking the Artemis II mission schedule in a way that is easier to read than a dense PDF timeline.

The current design is table-first and focuses on:
- NASA time and UTC side by side
- baseline plan vs latest public status
- source freshness
- clear status labeling like completed, scheduled, canceled, changed, inferred

## Current app state
The current app includes:
- a simple header
- summary cards
- a refresh/status strip
- search
- phase filters
- a readable milestone table

## Important limitation
The data is still static demo data.

That means:
- the milestone rows are hardcoded
- the Refresh button only updates the displayed timestamp
- Auto-refresh only updates the timestamp every minute
- there is no live NASA fetch yet

## What “inferred” means
“Inferred” means the milestone is publicly confirmed, but the exact wall-clock timestamp was not clearly published in the NASA source used for the table.

## Suggested next step
A low-effort first step would be manual refresh only:
1. create one normalized JSON endpoint such as `/api/artemis-schedule`
2. fetch that JSON from the app
3. update the milestone table from fetched state
4. update `lastUpdated` from the actual fetch timestamp
