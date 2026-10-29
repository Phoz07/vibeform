# Human-Only Publish Gate

AI clients interacting via the MCP Worker are strictly limited to drafting and modifying form definitions; they are prohibited from publishing forms or making them publicly accessible. Transitioning a form from `draft` to `published` requires explicit human intervention via the Web Dashboard. This mitigates prompt injection risks and ensures that untrusted AI outputs cannot unilaterally activate public data collection.
