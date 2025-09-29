import { useState } from 'react';
import { X, Loader } from 'lucide-react';
import { useStore } from '../store/useStore';
import { A2AClient } from '../services/a2aClient';
import { Agent } from '../types/agent';

interface AddAgentModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function AddAgentModal({ isOpen, onClose }: AddAgentModalProps) {
  const [url, setUrl] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const { addAgent } = useStore();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!url.trim()) {
      setError('Please enter a valid URL');
      return;
    }

    let agentUrl = url.trim();
    if (!agentUrl.startsWith('http://') && !agentUrl.startsWith('https://')) {
      agentUrl = 'https://' + agentUrl;
    }

    setIsLoading(true);

    try {
      const client = new A2AClient(agentUrl);

      const isOnline = await client.ping();

      let agentInfo = { name: 'Unknown Agent', description: '', skills: [] };
      try {
        agentInfo = await client.getAgentInfo();
      } catch {
        const urlObj = new URL(agentUrl);
        agentInfo.name = urlObj.hostname;
      }

      const newAgent: Agent = {
        id: `agent-${Date.now()}`,
        name: agentInfo.name,
        url: agentUrl,
        description: agentInfo.description,
        status: isOnline ? 'online' : 'offline',
        lastSeen: new Date(),
        skills: agentInfo.skills,
      };

      addAgent(newAgent);
      setUrl('');
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add agent. Please check the URL.');
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Add Agent</h2>
          <button className="close-button" onClick={onClose}>
            <X size={24} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="agent-url">Agent URL</label>
            <input
              id="agent-url"
              type="text"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://agent.example.com/api"
              disabled={isLoading}
              autoFocus
            />
            <p className="form-hint">
              Enter the URL of the Agent2Agent protocol endpoint
            </p>
          </div>

          {error && <div className="error-message">{error}</div>}

          <div className="modal-actions">
            <button type="button" className="button-secondary" onClick={onClose} disabled={isLoading}>
              Cancel
            </button>
            <button type="submit" className="button-primary" disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader size={16} className="spinner" />
                  Adding...
                </>
              ) : (
                'Add Agent'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}