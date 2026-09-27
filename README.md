# AI QA Test Case Generator (Gemini edition)

A small web app: paste a requirement or user story, and Google's Gemini API generates a structured set of test cases (positive, negative, edge, security) which you can view in a table and export as CSV.

Uses Gemini's free tier — `gemini-2.5-flash` — so you can run this without a credit card.

## ⚠️ Important security note
Never put your API key directly in code or commit it to GitHub. It is read from an **environment variable** (`GEMINI_API_KEY`) at runtime. Set it in your `.env` file locally, and in Render's dashboard for production.

## Get a free Gemini API key
1. Go to https://aistudio.google.com/app/apikey
2. Sign in with a Google account.
3. Click **Create API key** and copy it.
4. This key works on the free tier by default — no billing required for `gemini-2.5-flash` at moderate usage.

## Project structure
```
qa-testcase-generator/
├── server.js           # Express server + Gemini API call
├── package.json
├── .env.example         # Template for local env vars
├── public/
│   ├── index.html        # UI
│   ├── style.css
│   └── script.js         # Frontend logic (calls /api/generate)
└── README.md
```

## Run locally
1. Install dependencies:
   ```bash
   npm install
   ```
2. Copy `.env.example` to `.env` and add your key:
   ```bash
   cp .env.example .env
   ```
   Edit `.env`:
   ```
   GEMINI_API_KEY=your_real_gemini_key_here
   ```
3. Start the server:
   ```bash
   npm start
   ```
4. Open `http://localhost:3000` in your browser.

## Deploy on Render
1. Push this project to a **GitHub repository** (make sure `.env` is NOT committed — it's already in `.gitignore`).
2. On [Render](https://dashboard.render.com), click **New → Web Service** and connect your repo.
3. Configure:
   - **Language:** Node
   - **Build Command:** `npm install`
   - **Start Command:** `npm start` (or `node server.js`)
4. Under **Environment**, add:
   - `GEMINI_API_KEY` = your real Gemini key
   - (optional) `GEMINI_MODEL` = `gemini-2.5-flash`
5. Click **Deploy web service**. Your app will be live at the URL Render gives you.

## How it works
- The frontend (`public/`) sends the requirement text to `POST /api/generate`.
- `server.js` sends a system instruction (telling Gemini to act as a QA analyst) plus your requirement to Gemini's `generateContent` endpoint, using `responseSchema` so it returns clean structured JSON instead of free-form text.
- The response includes a `testCases` array (id, title, type, priority, preconditions, steps, test data, expected result).
- The frontend renders this as a table and lets you export it to CSV.

## Free tier limits to know
Google's free Gemini API tier (subject to change — check https://aistudio.google.com for current numbers) is request-rate limited per minute and per day rather than unlimited. If you hit a `429` error, you're being rate-limited — wait a minute and try again, or reduce how often you generate test cases. If you need heavier usage, enable billing on the linked Google Cloud project; the same key and code will keep working.

## Customizing the prompt
Open `server.js` and edit the `SYSTEM_INSTRUCTION` constant to change tone, required fields, or testing style (e.g. add a "Regression" test type, or require Gherkin-style steps).
