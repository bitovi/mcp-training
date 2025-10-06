import express from 'express';
import OAuth2Server from '@node-oauth/oauth2-server';
import crypto from 'crypto';
import { oauth } from './oauth-server.js';
import model from './oauth-model.js';

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

export async function authorize(req: express.Request, res: express.Response) {
  try {
    console.log(`Authorization request: ${req.method}`, {
      query: req.query,
      body: req.body
    });
    
    // For training simplicity, show consent page for GET, handle approval for POST
    if (req.method === 'GET') {
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
      return;
    }
    
    // Handle POST - user authorization decision
    if (req.body.authorize !== 'true') {
      const redirectUri = req.body.redirect_uri;
      const state = req.body.state;
      return res.redirect(`${redirectUri}?error=access_denied&state=${state}`);
    }
    
    // User approved - use OAuth server to generate authorization code
    // Create a new request object with form data as query parameters
    const authReq = {
      method: 'GET',
      headers: Object.fromEntries(
        Object.entries(req.headers).map(([key, value]) => [key, Array.isArray(value) ? value[0] : (value || '')])
      ),
      query: {
        client_id: req.body.client_id,
        redirect_uri: req.body.redirect_uri,
        code_challenge: req.body.code_challenge,
        code_challenge_method: req.body.code_challenge_method,
        state: req.body.state || 'default',
        response_type: 'code'
      },
      body: req.body
    };
    
    console.log('Creating OAuth authorization request...');
    const authRequest = new OAuth2Server.Request(authReq);
    const authResponse = new OAuth2Server.Response(res);
    
    console.log('Calling oauth.authorize...');
    try {
      const result = await oauth.authorize(authRequest, authResponse, {
        authenticateHandler: {
          handle: () => {
            console.log('Authenticating demo user');
            return { id: 'demo-user' };
          }
        }
      });
      console.log('OAuth authorization completed successfully, result:', result);
      
      // Check if response was already sent by OAuth library
      if (!res.headersSent) {
        console.log('OAuth library did not send redirect, sending manual redirect');
        const redirectUri = req.body.redirect_uri;
        const state = req.body.state || 'default';
        const authCode = result.authorizationCode;
        const redirectUrl = `${redirectUri}?code=${authCode}&state=${state}`;
        console.log('Redirecting to:', redirectUrl);
        res.redirect(redirectUrl);
      } else {
        console.log('Response already sent by OAuth library');
      }
    } catch (oauthError) {
      console.error('OAuth authorization failed:', oauthError);
      throw oauthError;
    }
  } catch (error) {
    console.error('Authorization error:', error);
    res.status(500).json({ error: 'Authorization failed' });
  }
}

export async function token(req: express.Request, res: express.Response) {
  try {
    console.log('Token request received:', {
      method: req.method,
      headers: req.headers,
      body: req.body
    });
    
    const tokenRequest = new OAuth2Server.Request(req);
    const tokenResponse = new OAuth2Server.Response(res);
    
    console.log('Calling oauth.token...');
    const token = await oauth.token(tokenRequest, tokenResponse);
    console.log('Token exchange successful:', token);
    
    // Check if response was already sent by OAuth library
    if (!res.headersSent) {
      console.log('OAuth library did not send token response, sending manual response');
      const expiresIn = token.accessTokenExpiresAt 
        ? Math.floor((token.accessTokenExpiresAt.getTime() - Date.now()) / 1000)
        : 3600; // Default to 1 hour if no expiration set
      
      res.json({
        access_token: token.accessToken,
        token_type: 'Bearer',
        expires_in: expiresIn,
        scope: token.scope || ''
      });
    } else {
      console.log('Token response already sent by OAuth library');
    }
  } catch (error) {
    console.error('Token error:', error);
    res.status(400).json({ error: 'invalid_grant' });
  }
}

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