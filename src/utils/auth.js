// @ts-check
const { SecretsManagerClient, GetSecretValueCommand } = require('@aws-sdk/client-secrets-manager');

const client = new SecretsManagerClient();

/** @type {string | undefined} */
let secretStringCache;

/**
 * @param {import('aws-lambda').APIGatewayProxyEventV2} event
 */
async function auth(event) {
  if (process.env.IS_TEST) return;
  const authHeader = event.headers?.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    throw Object.assign(new Error('Missing or invalid authorization header'), { statusCode: 401 });
  }

  const providedKey = authHeader.slice(7);
  const secretArn = process.env.API_KEY_SECRET_ARN;

  if (!secretArn) {
    throw Object.assign(new Error('API key secret ARN not configured'), { statusCode: 500 });
  }

  try {
    if (!secretStringCache) {
      const response = await client.send(new GetSecretValueCommand({
        SecretId: secretArn
      }));
      secretStringCache = response.SecretString;
    }
    if (secretStringCache !== providedKey) {
      throw Object.assign(new Error('Invalid API key'), { statusCode: 401 });
    }
  } catch (err) {
    console.error('Error retrieving API key:', err);
    throw Object.assign(new Error('Error validating API key'), { statusCode: 500 });
  }
}

module.exports = { auth }; 