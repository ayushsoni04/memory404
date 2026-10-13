# memory404 Chrome Extension

React + webpack Chrome extension (Manifest V3) that opens an in-page save overlay (mymind-style) so picking a group and saving stays visible while the background service worker finishes the request.

## Features

- Toolbar icon / `Alt+Shift+L` (`Option+Shift+L` on Mac) opens the save overlay on the current page
- Overlay stays on the page while you browse; save runs in the service worker
- Sign in with your memory404 email/password (Bearer token stored locally)
- Saves to `POST /api/links` into **your** vault with page metadata when available
- Choose an existing group or create one inline
- Right-click a link → **Add to LK** to save that URL
- Configurable app URL (⚙ in overlay; defaults to `http://localhost:3000`)

## Setup

```bash
cd extension
npm install
npm run build
```

Produces `extension/dist/` and copies a downloadable zip to `public/downloads/memory404-extension.zip` for the web app.

For watch mode during development:

```bash
cd extension
npm run dev
```

## Download from the app

New users can download the packaged zip from **Settings → Chrome extension** (or the empty vault CTA), unzip it, Load unpacked in Chrome, and set **App URL** to this site or their own memory404 server.

## Load in Chrome

1. Open `chrome://extensions`
2. Enable **Developer mode**
3. Click **Load unpacked**
4. Select the unzipped download folder (or `extension/dist` after a local build)
5. Reload the extension after rebuilding

## Notes

- **This / hosted site:** paste the memory404 origin (copyable in Settings)
- **Local:** `http://localhost:3000`
- **Your own server:** the origin of your self-hosted memory404 deployment
- Restricted pages (`chrome://`, Chrome Web Store, etc.) cannot host the overlay; use a normal http(s) tab
