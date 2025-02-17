// @ts-check
const { BedrockClient, ListFoundationModelsCommand } = require('@aws-sdk/client-bedrock');

const client = new BedrockClient();
const DEBUG = process.env.DEBUG === 'true';

/**
 * @param {import('aws-lambda').APIGatewayProxyEventV2} event
 * @param {import('lambda-stream').ResponseStream} responseStream
 */
async function handleModels(event, responseStream) {
  try {
    const response = await client.send(new ListFoundationModelsCommand({
      byOutputModality: 'TEXT',
      byInferenceType: 'ON_DEMAND'
    }));

    const models = response.modelSummaries
      ?.filter(model => 
        model.responseStreamingSupported && 
        model.modelLifecycle?.status === 'ACTIVE'
      )
      .map(model => ({
        id: model.modelId,
        created: Math.floor(Date.now() / 1000),
        object: 'model',
        owned_by: 'bedrock'
      })) || [];

    if (DEBUG) {
      console.log('Models response:', JSON.stringify(models, null, 2));
    }

    responseStream.write(JSON.stringify({
      object: 'list',
      data: models
    }));
  } catch (err) {
    console.error('Error listing models:', err);
    throw Object.assign(new Error('Failed to list models'), { statusCode: 500 });
  }
}

module.exports = { handleModels }; 