import { A2ARequest, A2AResponse } from '../types/agent';

const PROXY_URL = 'http://localhost:3001/api/proxy';

export interface TaskContext {
  taskId: string;
  contextId: string;
}

export class A2AClient {
  private url: string;

  constructor(url: string) {
    this.url = url;
  }

  private async makeRequest(body: A2ARequest): Promise<A2AResponse> {
    console.log('🔵 A2A Request:', JSON.stringify(body, null, 2));

    const response = await fetch(PROXY_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        url: this.url,
        body,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ HTTP error:', response.status, errorText);
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    console.log('🟢 A2A Response:', JSON.stringify(data, null, 2));

    return data;
  }

  async sendMessageStreaming(
    message: string,
    context?: TaskContext,
    metadata?: Record<string, any>,
    onUpdate?: (message: string) => void
  ): Promise<{ text: string; context: TaskContext }> {
    const messageObj: any = {
      kind: 'message',
      messageId: this.generateId(),
      role: 'user',
      parts: [
        {
          kind: 'text',
          text: message,
        },
      ],
    };

    // Add taskId and contextId if continuing a conversation
    if (context) {
      if (context.taskId) {
        messageObj.taskId = context.taskId;
      }
      if (context.contextId) {
        messageObj.contextId = context.contextId;
      }
    }

    const requestId = this.generateId();
    const request: any = {
      jsonrpc: '2.0',
      method: 'message/stream',
      params: {
        message: messageObj,
      },
      id: requestId,
    };

    // Add metadata to params if provided
    if (metadata && Object.keys(metadata).length > 0) {
      request.params.metadata = metadata;
    }

    console.log('🔵 A2A Streaming Request:', JSON.stringify(request, null, 2));

    try {
      // Retry logic: 5 attempts with 5 second delay
      const maxRetries = 5;
      const retryDelay = 5000; // 5 seconds
      let lastError: Error | null = null;

      for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
          console.log(`🔄 Stream request attempt ${attempt}/${maxRetries}`);

          const response = await fetch(PROXY_URL + '/stream', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              url: this.url,
              body: request,
            }),
          });

          if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
          }

          // Success - break out of retry loop and continue with stream processing
          console.log(`✅ Stream request successful on attempt ${attempt}`);

          const reader = response.body?.getReader();
          const decoder = new TextDecoder();

          if (!reader) {
            throw new Error('No reader available');
          }

          let finalText = '';
          let taskContext: TaskContext = context || { taskId: '', contextId: '' };

          while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            const chunk = decoder.decode(value, { stream: true });
            const lines = chunk.split('\n');

            for (const line of lines) {
              if (!line.trim() || !line.startsWith('data: ')) continue;

              const data = line.slice(6); // Remove 'data: ' prefix
              if (data === '[DONE]') continue;

              try {
                const parsed = JSON.parse(data);
                console.log('🟢 Stream chunk:', parsed);

                if (parsed.error) {
                  throw new Error(parsed.error.message);
                }

                const result = parsed.result;

                if (!result) continue;

                // Handle different response types based on 'kind'
                if (result.kind === 'task') {
                  // Initial Task response
                  const terminalStates = ['completed', 'canceled', 'failed', 'rejected'];
                  const isTerminal = terminalStates.includes(result.status?.state);

                  taskContext = {
                    taskId: isTerminal ? '' : result.id,
                    contextId: result.contextId,
                  };

                  console.log(`📋 Task received: ${result.id}, state: ${result.status?.state}`);

                  // Extract message from status if available
                  if (result.status?.message?.role === 'agent') {
                    const textPart = result.status.message.parts?.find((p: any) => p.kind === 'text');
                    if (textPart?.text) {
                      finalText = textPart.text;
                    }
                  }
                } else if (result.kind === 'message' && result.role === 'agent') {
                  // Intermediate streaming message from agent
                  const textPart = result.parts?.find((p: any) => p.kind === 'text');
                  if (textPart?.text) {
                    console.log('💬 Streaming message:', textPart.text.substring(0, 50));
                    if (onUpdate) {
                      onUpdate(textPart.text);
                    }
                  }

                  // Update context
                  if (result.taskId) {
                    taskContext.taskId = result.taskId;
                  }
                  if (result.contextId) {
                    taskContext.contextId = result.contextId;
                  }
                } else if (result.kind === 'status-update') {
                  // TaskStatusUpdateEvent - status changes during streaming
                  console.log(`📊 Status update: taskId=${result.taskId}, state=${result.status?.state}, final=${result.final}`);

                  taskContext.taskId = result.taskId;
                  taskContext.contextId = result.contextId;

                  // Extract message from status (both intermediate and final)
                  if (result.status?.message?.role === 'agent') {
                    const textPart = result.status.message.parts?.find((p: any) => p.kind === 'text');
                    if (textPart?.text) {
                      if (result.final) {
                        // This is the final message
                        finalText = textPart.text;
                        console.log('✅ Final message received');
                      } else {
                        // This is an intermediate message - call onUpdate
                        console.log('💬 Intermediate message:', textPart.text.substring(0, 50));
                        if (onUpdate) {
                          onUpdate(textPart.text);
                        }
                      }
                    }
                  }

                  // Clear taskId if terminal state
                  const terminalStates = ['completed', 'canceled', 'failed', 'rejected'];
                  if (terminalStates.includes(result.status?.state)) {
                    taskContext.taskId = '';
                  }
                } else if (result.kind === 'artifact-update') {
                  // TaskArtifactUpdateEvent - new artifacts generated
                  console.log('🎨 Artifact update received');
                  // Could handle artifacts here if needed
                }
              } catch (e) {
                console.error('Failed to parse chunk:', e);
              }
            }
          }

          return {
            text: finalText,
            context: taskContext,
          };
        } catch (error) {
          lastError = error as Error;
          console.error(`❌ Stream request attempt ${attempt} failed:`, error);

          // If this wasn't the last attempt, wait before retrying
          if (attempt < maxRetries) {
            console.log(`⏳ Waiting ${retryDelay / 1000} seconds before retry...`);
            await new Promise(resolve => setTimeout(resolve, retryDelay));
          }
        }
      }

      // If we get here, all retries failed
      console.error(`❌ All ${maxRetries} stream request attempts failed`);
      throw lastError || new Error('Stream request failed after all retries');
    } catch (error) {
      console.error('❌ Streaming request failed:', error);
      throw error;
    }
  }

  async sendMessage(
    message: string,
    context?: TaskContext,
    metadata?: Record<string, any>
  ): Promise<{ text: string; context: TaskContext; intermediateMessages?: string[] }> {
    const messageObj: any = {
      kind: 'message',
      messageId: this.generateId(),
      role: 'user',
      parts: [
        {
          kind: 'text',
          text: message,
        },
      ],
    };

    // Add taskId and contextId if continuing a conversation
    // Only add taskId if it's not empty (terminal tasks have empty taskId)
    if (context) {
      if (context.taskId) {
        messageObj.taskId = context.taskId;
      }
      if (context.contextId) {
        messageObj.contextId = context.contextId;
      }
    }

    const request: any = {
      jsonrpc: '2.0',
      method: 'message/send',
      params: {
        message: messageObj,
      },
      id: this.generateId(),
    };

    // Add metadata to params if provided
    if (metadata && Object.keys(metadata).length > 0) {
      request.params.metadata = metadata;
    }

    try {
      const data = await this.makeRequest(request);

      if (data.error) {
        console.error('❌ A2A Error:', data.error);
        throw new Error(data.error.message);
      }

      // Response can be Task or Message
      const result = data.result as any;

      let responseText = '';
      let taskContext: TaskContext;
      let intermediateMessages: string[] = [];

      // If it's a direct Message
      if (result.kind === 'message') {
        const textPart = result.parts?.find((p: any) => p.kind === 'text');
        responseText = textPart?.text || '';
        taskContext = {
          taskId: result.taskId || context?.taskId || '',
          contextId: result.contextId || context?.contextId || '',
        };
      }
      // If it's a Task
      else if (result.kind === 'task') {
        // Check if task is in terminal state (completed, canceled, failed, rejected)
        const terminalStates = ['completed', 'canceled', 'failed', 'rejected'];
        const isTerminal = terminalStates.includes(result.status?.state);

        // If terminal state, clear taskId to start a new conversation
        taskContext = {
          taskId: isTerminal ? '' : result.id,
          contextId: result.contextId,
        };

        console.log(`📋 Task state: ${result.status?.state}, isTerminal: ${isTerminal}`);

        // Extract intermediate messages from history (exclude user messages)
        if (result.history && result.history.length > 0) {
          const agentMessages = result.history.filter((m: any) => m.role === 'agent');
          intermediateMessages = agentMessages
            .map((m: any) => {
              const textPart = m.parts?.find((p: any) => p.kind === 'text');
              return textPart?.text;
            })
            .filter((text: string) => text);
        }

        // Get final response from status.message
        if (result.status?.message?.role === 'agent') {
          const textPart = result.status.message.parts?.find((p: any) => p.kind === 'text');
          if (textPart?.text) {
            responseText = textPart.text;
          }
        }

        // Fallback: use last message from history
        if (!responseText && intermediateMessages.length > 0) {
          responseText = intermediateMessages[intermediateMessages.length - 1];
          intermediateMessages = intermediateMessages.slice(0, -1); // Remove last as it's now the main response
        }
      } else {
        console.warn('⚠️ Unknown result kind:', result);
        throw new Error('Unknown response format');
      }

      if (!responseText) {
        console.warn('⚠️ Could not extract text from response:', result);
      }

      return {
        text: responseText,
        context: taskContext!,
        intermediateMessages: intermediateMessages.length > 0 ? intermediateMessages : undefined,
      };
    } catch (error) {
      console.error('❌ A2A request failed:', error);
      throw error;
    }
  }

  async getAgentInfo(): Promise<{
    name: string;
    description?: string;
    skills?: Array<{ id: string; name: string; description: string; tags?: string[] }>;
  }> {
    const request: A2ARequest = {
      jsonrpc: '2.0',
      method: 'agent/getAuthenticatedExtendedCard',
      id: this.generateId(),
    };

    try {
      const data = await this.makeRequest(request);

      if (data.error) {
        console.error('❌ Failed to get agent info:', data.error);
        throw new Error(data.error.message);
      }

      const result = data.result as any;
      return {
        name: result.name || 'Unknown Agent',
        description: result.description,
        skills: result.skills || [],
      };
    } catch (error) {
      console.error('❌ Failed to get agent info:', error);
      throw error;
    }
  }

  async ping(): Promise<boolean> {
    try {
      const request: A2ARequest = {
        jsonrpc: '2.0',
        method: 'agent/getAuthenticatedExtendedCard',
        id: this.generateId(),
      };

      const data = await this.makeRequest(request);
      return !data.error;
    } catch (error) {
      console.error('❌ Ping failed:', error);
      return false;
    }
  }

  private generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
}
