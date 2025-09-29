export interface AgentSkill {
  id: string;
  name: string;
  description: string;
  tags?: string[];
}

export interface Agent {
  id: string;
  name: string;
  url: string;
  description?: string;
  avatar?: string;
  status: 'online' | 'offline' | 'busy';
  lastSeen?: Date;
  skills?: AgentSkill[];
}

export interface Message {
  id: string;
  agentId: string;
  content: string;
  timestamp: Date;
  sender: 'user' | 'agent';
  status: 'sending' | 'sent' | 'error';
}

export interface A2ARequest {
  method: string;
  params?: Record<string, unknown>;
  id?: string;
}

export interface A2AResponse {
  result?: unknown;
  error?: {
    code: number;
    message: string;
  };
  id?: string;
}

export interface Conversation {
  agentId: string;
  messages: Message[];
  unreadCount: number;
}