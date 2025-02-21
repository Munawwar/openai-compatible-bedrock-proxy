#  Bedrock Access Gateway - Node.js Lambda Function URL

OpenAI-compatible RESTful APIs with Amazon Bedrock.

Use case: You can use a more privacy-respecting Claude Sonnet on Cursor IDE chat without sending data to Anthropic. Also this gives pay-as-you-go pricing. Check [Amazon Bedrock](https://aws.amazon.com/bedrock) for pricing.

This is a port of AWS's Python code sample, but re-written from Python to JS without Docker, ALB or VPC, rather uses Lambda function URL (this saves base costs) and uses CDK for deployment.

## Overview

Amazon Bedrock offers a wide range of foundation models (such as Claude 3 Opus/Sonnet/Haiku, Llama 2/3, Mistral/Mixtral,
etc.) and a broad set of capabilities for you to build generative AI applications. Check the [Amazon Bedrock](https://aws.amazon.com/bedrock) landing page for additional information.

Sometimes, you might have applications developed using OpenAI APIs or SDKs, and you want to experiment with Amazon Bedrock without modifying your codebase. Or you may simply wish to evaluate the capabilities of these foundation models in tools like AutoGen etc. Well, this repository allows you to access Amazon Bedrock models seamlessly through OpenAI APIs and SDKs, enabling you to test these models without code changes.

If you find this GitHub repository useful, please consider giving it a free star ⭐ to show your appreciation and support for the project.

**Features:**

- [x] Support streaming response via server-sent events (SSE)
- [x] Support Model APIs
- [x] Support Chat Completion APIs
- [x] Support Cross-Region Inference
- [x] Support Tool Call
- [ ] Support Embedding API (future)
- [ ] Support Multimodal API (future)

Please check [Usage Guide](./docs/Usage.md) for more details about how to use the new APIs.


## Get Started

### Prerequisites

Please make sure you have met below prerequisites:

- Access to Amazon Bedrock foundation models.

> For more information on how to request model access, please refer to the [Amazon Bedrock User Guide](https://docs.aws.amazon.com/bedrock/latest/userguide/model-access.html) (Set Up > Model access)

### Architecture

Uses a Lambda function with Function URL (with streaming support) to proxy requests to the Bedrock API.

API key is stored in Secrets Manager - lambda caches the secret in-memory till AWS decides to recycle the instance.

The CDK stack creates:
- Lambda function with Function URL
- Secrets Manager secret for API key
- IAM roles and policies for Lambda
- Permissions for Bedrock access

### Deployment

Prerequisites:
```sh
# Get node.js 22. I recommend via `fnn` node version manager
# fnm install 22
npm install -g aws-cdk@^2.178.2
npm install
# or if you want exact version from package-lock.json, then use `npm ci`
```

You need to have your credentials in `~/.aws/credentials`.

To use a specific AWS profile (e.g., 'personal'):
```sh
export AWS_PROFILE=personal
export AWS_REGION=us-east-2
# Or for Windows PowerShell
# $env:AWS_PROFILE = "personal"
# $env:AWS_REGION = "us-east-2"
```

Bootstrap CDK (first time only):
```sh
cdk bootstrap
```

Deploy stack:
```sh
cdk deploy
```

The deployment will output a Function URL. This is your API endpoint.

Go to AWS Secrets Manager, find the secret named "BedrockProxyAPIKey" and retrieve secret - this is your API key.
I recommend you change the secret to not have special characters which get's annoying with curl requests (use 32 characters alphanumeric characters at least).

You can now use the API key and `https://<function-url>/api/v1` as OpenAI base URL in Cursor IDE ([Reference](https://kane.mx/posts/2024/cursor-meets-bedrock/)).

## Testing

Once you have your function URL and API key, you can test the API.

### Chat Completion

```bash
curl -X POST https://<function-url>/api/v1/chat/completions \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer your-api-key" \
  -d '{
    "model": "us.anthropic.claude-3-5-sonnet-20241022-v2:0",
    "messages": [{"role": "user", "content": "Hello!"}]
  }'
```

### Streaming Chat Completion

```bash
curl -X POST https://<function-url>/api/v1/chat/completions \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer your-api-key" \
  --no-buffer \
  -d '{
    "model": "us.anthropic.claude-3-5-sonnet-20241022-v2:0",
    "messages": [{"role": "user", "content": "Hello!"}],
    "stream": true
  }'
```

### List Models

```bash
curl https://<function-url>/api/v1/models \
  -H "Authorization: Bearer your-api-key"
```

### Generate Embeddings (Doesn't work at the moment)

```bash
curl -X POST https://<function-url>/api/v1/embeddings \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer your-api-key" \
  -d '{
    "model": "cohere.embed-multilingual-v3",
    "input": "Hello, world!"
  }'
```

### Environment Variables

The Lambda function uses these environment variables:

- `DEFAULT_MODEL_ID`: Default model to use (default: "us.anthropic.claude-3-5-sonnet-20241022-v2:0")
- `DEFAULT_EMBEDDING_MODEL`: Default embedding model (default: "cohere.embed-multilingual-v3")
- `DEBUG`: Enable debug logging (default: "false")

These are set in the CDK stack and can be overridden during deployment.

### Troubleshooting

If you encounter any issues, please check the [Troubleshooting Guide](./docs/Troubleshooting.md) for more details.

### Local Development

1. Install dependencies:
```bash
npm install
```

2. Run type checking in watch mode:
```bash
npm run typecheck -- --watch
```

3. Test CDK changes:
```bash
cd cdk && npm run synth
```

### About Privacy

This application does not collect any of your data. Furthermore, it does not log any requests or responses by default.

### Which regions are supported?

Generally speaking, all regions that Amazon Bedrock supports will also be supported, if not, please raise an issue in Github.

Note that not all models are available in those regions.

### Which models are supported?

You can use the [Models API](./docs/Usage.md#models-api) to get/refresh a list of supported models in the current region.

### Any performance sacrifice or latency increase by using the proxy APIs

Comparing with the AWS SDK call, the referenced architecture will bring additional latency on response, you can try and test that on you own.

### Any plan to support Bedrock custom models?

Fine-tuned models and models with Provisioned Throughput are currently not supported. You can clone the repo and make the customization if needed.

## Security

See [CONTRIBUTING](CONTRIBUTING.md#security-issue-notifications) for more information.

## License

This library is licensed under the MIT-0 License. See the LICENSE file.