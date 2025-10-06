import OAuth2Server from '@node-oauth/oauth2-server';
import model from './oauth-model.js';

const oauth = new OAuth2Server({
  model: model,
  requireClientAuthentication: {
    authorization_code: false  // PKCE replaces client secret
  },
  allowBearerTokensInQueryString: true,
  accessTokenLifetime: 3600,
  authorizationCodeLifetime: 600,
  addAcceptedScopesHeader: false,
  addAuthorizedScopesHeader: false,
  allowExtendedTokenAttributes: false
});

export { oauth };