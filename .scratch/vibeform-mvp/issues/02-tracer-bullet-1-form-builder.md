# 02: Tracer Bullet 1: Form Builder & Field Management

**What to build:** Allow an authenticated Owner to create a new Form Definition in draft state, view their forms list, add questions across all 7 supported field types (Short Text, Long Text, Single Choice, Multiple Choice, Rating, Date, File Upload), edit field labels/configs, reorder questions, and soft-delete fields. The Owner can preview their form interactively in real time within the Web Builder UI.

**Blocked by:** 01 (Prefactoring: Dual D1 Databases & Monorepo Topology).

**Status:** ready-for-agent

- [ ] Owner can create a form draft with title and description via tRPC
- [ ] Polymorphic Zod schemas in shared package define configs for all 7 field types
- [ ] Owner can add, edit, reorder, and soft-delete fields with `deletedAt`
- [ ] Web Builder UI in Next.js allows visual editing of field questions and options
- [ ] Interactive live form preview updates as fields are added or modified
- [ ] Unauthorized users cannot view or modify forms owned by other users
