import crypto from 'crypto';

// In-memory storage: fine for one local training server, not for production.
const clients = new Map<string, any>();
const registeredClients = new Map<string, any>();
const authorizationCodes = new Map<string, any>();
const accessTokens = new Map<string, any>();

// A client's chosen `resource` (the MCP server URL it wants a token for)
// isn't part of the OAuth library's authorization-code model, so we stash
// it here, keyed by the code_challenge that uniquely identifies this
// authorization attempt, and pick it back up in saveAuthorizationCode.
const pendingResources = new Map<string, string>();

const CIMD_FETCH_TIMEOUT_MS = 3000;

// Fetch a Client ID Metadata Document. Under the current spec, a client's
// id is the HTTPS URL of a small JSON document it hosts describing itself
// (name, redirect_uris). This is the preferred way for a client to
// identify itself, ahead of Dynamic Client Registration below.
async function fetchClientIdMetadataDocument(clientId: string) {
  const response = await fetch(clientId, {
    signal: AbortSignal.timeout(CIMD_FETCH_TIMEOUT_MS),
    headers: { Accept: 'application/json' }
  });

  if (!response.ok) {
    throw new Error(`CIMD fetch failed: HTTP ${response.status}`);
  }

  const doc = await response.json();

  if (!Array.isArray(doc.redirect_uris) || doc.redirect_uris.length === 0) {
    throw new Error('CIMD document has no redirect_uris');
  }

  return {
    id: clientId,
    grants: ['authorization_code'],
    redirectUris: doc.redirect_uris,
    name: doc.client_name
  };
}

export default {
  async getClient(clientId: string, _clientSecret?: string) {
    if (clients.has(clientId)) {
      return clients.get(clientId);
    }

    // Registered earlier via the (legacy) POST /register endpoint.
    if (registeredClients.has(clientId)) {
      const client = registeredClients.get(clientId);
      clients.set(clientId, client);
      return client;
    }

    // client_id looks like a Client ID Metadata Document URL: fetch it to
    // learn the client's real redirect_uris.
    if (/^https?:\/\//.test(clientId)) {
      try {
        const client = await fetchClientIdMetadataDocument(clientId);
        clients.set(clientId, client);
        console.log(`Resolved client via CIMD: ${clientId} -> ${client.redirectUris.join(', ')}`);
        return client;
      } catch (error) {
        console.warn(`CIMD fetch failed for ${clientId}, falling back to an unvalidated demo client:`, error);
      }
    }

    // Fallback for local demo/dev clients (e.g. MCP Inspector) that pass an
    // opaque client_id with no CIMD document and never called /register. A
    // production server should reject this case instead of auto-creating a
    // client for it.
    const client = {
      id: clientId,
      grants: ['authorization_code'],
      redirectUris: ['DYNAMIC'] // placeholder: validateRedirectUri allows anything for this case
    };
    clients.set(clientId, client);
    console.warn(`No CIMD document or registration for client_id "${clientId}", using an unvalidated demo client.`);
    return client;
  },

  async validateRedirectUri(redirectUri: string, client: any) {
    if (!client.redirectUris || client.redirectUris.includes('DYNAMIC')) {
      return true; // unvalidated demo client, see the fallback above
    }
    return client.redirectUris.includes(redirectUri);
  },

  // Backwards-compatible Dynamic Client Registration (RFC 7591). Prefer
  // CIMD above; this exists only for clients that don't support it yet.
  registerClient(clientId: string, clientData: any) {
    const client = {
      id: clientId,
      grants: ['authorization_code'],
      redirectUris: clientData.redirect_uris || ['http://localhost:3000/callback']
    };
    registeredClients.set(clientId, client);
    return client;
  },

  setPendingResource(codeChallenge: string | undefined, resource: string | undefined) {
    if (codeChallenge && resource) {
      pendingResources.set(codeChallenge, resource);
    }
  },

  async saveAuthorizationCode(code: any, client: any, user: any) {
    const resource = pendingResources.get(code.codeChallenge);
    pendingResources.delete(code.codeChallenge);

    authorizationCodes.set(code.authorizationCode, {
      authorizationCode: code.authorizationCode,
      expiresAt: code.expiresAt,
      redirectUri: code.redirectUri,
      scope: code.scope,
      client,
      user,
      codeChallenge: code.codeChallenge,
      codeChallengeMethod: code.codeChallengeMethod,
      resource
    });
    return code;
  },

  async getAuthorizationCode(authorizationCode: string) {
    const code = authorizationCodes.get(authorizationCode);
    if (!code) return null;

    // Smuggle the resource this code was authorized for onto `user`, the
    // one field the OAuth library carries through to saveToken() below, so
    // the issued token ends up bound to the resource that was actually
    // authorized rather than whatever a client claims at the token step.
    return {
      ...code,
      user: { ...code.user, resource: code.resource }
    };
  },

  async revokeAuthorizationCode(code: any) {
    authorizationCodes.delete(code.authorizationCode);
    return true;
  },

  async generateAccessToken(_client: any, _user: any, _scope: any) {
    return crypto.randomBytes(32).toString('hex');
  },

  async saveToken(token: any, client: any, user: any) {
    const savedToken = {
      accessToken: token.accessToken,
      accessTokenExpiresAt: token.accessTokenExpiresAt,
      scope: token.scope,
      client,
      user,
      resource: user?.resource
    };

    accessTokens.set(token.accessToken, savedToken);
    return savedToken;
  },

  async getAccessToken(accessToken: string) {
    const token = accessTokens.get(accessToken);
    if (!token) return null;

    if (token.accessTokenExpiresAt && token.accessTokenExpiresAt < new Date()) {
      accessTokens.delete(accessToken);
      return null;
    }

    return token;
  },

  async verifyScope(_token: any, _scope: string[]) {
    return true; // Simplified for training
  }
};
