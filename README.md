# Artemis II Mini App

A simple, shareable Artemis II mission schedule app with:
- NASA time and UTC side by side
- baseline plan vs latest public status
- source freshness
- readable table-first layout

## Run locally

```bash
npm install
npm run dev
```

Then open `http://localhost:3000`.

## Notes

This repo is self-contained and does not require shadcn CLI setup.
The current version uses static demo data.
- Refresh only updates the displayed timestamp.
- Auto-refresh only updates that timestamp.
- No live NASA fetch is wired in yet.
