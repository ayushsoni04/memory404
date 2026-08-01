# memory404 Chrome Extension

React + webpack Chrome extension (Manifest V3) that opens an in-page save overlay (mymind-style) so picking a group and saving stays visible while the background service worker finishes the request.

## Features

- Toolbar icon / `Alt+Shift+L` (`Option+Shift+L` on Mac) opens the save overlay on the current page
- Overlay stays on the page while you browse; save runs in the service worker
- Saves to `POST /api/links` with page metadata when available
- Choose an existing group or create one inline
- Right-click a link → **Add to LK** to save that URL
- Configurable app URL (⚙ in overlay; defaults to `http://localhost:3000`)

## Setup

```bash
cd extension
npm install
npm run build
```

For watch mode during development:

```bash
cd extension
npm run dev
```

## Load in Chrome

1. Open `chrome://extensions`
2. Enable **Developer mode**
3. Click **Load unpacked**
4. Select `extension/dist`
5. Reload the extension after rebuilding

## Notes

- **Local:** run the app on `http://localhost:3000`, keep App URL as that in overlay settings
- **Production:** set App URL to `https://memory404.vercel.app`
- Restricted pages (`chrome://`, Chrome Web Store, etc.) cannot host the overlay; use a normal http(s) tab
