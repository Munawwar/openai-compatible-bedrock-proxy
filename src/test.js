/* How to run:

  export IS_TEST=true
  export AWS_REGION=us-east-2
  export AWS_PROFILE=personal
  node test.js

*/
const { handler } = require('./app');

const event = {
  "version": "2.0",
  "routeKey": "$default",
  "rawPath": "/api/v1/chat/completions",
  "rawQueryString": "",
  "headers": {
      "authorization": `Bearer ${process.env.API_KEY_SECRET}`,
      "x-amzn-tls-cipher-suite": "TLS_AES_128_GCM_SHA256",
      "content-length": "118",
      "x-amzn-tls-version": "TLSv1.3",
      "x-amzn-trace-id": "Root=1-67b35345-5245c4cc1c3fe77b6bdcd898",
      "x-forwarded-proto": "https",
      "host": "random.lambda-url.us-east-2.on.aws",
      "x-forwarded-port": "443",
      "content-type": "application/json",
      "x-forwarded-for": "87.200.84.111",
      "accept": "*/*",
      "user-agent": "curl/8.5.0"
  },
  "requestContext": {
      "accountId": "anonymous",
      "apiId": "random",
      "domainName": "random.lambda-url.us-east-2.on.aws",
      "domainPrefix": "random",
      "http": {
          "method": "POST",
          "path": "/api/v1/chat/completions",
          "protocol": "HTTP/1.1",
          "sourceIp": "87.200.84.111",
          "userAgent": "curl/8.5.0"
      },
      "requestId": "de99bbe6-753e-4633-8035-d626a651e2ce",
      "routeKey": "$default",
      "stage": "$default",
      "time": "17/Feb/2025:15:18:29 +0000",
      "timeEpoch": 1739805509568
  },
  "body": JSON.stringify({
      "model": "us.anthropic.claude-3-5-sonnet-20241022-v2:0",
      "messages": [{"role": "user", "content": "Hello!"}]
  }),
  "isBase64Encoded": false
};

const context = {
  "callbackWaitsForEmptyEventLoop": true,
  "functionVersion": "$LATEST",
  "functionName": "BedrockProxyStack-ProxyHandler-RandomHex",
  "memoryLimitInMB": "1024",
  "logGroupName": "/aws/lambda/BedrockProxyStack-ProxyHandler-RandomHex",
  "logStreamName": "2025/02/17/[$LATEST]11c8aa2c1984450bbda62ff835173449",
  "invokedFunctionArn": "arn:aws:lambda:us-east-2:1111111111111:function:BedrockProxyStack-ProxyHandler-RandomHex",
  "awsRequestId": "11111111-1111-1111-1111-111111111111"
};

(async () => {
  const response = await handler(
    event,
    // 'lambda-stream' will add the correct 2nd parameter
    // @ts-ignore
    context
  );
  console.log(response);
})();