// @ts-check
const { getEmbeddingsModel } = require('../utils/bedrock');

const DEFAULT_EMBEDDING_MODEL = process.env.DEFAULT_EMBEDDING_MODEL || 'cohere.embed-multilingual-v3';
const DEBUG = process.env.DEBUG === 'true';

/**
 * @typedef {Object} EmbeddingData
 * @property {string} object
 * @property {number[] | Buffer} embedding
 * @property {number} index
 */

/**
 * @typedef {Object} EmbeddingsUsage
 * @property {number} prompt_tokens
 * @property {number} total_tokens
 */

/**
 * @typedef {Object} EmbeddingsResponseBody
 * @property {string} object
 * @property {EmbeddingData[]} data
 * @property {string} model
 * @property {EmbeddingsUsage} usage
 */

/**
 * @typedef {Object} EmbeddingsRequest
 * @property {string | string[]} input
 * @property {string} model
 * @property {string} [encoding_format]
 */

/**
 * @param {import('aws-lambda').APIGatewayProxyEventV2} event
 * @param {import('lambda-stream').ResponseStream} responseStream
 */
async function handleEmbeddings(event, responseStream) {
  /** @type {import('../utils/bedrock').EmbeddingsRequest} */
  const body = JSON.parse(event.body || '{}');

  // Validate input
  if (!body.input) {
    throw Object.assign(new Error('input is required'), { statusCode: 400 });
  }

  // Validate encoding format
  if (body.encoding_format && !['float', 'base64'].includes(body.encoding_format)) {
    throw Object.assign(
      new Error('encoding_format must be either "float" or "base64"'),
      { statusCode: 400 }
    );
  }

  const modelId = body.model.startsWith('text-embedding-') ? DEFAULT_EMBEDDING_MODEL : body.model;
  const model = getEmbeddingsModel(modelId);
  
  try {
    const result = await model.embed({
      ...body,
      model: modelId
    });

    if (DEBUG) {
      console.log('Embeddings response:', JSON.stringify(result, null, 2));
    }

    /** @type {EmbeddingsResponseBody} */
    const response = {
      object: 'list',
      // FIXME: fix the types
      // @ts-ignore
      data: result.embeddings.map((embedding, index) => ({
        object: 'embedding',
        embedding: body.encoding_format === 'base64' 
          ? Buffer.from(Float32Array.from(embedding).buffer)
          : embedding,
        index
      })),
      model: modelId,
      usage: {
        prompt_tokens: result.usage.input_tokens,
        total_tokens: result.usage.total_tokens
      }
    };

    responseStream.write(JSON.stringify(response));
  } catch (err) {
    console.error('Error generating embeddings:', err);
    throw Object.assign(
      // @ts-ignore
      new Error(err?.message || 'Failed to generate embeddings'),
      // @ts-ignore
      { statusCode: err?.statusCode || 500 }
    );
  }
}

module.exports = { handleEmbeddings }; 