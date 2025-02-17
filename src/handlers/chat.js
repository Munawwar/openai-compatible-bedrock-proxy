// @ts-check
const { invokeModelNonStream, invokeModelStream } = require('../utils/bedrock');

/**
 * @param {import('aws-lambda').APIGatewayProxyEventV2} event
 * @param {import('lambda-stream').ResponseStream} responseStream
 */
async function handleChat(event, responseStream) {
  const body = JSON.parse(event.body || '{}');
  
  if (body.stream) {
    responseStream.setContentType('text/event-stream');
    const response = await invokeModelStream(body);
    
    // Handle streaming response
    if (response.body) {
      for await (const chunk of response.body) {
        const payload = JSON.parse(Buffer.from(chunk.chunk?.bytes || '').toString());
        
        if (payload.type === 'content_block_start') {
          responseStream.write(`data: ${JSON.stringify({
            id: `chatcmpl-${Date.now()}`,
            object: 'chat.completion.chunk',
            created: Math.floor(Date.now() / 1000),
            model: body.model,
            choices: [{
              index: 0,
              delta: { role: 'assistant', content: '' }
            }]
          })}\n\n`);
        } else if (payload.type === 'content_block') {
          responseStream.write(`data: ${JSON.stringify({
            id: `chatcmpl-${Date.now()}`,
            object: 'chat.completion.chunk',
            created: Math.floor(Date.now() / 1000),
            model: body.model,
            choices: [{
              index: 0,
              delta: { content: payload.text }
            }]
          })}\n\n`);
        }
      }
    }
    responseStream.write('data: [DONE]\n\n');
  } else {
    const response = await invokeModelNonStream(body);
    const result = JSON.parse(Buffer.from(response.body).toString());
    
    responseStream.write(JSON.stringify({
      id: `chatcmpl-${Date.now()}`,
      object: 'chat.completion',
      created: Math.floor(Date.now() / 1000),
      model: body.model,
      choices: [{
        index: 0,
        message: {
          role: 'assistant',
          content: result.content[0].text
        },
        finish_reason: 'stop'
      }],
      usage: {
        prompt_tokens: result.usage?.input_tokens || 0,
        completion_tokens: result.usage?.output_tokens || 0,
        total_tokens: (result.usage?.input_tokens || 0) + (result.usage?.output_tokens || 0)
      }
    }));
  }
}

module.exports = { handleChat }; 