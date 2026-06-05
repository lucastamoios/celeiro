# Celeiro Amazon Sync - Browser Extension

Browser extension (Chrome and Firefox) to sync Amazon orders with Celeiro, enabling automatic categorization of bank transactions.

The same code runs in both browsers: the manifest declares `background.service_worker` (used by Chrome) and `background.scripts` (used by Firefox) side by side, and all APIs are called through the `chrome.*` namespace with promises, which Firefox supports in Manifest V3. The minimum Firefox version is 142 (required by the `data_collection_permissions` manifest key, which Mozilla now mandates for new extensions).

## Installation

### 1. Generate PNG Icons (required)

The extension needs PNG icons. Convert the provided SVGs:

```bash
cd chrome-extension/icons

# Using ImageMagick (if installed)
convert icon16.svg icon16.png
convert icon48.svg icon48.png
convert icon128.svg icon128.png

# Or using rsvg-convert (if installed)
rsvg-convert -w 16 -h 16 icon16.svg -o icon16.png
rsvg-convert -w 48 -h 48 icon48.svg -o icon48.png
rsvg-convert -w 128 -h 128 icon128.svg -o icon128.png
```

Or simply create the PNGs manually with any image editor.

### 2. Install in Chrome

1. Open `chrome://extensions/` in Chrome
2. Enable "Developer mode" (top right corner)
3. Click "Load unpacked"
4. Select the `chrome-extension` folder

### 3. Install in Firefox

For development (temporary, removed when Firefox closes):

1. Open `about:debugging#/runtime/this-firefox` in Firefox
2. Click "Load Temporary Add-on..."
3. Select `chrome-extension/manifest.json`

For a permanent install, the extension must be signed: zip the folder contents and submit it to [addons.mozilla.org](https://addons.mozilla.org/developers/) (self-distribution / unlisted is fine), then install the signed `.xpi` it gives back.

**Important (Firefox only)**: Firefox treats `host_permissions` as optional in Manifest V3, so after installing you must grant site access manually. Go to `about:addons` → Celeiro Amazon Sync → Permissions, and enable access to amazon.com.br (and your API host if it is not localhost). Without this, the sync cannot inject the extraction script after navigating between order pages.

## Usage

### Initial Setup

1. Click the extension icon in the Chrome toolbar
2. Configure:
   - **API URL**: Celeiro backend URL (e.g., `http://localhost:8080`)
   - **Token**: Your JWT authentication token
   - **Month/Year**: Order period to sync

### Syncing

1. Log in to Amazon in the browser
2. Click "Sync Amazon Orders"
3. The extension will:
   - Navigate to the orders page
   - Extract information from each order
   - Paginate automatically
   - Send data to Celeiro

### "Open Amazon Orders" Button

Opens the Amazon orders page directly, filtered by the selected month/year.

## Extracted Data

For each order, the extension extracts:
- **order_id**: Unique order identifier
- **date**: Order date (ISO format)
- **total**: Total order amount
- **items**: List of purchased products

## Backend API

The extension sends data to:
```
POST /api/v1/financial/amazon/sync
```

Payload:
```json
{
  "orders": [
    {
      "order_id": "123-4567890-1234567",
      "date": "15 de dezembro de 2024",
      "parsed_date": {
        "day": 15,
        "month": 12,
        "year": 2024,
        "iso": "2024-12-15"
      },
      "total": "R$ 123,45",
      "parsed_total": 123.45,
      "items": [
        { "name": "Nome do Produto", "url": "https://amazon.com.br/dp/..." }
      ]
    }
  ],
  "month": 12,
  "year": 2024
}
```

## Pagination Behavior

The extension automatically navigates through Amazon order pages:

1. **Automatic extraction**: Extracts orders from each page sequentially
2. **Previous month detection**: Stops when it finds orders from the month before the selected one
3. **Safety extra page**: Always fetches **ONE ADDITIONAL PAGE** after detecting orders from the previous month
   - This ensures no orders are missed (Amazon's ordering isn't always perfect)
4. **Safety limit**: Maximum of 20 pages to avoid infinite loops

## Data Parsing

### Dates (Brazilian Portuguese)

The extension parses dates in the format `15 de dezembro de 2024`:

**Supported months:**
- janeiro, fevereiro, marco/marco, abril, maio, junho
- julho, agosto, setembro, outubro, novembro, dezembro

### Currency Values

Parses the Brazilian Real format:
- `R$ 1.234,56` → `1234.56` (float)
- Removes thousands separators (dots), converts comma to decimal point

## Troubleshooting

### Extension doesn't extract orders

1. Make sure you're logged in to Amazon
2. Try reloading the orders page
3. Check the browser console (F12) for errors

### API Error

1. Check if the API URL is correct
2. Check if the token is valid
3. Check if the backend is running

### Icons don't appear

Generate the PNG files as instructed above.

## Development

### File Structure

```
chrome-extension/
├── manifest.json      # Extension configuration
├── popup.html         # Popup interface
├── popup.js           # Popup logic
├── content.js         # Script injected into Amazon pages
├── background.js      # Service worker for long operations
├── icons/             # Extension icons
└── README.md          # This file
```

### Debug

**IMPORTANT: There are two different consoles!**

1. **Popup Console** (`popup.js` logs):
   - Right-click the extension icon
   - Select "Inspect popup"
   - Navigation and API call logs appear here

2. **Amazon Page Console** (`extractOrders()` logs):
   - Press F12 on the Amazon page
   - The `extractOrders()` function is injected into the Amazon page
   - Order extraction logs appear in THIS console, not in the popup

3. **Service Worker** (Chrome):
   - Open `chrome://extensions/`
   - Click "Service Worker" to see background logs

4. **Background script** (Firefox):
   - Open `about:debugging#/runtime/this-firefox`
   - Click "Inspect" on the extension to see background logs

**Tip**: When the extension navigates to a new page, DevTools attached to the previous page may disconnect. Reopen DevTools after navigation if needed.
