// @ts-check
const { App } = require('aws-cdk-lib');
const { BedrockProxyStack } = require('../lib/bedrock-proxy-stack');

const app = new App();
new BedrockProxyStack(app, 'BedrockProxyStack', {
  env: { 
    account: process.env.CDK_DEFAULT_ACCOUNT,
    region: process.env.CDK_DEFAULT_REGION
  }
}); 