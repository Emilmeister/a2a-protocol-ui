import { useState } from 'react';
import { AgentList } from './components/AgentList';
import { ChatWindow } from './components/ChatWindow';
import { AddAgentModal } from './components/AddAgentModal';
import './App.css';

function App() {
  const [isModalOpen, setIsModalOpen] = useState(false);

  return (
    <div className="app">
      <AgentList onAddAgent={() => setIsModalOpen(true)} />
      <ChatWindow />
      <AddAgentModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />
    </div>
  );
}

export default App;