import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { Agent, Message, Conversation } from '../types/agent';
import { TaskContext } from '../services/a2aClient';

interface AppState {
  agents: Agent[];
  conversations: Record<string, Conversation>;
  taskContexts: Record<string, TaskContext>; // agentId -> TaskContext
  activeAgentId: string | null;

  addAgent: (agent: Agent) => void;
  removeAgent: (agentId: string) => void;
  updateAgentStatus: (agentId: string, status: Agent['status']) => void;

  addMessage: (message: Message) => void;
  updateMessage: (messageId: string, content: string) => void;
  updateMessageStatus: (messageId: string, status: Message['status']) => void;
  clearConversation: (agentId: string) => void;

  setActiveAgent: (agentId: string | null) => void;
  markConversationAsRead: (agentId: string) => void;

  getConversation: (agentId: string) => Conversation;
  getTaskContext: (agentId: string) => TaskContext | undefined;
  setTaskContext: (agentId: string, context: TaskContext) => void;
}

export const useStore = create<AppState>()(
  persist(
    (set, get) => ({
      agents: [],
      conversations: {},
      taskContexts: {},
      activeAgentId: null,

      addAgent: (agent) =>
        set((state) => ({
          agents: [...state.agents, agent],
          conversations: {
            ...state.conversations,
            [agent.id]: {
              agentId: agent.id,
              messages: [],
              unreadCount: 0,
            },
          },
        })),

      removeAgent: (agentId) =>
        set((state) => {
          const newConversations = { ...state.conversations };
          delete newConversations[agentId];

          return {
            agents: state.agents.filter((a) => a.id !== agentId),
            conversations: newConversations,
            activeAgentId: state.activeAgentId === agentId ? null : state.activeAgentId,
          };
        }),

      updateAgentStatus: (agentId, status) =>
        set((state) => ({
          agents: state.agents.map((a) =>
            a.id === agentId ? { ...a, status, lastSeen: new Date() } : a
          ),
        })),

      addMessage: (message) =>
        set((state) => {
          const conversation = state.conversations[message.agentId] || {
            agentId: message.agentId,
            messages: [],
            unreadCount: 0,
          };

          const isUnread = message.sender === 'agent' && state.activeAgentId !== message.agentId;

          return {
            conversations: {
              ...state.conversations,
              [message.agentId]: {
                ...conversation,
                messages: [...conversation.messages, message],
                unreadCount: isUnread ? conversation.unreadCount + 1 : conversation.unreadCount,
              },
            },
          };
        }),

      updateMessage: (messageId, content) =>
        set((state) => {
          const newConversations = { ...state.conversations };

          Object.keys(newConversations).forEach((agentId) => {
            newConversations[agentId] = {
              ...newConversations[agentId],
              messages: newConversations[agentId].messages.map((m) =>
                m.id === messageId ? { ...m, content } : m
              ),
            };
          });

          return { conversations: newConversations };
        }),

      updateMessageStatus: (messageId, status) =>
        set((state) => {
          const newConversations = { ...state.conversations };

          Object.keys(newConversations).forEach((agentId) => {
            newConversations[agentId] = {
              ...newConversations[agentId],
              messages: newConversations[agentId].messages.map((m) =>
                m.id === messageId ? { ...m, status } : m
              ),
            };
          });

          return { conversations: newConversations };
        }),

      clearConversation: (agentId) =>
        set((state) => {
          const newConversations = { ...state.conversations };
          const newTaskContexts = { ...state.taskContexts };

          // Clear messages
          if (newConversations[agentId]) {
            newConversations[agentId] = {
              ...newConversations[agentId],
              messages: [],
              unreadCount: 0,
            };
          }

          // Clear task context
          delete newTaskContexts[agentId];

          return {
            conversations: newConversations,
            taskContexts: newTaskContexts,
          };
        }),

      setActiveAgent: (agentId) =>
        set((state) => {
          if (agentId && state.conversations[agentId]) {
            return {
              activeAgentId: agentId,
              conversations: {
                ...state.conversations,
                [agentId]: {
                  ...state.conversations[agentId],
                  unreadCount: 0,
                },
              },
            };
          }
          return { activeAgentId: agentId };
        }),

      markConversationAsRead: (agentId) =>
        set((state) => ({
          conversations: {
            ...state.conversations,
            [agentId]: {
              ...state.conversations[agentId],
              unreadCount: 0,
            },
          },
        })),

      getConversation: (agentId) => {
        const state = get();
        return (
          state.conversations[agentId] || {
            agentId,
            messages: [],
            unreadCount: 0,
          }
        );
      },

      getTaskContext: (agentId) => {
        const state = get();
        return state.taskContexts[agentId];
      },

      setTaskContext: (agentId, context) =>
        set((state) => ({
          taskContexts: {
            ...state.taskContexts,
            [agentId]: context,
          },
        })),
    }),
    {
      name: 'a2a-messenger-storage',
    }
  )
);