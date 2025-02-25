// @ts-check
const { BedrockClient, ListFoundationModelsCommand, ListInferenceProfilesCommand } = require('@aws-sdk/client-bedrock');

const client = new BedrockClient();

const {
  AWS_REGION= "us-west-2",
  DEFAULT_MODEL_ID = 'us.anthropic.claude-3-7-sonnet-20250219-v1:0',
} = process.env;
const DEBUG = process.env.DEBUG === 'true';

function getInferenceRegionPrefix() {
  if (AWS_REGION.startsWith('ap-')) {
    return 'apac';
  }
  return AWS_REGION.slice(0, 2);
}

/**
 * @param {import('aws-lambda').APIGatewayProxyEventV2} event
 * @param {import('lambda-stream').ResponseStream} responseStream
 */
async function handleModels(event, responseStream) {
  try {
    /** @type {{ [modelId: string]: { modalities: import('@aws-sdk/client-bedrock').ModelModality[] | undefined } }} */
    const modelList = {};

    const profileResponse = await client.send(new ListInferenceProfilesCommand({
      maxResults: 1000,
      typeEquals: 'SYSTEM_DEFINED'
    }));
    const profileList = profileResponse.inferenceProfileSummaries?.map(p => p.inferenceProfileId) || [];

    const response = await client.send(new ListFoundationModelsCommand({
      byOutputModality: 'TEXT',
    }));

    // Process each model
    for (const model of response.modelSummaries || []) {
      const modelId = model.modelId || 'N/A';
      const streamSupported = model.responseStreamingSupported ?? true;
      const status = model.modelLifecycle?.status || 'ACTIVE';

      // Skip if streaming not supported or status not active/legacy
      if (!streamSupported || !['ACTIVE', 'LEGACY'].includes(status)) {
        continue;
      }

      const inferenceTypes = model.inferenceTypesSupported || [];
      const inputModalities = model.inputModalities;

      // Add on-demand model
      if (inferenceTypes.includes('ON_DEMAND')) {
        modelList[modelId] = {
          modalities: inputModalities
        };
      }

      // Add cross-region inference model if applicable
      const profileId = `${getInferenceRegionPrefix()}.${modelId}`;
      if (profileList.includes(profileId)) {
        modelList[profileId] = {
          modalities: inputModalities
        };
      }
    }

    // Fallback to default model if list is empty
    if (Object.keys(modelList).length === 0) {
      modelList[DEFAULT_MODEL_ID] = {
        modalities: ['TEXT', 'IMAGE']
      };
    }

    const models = Object.entries(modelList).map(([id, details]) => ({
      id,
      created: Math.floor(Date.now() / 1000),
      object: 'model',
      owned_by: 'bedrock',
      modalities: details.modalities
    }));

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