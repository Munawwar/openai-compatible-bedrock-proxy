// @ts-check
const { Stack, Duration, CfnOutput } = require('aws-cdk-lib');
const { NodejsFunction } = require('aws-cdk-lib/aws-lambda-nodejs');
const { Runtime, InvokeMode, HttpMethod } = require('aws-cdk-lib/aws-lambda');
const { FunctionUrlAuthType } = require('aws-cdk-lib/aws-lambda');
const { Secret } = require('aws-cdk-lib/aws-secretsmanager');
const { Effect, PolicyStatement } = require('aws-cdk-lib/aws-iam');

class BedrockProxyStack extends Stack {
  /**
   * @param {import('aws-cdk-lib').App} scope
   * @param {string} id
   * @param {import('aws-cdk-lib').StackProps} props
   */
  constructor(scope, id, props) {
    super(scope, id, props);

    // Create API key secret
    const apiKeySecret = new Secret(this, 'ApiKeySecret', {
      secretName: 'BedrockProxyAPIKey',
      description: 'API Key for Bedrock Proxy',
    });

    // Create Lambda function
    const proxyHandler = new NodejsFunction(this, 'ProxyHandler', {
      entry: '../src/app.js',
      handler: 'handler',
      runtime: Runtime.NODEJS_22_X,
      memorySize: 1024,
      timeout: Duration.seconds(30),
      // You can prevent any potential abuse of the API by not limiting concurrent execution
      // reservedConcurrentExecutions: 10,
      environment: {
        API_KEY_SECRET_ARN: apiKeySecret.secretArn,
        DEFAULT_MODEL_ID: 'us.anthropic.claude-3-7-sonnet-20250219-v1:0',
        DEBUG: 'false'
      }
    });

    // Add permissions
    proxyHandler.addToRolePolicy(new PolicyStatement({
      effect: Effect.ALLOW,
      actions: [
        'bedrock:InvokeModel',
        'bedrock:InvokeModelWithResponseStream',
        'bedrock:ListFoundationModels'
      ],
      resources: ['*']
    }));

    apiKeySecret.grantRead(proxyHandler);

    // Create Function URL with streaming support
    const fnUrl = proxyHandler.addFunctionUrl({
      authType: FunctionUrlAuthType.NONE,
      cors: {
        allowedOrigins: ['*'],
        allowedMethods: [HttpMethod.GET, HttpMethod.POST],
        allowedHeaders: ['*']
      },
      invokeMode: InvokeMode.RESPONSE_STREAM, // Enable streaming
    });

    // Output the Function URL
    new CfnOutput(this, 'FunctionUrl', {
      value: fnUrl.url
    });
  }
}

module.exports = { BedrockProxyStack }; 