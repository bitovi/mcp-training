// Canonical URL of this server, used as the OAuth issuer and as the
// resource/audience that tokens must be bound to (RFC 8707).
export const SERVER_URL = process.env.MCP_SERVER_URL || 'http://localhost:3000';
