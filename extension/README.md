# Linksavekren Chrome Extension

React + webpack Chrome extension (Manifest V3) to save the current tab into your Linksavekren app.

## Features

- Saves active tab to `POST /api/links`
- Captures page metadata from the tab:
  - title
  - description
  - og image
- Lets you choose an existing group or create a new one inline
- Configurable app URL (defaults to `http://localhost:3000`)

## Setup

```bash
cd extension
npm install
npm run build
```

For watch mode during development:

```bash
npm run dev
```

## Load in Chrome

1. Open `chrome://extensions`
2. Enable **Developer mode**
3. Click **Load unpacked**
4. Select `extension/dist`

## Notes

- Make sure your app is running (e.g. `npm run dev` in project root)
- If your app runs on a different origin, update it in the popup's **App URL**
