// @ts-check
const { BedrockRuntimeClient, InvokeModelCommand } = require('@aws-sdk/client-bedrock-runtime');

const client = new BedrockRuntimeClient();
const DEFAULT_EMBEDDING_MODEL = process.env.DEFAULT_EMBEDDING_MODEL || 'cohere.embed-multilingual-v3';
const DEBUG = process.env.DEBUG === 'true';

/**
 * @typedef {Object} EmbeddingsRequest
 * @property {string | string[]} input
 * @property {string} model
 * @property {string} [encoding_format]
 */

/**
 * @typedef {Object} EmbeddingsResponse
 * @property {number[][]} embeddings
 * @property {Object} usage
 * @property {number} usage.input_tokens
 */

/**
 * @param {import('aws-lambda').APIGatewayProxyEventV2} event
 * @param {import('lambda-stream').ResponseStream} responseStream
 */
async function handleEmbeddings(event, responseStream) {
  /** @type {EmbeddingsRequest} */
  const body = JSON.parse(event.body || '{}');
  const modelId = body.model.startsWith('text-embedding-') ? DEFAULT_EMBEDDING_MODEL : body.model;
  
  const inputs = Array.isArray(body.input) ? body.input : [body.input];
  
  try {
    const command = new InvokeModelCommand({
      modelId,
      body: JSON.stringify({
        texts: inputs,
        input_type: 'search_document',
        truncate: 'END'
      }),
      contentType: 'application/json',
      accept: 'application/json'
    });

    const response = await client.send(command);
    /** @type {EmbeddingsResponse} */
    const result = JSON.parse(Buffer.from(response.body).toString());

    if (DEBUG) {
      console.log('Embeddings response:', JSON.stringify(result, null, 2));
    }

    responseStream.write(JSON.stringify({
      object: 'list',
      data: result.embeddings.map((embedding, index) => ({
        object: 'embedding',
        embedding,
        index
      })),
      model: modelId,
      usage: {
        prompt_tokens: result.usage?.input_tokens || 0,
        total_tokens: result.usage?.input_tokens || 0
      }
    }));
  } catch (err) {
    console.error('Error generating embeddings:', err);
    throw Object.assign(new Error('Failed to generate embeddings'), { statusCode: 500 });
  }
}

module.exports = { handleEmbeddings }; 