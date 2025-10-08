import express from 'express';
import crypto from 'crypto';
import { oauth } from './oauth-server.js';
import model from './oauth-model.js';

// 0. Authentication middleware for MCP routes - Hit first when creating 401
export async function authenticateRequest(
  req: express.Request,
  res: express.Response,
  next: express.NextFunction
) {
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
    (req as any).auth = { user: accessToken.user, client: accessToken.client };
    next();
  } catch (error) {
    return send401(res, req, 'Token validation failed');
  }
}

// 1. OAuth Discovery - First step: clients discover OAuth endpoints
export function discovery(req: express.Request, res: express.Response) {
  res.json({
    issuer: 'http://localhost:3000',
    authorization_endpoint: 'http://localhost:3000/authorize',
    token_endpoint: 'http://localhost:3000/token',
    registration_endpoint: 'http://localhost:3000/register',
    code_challenge_methods_supported: ['S256'],
    response_types_supported: ['code'],
    grant_types_supported: ['authorization_code', 'refresh_token'],
    token_endpoint_auth_methods_supported: ['none', 'client_secret_post'],
    scopes_supported: []
  });
}

// 2. Protected Resource Metadata - Clients discover resource server info
export function protectedResourceMetadata(req: express.Request, res: express.Response) {
  const baseUrl = 'http://localhost:3000';
  res.json({
    resource: baseUrl,
    authorization_servers: [baseUrl],
    scopes_supported: [],
    bearer_methods_supported: ['header', 'body'],
    resource_documentation: `${baseUrl}/.well-known/oauth-authorization-server`
  });
}

// 3. Client Registration - Optional: clients can register dynamically
export function register(req: express.Request, res: express.Response) {
  // Dynamic client registration for MCP clients
  try {
    const clientMetadata = req.body;
    
    // Generate a unique client ID for this MCP client
    const clientId = `mcp_${crypto.randomUUID()}`;
    
    // Store the client in our model
    const client = model.registerClient(clientId, clientMetadata);
    
    const registrationResponse = {
      client_id: clientId,
      client_id_issued_at: Math.floor(Date.now() / 1000),
      redirect_uris: clientMetadata.redirect_uris || ['http://localhost:3000/callback'],
      grant_types: ['authorization_code'],
      response_types: ['code'],
      token_endpoint_auth_method: 'none',
      scope: '',
      ...(clientMetadata.client_name && { client_name: clientMetadata.client_name }),
      ...(clientMetadata.client_uri && { client_uri: clientMetadata.client_uri })
    };

    console.log('Registered new MCP client:', clientId);
    res.status(201).json(registrationResponse);
  } catch (error) {
    console.error('Client registration failed:', error);
    res.status(400).json({
      error: 'invalid_client_metadata',
      error_description: error instanceof Error ? error.message : 'Invalid client metadata'
    });
  }
}

// 4. Authorization Request - Show consent page to user
export function authorizeGet(req: express.Request, res: express.Response) {
  try {
    console.log('Authorization GET request:', req.query);
    
    // Show consent page with OAuth parameters
    const { client_id, redirect_uri, code_challenge, code_challenge_method } = req.query;
    const state = req.query.state || 'default'; // Ensure state has a value
    
    console.log('Showing consent page for client:', client_id);
    
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
          <p><strong>State:</strong> <input type="text" value="${state}" readonly style="width: 300px; background: #fff;"></p>
        </div>
        
        <form method="post">
          <input type="hidden" name="client_id" value="${client_id}">
          <input type="hidden" name="redirect_uri" value="${redirect_uri}">
          <input type="hidden" name="code_challenge" value="${code_challenge}">
          <input type="hidden" name="code_challenge_method" value="${code_challenge_method}">
          <input type="hidden" name="state" value="${state}">
          <input type="hidden" name="response_type" value="code">
          <button type="submit" name="authorize" value="true" style="background: green; color: white; padding: 10px 20px; margin: 5px;">Allow</button>
          <button type="submit" name="authorize" value="false" style="background: red; color: white; padding: 10px 20px; margin: 5px;">Deny</button>
        </form>
      </body>
      </html>
    `;
    
    console.log('Sending consent page HTML');
    res.send(consentPage);
  } catch (error) {
    console.error('Authorization GET error:', error);
    res.status(500).json({ error: 'Authorization failed' });
  }
}

// 5. Authorization Decision - Handle user's allow/deny decision
export function authorizeDecision(req: express.Request, res: express.Response) {
  // Handle user denial first
  if (req.body.authorize !== 'true') {
    const redirectUri = req.body.redirect_uri;
    const state = req.body.state;
    return res.redirect(`${redirectUri}?error=access_denied&state=${state}`);
  }
  
  // For approval, redirect to a GET endpoint with query parameters
  const authUrl = new URL('http://localhost:3000/oauth/authorize-internal');
  authUrl.searchParams.set('client_id', req.body.client_id);
  authUrl.searchParams.set('redirect_uri', req.body.redirect_uri);
  authUrl.searchParams.set('code_challenge', req.body.code_challenge);
  authUrl.searchParams.set('code_challenge_method', req.body.code_challenge_method);
  authUrl.searchParams.set('state', req.body.state || 'default');
  authUrl.searchParams.set('response_type', 'code');
  
  // Redirect to internal authorization endpoint
  res.redirect(authUrl.toString());
}

// 6. OAuth Callback - Final page shown after authorization code redirect
export function callback(req: express.Request, res: express.Response) {
  // Simple callback page for OAuth flow completion
  const { code, state, error } = req.query;
  
  if (error) {
    res.send(`
      <!DOCTYPE html>
      <html>
      <head><title>Authorization Failed</title></head>
      <body>
        <h1>Authorization Failed</h1>
        <p>Error: ${error}</p>
        <p>State: ${state || 'none'}</p>
      </body>
      </html>
    `);
    return;
  }
  
  res.send(`
    <!DOCTYPE html>
    <html>
    <head><title>Authorization Successful</title></head>
    <body>
      <h1>Authorization Successful</h1>
      <p>Authorization code: <code>${code}</code></p>
      <p>State: ${state || 'none'}</p>
      <p>You can now close this window and return to your application.</p>
    </body>
    </html>
  `);
}

// Helpers
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

function createWwwAuthenticate(
  req: express.Request,
  errorDescription?: string
): string {
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

function send401(
  res: express.Response,
  req: express.Request,
  errorDescription?: string
) {
  res
    .status(401)
    .header('WWW-Authenticate', createWwwAuthenticate(req, errorDescription))
    .header('Cache-Control', 'no-cache, no-store, must-revalidate')
    .header('Pragma', 'no-cache')
    .header('Expires', '0')
    .json({
      jsonrpc: '2.0',
      error: {
        code: -32001,
        message: errorDescription || 'Authentication required',
      },
      id: req.body?.id || null,
    });
}