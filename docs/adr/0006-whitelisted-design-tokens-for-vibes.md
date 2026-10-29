# Whitelisted Design Tokens for Vibe Customization

To allow AI to dynamically style form aesthetics according to user prompts without introducing Cross-Site Scripting (XSS) or broken layout vulnerabilities, Vibes are constrained to predefined token dictionaries and curated presets (e.g., playful, minimal, formal, cyberpunk). The MCP Worker only accepts mutations to whitelisted token keys (primaryColor, backgroundColor, borderRadius, fontFamily) rather than arbitrary CSS or class injections.
