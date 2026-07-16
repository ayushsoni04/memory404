# memory404 Chrome Extension

React + webpack Chrome extension (Manifest V3) to save the current tab into your memory404 app.

## Features

- Saves active tab to `POST /api/links`
- Captures page metadata from the tab:
  - title
  - description
  - og image
- Lets you choose an existing group or create a new one inline
- Configurable app URL (defaults to `http://localhost:3000`; use `https://memory404.vercel.app` for production)

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

- **Local:** run `npm run dev` in the project root, keep App URL as `http://localhost:3000`
- **Production:** set App URL in the popup (⚙) to `https://memory404.vercel.app`
- Reload the extension in `chrome://extensions` after rebuilding
