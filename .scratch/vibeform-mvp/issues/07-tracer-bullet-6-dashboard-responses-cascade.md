# 07: Tracer Bullet 6: Dashboard Responses & Synchronous Cascade Cleanup

**What to build:** Provide the Owner Dashboard interface for viewing submitted responses in tabular and detail views, including submission timestamps and answer values. Provide explicit deletion controls for deleting single responses or entire forms. When an Owner deletes a response or form, the API Worker executes a synchronous teardown sequence: first deleting all associated attachment objects from R2, then purging answers and response records from `responses-db`, and finally removing field and form records from `definitions-db`.

**Blocked by:** 04 (Tracer Bullet 3: Publish Gate & Public Form Submission), 05 (Tracer Bullet 4: Secure File Attachments Pipeline).

**Status:** ready-for-agent

- [ ] Authenticated Owner can view list and detail of submitted responses for their forms
- [ ] Non-owners cannot access another user's form responses (IDOR protected)
- [ ] Owner can delete an individual response, purging its answers and R2 attachments
- [ ] Owner can delete an entire form, triggering the synchronous multi-phase cleanup (R2 -> `responses-db` -> `definitions-db`)
- [ ] Zero orphaned attachments remain in R2 after form deletion
- [ ] Deletion is verified across both D1 databases
