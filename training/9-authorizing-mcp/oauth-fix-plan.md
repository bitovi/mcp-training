# OAuth Token Persistence Fix Plan

## 🔍 Problem Analysis

### Current Issue
VS Code's MCP client caches OAuth tokens persistently across server restarts, but our MCP server uses in-memory token storage. This creates a mismatch:

1. **VS Code side**: Tokens are cached persistently in storage
2. **Server side**: Tokens are lost when server restarts (in-memory Map)
3. **Result**: VS Code retries cached tokens that no longer exist on server
4. **Critical**: **Our server IS rejecting the invalid tokens with 401, but VS Code is NOT starting a fresh OAuth flow**

### Evidence from Logs
```
🔐 authenticateRequest called
   🔑 Extracted token (first 10 chars): 7e3940c0de...
   ✅ Token validation result: false
   ❌ Invalid or expired access token
   🚫 Sending 401 Unauthorized response
```

**Key Insight**: The server correctly rejects the cached token and sends a 401 with proper WWW-Authenticate headers, but VS Code doesn't initiate a new OAuth flow in response.

## 🔬 Research Findings

### Discovery Endpoint Investigation
We tested two approaches to signal server changes via OAuth discovery metadata:

1. **Custom field approach**: Added `server_started_at` timestamp
2. **Standard field approach**: Made `issuer` unique with timestamp (`http://localhost:3000/1759919737922`)

**Result**: VS Code calls discovery endpoint and receives the changed metadata, but **still retries cached tokens**. This suggests VS Code hasn't implemented server restart detection based on discovery metadata changes yet.

### VS Code Source Code Analysis
Deep dive into VS Code's MCP authentication revealed:
- Sophisticated authentication services with persistent token caching
- [`_populateAuthMetadata`](https://github.com/microsoft/vscode/blob/main/src/vs/workbench/api/common/extHostMcp.ts#L344-L398) and [`_getAuthorizationServerMetadata`](https://github.com/microsoft/vscode/blob/main/src/vs/workbench/api/common/extHostMcp.ts#L417-L454) methods that parse discovery responses
- Evidence that VS Code is designed to detect server changes, but may not be fully implemented

### VS Code Authentication Flow Analysis (From Logs)
VS Code logs reveal the exact authentication sequence:

```
[trace] Fetching http://localhost:3000/mcp (initial request)
[trace] Fetched: {"status":401} (no auth header)
[trace] Fetching http://localhost:3000/.well-known/oauth-authorization-server 
[trace] Fetched: {"status":200} (discovery successful)
[trace] Fetching http://localhost:3000/mcp with "Authorization":"***"
[trace] Fetched: {"status":401} (cached token rejected)
[info] Connection state: Error 401 status
[error] Server exited before responding to `initialize` request.
```

#### **Log → Source Code Mapping:**

1. **Initial 401**: [`McpHTTPHandle._fetch()`](https://github.com/microsoft/vscode/blob/main/src/vs/workbench/api/common/extHostMcp.ts) basic HTTP wrapper
2. **Discovery call**: [`_populateAuthMetadata()`](https://github.com/microsoft/vscode/blob/main/src/vs/workbench/api/common/extHostMcp.ts#L344-L398) → [`_getAuthorizationServerMetadata()`](https://github.com/microsoft/vscode/blob/main/src/vs/workbench/api/common/extHostMcp.ts#L417-L454)
3. **Token retry**: Back to `McpHTTPHandle` with cached token from authentication service
4. **Error state**: Connection marked as failed, no fresh OAuth flow initiated

#### **Critical Finding - ACTUAL ROOT CAUSE IDENTIFIED:**
The problem is in VS Code's `_fetchWithAuthRetry` method in `McpHTTPHandle`. When it gets a 401 with existing `_authMetadata`, it **only retries if scopes have changed**:

```typescript
} else {
    // We have auth metadata, but got a 401. Check if the scopes changed.
    const { scopesChallenge } = this._parseWWWAuthenticateHeader(res);
    if (!scopesMatch(scopesChallenge, this._authMetadata.scopes)) {
        // Only retries here if scopes are different
        this._authMetadata.scopes = scopesChallenge;
        await this._addAuthHeader(headers);
        // ... retry logic
    }
    // NO RETRY if scopes match but token is invalid!
}
```

**VS Code assumes that if scopes haven't changed, the cached token should still work.** It doesn't account for server restarts invalidating tokens.

## 🎯 Solution Strategy

**UPDATED ANALYSIS**: Based on VS Code logs, our original plan won't work because:

1. ✅ **We're already rejecting invalid tokens with 401**
2. ✅ **VS Code IS calling discovery and getting metadata** 
3. ✅ **VS Code IS retrying with cached tokens**
4. ❌ **VS Code STOPS after second 401 instead of starting fresh OAuth**

The issue is **VS Code's authentication logic**, not our server. VS Code marks the connection as failed and doesn't attempt fresh OAuth after cached token rejection.

### Root Cause: VS Code's Incomplete Auth Retry Logic

The problem is in VS Code's [`_fetchWithAuthRetry`](https://github.com/microsoft/vscode/blob/main/src/vs/workbench/api/common/extHostMcp.ts) method:

1. **First 401**: No auth metadata → populates metadata → adds auth header → retries ✅
2. **Second 401**: Has auth metadata → **only retries if scopes changed** ❌
3. **No scope change**: Assumes cached token should work → gives up ❌

**The Missing Logic**: VS Code never considers that tokens might be invalid due to **server restart** rather than **scope changes**.

### Alternative Approaches

Since **VS Code only retries OAuth when scopes change**, we need strategies to either:
1. **Force scope changes** on server restart
2. **Bypass the retry logic** entirely  
3. **Make VS Code think it's a new server**

#### Option 1: Force Scope Changes on Restart
- Change the scopes returned in WWW-Authenticate header after restart
- Add/remove a dummy scope like `server-instance-${timestamp}`
- This would trigger the retry path in `_fetchWithAuthRetry`

#### Option 2: Clear Authentication Metadata  
- Find a way to force VS Code to treat this as a "no auth metadata" case
- Return different discovery metadata that invalidates cached auth
- This would trigger the first-time auth path

#### Option 3: Different Discovery Response
- Change something in the OAuth discovery response on restart
- VS Code might re-evaluate and clear cached tokens
- Test issuer changes, endpoint changes, etc.

#### Key Components:

1. **Server Instance Tracking**
   - Track server startup time: `const serverStartTime = new Date()`
   - Embed instance info in tokens when issuing
   - Validate instance info when tokens are used

2. **Token Format Enhancement**
   - Current: Random hex string
   - New: `{instanceId}.{tokenId}` format
   - Example: `1728384810977.7e3940c0de...`

3. **Validation Logic**
   - Parse token to extract instance ID
   - Compare with current server instance
   - Reject tokens from previous instances
   - Return proper 401 with fresh discovery info

## 📋 Revised Implementation Plan

### Immediate Testing Approach

Based on the `_fetchWithAuthRetry` logic, let's test the most promising approach:

#### Test 1: Force Scope Changes (MOST LIKELY TO WORK)
```typescript
// In send401 function, modify WWW-Authenticate header:
function send401(res: Response, serverStartTime: number) {
    const dynamicScope = `mcp server-instance-${serverStartTime}`;
    res.setHeader('WWW-Authenticate', `Bearer realm="mcp-server", scope="${dynamicScope}"`);
    res.status(401).json({ error: 'unauthorized' });
}
```

#### Test 2: Clear Discovery Cache
```typescript
// Change discovery response to invalidate cached metadata
app.get('/.well-known/oauth-authorization-server', (req, res) => {
    res.json({
        issuer: `http://localhost:3000/restart-${serverStartTime.getTime()}`,
        // ... other endpoints
    });
});
```

#### Test 3: Return Different 401 Format
```typescript
// Try different WWW-Authenticate formats that might not be cached
res.setHeader('WWW-Authenticate', `Bearer error="invalid_token", error_description="Server restarted"`);
```

### Expected Outcomes

1. **Dynamic Scopes**: Should trigger `!scopesMatch()` → retry with fresh token → success ✅
2. **Discovery Changes**: May force VS Code to re-populate auth metadata 
3. **Different 401 Format**: May bypass the scope comparison logic

### Success Criteria

VS Code logs should show:
- "Scopes changed from [...] to [...], updating and retrying" 
- Fresh `$getTokenFromServerMetadata()` call
- Successful MCP connection after retry
- No "Server exited before responding" errors

## 🎯 Revised Expected Outcome

The logs revealed VS Code **already receives proper 401s** but stops instead of retrying OAuth. Our new testing approach aims to find responses that **do** trigger fresh OAuth flows.

### What We Now Know:
1. **401 + static scopes** = VS Code gives up ❌
2. **401 + changed scopes** = VS Code retries OAuth ✅ (THEORY)
3. **Discovery metadata changes** = May invalidate auth cache ✅ (THEORY)

### What We're Testing:
1. **Dynamic scopes**: Force `!scopesMatch()` to trigger retry
2. **Discovery invalidation**: Clear cached auth metadata
3. **Alternative 401 formats**: Bypass scope comparison entirely

### Success Indicators:
- VS Code logs show OAuth flow initiation
- No "Server exited before responding" errors
- Fresh token generation and successful MCP connection

## 🚀 Updated Benefits

1. **Identifies VS Code limitations**: Documents actual MCP authentication behavior
2. **Finds workarounds**: Tests alternative approaches that might work
3. **Evidence-based**: Uses actual VS Code logs rather than assumptions
4. **Practical solutions**: Focuses on what actually makes VS Code retry OAuth

## 📝 Updated Implementation Steps

1. ✅ **VS Code Log Analysis** - Mapped authentication flow to source code
2. ✅ **Root Cause Identified** - VS Code stops after cached token fails
3. ⏳ **Test Alternative Error Responses** - Try 403, different headers
4. ⏳ **Test Issuer Changes** - Force "new server" detection
5. ⏳ **Test Client Invalidation** - Clear all OAuth state on restart
6. ⏳ **Document Working Solution** - Update plan with successful approach

## 🔧 Technical Implementation Notes

### Current VS Code Behavior (From Logs):
```
401 (no auth) → Discovery call → 401 (bad token) → Connection failed
```

### Target VS Code Behavior:
```
401 (no auth) → Discovery call → 401 (bad token) → Fresh OAuth flow → Success
```

### Test Approaches:
1. **Dynamic Scopes**: Add `server-instance-${timestamp}` to scope list
2. **Discovery Changes**: `issuer: http://localhost:3000/restart-${timestamp}`
3. **Auth Bypass**: Different WWW-Authenticate formats

### Key Insight:
The problem is VS Code's assumption that **same scopes = valid token**. We need to break this assumption by either changing scopes or invalidating the cached auth metadata entirely.

## VSCode Issue

**Title**: MCP OAuth authentication fails to retry after server restart when scopes unchanged

**Labels**: `mcp`, `authentication`, `oauth`, `bug`

**Description**:

### Summary
VS Code's MCP client fails to retry OAuth authentication after server restarts when the OAuth scopes remain the same, leading to permanent connection failures until VS Code is restarted.

### Environment
- VS Code version: Latest (1.95+)
- Extension: Model Context Protocol (MCP) built-in support
- Server: HTTP MCP server with OAuth 2.1 + PKCE authentication

### Steps to Reproduce
1. Set up an MCP server with OAuth authentication using in-memory token storage
2. Connect VS Code to the server and complete OAuth flow successfully
3. Restart the MCP server (invalidating all stored tokens)
4. VS Code attempts to reconnect using cached token
5. Server responds with 401 and same WWW-Authenticate scopes as before

### Expected Behavior
VS Code should detect the 401 response and initiate a fresh OAuth flow to obtain a new valid token.

### Actual Behavior
VS Code gives up after the second 401 response and marks the connection as failed with "Server exited before responding to `initialize` request."

### Root Cause Analysis
The issue is in the `_fetchWithAuthRetry` method in `McpHTTPHandle` ([source](https://github.com/microsoft/vscode/blob/main/src/vs/workbench/api/common/extHostMcp.ts)):

```typescript
} else {
    // We have auth metadata, but got a 401. Check if the scopes changed.
    const { scopesChallenge } = this._parseWWWAuthenticateHeader(res);
    if (!scopesMatch(scopesChallenge, this._authMetadata.scopes)) {
        // Only retries here if scopes are different
        this._authMetadata.scopes = scopesChallenge;
        await this._addAuthHeader(headers);
        // ... retry logic
    }
    // NO RETRY if scopes match but token is invalid!
}
```

**Problem**: VS Code assumes that if OAuth scopes haven't changed, the cached token should still be valid. It doesn't account for server restarts that invalidate tokens while keeping scopes the same.

### Logs
VS Code client logs show:
```
[trace] Fetching http://localhost:3000/mcp (initial request)
[trace] Fetched: {"status":401} (no auth header)
[trace] Fetching http://localhost:3000/.well-known/oauth-authorization-server 
[trace] Fetched: {"status":200} (discovery successful)
[trace] Fetching http://localhost:3000/mcp with "Authorization":"***"
[trace] Fetched: {"status":401} (cached token rejected)
[info] Connection state: Error 401 status
[error] Server exited before responding to `initialize` request.
```

Server logs confirm proper OAuth behavior:
```
🔐 authenticateRequest called
   🔑 Extracted token (first 10 chars): 7e3940c0de...
   ✅ Token validation result: false
   ❌ Invalid or expired access token
   🚫 Sending 401 Unauthorized response
```

### Proposed Solution
The `_fetchWithAuthRetry` method should have a fallback when scopes match but authentication fails:

```typescript
} else {
    // We have auth metadata, but got a 401. Check if the scopes changed.
    const { scopesChallenge } = this._parseWWWAuthenticateHeader(res);
    if (!scopesMatch(scopesChallenge, this._authMetadata.scopes)) {
        this._log(LogLevel.Debug, `Scopes changed, updating and retrying`);
        this._authMetadata.scopes = scopesChallenge;
        await this._addAuthHeader(headers);
        if (headers['Authorization']) {
            init.headers = headers;
            res = await doFetch();
        }
    } else {
        // NEW: Retry even with same scopes - token might be invalid due to server restart
        this._log(LogLevel.Debug, `Token rejected but scopes unchanged, forcing fresh token`);
        await this._addAuthHeader(headers);
        if (headers['Authorization']) {
            init.headers = headers;
            res = await doFetch();
        }
    }
}
```

### Workarounds
Server implementations can work around this by:
1. **Dynamic scopes**: Include server instance info in scopes (e.g., `server-instance-${timestamp}`)
2. **Discovery changes**: Modify the OAuth issuer URL on restart to invalidate cached metadata

### Additional Context
This affects any MCP server using:
- OAuth authentication 
- In-memory token storage (common in development)
- Server restart scenarios (common in development and deployment)

The issue prevents proper development workflows and reduces the reliability of MCP authentication in production environments with rolling deployments.