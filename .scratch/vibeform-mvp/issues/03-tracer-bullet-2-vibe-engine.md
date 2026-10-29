# 03: Tracer Bullet 2: Vibe Engine & Design Tokens

**What to build:** Enable stylistic personalization of forms via a safe Vibe theming system. Owners can select from curated preset Vibes (playful, minimal, formal, cyberpunk, warm) or tune whitelisted design tokens (`primaryColor`, `backgroundColor`, `borderRadius`, `fontFamily`). The Vibe tokens are stored in the Form Definition in `definitions-db` and dynamically applied to the live builder preview and public form page while strictly preventing arbitrary CSS or script injections.

**Blocked by:** 02 (Tracer Bullet 1: Form Builder & Field Management).

**Status:** ready-for-agent

- [ ] Vibe token schema validates whitelisted design tokens and rejects arbitrary CSS
- [ ] At least 5 curated preset Vibes available for selection
- [ ] Owner can select and preview different Vibes in the Web Builder UI
- [ ] Vibe tokens persist in `forms.vibeTokens` in `definitions-db`
- [ ] Form preview reflects the selected theme's typography, colors, and border radius in real time
