# Colocation of Authentication Tables in the Definitions Database

User accounts, sessions, and hashed MCP tokens reside in `definitions-db` (Control Plane). This allows the MCP Worker to validate incoming bearer tokens against the Owner's identity in a single local query without requiring remote RPC or cross-database federation. In contrast, `responses-db` (Data Plane) remains completely devoid of user and credential schemas, strictly storing anonymous submission payloads keyed solely by `formId`.
