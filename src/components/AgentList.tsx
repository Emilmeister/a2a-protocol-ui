import { Plus, Trash2 } from 'lucide-react';
import { useStore } from '../store/useStore';

interface AgentListProps {
  onAddAgent: () => void;
}

export function AgentList({ onAddAgent }: AgentListProps) {
  const { agents, activeAgentId, setActiveAgent, removeAgent, conversations } = useStore();

  const handleDeleteAgent = (agentId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm('Are you sure you want to remove this agent?')) {
      removeAgent(agentId);
    }
  };

  return (
    <div className="agent-list">
      <div className="agent-list-header">
        <h1>A2A Messenger</h1>
        <button className="add-agent-button" onClick={onAddAgent} title="Add Agent">
          <Plus size={20} />
        </button>
      </div>

      <div className="agent-list-items">
        {agents.length === 0 ? (
          <div className="empty-state">
            <p>No agents yet</p>
            <button className="add-agent-link" onClick={onAddAgent}>
              Add your first agent
            </button>
          </div>
        ) : (
          agents.map((agent) => {
            const conversation = conversations[agent.id];
            const unreadCount = conversation?.unreadCount || 0;
            const lastMessage =
              conversation?.messages[conversation.messages.length - 1];

            return (
              <div
                key={agent.id}
                className={`agent-item ${activeAgentId === agent.id ? 'active' : ''}`}
                onClick={() => setActiveAgent(agent.id)}
              >
                <div className="agent-avatar-small">
                  {agent.avatar ? (
                    <img src={agent.avatar} alt={agent.name} />
                  ) : (
                    <div className="avatar-placeholder-small">
                      {agent.name.charAt(0).toUpperCase()}
                    </div>
                  )}
                  <span className={`status-indicator status-${agent.status}`}></span>
                </div>

                <div className="agent-item-info">
                  <div className="agent-item-header">
                    <h3>{agent.name}</h3>
                    {lastMessage && (
                      <span className="last-message-time">
                        {new Date(lastMessage.timestamp).toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                    )}
                  </div>

                  <div className="agent-item-footer">
                    <p className="last-message">
                      {lastMessage
                        ? `${lastMessage.sender === 'user' ? 'You: ' : ''}${lastMessage.content.substring(0, 30)}${lastMessage.content.length > 30 ? '...' : ''}`
                        : 'No messages yet'}
                    </p>
                    {unreadCount > 0 && (
                      <span className="unread-badge">{unreadCount}</span>
                    )}
                  </div>
                </div>

                <button
                  className="delete-agent-button"
                  onClick={(e) => handleDeleteAgent(agent.id, e)}
                  title="Remove agent"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}