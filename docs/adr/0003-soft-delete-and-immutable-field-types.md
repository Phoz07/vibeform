# Soft Delete and Immutable Field Types on Live Forms

To preserve the integrity of existing responses in `responses-db` across schema edits in `definitions-db`, fields are never physically deleted once created; they are soft-deleted using a `deletedAt` timestamp. Furthermore, existing field types are immutable. If an Owner or AI modifies a form, new fields may be appended or old fields hidden, but existing field IDs and types remain permanently stable, preventing orphaned or malformed response data across the decoupled databases.
