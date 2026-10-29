# 05: Tracer Bullet 4: Secure File Attachments Pipeline

**What to build:** Provide a secure file upload pipeline for `file_upload` questions. When a respondent uploads a file during form completion, the file is streamed to the API Worker (`POST /f/:slug/upload`), which validates file size, checks magic bytes against permitted MIME types, strips EXIF metadata from raster images, and streams the sanitized binary into the private R2 bucket under a random key. The resulting attachment ID is linked to the response answer in `responses-db`. On the Owner Dashboard, authenticated Owners can view and download attached files through an authorized streaming endpoint.

**Blocked by:** 04 (Tracer Bullet 3: Publish Gate & Public Form Submission).

**Status:** ready-for-agent

- [ ] Respondent can upload files within field-configured size and MIME type limits
- [ ] API Worker validates MIME types via magic bytes (not solely HTTP headers)
- [ ] Image EXIF/location metadata is stripped prior to storage
- [ ] File object is saved to private R2 bucket and metadata stored in `attachments` table
- [ ] Authenticated Owner can stream/download attachments from their dashboard
- [ ] Unauthenticated or unauthorized users are denied access to uploaded files
