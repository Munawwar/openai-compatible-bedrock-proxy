/* How to run:

  export IS_TEST=true
  export AWS_REGION=us-east-2
  export AWS_PROFILE=personal
  DEBUG=true node test.js

*/
const { handler } = require('../src/app');

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
      "x-amzn-trace-id": "Root=1-67b35345-5245c4cabcabcabcbdcd898",
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
      "requestId": "de99bbe6-753e-4633-8035-dabcabcabce2ce",
      "routeKey": "$default",
      "stage": "$default",
      "time": "17/Feb/2025:15:18:29 +0000",
      "timeEpoch": 1739805509568
  },

  // This is a simple example body to test on:
  // "body": JSON.stringify({
  //     "model": "us.anthropic.claude-3-5-sonnet-20241022-v2:0",
  //     "messages": [{"role": "user", "content": "Hello!"}]
  // }),

  // This is an example from Cursor IDE
  "body": JSON.stringify({
    "model": "gpt-4o",
    "messages": [
        {
            "role": "system",
            "content": "You are an intelligent programmer, powered by GPT-4o. You are happy to help answer any questions that the user has (usually they will be about coding).\n\n1. When the user is asking for edits to their code, please output a simplified version of the code block that highlights the changes necessary and adds comments to indicate where unchanged code has been skipped. For example:\n```language:path/to/file\n// ... existing code ...\n{{ edit_1 }}\n// ... existing code ...\n{{ edit_2 }}\n// ... existing code ...\n```\nThe user can see the entire file, so they prefer to only read the updates to the code. Often this will mean that the start/end of the file will be skipped, but that's okay! Rewrite the entire file only if specifically requested. Always provide a brief explanation of the updates, unless the user specifically requests only the code.\n\nThese edit codeblocks are also read by a less intelligent language model, colloquially called the apply model, to update the file. To help specify the edit to the apply model, you will be very careful when generating the codeblock to not introduce ambiguity. You will specify all unchanged regions (code and comments) of the file with “// … existing code …” comment markers. This will ensure the apply model will not delete existing unchanged code or comments when editing the file. You will not mention the apply model.\n\n2. Do not lie or make up facts.\n\n3. If a user messages you in a foreign language, please respond in that language.\n\n4. Format your response in markdown.\n\n5. When writing out new code blocks, please specify the language ID after the initial backticks, like so: \n```python\n{{ code }}\n```\n\n6. When writing out code blocks for an existing file, please also specify the file path after the initial backticks and restate the method / class your codeblock belongs to, like so:\n```language:some/other/file\nfunction AIChatHistory() {\n    ...\n    {{ code }}\n    ...\n}\n```"
        },
        {
            "role": "user",
            "content": "\n\nhi"
        }
    ],
    "temperature": 0,
    "user": "google-oauth2|user_abcabcabc",
    "stream": true
  }),
  "isBase64Encoded": false
};

const context = {
  "callbackWaitsForEmptyEventLoop": true,
  "functionVersion": "$LATEST",
  "functionName": "BedrockProxyStack-ProxyHandler-RandomHex",
  "memoryLimitInMB": "1024",
  "logGroupName": "/aws/lambda/BedrockProxyStack-ProxyHandler-RandomHex",
  "logStreamName": "2025/02/17/[$LATEST]11c8aa2cabcabcabc2ff835173449",
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
  // response on dev when streaming won't be how it looks like production
  // console.log(response);
})();