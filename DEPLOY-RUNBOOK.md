# Deploying kr8tiv.io

The site deploys to Hostinger from GitHub Actions. One push to `main` that
touches `src/`, `public/`, `astro.config.*`, or `package.json` triggers
**Deploy KR8TIV to Hostinger** (`.github/workflows/deploy-hostinger.yml`),
which builds the Astro site, zips `dist/`, and uploads it over the Hostinger
API. Nothing else deploys — feature branches are safe to push.

---

## Unblocking the deploy: refresh the Hostinger API token

**Symptom.** The workflow fails in the *Deploy to Hostinger* step with:

```
Error: GET /api/hosting/v1/websites?domain=kr8tiv.io failed: 401 {"message":"Unauthenticated."}
```

The token is expired **account-wide**, so it also breaks the Hostinger MCP
connector and any hPanel-API preview. One new token fixes all of them.

### 1 · Mint a new token (about 60 seconds)

1. Sign in at **https://hpanel.hostinger.com**.
2. Click the **profile/avatar menu, top right** → **Account Information**.
   (Direct link: **https://hpanel.hostinger.com/profile/api-tokens**)
3. Open the **API tokens** section → **Create token** / **Generate new token**.
4. Name it something you'll recognise later — e.g. `github-actions-kr8tiv-io`.
5. Set the longest available expiry.
6. **Copy the token now.** Hostinger shows it exactly once.

### 2 · Paste it into the repo secret (about 60 seconds)

1. Go to **https://github.com/kr8tiv-io/kr8tiv-io-v2-website/settings/secrets/actions**
2. Find the existing secret named exactly:

   ```
   HOSTINGER_API_TOKEN
   ```

3. Click **Update**, paste the new token, **Update secret**.
   Do not rename it — the workflow reads that exact name
   (`deploy-hostinger.yml`, `secrets.HOSTINGER_API_TOKEN`).

### 3 · Re-run the deploy

- **https://github.com/kr8tiv-io/kr8tiv-io-v2-website/actions** → open the
  failed **Deploy KR8TIV to Hostinger** run → **Re-run failed jobs**.
- Or from the CLI: `gh run rerun 30884186464`
- Or trigger a fresh run: Actions → *Deploy KR8TIV to Hostinger* → **Run workflow**.

### 4 · While you're there — the local MCP token

The same dead token is stored in `~/.claude.json` under the Hostinger MCP
server config. Replacing it there restores the Hostinger tooling in Claude
sessions (site listing, DNS, VPS, hosted previews).

---

## What ships when the token is fixed

`main` already contains the **perf-alberta-seo** work (video payload
183 MB → 45 MB, poster frames, wider lazy-load margin, Costa Rica → Alberta,
SEO/AI-SEO schema). That merge happened but never reached the live site
because of this token, so **the first successful run publishes it**.

The **visual-upgrade** branch is a separate, deliberate hold. It is not on
`main` and will not deploy until it is merged.
