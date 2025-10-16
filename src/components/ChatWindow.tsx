import { useState, useRef, useEffect } from 'react';
import { Send, Trash2 } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { useStore } from '../store/useStore';
import { A2AClient } from '../services/a2aClient';
import { Message } from '../types/agent';

export function ChatWindow() {
  const [messageText, setMessageText] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [metadata, setMetadata] = useState<Array<{ key: string; value: string }>>([]);
  const [showMetadata, setShowMetadata] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const {
    activeAgentId,
    agents,
    getConversation,
    addMessage,
    updateMessage,
    updateMessageStatus,
    getTaskContext,
    setTaskContext,
    clearConversation,
  } = useStore();

  const agent = agents.find((a) => a.id === activeAgentId);
  const conversation = activeAgentId ? getConversation(activeAgentId) : null;

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [conversation?.messages]);

  const handleSendMessage = async () => {
    if (!messageText.trim() || !agent || isSending) return;

    const userMessage: Message = {
      id: `msg-${Date.now()}`,
      agentId: agent.id,
      content: messageText,
      timestamp: new Date(),
      sender: 'user',
      status: 'sending',
    };

    addMessage(userMessage);
    const messageToSend = messageText;
    setMessageText('');
    setIsSending(true);

    // Track streaming messages by ID
    const streamingMessages = new Map<string, string>();

    try {
      const client = new A2AClient(agent.url);

      // Get existing task context for this agent
      const taskContext = getTaskContext(agent.id);

      // Convert metadata array to object
      const metadataObj = metadata.reduce((acc, { key, value }) => {
        if (key.trim()) {
          acc[key] = value;
        }
        return acc;
      }, {} as Record<string, string>);

      // Use streaming API
      const response = await client.sendMessageStreaming(
        messageToSend,
        taskContext,
        Object.keys(metadataObj).length > 0 ? metadataObj : undefined,
        (streamText) => {
          // This callback is called for each streaming update
          const messageId = `msg-stream-${Date.now()}-${Math.random()}`;

          // Check if we already have this message (by content)
          let existingMessageId: string | undefined;
          for (const [id, content] of streamingMessages.entries()) {
            if (streamText.startsWith(content)) {
              existingMessageId = id;
              break;
            }
          }

          if (existingMessageId) {
            // Update existing message
            streamingMessages.set(existingMessageId, streamText);
            updateMessage(existingMessageId, streamText);
          } else {
            // Add new streaming message
            streamingMessages.set(messageId, streamText);
            const streamMessage: Message = {
              id: messageId,
              agentId: agent.id,
              content: streamText,
              timestamp: new Date(),
              sender: 'agent',
              status: 'sent',
            };
            addMessage(streamMessage);
          }
        }
      );

      // Save the updated task context
      setTaskContext(agent.id, response.context);

      updateMessageStatus(userMessage.id, 'sent');

      // Add final message if different from last streaming message
      if (response.text && !Array.from(streamingMessages.values()).includes(response.text)) {
        const agentMessage: Message = {
          id: `msg-${Date.now()}-agent`,
          agentId: agent.id,
          content: response.text,
          timestamp: new Date(),
          sender: 'agent',
          status: 'sent',
        };
        addMessage(agentMessage);
      }
    } catch (error) {
      console.error('Failed to send message:', error);
      updateMessageStatus(userMessage.id, 'error');
    } finally {
      setIsSending(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleClearChat = () => {
    if (!agent) return;
    if (confirm('Are you sure you want to clear this conversation?')) {
      clearConversation(agent.id);
    }
  };

  if (!agent) {
    return (
      <div className="chat-window-empty">
        <p>Select an agent to start chatting</p>
      </div>
    );
  }

  return (
    <div className="chat-window">
      <div className="chat-header">
        <div className="agent-avatar">
          {agent.avatar ? (
            <img src={agent.avatar} alt={agent.name} />
          ) : (
            <div className="avatar-placeholder">{agent.name.charAt(0).toUpperCase()}</div>
          )}
        </div>
        <div className="agent-info">
          <div className="agent-info-header">
            <h2>{agent.name}</h2>
            <span className={`status status-${agent.status}`}>{agent.status}</span>
          </div>
          {agent.description && <p className="agent-description">{agent.description}</p>}
          {agent.skills && agent.skills.length > 0 && (
            <div className="agent-skills">
              {agent.skills.map((skill) => (
                <span key={skill.id} className="skill-tag" title={skill.description}>
                  {skill.name}
                </span>
              ))}
            </div>
          )}
        </div>
        <button
          className="clear-chat-button"
          onClick={handleClearChat}
          title="Clear conversation"
        >
          <Trash2 size={20} />
        </button>
      </div>

      <div className="messages-container">
        {conversation?.messages.map((message) => (
          <div key={message.id} className={`message message-${message.sender}`}>
            <div className="message-content">
              {message.sender === 'agent' ? (
                <div className="markdown-content">
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>{message.content}</ReactMarkdown>
                </div>
              ) : (
                <p>{message.content}</p>
              )}
              <span className="message-time">
                {new Date(message.timestamp).toLocaleTimeString([], {
                  hour: '2-digit',
                  minute: '2-digit',
                })}
                {message.sender === 'user' && (
                  <span className={`message-status status-${message.status}`}>
                    {message.status === 'error' ? ' ✗' : message.status === 'sent' ? ' ✓' : ' ⋯'}
                  </span>
                )}
              </span>
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      <div className="message-input-container">
        <div className="input-with-metadata">
          <div className="metadata-toggle-container">
            <button
              className="metadata-toggle-button"
              onClick={() => setShowMetadata(!showMetadata)}
              type="button"
              title="Add metadata"
            >
              {showMetadata ? '📋 Hide Metadata' : '📋 Add Metadata'}
            </button>
          </div>

          {showMetadata && (
            <div className="metadata-container">
              <div className="metadata-header">
                <span>Message Metadata</span>
                <button
                  className="add-metadata-button"
                  onClick={() => setMetadata([...metadata, { key: '', value: '' }])}
                  type="button"
                >
                  + Add Field
                </button>
              </div>
              {metadata.map((item, index) => (
                <div key={index} className="metadata-field">
                  <input
                    type="text"
                    placeholder="Key"
                    value={item.key}
                    onChange={(e) => {
                      const newMetadata = [...metadata];
                      newMetadata[index].key = e.target.value;
                      setMetadata(newMetadata);
                    }}
                    className="metadata-key-input"
                  />
                  <input
                    type="text"
                    placeholder="Value"
                    value={item.value}
                    onChange={(e) => {
                      const newMetadata = [...metadata];
                      newMetadata[index].value = e.target.value;
                      setMetadata(newMetadata);
                    }}
                    className="metadata-value-input"
                  />
                  <button
                    className="remove-metadata-button"
                    onClick={() => {
                      const newMetadata = metadata.filter((_, i) => i !== index);
                      setMetadata(newMetadata);
                    }}
                    type="button"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          )}

          <textarea
            className="message-input"
            value={messageText}
            onChange={(e) => setMessageText(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Type a message..."
            disabled={isSending}
            rows={1}
          />
        </div>
        <button
          className="send-button"
          onClick={handleSendMessage}
          disabled={!messageText.trim() || isSending}
        >
          <Send size={20} />
        </button>
      </div>
    </div>
  );
}