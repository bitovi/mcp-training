import OAuthServer from '@node-oauth/express-oauth-server';
import model from './oauth-model.js';

// Create Express OAuth server with our model
export const oauth = new OAuthServer({
  model: model,
  requireClientAuthentication: {
    authorization_code: false  // PKCE replaces client secret
  },
  allowBearerTokensInQueryString: true,
  accessTokenLifetime: 3600,
  authorizationCodeLifetime: 600,
  addAcceptedScopesHeader: false,
  addAuthorizedScopesHeader: false,
  allowExtendedTokenAttributes: false,
  useErrorHandler: false,  // Let OAuth server handle errors
  continueMiddleware: false  // Let OAuth server send responses
});