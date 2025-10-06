import express from 'express';
import { oauth } from './oauth-server.js';
import { discovery, authorizeGet, authorizeDecision, protectedResourceMetadata, callback, register } from './oauth-handlers.js';
import model from './oauth-model.js';

export function addOAuthToApp(app: express.Application) {
  // Add OAuth discovery endpoints
  app.get('/.well-known/oauth-authorization-server', discovery);
  app.get('/.well-known/oauth-protected-resource', protectedResourceMetadata);
  
  // Custom consent page for GET /authorize
  app.get('/authorize', authorizeGet);
  
  // Handle POST /authorize (user decision) - convert to GET-style authorization
  app.post('/authorize', authorizeDecision);
  
  // Internal authorization endpoint that uses OAuth middleware
  app.get('/oauth/authorize-internal', oauth.authorize({
    authenticateHandler: {
      handle: () => {
        console.log('Authenticating demo user');
        return { id: 'demo-user' };
      }
    }
  }));
  
  // Use Express OAuth middleware for token endpoint
  app.post('/token', oauth.token());
  
  // Other endpoints
  app.get('/callback', callback);
  app.post('/register', register);
  
  // Add authentication middleware to /mcp routes
  app.use('/mcp', oauth.authenticate());
  
  return app;
}