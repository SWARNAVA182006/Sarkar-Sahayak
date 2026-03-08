// This file should be generated after deployment with actual values
// For now, it contains placeholder values

export const amplifyConfig = {
  Auth: {
    Cognito: {
      userPoolId: process.env.VITE_USER_POOL_ID || 'us-east-1_XXXXXXXXX',
      userPoolClientId: process.env.VITE_USER_POOL_CLIENT_ID || 'XXXXXXXXXXXXXXXXXXXXXXXXXX',
      region: process.env.VITE_AWS_REGION || 'us-east-1',
    }
  },
  API: {
    REST: {
      GovSaathiAPI: {
        endpoint: process.env.VITE_API_URL || 'https://api.example.com/prod',
        region: process.env.VITE_AWS_REGION || 'us-east-1',
      }
    }
  }
};
