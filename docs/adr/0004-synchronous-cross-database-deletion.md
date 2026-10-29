# Synchronous Cascade Deletion Across Decoupled Databases

Because `definitions-db` and `responses-db` are physically separate D1 databases without cross-database foreign key constraints, cascading deletions cannot rely on database triggers. When an Owner deletes a form or response, the API Worker executes a strict synchronous teardown: first deleting attached files from R2, then deleting answers and response records from `responses-db`, and finally deleting field and form records from `definitions-db`. This eliminates orphaned storage costs and guarantees instantaneous privacy compliance.
