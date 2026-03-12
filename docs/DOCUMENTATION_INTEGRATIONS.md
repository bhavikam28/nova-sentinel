# Documentation Integrations — Jira, Slack, Confluence

Enable the **Open in Jira**, **Open in Slack**, and **Open in Confluence** buttons in the Automated Documentation tab by setting environment variables.

## Quick Setup

### 1. Create or edit `.env`

In your project root (or `frontend/` if Vite runs from there), create `.env` if it doesn't exist, or add these lines:

```bash
# Documentation tab — Open-in-app links
VITE_JIRA_BASE_URL=https://your-company.atlassian.net
VITE_SLACK_CHANNEL_URL=https://app.slack.com/client/T01234567/C01234567
VITE_CONFLUENCE_BASE_URL=https://your-company.atlassian.net/wiki
VITE_CONFLUENCE_SPACE_KEY=SEC
```

### 2. Get your URLs

| Variable | How to get it |
|----------|---------------|
| **VITE_JIRA_BASE_URL** | Your Atlassian URL: `https://<your-org>.atlassian.net` (no trailing slash) |
| **VITE_SLACK_CHANNEL_URL** | Open your #security-incidents channel in Slack, copy the URL from the browser (e.g. `https://app.slack.com/client/T01234567/C01234567`) |
| **VITE_CONFLUENCE_BASE_URL** | Same as Jira: `https://<your-org>.atlassian.net/wiki` |
| **VITE_CONFLUENCE_SPACE_KEY** | The Confluence space key for incident docs (e.g. `SEC`, `SECOPS`) |

### 3. Restart the frontend

Vite reads env vars at build/start time. Restart the dev server:

```bash
cd frontend && npm run dev
```

---

## What each button does

| Button | Action |
|--------|--------|
| **Open in JIRA** | Opens Jira Create Issue with pre-filled summary and description (Markdown) |
| **Open in Slack** | Opens your configured Slack channel — paste the copied content manually |
| **Open in Confluence** | Opens Confluence page create in the configured space — paste the copied content |

---

## Notes

- **Copy** works without any env vars — you can always copy and paste into any tool.
- **Export Markdown** also works without env vars.
- If a button is greyed out with `(set env)`, the corresponding variable is not set.
