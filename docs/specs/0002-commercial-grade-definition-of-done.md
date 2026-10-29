# Spec: Commercial-Grade Definition of Done

## Goal

Promote Vibe Form from an MVP to a production-ready SaaS while preserving the
Control Plane/Data Plane boundary and the human-only Publish Gate.

## Non-negotiable invariants

1. The MCP Worker has no Data Plane bindings and no response-content tool.
2. A form becomes public only after an authenticated Owner action in the Web
   Dashboard.
3. Every public submission and upload is validated and rate-limited at the
   server boundary.
4. Every attachment is stored privately and is retrievable only after Owner
   authorization.
5. Cleanup is retryable and observable; no partial cleanup is presented as
   success.
6. User-visible loading, error, empty, success, focus, and reduced-motion
   states exist for the critical flows.

## Critical journeys

### Owner

- Sign in, create or receive a draft, edit fields, choose a Vibe, and publish.
- Revoke an MCP Token and observe that the next request fails.
- View responses and download an attachment without exposing it publicly.
- Delete a response or form and observe completion or an explicit retryable
  failure.

### Respondent

- Open a published form on mobile and desktop.
- Complete keyboard-only navigation and receive inline validation.
- Upload an allowed file with visible progress, then submit once.
- See a success state and a useful error state when submission fails.

### Agent

- Initialize an MCP session, list tools, and call a scoped tool successfully.
- Receive standard JSON-RPC errors for malformed, unauthorized, forbidden,
  unknown-tool, and invalid-argument requests.
- Be unable to retrieve answers or attachments, including through guessed tool
  names or prompt-injected arguments.

## Release gates

### Gate A — Security and boundary

- Exact-origin CORS tests for `apps/server` and `apps/mcp`.
- Security-header tests for HTML, API, and error responses.
- Distributed rate-limit tests for `/f/:slug/submit` and upload.
- Server-side Turnstile verification tests, including missing, invalid, and
  replayed tokens.
- Magic-byte, size, configured MIME, malformed-image, and metadata-stripping
  tests.
- Authenticated attachment tests for the correct Owner, another Owner, and an
  anonymous request.
- Source/binding isolation test proving MCP has no responses or R2 access.

### Gate B — Reliability and observability

- Cleanup retry tests for each failed phase and an end-to-end success test.
- Structured logs include request ID, route, outcome, and safe entity IDs;
  they never include tokens, answer values, or file contents.
- Sentry/error tracking receives uncaught runtime failures without blocking the
  request.
- Health checks identify unavailable database and attachment bindings.

### Gate C — UX and accessibility

- Shared CSS theme variables define color, spacing, typography, radius, focus,
  and motion tokens.
- Critical transitions use reduced-motion-safe CSS or animation primitives.
- Submit/upload controls expose pending state and prevent duplicate actions.
- Errors are associated with fields and announced to assistive technology.
- Empty states contain a concise explanation and a single relevant CTA.
- Custom 404 and 500 pages preserve navigation, branding, and recovery action.

### Gate D — Quality and performance

- `pnpm check-types` passes for every workspace.
- `pnpm lint` passes with zero errors and warnings.
- `pnpm test` covers shared field validation, API boundaries, MCP protocol,
  upload security, and cleanup behavior.
- Fixed-condition Lighthouse runs cover the public form, dashboard, and
  builder; the threshold and baseline are committed with the release report.
- `loading.tsx`/Suspense coverage is verified on every data-heavy route rather
  than inferred from a global spinner.

## Delivery order

1. Close boundary and protocol gaps before visual polish.
2. Add retryable cleanup and safe structured observability.
3. Harden public-form upload/submit journeys.
4. Standardize shared tokens and accessible states.
5. Run performance and release evidence against production-like bindings.

## Explicit non-goals

- Do not add AI access to respondent answers or attachment contents.
- Do not treat response counts as permission to add analytics or summaries.
- Do not add arbitrary CSS or user-provided executable content to Vibes.
- Do not claim compliance certification, uptime, or Lighthouse results without
  an environment-specific measurement and retention policy.

## Glossary additions

**Boundary gate:** A release gate whose proof depends on an enforced
infrastructure or server boundary, not a UI convention.

**Cleanup workflow:** The retryable, observable sequence that removes
attachments, Data Plane rows, and Control Plane rows without claiming atomicity
across independent stores.

**Release evidence:** A retained test result, deployment check, or measurement
that proves a Definition of Done item in a specified environment.
