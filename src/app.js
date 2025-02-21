// @ts-check
const { streamifyResponse } = require('lambda-stream');
const { auth } = require('./utils/auth');
const { handleChat } = require('./handlers/chat');
const { handleModels } = require('./handlers/models');
const { handleEmbeddings } = require('./handlers/embeddings');

const DEBUG = process.env.DEBUG === 'true';

/**
 * @param {import('aws-lambda').APIGatewayProxyEventV2} event 
 * @param {import('lambda-stream').ResponseStream} responseStream
 * @param {import('aws-lambda').Context} [context]
 */
async function routeRequest(event, responseStream, context) {
  // Authenticate request
  await auth(event);

  const path = event.rawPath;
  const method = event.requestContext.http.method;

  // Health check
  if (path === '/health' && method === 'GET') {
    responseStream.write(JSON.stringify({ status: 'OK' }));
    return;
  }

  // API routes
  if (path.startsWith('/api/v1')) {
    if (path.startsWith('/api/v1/chat')) {
      await handleChat(event, responseStream);
    } else if (path.startsWith('/api/v1/models')) {
      await handleModels(event, responseStream);
    } else if (path.startsWith('/api/v1/embeddings')) {
      await handleEmbeddings(event, responseStream);
    } else {
      throw new Error('Not Found');
    }
    return;
  }

  throw new Error('Not Found');
}

exports.handler = streamifyResponse(async (event, responseStream, context) => {
  try {
    if (DEBUG) {
      console.log('Request:', event);
    }
    responseStream.setContentType('application/json');
    await routeRequest(event, responseStream, context || undefined);
    responseStream.end();
  } catch (err) {
    // Add type checking for error
    const error = /** @type {{ statusCode?: number; message?: string }} */ (err);
    const statusCode = error?.statusCode || 500;
    const message = error?.message || 'Internal Server Error';
    console.error(JSON.stringify({
      statusCode,
      message,
      // @ts-ignore
      stack: err?.stack
    }));
    responseStream.write(JSON.stringify({
      error: { message, status: statusCode }
    }));
    responseStream.end();
  }
}); 