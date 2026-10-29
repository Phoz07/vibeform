# Spec: Vibe Form MVP

## Problem Statement

When users create forms using traditional form builders, the process is manual and tedious. While modern AI assistants could dramatically accelerate form creation, conventional architectures require granting the AI full visibility over the application database. If an AI model or plugin has access to the form system, respondents' private submissions—including sensitive personal data, health information, contact details, and uploaded documents—are exposed to the AI provider. This creates severe compliance, privacy, and prompt-injection risks, forcing form creators to either endure manual form setup or sacrifice respondent privacy.

## Solution

Vibe Form solves this by decoupling the **Control Plane** (where forms are defined, styled, and edited with AI assistance) from the **Data Plane** (where respondent answers and attachments are stored). This separation is physically enforced at the infrastructure level via separate Cloudflare Worker bindings and discrete D1 databases. AI clients (such as Claude via MCP) connect to a dedicated MCP Worker with access only to form definitions and zero access to responses or attachments. Owners enjoy frictionless conversational form authoring while respondents are mathematically and architecturally guaranteed that their submitted answers can never be read, ingested, or leaked by AI.

## User Stories

1. As an Owner, I want to authenticate to the web application with my email and password, so that I can securely manage my forms and view submitted responses.
2. As an Owner, I want to generate a scoped MCP Token from my web dashboard, so that I can connect external AI assistants like Claude Desktop to build forms on my behalf.
3. As an Owner, I want to view my active MCP Tokens, see when they were last used, and revoke them instantly, so that I maintain full control over external AI access.
4. As an Owner, I want to instruct an AI assistant via MCP to generate a new form draft with specific questions, so that I do not have to manually configure each field from scratch.
5. As an Owner, I want newly created AI-generated forms to always initialize in a `draft` state, so that unfinished or untrusted forms are never exposed to the public prematurely.
6. As an Owner, I want to review form drafts in the Web Builder, edit question labels, change required flags, and reorder fields, so that I can refine the AI's initial work.
7. As an Owner, I want the AI to select and apply visual Vibes (design tokens like playful, minimal, formal, cyberpunk) to my form via MCP, so that the form matches my desired aesthetic without manual CSS styling.
8. As an Owner, I want the system to restrict Vibe customization to whitelisted design tokens, so that malicious prompts or AI hallucinations cannot inject executable scripts or corrupt the layout.
9. As an Owner, I want a mandatory Publish Gate on the Web Dashboard where I must explicitly click "Publish", so that AI cannot unilaterally make forms public.
10. As an Owner, I want each published form to receive an unguessable public URL slug by default, so that unauthorized internet users cannot guess or scrape my form link.
11. As an Owner, I want the option to customize the public URL slug (e.g., `/f/summer-camp-2026`), so that the link is memorable and easy to share.
12. As an Owner, I want to unpublish or close a form at any time, so that respondents can no longer submit answers once a deadline has passed.
13. As an Owner, I want to view all submitted responses for my forms in a private dashboard, so that I can inspect respondent data without exposing it to any external service.
14. As an Owner, I want to download or view respondent-uploaded attachments securely through an authenticated stream, so that private files are never publicly exposed on the open web.
15. As an Owner, I want to delete individual responses or entire forms and have the system synchronously purge all associated records across both databases and R2 storage, so that no orphaned personal data remains.
16. As an Owner, I want the MCP Worker to report only the aggregate count of responses for my forms, so that my AI assistant can report high-level progress without having access to respondent answers.
17. As an Owner, I want to add new fields to a published form without breaking or corrupting existing submitted responses, so that I can adapt live forms safely.
18. As a Respondent, I want to access a published form via a public link on any desktop or mobile browser, so that I can submit my information easily.
19. As a Respondent, I want clear, real-time client-side validation on every question (short text, long text, single choice, multiple choice, rating, date, file upload), so that I know immediately if an input is invalid before submitting.
20. As a Respondent, I want to upload file attachments within permitted size and MIME type limits, so that I can submit required documentation alongside my form.
21. As a Respondent, I want the server to strip EXIF metadata and validate magic bytes on my uploaded files, so that my location and camera metadata are not stored unnecessarily.
22. As a Respondent, I want to receive immediate visual confirmation upon successful submission, so that I know my answers were received.
23. As a Respondent, I want architectural assurance that my submitted answers and files reside in an isolated Data Plane inaccessible to AI models, so that my personal privacy is guaranteed.
24. As an Interviewer / Demo Viewer, I want to inspect the Worker bindings and architecture diagram, so that I can verify that physical isolation is enforced at the infrastructure level rather than through prompt engineering.

## Implementation Decisions

### 1. Monorepo & Application Topology
- The codebase is structured as a monorepo containing:
  - Frontend Web Application: Next.js handling the Owner Dashboard, Form Builder, and Public Respondent Form Page.
  - API Worker: Hono application handling Owner tRPC endpoints, Better Auth session authentication, public submission endpoints, file upload streaming, and cross-database cascade deletions. Bound to `DEFINITIONS_DB`, `RESPONSES_DB`, and the `ATTACHMENTS` R2 bucket.
  - MCP Worker: Dedicated Hono application implementing the Model Context Protocol over Streamable HTTP and SSE. Bound exclusively to `DEFINITIONS_DB`. It possesses zero bindings to `RESPONSES_DB` and zero bindings to `ATTACHMENTS`.

### 2. Physical Database Separation
- **Definitions Database (Control Plane)**:
  - Stores `user`, `session`, `account`, and `verification` tables managed by Better Auth.
  - Stores `mcp_tokens`: Contains hashed token strings (SHA-256), assigned `ownerId`, scopes (`forms:read`, `forms:write`), expiration timestamps, and last used timestamps.
  - Stores `forms`: Contains form metadata (`id`, `ownerId`, `title`, `description`, `slug`, `status` [draft, published, closed], `vibeTokens`, `createdAt`, `updatedAt`).
  - Stores `fields`: Contains question definitions (`id`, `formId`, `type`, `label`, `required`, `position`, `config`, `deletedAt`).
- **Responses Database (Data Plane)**:
  - Stores `responses`: Contains submission metadata (`id`, `formId`, `submittedAt`).
  - Stores `answers`: Contains individual field values (`id`, `responseId`, `fieldId`, `value`).
  - Stores `attachments`: Contains uploaded file metadata (`id`, `answerId`, `r2Key`, `fileName`, `mimeType`, `sizeBytes`, `createdAt`).
  - Note: Cross-database foreign keys do not exist; referential integrity is orchestrated at the API Worker service layer.

### 3. Human-Only Publish Gate
- The MCP Worker does NOT expose any `publish_form` tool. AI agents can only create forms in `draft` status, add fields, update fields, reorder fields, remove fields, and adjust Vibes.
- Transitioning a form to `published` or `closed` is strictly gated behind an authenticated user action in the Next.js Web Dashboard via the API Worker.

### 4. Field Mutation & Schema Stability
- Fields utilize soft deletion via a `deletedAt` timestamp. When an Owner or AI removes a field, its record is marked with `deletedAt`, hiding it from subsequent public submissions while preserving historical mappings for preexisting answers in the Data Plane.
- Existing field types are immutable. Changing a field's underlying type requires creating a new field.

### 5. Type-Safe Field Definitions & Validation
- Field configuration and respondent answers are governed by a shared polymorphic schema with the following types:
  - `short_text`: Config contains optional `minLength`, `maxLength`, and `placeholder`.
  - `long_text`: Config contains optional `minLength`, `maxLength`, and `placeholder`.
  - `single_choice`: Config contains `options` (array of strings) and optional `allowOther`.
  - `multiple_choice`: Config contains `options`, optional `minSelections`, and optional `maxSelections`.
  - `rating`: Config contains `maxRating` (default 5) and optional `lowLabel`, `highLabel`.
  - `date`: Config contains optional `minDate` and `maxDate`.
  - `file_upload`: Config contains `maxSizeBytes` and `allowedMimeTypes`.

### 6. File Attachment Processing
- Respondent file uploads are streamed directly through the API Worker (`POST /f/:slug/upload`).
- The API Worker performs inline magic-byte validation against permitted MIME types, strips EXIF metadata from raster images, generates a cryptographically random R2 key, stores the object in the private R2 bucket, and returns an attachment token.
- Attachments are served exclusively to the authenticated Owner via an authorized streaming endpoint in the API Worker.

### 7. Vibe Customization Engine
- Form aesthetic styling is restricted to predefined presets (`playful`, `minimal`, `formal`, `cyberpunk`, `warm`) and a strict whitelist of design tokens:
  - `primaryColor`: Hex color string
  - `backgroundColor`: Hex color string
  - `borderRadius`: Enumerated scale (none, sm, md, lg, full)
  - `fontFamily`: Enumerated safe font stack (sans, serif, mono, rounded)
- Freeform CSS injection is disallowed to eliminate XSS vectors.

### 8. Synchronous Cross-Database Teardown
- Deleting a form or response triggers a synchronous multi-phase cleanup inside the API Worker:
  1. Retrieve all associated attachment R2 keys from `responses-db` and delete them from the R2 bucket.
  2. Delete associated answers and response rows from `responses-db`.
  3. Delete associated fields and form metadata from `definitions-db`.

## Testing Decisions

### What Makes a Good Test
- Tests must verify observable system behavior at the highest possible architectural boundaries rather than asserting private implementation details or internal state.
- Tests must explicitly prove the core value proposition: that the Control Plane is functional and that the MCP Worker is physically incapable of querying or leaking Data Plane responses.

### Modules and Seams Tested
- **Primary Testing Seam: Worker HTTP Boundary (`app.request`)**
  - **API Worker Seam**: Tests invoke `serverApp.request()` with in-memory D1 test databases and mocked R2 bindings. Verifies authenticated Owner tRPC actions, public form fetching, input validation on submission, file upload handling, and cascade deletion.
  - **MCP Worker Seam**: Tests invoke `mcpApp.request()` passing only `DEFINITIONS_DB`. Verifies JSON-RPC protocol compliance over HTTP, Bearer token authentication, tool execution (`create_form`, `add_field`, `set_vibe`, `get_response_count`), rejection of unauthorized tokens, absence of publish tools, and absence of response-reading capabilities.
  - **Isolation Assertion Test**: Formally proves that attempting to inject or request respondent answers through the MCP Worker results in protocol-level errors due to the total absence of Data Plane bindings.
- **Secondary Testing Seam: Client Form Schema Validation**
  - Unit tests verifying that the shared polymorphic field schema accurately validates conforming inputs and rejects malformed submissions across all 7 field types.

### Prior Art
- Hono's native `app.request()` test harness using standard Fetch Request and Response objects against simulated Cloudflare Worker environments.

## Out of Scope

- AI automated analysis or summarization of submitted responses (deferred to post-v1).
- Multi-user collaboration or real-time concurrent editing of forms.
- Payment processing or monetization gateways.
- Advanced conditional branching or complex multi-page wizards (planned for future milestones).
- Third-party webhook integrations for respondent submissions.

## Further Notes

- The project relies on Better Auth for session and credential management, with user and session tables residing in `definitions-db`.
- MCP tools will be verified against Claude Desktop using standard configuration format:
  ```json
  {
    "mcpServers": {
      "vibeform": {
        "url": "http://localhost:3002/mcp",
        "headers": {
          "Authorization": "Bearer <mcp_token>"
        }
      }
    }
  }
  ```
