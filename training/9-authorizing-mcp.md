## OAuth 2.1 + PKCE Flow Sequence Diagram

Here's what happens when VS Code (or another MCP client) connects to our OAuth-protected MCP server:

<!-- todo: Recommend a mermaid diagram plugin. VScode supports no diagramming languages by default. - ex: Markdown Preview Mermaid Support -->

```mermaid
sequenceDiagram
    participant VSCode as VS Code MCP Client
    participant Server as MCP OAuth Server
    participant Browser as User Browser
    participant User as User

    Note over VSCode,User: Phase 1: Initial Connection (No Auth)
    VSCode->>Server: POST /mcp (initialize, no auth)
    Note over Server: authenticateRequest(): Check for Bearer token → none found
    Server->>VSCode: 401 + WWW-Authenticate header

    Note over VSCode,User: Phase 2: OAuth Discovery
    VSCode->>Server: GET /.well-known/oauth-authorization-server
    Note over Server: discovery(): Return OAuth metadata (endpoints, PKCE support)
    Server->>VSCode: OAuth server configuration

    VSCode->>Server: GET /.well-known/oauth-protected-resource
    Note over Server: protectedResourceMetadata(): Return resource metadata
    Server->>VSCode: Resource server configuration

    Note over VSCode,User: Phase 3: Client Registration (Optional)
    VSCode->>Server: POST /register (dynamic client registration)
    Note over Server: register(): Generate client_id for MCP client
    Server->>VSCode: Client credentials (client_id)

    Note over VSCode,User: Phase 4: Authorization Request
    Note over VSCode: Generate PKCE code_verifier & code_challenge
    VSCode->>Server: GET /authorize?client_id=...&code_challenge=...&redirect_uri=...
    Note over Server: authorizeGet(): Show consent page to user
    Server->>VSCode: 200 HTML consent page

    Note over VSCode,Browser: VS Code opens browser
    VSCode->>Browser: Open consent page URL
    Browser->>User: Display consent page
    User->>Browser: Click "Allow" button
    Browser->>Server: POST /authorize (user approval)
    Note over Server: authorizeDecision(): Generate authorization_code with PKCE binding
    Server->>Browser: 302 redirect to VS Code with auth code
    Browser->>VSCode: Redirect with code=...&state=...

    Note over VSCode,User: Phase 5: Token Exchange
    VSCode->>Server: POST /token (grant_type=authorization_code + PKCE code_verifier)
    Note over Server: oauth.token(): Validate auth code & verify PKCE code_challenge
    Server->>VSCode: Access token (Bearer token)

    Note over VSCode,User: Phase 6: Authenticated MCP Session
    VSCode->>Server: POST /mcp (initialize + Bearer token)
    Note over Server: authenticateRequest(): Validate Bearer token → success
    Note over Server: Create StreamableHTTPServerTransport
    Note over Server: Store transport by session ID
    Server->>VSCode: MCP session established

    Note over VSCode,User: Phase 7: MCP Operations
    VSCode->>Server: POST /mcp (list_tools + Bearer token)
    Note over Server: authenticateRequest(): Validate token → serve MCP request
    Server->>VSCode: Available tools (slugify, countdown)

    VSCode->>Server: POST /mcp (call_tool + Bearer token)
    Note over Server: authenticateRequest(): Validate token → execute tool
    Server->>VSCode: Tool result
```

<!-- TODO: Missing the "problem" & "verify" sections. & need more than just the diagram for the background info section.  -->

## Solution

The OAuth 2.1 + PKCE authentication system is already implemented in the `src/auth/` folder. You only need to integrate it into your existing HTTP server.

### Update HTTP Server (`src/http-server.ts`)

Add OAuth authentication to your existing HTTP server from step 7 with these changes:

```diff
#!/usr/bin/env -S node --import ./loader.mjs
import express from 'express';
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { createMcpServer } from "./mcp-server.js";
+ import { addOAuthToApp } from "./auth/oauth-wrapper.js";

const app = express();

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

- // Add CORS headers
+ // Add CORS headers FIRST
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
-   res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, Mcp-Session-Id, MCP-Protocol-Version');
+   res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, Mcp-Session-Id, MCP-Protocol-Version, WWW-Authenticate');
+   res.header('Access-Control-Expose-Headers', 'WWW-Authenticate');

  if (req.method === 'OPTIONS') {
    res.sendStatus(200);
    return;
  }
  next();
});

+ // Add OAuth endpoints and authentication AFTER CORS
+ addOAuthToApp(app);

// Map to store transports by session ID
const transports: Record<string, StreamableHTTPServerTransport> = {};

// ... rest of the existing code remains unchanged
```

**Key Changes:**

1. **Line 5**: Import `addOAuthToApp` from the OAuth wrapper
2. **Line 13**: Update comment to emphasize CORS comes first
3. **Line 17**: Add `WWW-Authenticate` header to CORS configuration for OAuth responses
4. **Line 18**: Add `Access-Control-Expose-Headers` so browsers can read the WWW-Authenticate header
5. **Lines 26-27**: Add OAuth endpoints and authentication middleware after CORS

That's it! The OAuth authentication system will now protect all `/mcp` routes.

## Next Steps

Congratulations! 🎉 You've completed the full MCP training journey.
You're now ready to build amazing MCP integrations!
