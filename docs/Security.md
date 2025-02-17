# Security

You can prevent API abuse by throttling concurrency of lambda invocations by setting `reservedConcurrentExecutions` value in `cdk/lib/bedrock-proxy-stack.js` file.