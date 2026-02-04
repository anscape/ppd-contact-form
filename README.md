# PPD Contact Form

A minimal static landing page + contact form that posts to Google Sheets via Apps Script.

## Google Sheets Contact Form Setup

### 1) Create a spreadsheet
Create a new Google Sheet and add the following headers in the first row:

- `created_at`
- `name`
- `email`
- `message`
- `user_agent`
- `referrer`

### 2) Apps Script
Open **Extensions → Apps Script**, create a new project, and paste this code **verbatim** into `Code.gs`:

```js
function doPost(e) {
  try {
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheets()[0];
    const data = JSON.parse(e.postData.contents);

    if (!data.name || !data.email || !data.message) {
      return ContentService
        .createTextOutput(JSON.stringify({ ok: false, error: "missing_fields" }))
        .setMimeType(ContentService.MimeType.JSON);
    }

    sheet.appendRow([
      new Date().toISOString(),
      String(data.name),
      String(data.email),
      String(data.message),
      String(data.user_agent || ""),
      String(data.referrer || "")
    ]);

    return ContentService
      .createTextOutput(JSON.stringify({ ok: true }))
      .setMimeType(ContentService.MimeType.JSON);

  } catch (err) {
    return ContentService
      .createTextOutput(JSON.stringify({ ok: false, error: String(err) }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}
```

### 3) Deploy as Web App
Deploy from Apps Script:

1. Click **Deploy → New deployment**
2. Select **Web app**
3. Execute as: **Me**
4. Who has access: **Anyone**
5. Click **Deploy** and copy the Web App URL

### 4) Add the endpoint URL
Paste the Web App URL into:

- `assets/js/contact.js` → `GOOGLE_SHEETS_ENDPOINT`

### 5) Test locally
Open `index.html` or `contact.html` directly, or run a tiny static server from the `ppd-contact-form/` folder:

```bash
python3 -m http.server 8000
```

Then visit `http://localhost:8000/contact.html` and submit a message.

## Publish to GitHub Pages (Subdirectory)

Your site files live in `ppd-contact-form/`, so you have two supported options.

### Option 1 (Recommended): Deploy from `/ppd-contact-form` using GitHub Actions
Use the official GitHub Pages workflow and point it at the subfolder.

1. Create `.github/workflows/pages.yml` at the repo root.
2. Use this minimal workflow:

```yml
name: Deploy Pages

on:
  push:
    branches: [main]
  workflow_dispatch:

permissions:
  contents: read
  pages: write
  id-token: write

concurrency:
  group: "pages"
  cancel-in-progress: true

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/configure-pages@v4
      - uses: actions/upload-pages-artifact@v3
        with:
          path: ./ppd-contact-form

  deploy:
    needs: build
    runs-on: ubuntu-latest
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    steps:
      - id: deployment
        uses: actions/deploy-pages@v4
```

3. In **Settings → Pages**, set **Source** to **GitHub Actions**.

### Option 2: Move site files to repo root (classic Pages)
1. Move all contents of `ppd-contact-form/` into the repository root.
2. In **Settings → Pages**, choose **Deploy from a branch** and set `/ (root)`.

## Troubleshooting

- All asset paths must be relative (no leading `/`).
- Confirm the Apps Script Web App URL is correct in `assets/js/contact.js`.
- Apps Script deployment must allow access to **Anyone**.
- If you see CORS or network errors, re-check the deployment settings and the browser console.
