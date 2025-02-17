# AWS Bedrock Access Gateway

OpenAI-compatible RESTful APIs for Amazon Bedrock

This is a port of AWS's code sample, but re-written from Python to JS without Docker, no ALB nor VPC, rather uses Lambda function URL (this saves costs) and uses CDK.

### AWS resources that will be created

The CDK stack creates:
- Lambda function with Function URL
- Secrets Manager secret for API key
- IAM roles and policies for Lambda
- Permissions for Bedrock access

## How to Deploy

Prerequisites:
```sh
npm install -g aws-cdk@^2.178.2
npm install
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

## Testing

Once you have your function URL and API key, you can test the API.

### Chat Completion

```bash
curl -X POST https://<function-url>/api/v1/chat/completions \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer your-api-key" \
  -d '{
    "model": "anthropic.claude-3-sonnet-20240229-v1:0",
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
    "model": "anthropic.claude-3-sonnet-20240229-v1:0",
    "messages": [{"role": "user", "content": "Hello!"}],
    "stream": true
  }'
```

### List Models

```bash
curl https://<function-url>/api/v1/models \
  -H "Authorization: Bearer your-api-key"
```

### Generate Embeddings

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

- `DEFAULT_MODEL_ID`: Default model to use (default: "anthropic.claude-3-sonnet-20240229-v1:0")
- `DEFAULT_EMBEDDING_MODEL`: Default embedding model (default: "cohere.embed-multilingual-v3")
- `DEBUG`: Enable debug logging (default: "false")

These are set in the CDK stack and can be overridden during deployment.

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

### Troubleshooting

1. **Function URL returns 403**
   - Check if API key is set in Secrets Manager
   - Verify API key format in request header

2. **Streaming doesn't work**
   - Ensure `invokeMode` is set to `RESPONSE_STREAM`
   - Check if model supports streaming

3. **Type errors**
   - Run `npm run typecheck` to see detailed errors
   - Check JSDoc comments and types

## License

MIT-0