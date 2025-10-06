# PKCE Authentication Implementation Plan

## Overview
Implement a complete OAuth 2.1 + PKCE authentication flow for MCP training using `@node-oauth/oauth2-server` with simplified, training-friendly features.

## Dependencies Required
```bash
npm install @node-oauth/oauth2-server express crypto uuid
npm install @types/express --save-dev
```

## File Structure
```
src/
├── http-server.ts          # Minimal changes - just import and call wrapper
├── auth/
│   ├── oauth-wrapper.ts    # Main auth wrapper function
│   ├── oauth-model.ts      # OAuth data model (in-memory storage)
│   ├── oauth-server.ts     # OAuth server configuration
│   └── oauth-handlers.ts   # Route handlers for OAuth endpoints
└── mcp-server.ts           # Existing MCP server (unchanged)
```

## Implementation Steps

### 1. OAuth Data Model (auth/oauth-model.ts)
Implement the required interface for `@node-oauth/oauth2-server`:

**Required methods:**
- `getClient(clientId)` - Return client info
- `saveAuthorizationCode(code, client, user)` - Store auth code + PKCE data
- `getAuthorizationCode(authorizationCode)` - Retrieve and validate auth code
- `revokeAuthorizationCode(authorizationCode)` - Mark code as used
- `saveToken(token, client, user)` - Store access token
- `getAccessToken(accessToken)` - Validate access token

**In-memory storage:**
```typescript
const clients = new Map();
const authorizationCodes = new Map();
const accessTokens = new Map();
```

**Simplified data:**
- Single hardcoded client: `{ id: 'mcp-demo-client', grants: ['authorization_code'], redirectUris: ['http://localhost:3000/callback'] }`
- Auto-approve user (skip authentication): `{ id: 'demo-user' }`
- PKCE validation in authorization code flow

```typescript
import crypto from 'crypto';

// In-memory storage
const clients = new Map([
  ['mcp-demo-client', { 
    id: 'mcp-demo-client', 
    grants: ['authorization_code'], 
    redirectUris: ['http://localhost:3000/callback'] 
  }]
]);
const authorizationCodes = new Map();
const accessTokens = new Map();

export default {
  async getClient(clientId: string) {
    return clients.get(clientId) || null;
  },

  async saveAuthorizationCode(code: any, client: any, user: any) {
    authorizationCodes.set(code.authorizationCode, {
      authorizationCode: code.authorizationCode,
      expiresAt: code.expiresAt,
      redirectUri: code.redirectUri,
      scope: code.scope,
      client: client,
      user: user,
      codeChallenge: code.codeChallenge,
      codeChallengeMethod: code.codeChallengeMethod
    });
    return code;
  },

  async getAuthorizationCode(authorizationCode: string) {
    return authorizationCodes.get(authorizationCode) || null;
  },

  async revokeAuthorizationCode(authorizationCode: string) {
    authorizationCodes.delete(authorizationCode);
    return true;
  },

  async saveToken(token: any, client: any, user: any) {
    accessTokens.set(token.accessToken, {
      accessToken: token.accessToken,
      expiresAt: token.accessTokenExpiresAt,
      scope: token.scope,
      client: client,
      user: user
    });
    return token;
  },

  async getAccessToken(accessToken: string) {
    const token = accessTokens.get(accessToken);
    if (!token) return null;
    
    // Check if token is expired
    if (token.expiresAt && token.expiresAt < new Date()) {
      accessTokens.delete(accessToken);
      return null;
    }
    
    return token;
  },

  // PKCE verification
  async verifyScope(token: any, scope: string) {
    return true; // Simplified for training
  }
};
```

### 2. OAuth Server Configuration (auth/oauth-server.ts)
Configure the OAuth server with PKCE support:

```typescript
import OAuth2Server from '@node-oauth/oauth2-server';
import model from './oauth-model.js';

const oauth = new OAuth2Server({
  model: model,
  requireClientAuthentication: {
    authorization_code: false  // PKCE replaces client secret
  },
  allowBearerTokensInQueryString: true,
  accessTokenLifetime: 3600,
  authorizationCodeLifetime: 600
});

export { oauth };
```

### 3. OAuth Route Handlers (auth/oauth-handlers.ts)
Implement the three main OAuth endpoints:

```typescript
import express from 'express';
import { oauth } from './oauth-server.js';

export function discovery(req: express.Request, res: express.Response) {
  res.json({
    issuer: 'http://localhost:3000',
    authorization_endpoint: 'http://localhost:3000/authorize',
    token_endpoint: 'http://localhost:3000/token',
    code_challenge_methods_supported: ['S256']
  });
}

export async function authorize(req: express.Request, res: express.Response) {
  try {
    // For training simplicity, show consent page for GET, handle approval for POST
    if (req.method === 'GET') {
      // Show consent page with OAuth parameters
      const { client_id, redirect_uri, code_challenge, code_challenge_method, state } = req.query;
      
      const consentPage = `
        <!DOCTYPE html>
        <html>
        <head><title>MCP Demo - Authorize</title></head>
        <body>
          <h1>Authorize MCP Demo Client</h1>
          <p>MCP Demo Client wants to access your account.</p>
          
          <h3>OAuth Parameters:</h3>
          <div style="background: #f5f5f5; padding: 10px; margin: 10px 0; border-radius: 4px;">
            <p><strong>Client ID:</strong> <input type="text" value="${client_id}" readonly style="width: 200px; background: #fff;"></p>
            <p><strong>Redirect URI:</strong> <input type="text" value="${redirect_uri}" readonly style="width: 300px; background: #fff;"></p>
            <p><strong>Code Challenge:</strong> <input type="text" value="${code_challenge}" readonly style="width: 400px; background: #fff;"></p>
            <p><strong>Challenge Method:</strong> <input type="text" value="${code_challenge_method}" readonly style="width: 100px; background: #fff;"></p>
            <p><strong>State:</strong> <input type="text" value="${state || ''}" readonly style="width: 300px; background: #fff;"></p>
          </div>
          
          <form method="post">
            <input type="hidden" name="client_id" value="${client_id}">
            <input type="hidden" name="redirect_uri" value="${redirect_uri}">
            <input type="hidden" name="code_challenge" value="${code_challenge}">
            <input type="hidden" name="code_challenge_method" value="${code_challenge_method}">
            <input type="hidden" name="state" value="${state || ''}">
            <button type="submit" name="authorize" value="true" style="background: green; color: white; padding: 10px 20px; margin: 5px;">Allow</button>
            <button type="submit" name="authorize" value="false" style="background: red; color: white; padding: 10px 20px; margin: 5px;">Deny</button>
          </form>
        </body>
        </html>
      `;
      
      res.send(consentPage);
      return;
    }
    
    // Handle POST - user authorization decision
    if (req.body.authorize !== 'true') {
      const redirectUri = req.body.redirect_uri;
      const state = req.body.state;
      return res.redirect(`${redirectUri}?error=access_denied&state=${state}`);
    }
    
    // User approved - use OAuth server to generate authorization code
    const authRequest = new oauth.Request(req);
    const authResponse = new oauth.Response(res);
    
    const code = await oauth.authorize(authRequest, authResponse, {
      authenticateHandler: {
        handle: () => ({ id: 'demo-user' }) // Auto-approve demo user
      }
    });
    
    // OAuth server handles the redirect with authorization code
  } catch (error) {
    console.error('Authorization error:', error);
    res.status(500).json({ error: 'Authorization failed' });
  }
}

export async function token(req: express.Request, res: express.Response) {
  try {
    const tokenRequest = new oauth.Request(req);
    const tokenResponse = new oauth.Response(res);
    
    const token = await oauth.token(tokenRequest, tokenResponse);
    
    // OAuth server automatically sends the response
  } catch (error) {
    console.error('Token error:', error);
    res.status(400).json({ error: 'invalid_grant' });
  }
}
```

### 4. Auth Wrapper (auth/oauth-wrapper.ts)
Single function that adds OAuth to any Express app:

```typescript
import express from 'express';
import { oauth } from './oauth-server.js';
import { discovery, authorize, token } from './oauth-handlers.js';
import model from './oauth-model.js';

export function addOAuthToApp(app: express.Application) {
  // Add OAuth endpoints
  app.get('/.well-known/oauth-authorization-server', discovery);
  app.get('/authorize', authorize);
  app.post('/authorize', authorize);  // Handle both GET (consent page) and POST (approval)
  app.post('/token', token);
  
  // Add authentication middleware to /mcp routes
  app.use('/mcp', authenticateRequest);
  
  return app;
}

async function authenticateRequest(req: express.Request, res: express.Response, next: express.NextFunction) {
  try {
    // Extract bearer token
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return send401(res, req, 'Missing Authorization header');
    }
    
    const token = authHeader.substring(7);
    
    // Validate token using OAuth model  
    const accessToken = await model.getAccessToken(token);
    if (!accessToken) {
      return send401(res, req, 'Invalid or expired access token');
    }
    
    // Add auth info to request
    req.auth = { user: accessToken.user, client: accessToken.client };
    next();
  } catch (error) {
    return send401(res, req, 'Token validation failed');
  }
}

function isVSCodeClient(req: express.Request): boolean {
  // Check User-Agent header - VS Code sends "node"
  const userAgent = req.headers['user-agent'];
  if (userAgent === 'node') {
    return true;
  }
  
  // Check MCP initialize request clientInfo
  if (req.body?.method === 'initialize' && req.body?.params?.clientInfo) {
    const clientName = req.body.params.clientInfo.name;
    if (clientName === 'Visual Studio Code') {
      return true;
    }
  }
  
  return false;
}

function createWwwAuthenticate(req: express.Request, errorDescription?: string): string {
  const metadataUrl = 'http://localhost:3000/.well-known/oauth-authorization-server';
  
  let authValue = 'Bearer realm="mcp"';
  
  // Add error description if provided
  if (errorDescription) {
    authValue += `, error="invalid_token", error_description="${errorDescription}"`;
  }
  
  // VS Code requires non-standard resource_metadata_url parameter
  // Other clients use standard resource_metadata parameter (RFC 9728)
  if (isVSCodeClient(req)) {
    authValue += `, resource_metadata_url="${metadataUrl}"`;
  } else {
    authValue += `, resource_metadata="${metadataUrl}"`;
  }
  
  return authValue;
}

function send401(res: express.Response, req: express.Request, errorDescription?: string) {
  res.status(401)
    .header('WWW-Authenticate', createWwwAuthenticate(req, errorDescription))
    .header('Cache-Control', 'no-cache, no-store, must-revalidate')
    .header('Pragma', 'no-cache')
    .header('Expires', '0')
    .json({
      jsonrpc: '2.0',
      error: { code: -32001, message: errorDescription || 'Authentication required' },
      id: req.body?.id || null
    });
}
```

### 5. Minimal HTTP Server Changes (http-server.ts)
Only add 2 lines to existing server:

```typescript
#!/usr/bin/env node --import ./loader.mjs
import express from 'express';
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { createMcpServer } from "./mcp-server.js";
import { addOAuthToApp } from "./auth/oauth-wrapper.js";  // ADD THIS LINE

const app = express();

// Existing middleware
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// ADD THIS LINE - adds OAuth endpoints and auth middleware
addOAuthToApp(app);

// Existing CORS and session management code stays the same
// ... rest of existing http-server.ts unchanged
```

## Training Flow

### Phase 1: Setup
1. Install dependencies: `npm install @node-oauth/oauth2-server crypto uuid`
2. Start server: `npm run dev:http` (port 3000)
3. Verify discovery endpoint: `curl http://localhost:3000/.well-known/oauth-authorization-server`
4. Verify MCP endpoint returns 401: `curl http://localhost:3000/mcp`
```

### 2. OAuth Server Configuration (oauth/server.ts)
Configure the OAuth server with PKCE support:

```typescript
import OAuth2Server from '@node-oauth/oauth2-server';
import model from './model.js';

const oauth = new OAuth2Server({
  model: model,
  requireClientAuthentication: {
    authorization_code: false  // PKCE replaces client secret
  },
  allowBearerTokensInQueryString: true,
  accessTokenLifetime: 3600,
  authorizationCodeLifetime: 600
});
```

### 3. OAuth Route Handlers (oauth/handlers.ts)
Implement the three main OAuth endpoints:

**Discovery endpoint** (`/.well-known/oauth-authorization-server`):
```json
{
  "issuer": "http://localhost:3000",
  "authorization_endpoint": "http://localhost:3000/authorize",
  "token_endpoint": "http://localhost:3000/token",
  "code_challenge_methods_supported": ["S256"]
}
```

**Authorization endpoint** (`/authorize`):
- Validate PKCE code_challenge and code_challenge_method
- Auto-approve for demo (skip user login)
- Generate authorization code with PKCE data
- Redirect to client with code

**Token endpoint** (`/token`):
- Validate authorization code
- Verify PKCE code_verifier against stored code_challenge
- Issue access token
- Return JSON response

### 4. Combined Server (http-server.ts)
Single Express server hosting both OAuth and MCP endpoints:

```typescript
import express from 'express';
import { oauth } from './oauth/server.js';
import { authorize, token, discovery } from './oauth/handlers.js';
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { createMcpServer } from "./mcp-server.js";

const app = express();

// OAuth endpoints
app.get('/.well-known/oauth-authorization-server', discovery);
app.get('/authorize', authorize);
app.post('/token', token);

// MCP endpoints with auth middleware
app.post('/mcp', authenticateRequest, handleMcpPost);
app.get('/mcp', authenticateRequest, handleMcpGet);
app.delete('/mcp', authenticateRequest, handleMcpDelete);

app.listen(3000, () => {
  console.log('� Combined MCP + OAuth Server running on http://localhost:3000');
});
```

**Authentication middleware:**
- Extract `Authorization: Bearer <token>` header
- Validate token using OAuth model
- Return 401 with proper `WWW-Authenticate` header if invalid
- Set auth context for valid requests

**Session management:**
- Only create new sessions for authenticated requests
- Store auth info with session
- Validate auth on all subsequent requests

### 5. Simple Consent Page
Basic HTML page for authorization approval:

```html
<!DOCTYPE html>
<html>
<head><title>MCP Demo - Authorize</title></head>
<body>
  <h1>Authorize MCP Demo Client</h1>
  <p>MCP Demo Client wants to access your account.</p>
  
  <h3>OAuth Parameters:</h3>
  <div style="background: #f5f5f5; padding: 10px; margin: 10px 0; border-radius: 4px;">
    <p><strong>Client ID:</strong> <input type="text" name="client_id" value="{client_id}" readonly style="width: 200px; background: #fff;"></p>
    <p><strong>Redirect URI:</strong> <input type="text" name="redirect_uri" value="{redirect_uri}" readonly style="width: 300px; background: #fff;"></p>
    <p><strong>Code Challenge:</strong> <input type="text" name="code_challenge" value="{code_challenge}" readonly style="width: 400px; background: #fff;"></p>
    <p><strong>Challenge Method:</strong> <input type="text" name="code_challenge_method" value="{code_challenge_method}" readonly style="width: 100px; background: #fff;"></p>
    <p><strong>State:</strong> <input type="text" name="state" value="{state}" readonly style="width: 300px; background: #fff;"></p>
  </div>
  
  <form method="post">
    <button type="submit" name="authorize" value="true" style="background: green; color: white; padding: 10px 20px; margin: 5px;">Allow</button>
    <button type="submit" name="authorize" value="false" style="background: red; color: white; padding: 10px 20px; margin: 5px;">Deny</button>
  </form>
</body>
</html>
```

## Training Flow

### Phase 1: Setup
1. Start combined server: `npm run dev:http` (port 3000)
2. Verify discovery endpoint: `curl http://localhost:3000/.well-known/oauth-authorization-server`
3. Verify MCP endpoint returns 401: `curl http://localhost:3000/mcp`

### Phase 2: MCP Inspector Testing
1. Connect to `http://localhost:3000/mcp`
2. Expect 401 with WWW-Authenticate header pointing to OAuth server
3. MCP Inspector should show OAuth flow UI
4. Complete OAuth flow in browser
5. Return to Inspector with access token
6. Test tool calls with authentication

### Phase 3: VS Code Testing
1. Configure MCP client with OAuth settings
2. Test OAuth flow through VS Code
3. Verify authenticated tool access

## Simplifications for Training

1. **No user authentication** - Auto-approve all requests
2. **Hardcoded client** - Single pre-registered client ID (spec-compliant, required per RFC 6749)
3. **Single server** - Combined OAuth + MCP endpoints on one port (simpler setup)
4. **In-memory storage** - No database required
5. **Local-only** - All URLs use localhost
6. **Minimal UI** - Simple HTML forms
7. **No scopes** - Binary access (authenticated vs not)

## Expected Outcomes

Students will learn:
- Complete OAuth 2.1 + PKCE flow
- MCP authentication patterns
- 401/WWW-Authenticate headers
- Session-based authentication
- Browser-based OAuth flows
- Token validation and storage

The implementation provides a realistic but simplified OAuth experience that demonstrates real-world MCP authentication patterns without excessive complexity.
