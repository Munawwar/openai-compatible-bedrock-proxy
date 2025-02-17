// @ts-check
const { BedrockRuntimeClient, InvokeModelCommand, InvokeModelWithResponseStreamCommand } = require('@aws-sdk/client-bedrock-runtime');

const client = new BedrockRuntimeClient();

const DEFAULT_MODEL = process.env.DEFAULT_MODEL_ID || 'us.anthropic.claude-3-5-sonnet-20241022-v2:0';
const DEBUG = process.env.DEBUG === 'true';

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
 */

/**
 * @param {ChatRequest} request
 */
function buildBody(request) {
  const modelId = request.model.toLowerCase().startsWith('gpt-') ? DEFAULT_MODEL : request.model;
  
  const body = {
    messages: request.messages.map(msg => ({
      role: msg.role,
      content: Array.isArray(msg.content) ? msg.content : [{ type: 'text', text: msg.content }]
    })),
    anthropic_version: 'bedrock-2023-05-31',
    max_tokens: request.max_tokens || 2048,
    temperature: request.temperature || 1.0,
    top_p: request.top_p || 1.0
  };

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

  return client.send(new InvokeModelWithResponseStreamCommand({
    modelId,
    body: JSON.stringify(body),
    contentType: 'application/json',
    accept: 'application/json'
  }));
}

module.exports = { invokeModelNonStream, invokeModelStream }; 