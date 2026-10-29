# 04: Tracer Bullet 3: Publish Gate & Public Form Submission

**What to build:** Implement the mandatory Human-Only Publish Gate on the Web Dashboard where an Owner explicitly toggles a form from `draft` to `published`. Upon publishing, a collision-resistant NanoID slug is assigned (with support for setting an optional custom vanity slug). Expose the public respondent route (`/f/:slug`) where anonymous respondents can render the active form styled with its assigned Vibe, experience real-time client-side validation, and submit answers. The API Worker validates submitted answers against active (non-deleted) fields and records them in `responses-db`.

**Blocked by:** 02 (Tracer Bullet 1: Form Builder & Field Management), 03 (Tracer Bullet 2: Vibe Engine & Design Tokens).

**Status:** ready-for-agent

- [ ] Owner can publish and unpublish/close forms exclusively via the Web Dashboard
- [ ] Published form is accessible at public route `/f/:slug` (and rejected if draft/closed)
- [ ] Public form page renders all non-deleted fields styled according to the form's Vibe tokens
- [ ] Submissions validate required fields and specific type constraints (lengths, choices, ratings)
- [ ] Valid submissions are successfully persisted into `responses` and `answers` in `responses-db`
- [ ] Respondent receives immediate visual confirmation of submission success
