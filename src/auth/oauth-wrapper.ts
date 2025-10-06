import express from 'express';
import { oauth } from './oauth-server.js';
import { discovery, authorize, token, protectedResourceMetadata, callback, register } from './oauth-handlers.js';
import model from './oauth-model.js';

export function addOAuthToApp(app: express.Application) {
  // Add OAuth endpoints
  app.get('/.well-known/oauth-authorization-server', discovery);
  app.get('/.well-known/oauth-protected-resource', protectedResourceMetadata);
  app.get('/authorize', authorize);
  app.post('/authorize', authorize);  // Handle both GET (consent page) and POST (approval)
  app.post('/token', token);
  app.get('/callback', callback);  // OAuth redirect callback
  app.post('/register', register);  // Dynamic client registration
  
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
    (req as any).auth = { user: accessToken.user, client: accessToken.client };
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
  const metadataUrl = 'http://localhost:3000/.well-known/oauth-protected-resource';
  
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