// @ts-check
const { invokeModelNonStream, invokeModelStream } = require('../utils/bedrock');

const DEBUG = process.env.DEBUG === 'true';

/**
 * @param {import('aws-lambda').APIGatewayProxyEventV2} event
 * @param {import('lambda-stream').ResponseStream} responseStream
 */
async function handleChat(event, responseStream) {
  const body = JSON.parse(event.body || '{}');
  
  // Add validation for required fields
  if (!body.messages || !Array.isArray(body.messages) || body.messages.length === 0) {
    throw Object.assign(new Error('messages is required and must be a non-empty array'), { statusCode: 400 });
  }

  // Validate message format
  for (const msg of body.messages) {
    if (!msg.role || !msg.content) {
      throw Object.assign(new Error('Each message must have role and content'), { statusCode: 400 });
    }
    if (!['user', 'assistant', 'system'].includes(msg.role)) {
      throw Object.assign(new Error('Invalid message role'), { statusCode: 400 });
    }
  }
  
  if (body.stream) {
    responseStream.setContentType('text/event-stream');
    const response = await invokeModelStream(body);
    
    // Handle streaming response
    if (response.body) {
      for await (const chunk of response.body) {
        const payload = JSON.parse(Buffer.from(chunk.chunk?.bytes || '').toString());
        if (DEBUG) {
          console.log('Bedrock response:', JSON.stringify(payload, null, 2));
        }
        /* Example anthropic payload:
          {
            "type": "message_start",
            "message": {
              "id": "msg_bdrk_0163MgvKKBYtA2JLEtwsDHwZ",
              "type": "message",
              "role": "assistant",
              "model": "claude-3-5-sonnet-20241022",
              "content": [],
              "stop_reason": null,
              "stop_sequence": null,
              "usage": {
                "input_tokens": 462,
                "output_tokens": 1
              }
            }
          }

          or

          {
            "type": "content_block_start",
            "index": 0,
            "content_block": {
              "type": "text",
              "text": ""
            }
          }

          or

          {
            "type": "content_block_delta",
            "index": 0,
            "delta": {
              "type": "text_delta",
              "text": "Hello"
            }
          }

          or

          {
            "type": "content_block_stop",
            "index": 0
          }

          or

          {
            "type": "message_delta",
            "delta": {
              "stop_reason": "end_turn",
              "stop_sequence": null
            },
            "usage": {
              "output_tokens": 26
            }
          }

          or

          {
            "type": "message_stop",
            "amazon-bedrock-invocationMetrics": {
              "inputTokenCount": 462,
              "outputTokenCount": 26,
              "invocationLatency": 1405,
              "firstByteLatency": 985
            }
          }
        */
        const date = Date.now();
        const id = `chatcmpl-${date}`;
        let line;
        if (payload.type === 'content_block_start') {
          line = `data: ${JSON.stringify({
            id,
            object: 'chat.completion.chunk',
            created: Math.floor(date / 1000),
            model: body.model,
            choices: [{
              index: 0,
              delta: { role: 'assistant', content: payload.content_block?.text || '' }
            }]
          })}\n\n`;
        } else if (payload.type === 'content_block' || payload.type === 'content_block_delta') {
          line = `data: ${JSON.stringify({
            id,
            object: 'chat.completion.chunk',
            created: Math.floor(date / 1000),
            model: body.model,
            choices: [{
              index: 0,
              delta: { content: payload.delta?.text || '' }
            }]
          })}\n\n`;
        }
        if (line) {
          if (DEBUG) {
            console.log(line);
          }
          responseStream.write(line);
        }
      }
    }
    if (DEBUG) {
      console.log('data: [DONE]\n\n');
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