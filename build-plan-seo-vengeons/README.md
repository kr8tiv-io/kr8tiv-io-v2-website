# Running this plan
1. Prereq: `grok` CLI installed and authed (NOT available on the box Nov 6 — `which grok` empty; prompts written only, nothing run).
2. Repo: /workspace/kio-seo-imagine, start a fresh branch `seo/vengeons-pass` off main after the video-plates merge.
3. Feed `build-plan/prompts/NNN-*.md` in order per INDEX.md; stop on any error, failed build, or Build 402.
4. Prompt 001 accepts Matt's GSC paste at `{paste}`; if absent it drafts intent-based titles flagged NEEDS-GSC.
5. No Hostinger publish/merge inside prompts — parent gates deploy after screenshots + Matt's OK.
