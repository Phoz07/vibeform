# Production Hardening and Release Gates

## Status

Accepted

## Context

The MVP already has a deliberately strong boundary: the MCP Worker can access
only the Control Plane, while respondent answers and attachments remain in the
Data Plane. A commercial release must improve the user experience and
operability without turning aspirational checklist items into weaker security
claims or unverifiable quality goals.

## Decisions

### 1. Preserve the physical privacy boundary

The MCP Worker must continue to have only a `DEFINITIONS_DB` binding. It may
read form metadata and an explicitly documented aggregate response count, but
it must never read answer values, attachment metadata that can identify a
respondent, R2 objects, or a proxy endpoint that relays Data Plane content.
The aggregate count is treated as metadata, not respondent data, and must be
covered by an isolation test.

### 2. Treat security controls as server-enforced contracts

- CORS allows only configured, exact origins; missing or invalid production
  configuration fails deployment rather than widening access.
- Security headers are applied at the Worker boundary and the Next.js boundary.
  API-only Workers use a restrictive non-HTML CSP; any HTML-serving boundary
  generates CSP from its actual asset and authentication strategy rather than
  using a permissive placeholder.
- Rate limiting for public submission and upload routes uses a Cloudflare
  stateful primitive (Durable Object, Workers Rate Limiting, or an equivalent
  configured service). In-memory counters are not an acceptable production
  implementation.
- Turnstile is verified server-side before accepting a submission. A client
  widget alone is not a security control.
- File validation uses bounded reads, magic bytes, configured size/type limits,
  and safe generated object keys. Attachment delivery remains authenticated
  through the API Worker.

### 3. Make deletion recoverable

Cross-database deletion is an idempotent cleanup workflow, not an assumption
that three independent writes are atomic. Each phase is safe to retry, records
its progress, and exposes an operational failure. A successful response means
all required phases completed; partial cleanup is never reported as success.

### 4. Use protocol-native MCP failures

Malformed JSON-RPC requests return JSON-RPC errors with the appropriate
standard code. Authentication and authorization failures remain explicit
protocol errors. Tool execution failures use the MCP tool error shape only
after the request itself is valid. Every tool has a precise description and a
closed, validated input schema; undocumented properties are rejected.

### 5. Define design tokens in the active Tailwind system

This repository uses Tailwind v4 CSS theme variables in
`packages/ui/src/styles/globals.css`, not a legacy `tailwind.config.ts` as the
source of truth. Color, spacing, typography, radius, motion, and focus tokens
must therefore be centralized in CSS theme variables and consumed through
shared UI primitives. A config file may be added only if the build actually
uses it.

### 6. Measure performance and accessibility at user-visible boundaries

“Lighthouse above 90” is a release signal, not an implementation requirement
that can be asserted from source inspection. The release gate uses fixed routes,
device/network settings, and a recorded baseline. Accessibility checks cover
keyboard flows, focus visibility, semantic labels, reduced motion, and error
announcements on both public forms and owner flows.

## Consequences

The production work is staged behind independently verifiable gates:

1. **Boundary gate:** MCP isolation, auth scopes, CORS, headers, upload
   validation, and authenticated attachment delivery.
2. **Reliability gate:** idempotent cleanup, structured request/error logs,
   error tracking, health checks, and actionable alerts.
3. **UX gate:** loading, empty, error, success, responsive, keyboard, and
   reduced-motion states for the critical owner and respondent journeys.
4. **Quality gate:** type check, lint, focused unit/integration tests, MCP
   protocol tests, and fixed-condition performance/accessibility measurements.

No gate is considered complete because a dependency is installed or a UI
element exists; each requires an observable test or deployment check.

## Rejected alternatives

- **A legacy `tailwind.config.ts` as the sole token source:** conflicts with
  the repository's Tailwind v4 setup and creates two competing systems.
- **Best-effort in-memory rate limiting:** fails across Worker isolates and
  regions.
- **A synchronous multi-write delete with no retry state:** can leave private
  objects or records behind after a transient failure.
- **A browser-only CAPTCHA check:** can be bypassed without server
  verification.
- **A broad CSP such as `default-src *`:** creates the appearance of hardening
  while preserving injection paths.
