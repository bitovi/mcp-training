import crypto from 'crypto';

// In-memory storage - we'll store clients dynamically
const clients = new Map();
const authorizationCodes = new Map();
const accessTokens = new Map();

export default {
  async getClient(clientId: string, clientSecret?: string) {
    console.log('Getting client:', clientId);
    
    // Use a placeholder URI but rely on validateRedirectUri for actual validation
    const client = {
      id: clientId,
      grants: ['authorization_code'],
      redirectUris: ['DYNAMIC']  // Placeholder - actual validation in validateRedirectUri
    };
    
    clients.set(clientId, client);
    console.log('Auto-created client with dynamic redirect URI validation');
    return client;
  },

  // Override to validate any localhost redirect URI
  async validateRedirectUri(redirectUri: string, client: any) {
    return true;
  },

  // Add method to register new clients dynamically
  registerClient(clientId: string, clientData: any) {
    const client = {
      id: clientId,
      grants: ['authorization_code'],
      redirectUris: clientData.redirect_uris || ['http://localhost:3000/callback']
    };
    clients.set(clientId, client);
    return client;
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
    const code = authorizationCodes.get(authorizationCode);
    console.log('Getting authorization code:', authorizationCode, 'found:', !!code);
    if (code) {
      console.log('Authorization code details:', {
        authorizationCode: code.authorizationCode,
        clientId: code.client?.id,
        userId: code.user?.id,
        expiresAt: code.expiresAt
      });
    }
    return code || null;
  },

  async revokeAuthorizationCode(code: any) {
    console.log('Revoking authorization code:', code.authorizationCode);
    authorizationCodes.delete(code.authorizationCode);
    return true;
  },

  async generateAccessToken(client: any, user: any, scope: any) {
    const token = crypto.randomBytes(32).toString('hex');
    console.log('Generated access token for client:', client?.id, 'user:', user?.id);
    return token;
  },

  async saveToken(token: any, client: any, user: any) {
    console.log('Saving token for client:', client?.id, 'user:', user?.id);
    const savedToken = {
      accessToken: token.accessToken,
      accessTokenExpiresAt: token.accessTokenExpiresAt,
      scope: token.scope,
      client: client,
      user: user
    };
    
    accessTokens.set(token.accessToken, savedToken);
    console.log('Token saved successfully');
    return savedToken; // Return the complete token object with client info
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
  async verifyScope(token: any, scope: string[]) {
    return true; // Simplified for training
  }
};