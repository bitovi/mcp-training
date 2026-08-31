import express from 'express';
import { oauth } from './oauth-server.js';
import { discovery, authorizeGet, authorizeDecision, protectedResourceMetadata, callback, register, requireBearerAuth } from './oauth-handlers.js';
import { SERVER_URL } from './config.js';

export { requireBearerAuth };

// Adds `&iss=<issuer>` to a redirect URL, per RFC 9207. Used to inject the
// issuer into the redirect the OAuth library sends back to the client after
// a successful authorization, since the library itself predates that RFC
// and has no concept of it.
function withIssuer(url: string): string {
  try {
    const parsed = new URL(url);
    parsed.searchParams.set('iss', SERVER_URL);
    return parsed.toString();
  } catch {
    return url;
  }
}

export function addOAuthToApp(app: express.Application) {
  // The consent form post and the /token grant both arrive as
  // application/x-www-form-urlencoded, which createMcpExpressApp() doesn't
  // parse for you (it only wires up express.json()).
  app.use(express.urlencoded({ extended: false }));

  // Add OAuth discovery endpoints
  app.get('/.well-known/oauth-authorization-server', discovery);
  app.get('/.well-known/oauth-protected-resource', protectedResourceMetadata);

  // Custom consent page for GET /authorize
  app.get('/authorize', authorizeGet);

  // Handle POST /authorize (user decision) - convert to GET-style authorization
  app.post('/authorize', authorizeDecision);

  // Internal authorization endpoint that uses OAuth middleware
  app.get(
    '/oauth/authorize-internal',
    (req, res, next) => {
      const originalRedirect = res.redirect.bind(res);
      (res as any).redirect = (url: string) => originalRedirect(withIssuer(url));
      next();
    },
    oauth.authorize({
      authenticateHandler: {
        handle: () => {
          console.log('Authenticating demo user');
          return { id: 'demo-user' };
        }
      }
    })
  );

  // Use Express OAuth middleware for token endpoint
  app.post('/token', oauth.token());

  // Other endpoints
  app.get('/callback', callback);
  app.post('/register', register);

  // Note: this does NOT mount requireBearerAuth on any route. Protect your
  // MCP endpoint by applying requireBearerAuth to it directly, e.g.
  // app.all('/mcp', requireBearerAuth, mcpHandler).

  return app;
}
