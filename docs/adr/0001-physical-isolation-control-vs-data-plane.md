# Physical Isolation of Control Plane and Data Plane

To guarantee respondent privacy against AI prompt injections, bugs, or unauthorized data access, form definitions and respondent data are physically separated across distinct Cloudflare D1 databases and Worker bindings. The MCP Worker is bound exclusively to `definitions-db` with zero bindings to `responses-db` or the attachments R2 bucket, enforcing isolation at the infrastructure level rather than at the application or prompt level.
