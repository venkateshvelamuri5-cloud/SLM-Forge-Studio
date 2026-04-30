# Google Apps Script Setup Guide

## Step 1 — Create the Google Sheet

1. Go to [sheets.google.com](https://sheets.google.com) → New spreadsheet
2. Name it: **SLM Forge DB**
3. Copy the Spreadsheet ID from the URL:
   `https://docs.google.com/spreadsheets/d/THIS_IS_THE_ID/edit`
4. Create these sheets (tabs) — exact names matter:

| Sheet Name | Purpose |
|---|---|
| `Users` | Login accounts |
| `SLM_Profiles` | Published SLM profiles from Studio |
| `Access_Control` | Which user can see which SLM |
| `Login_Attempts` | Audit log |
| `Users Registered` | Signup data |
| `Feeback from the Users` | Exit-intent feedback |
| `Batch_Jobs` | Batch processing log |

## Step 2 — Deploy the Apps Script

1. In the spreadsheet, go to **Extensions → Apps Script**
2. Delete all existing code
3. Paste the entire contents of `gas-backend.js`
4. On line 14, replace `YOUR_SPREADSHEET_ID_HERE` with your actual Sheet ID
5. Click **Save** (floppy disk icon)
6. Click **Deploy → New deployment**
7. Settings:
   - Type: **Web app**
   - Execute as: **Me**
   - Who has access: **Anyone**
8. Click **Deploy** → Copy the **Web app URL**

## Step 3 — Update the App URL

In `public/index.html`, find line ~2294:
```javascript
const GAS_URL = 'https://script.google.com/macros/s/YOUR_URL/exec';
```
Replace with your deployed URL.

Also update the same `GAS_URL` in `public/studio.html` and `public/orchestrator.html`.

## Step 4 — Create Your First Admin Account

1. Open the `Users` sheet
2. Add a header row: `email | password_hash | name | role | org | created_at | last_login`
3. Add your first admin row:

| email | password_hash | name | role | org | created_at | last_login |
|---|---|---|---|---|---|---|
| admin@yourcompany.com | `=BASE64ENCODE("yourpassword")` | Admin User | admin | YourCo | 2025-01-01 | |

> Note: `BASE64ENCODE` in Sheets encodes the password. The client sends `btoa(password)` which matches.

## Step 5 — Add Users

Option A — Users register themselves via the app (they get `user` role by default)

Option B — Admin manually adds rows to `Users` sheet with role `user`, `developer`, or `admin`

## Step 6 — Assign Profiles to Users

After a developer publishes a profile from Studio:

Option A — In `Access_Control` sheet, add a row:
```
user@company.com | profile_id | 2025-01-15 | admin@company.com
```

Option B — Use the Orchestrator UI to assign (coming in next update)

## Role Reference

| Role | Can do |
|---|---|
| `user` | Chat only, Batch, sees assigned SLMs |
| `developer` | All tabs, model selection, Tune, Ingest, Metrics |
| `admin` | Everything + Orchestrator |

## URL Structure (on Vercel)

| URL | Who uses it |
|---|---|
| `https://yourapp.vercel.app` | End users (Forge) |
| `https://yourapp.vercel.app/studio.html` | Developers |
| `https://yourapp.vercel.app/orchestrator.html` | Admins |
