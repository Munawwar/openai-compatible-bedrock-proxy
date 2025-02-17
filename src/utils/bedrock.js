// @ts-check
const { BedrockRuntimeClient, InvokeModelCommand, InvokeModelWithResponseStreamCommand } = require('@aws-sdk/client-bedrock-runtime');

const client = new BedrockRuntimeClient();

const DEFAULT_MODEL = process.env.DEFAULT_MODEL_ID || 'us.anthropic.claude-3-5-sonnet-20241022-v2:0';
const DEBUG = process.env.DEBUG === 'true';

/**
 * @type {Record<string, string>}
 */
const SUPPORTED_BEDROCK_EMBEDDING_MODELS = {
  'cohere.embed-multilingual-v3': 'Cohere Embed Multilingual',
  'cohere.embed-english-v3': 'Cohere Embed English',
  // Disable Titan embedding as mentioned in Python code
  // 'amazon.titan-embed-text-v1': 'Titan Embeddings G1 - Text',
  // 'amazon.titan-embed-image-v1': 'Titan Multimodal Embeddings G1'
};

/**
 * @typedef {Object} ChatMessage
 * @property {string} role
 * @property {string | Array<{type: string, [key: string]: any}>} content
 * @property {string} [name]
 */

/**
 * @typedef {Object} ChatRequest
 * @property {ChatMessage[]} messages
 * @property {string} model
 * @property {number} [temperature]
 * @property {number} [top_p]
 * @property {number} [max_tokens]
 * @property {boolean} [stream]
 * @property {string[]} [stop]
 * @property {Object[]} [tools]
 */

/**
 * @typedef {Object} BedrockRequestBody
 * @property {Array<{role: string, content: Array<{type: string, text?: string, [key: string]: any}>}>} messages
 * @property {string} anthropic_version
 * @property {number} max_tokens
 * @property {number} temperature
 * @property {number} top_p
 * @property {string[]} [stop_sequences]
 * @property {Object[]} [tools]
 * @property {Array<{text: string}>} [system]
 */

/**
 * @typedef {Object} EmbeddingsRequest
 * @property {string | string[] | number[] | number[][]} input
 * @property {string} model
 * @property {string} [encoding_format]
 * @property {Object} [embedding_config]
 */

/**
 * @typedef {Object} EmbeddingsResponse
 * @property {number[][]} embeddings
 * @property {Object} usage
 * @property {number} usage.input_tokens
 * @property {number} [usage.output_tokens]
 */

/**
 * Extract system prompts from messages
 * @param {ChatMessage[]} messages 
 * @returns {Array<{text: string}>}
 */
function parseSystemPrompts(messages) {
  const systemPrompts = [];
  for (const msg of messages) {
    if (msg.role !== 'system') continue;
    if (typeof msg.content !== 'string') {
      throw Object.assign(new Error('System messages must have string content'), { statusCode: 400 });
    }
    systemPrompts.push({ text: msg.content });
  }
  return systemPrompts;
}

/**
 * @param {ChatRequest} request
 * @returns {BedrockRequestBody}
 */
function buildBody(request) {
  const modelId = request.model.toLowerCase().startsWith('gpt-') ? DEFAULT_MODEL : request.model;
  
  /** @type {BedrockRequestBody} */
  const body = {
    messages: request.messages.map(msg => ({
      role: msg.role,
      content: Array.isArray(msg.content) ? msg.content : [{ type: 'text', text: msg.content }]
    })),
    anthropic_version: 'bedrock-2023-05-31',
    max_tokens: request.max_tokens || 2048,
    temperature: request.temperature || 1.0,
    top_p: request.top_p || 1.0,
    system: parseSystemPrompts(request.messages)
  };

  // Add optional parameters
  if (request.stop) {
    body.stop_sequences = Array.isArray(request.stop) ? request.stop : [request.stop];
  }

  // Add tools/functions support
  if (request.tools?.length) {
    body.tools = request.tools;
  }

  if (DEBUG) {
    console.log('Request body:', JSON.stringify(body, null, 2));
  }

  return body;
}

/**
 * @param {ChatRequest} request
 */
function invokeModelNonStream(request) {
  const modelId = request.model.toLowerCase().startsWith('gpt-') ? DEFAULT_MODEL : request.model;
  const body = buildBody(request);

  if (DEBUG) {
    console.log('Non-stream request:', {
      modelId,
      body: JSON.stringify(body, null, 2)
    });
  }

  return client.send(new InvokeModelCommand({
    modelId,
    body: JSON.stringify(body),
    contentType: 'application/json',
    accept: 'application/json'
  }));
}

/**
 * @param {ChatRequest} request
 */
function invokeModelStream(request) {
  const modelId = request.model.toLowerCase().startsWith('gpt-') ? DEFAULT_MODEL : request.model;
  const body = buildBody(request);

  if (DEBUG) {
    console.log('Stream request:', {
      modelId,
      body: JSON.stringify(body, null, 2)
    });
  }

  return client.send(new InvokeModelWithResponseStreamCommand({
    modelId,
    body: JSON.stringify(body),
    contentType: 'application/json',
    accept: 'application/json'
  }));
}

/**
 * Validates if the embedding model is supported
 * @param {string} modelId 
 * @returns {boolean}
 */
function isSupportedEmbeddingModel(modelId) {
  return modelId in SUPPORTED_BEDROCK_EMBEDDING_MODELS;
}

/**
 * Base class for embeddings models
 * @abstract
 */
class BaseEmbeddingsModel {
  accept = 'application/json';
  contentType = 'application/json';

  /**
   * @param {Object} args
   * @param {string} modelId
   */
  async invokeModel(args, modelId) {
    const body = JSON.stringify(args);
    if (DEBUG) {
      console.log('Invoke Bedrock Model:', modelId);
      console.log('Bedrock request body:', body);
    }

    try {
      const response = await client.send(new InvokeModelCommand({
        body,
        modelId,
        accept: this.accept,
        contentType: this.contentType
      }));
      return JSON.parse(Buffer.from(response.body).toString());
    } catch (err) {
      console.error('Error invoking model:', err);
      throw Object.assign(
        new Error(err.message || 'Failed to invoke model'),
        { statusCode: err.statusCode || 500 }
      );
    }
  }
}

/**
 * Cohere embeddings model handler
 */
class CohereEmbeddingsModel extends BaseEmbeddingsModel {
  /**
   * @param {EmbeddingsRequest} request
   */
  parseArgs(request) {
    let texts = [];
    if (typeof request.input === 'string') {
      texts = [request.input];
    } else if (Array.isArray(request.input)) {
      if (typeof request.input[0] === 'string') {
        texts = request.input;
      } else {
        throw Object.assign(
          new Error('Cohere models only support string inputs'),
          { statusCode: 400 }
        );
      }
    }

    return {
      texts,
      input_type: 'search_document',
      truncate: 'END'
    };
  }

  /**
   * @param {EmbeddingsRequest} request
   */
  async embed(request) {
    const args = this.parseArgs(request);
    const response = await this.invokeModel(args, request.model);

    if (DEBUG) {
      console.log('Bedrock response:', response);
    }

    return {
      embeddings: response.embeddings,
      usage: {
        input_tokens: response.usage?.input_tokens || 0,
        total_tokens: response.usage?.input_tokens || 0
      }
    };
  }
}

/**
 * Get appropriate embeddings model handler
 * @param {string} modelId 
 * @returns {CohereEmbeddingsModel}
 */
function getEmbeddingsModel(modelId) {
  const modelName = SUPPORTED_BEDROCK_EMBEDDING_MODELS[modelId];
  if (!modelName) {
    throw Object.assign(
      new Error(`Unsupported embedding model: ${modelId}`),
      { statusCode: 400 }
    );
  }

  if (modelName.startsWith('Cohere')) {
    return new CohereEmbeddingsModel();
  }

  throw Object.assign(
    new Error(`No handler for model: ${modelId}`),
    { statusCode: 400 }
  );
}

module.exports = {
  invokeModelNonStream,
  invokeModelStream,
  isSupportedEmbeddingModel,
  SUPPORTED_BEDROCK_EMBEDDING_MODELS,
  getEmbeddingsModel
}; 