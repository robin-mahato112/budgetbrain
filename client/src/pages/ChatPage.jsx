import { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import Sidebar from '../components/Sidebar';
import ChatWindow from '../components/ChatWindow';
import Dashboard from '../components/Dashboard';
import styles from './ChatPage.module.css';

const API = import.meta.env.VITE_API_URL || '';

export default function ChatPage() {
  const { user, logout } = useAuth();
  const { theme, toggle } = useTheme();
  const [chats, setChats] = useState([]);
  const [activeChatId, setActiveChatId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [activeView, setActiveView] = useState('chat');

  useEffect(() => { fetchChats(); }, []);

  const fetchChats = async () => {
    const res = await axios.get(`${API}/api/chat`);
    setChats(res.data);
  };

  const loadChat = async (id) => {
    const res = await axios.get(`${API}/api/chat/${id}`);
    setActiveChatId(id);
    setMessages(res.data.messages);
    setActiveView('chat');
  };

  const newChat = () => {
    setActiveChatId(null);
    setMessages([]);
    setActiveView('chat');
  };

  const sendMessage = async (text) => {
    const userMsg = { role: 'user', content: text };
    setMessages(prev => [...prev, userMsg]);
    setLoading(true);
    try {
      const res = await axios.post(`${API}/api/chat/message`, { message: text, chatId: activeChatId });
      setActiveChatId(res.data.chatId);
      setMessages(prev => [...prev, { role: 'assistant', content: res.data.reply }]);
      fetchChats();
    } catch {
      setMessages(prev => [...prev, { role: 'assistant', content: '⚠️ Something went wrong. Please try again.' }]);
    } finally {
      setLoading(false);
    }
  };

  const deleteChat = async (id) => {
    await axios.delete(`${API}/api/chat/${id}`);
    if (activeChatId === id) newChat();
    fetchChats();
  };

  return (
    <div className={styles.layout}>
      <Sidebar
        open={sidebarOpen}
        chats={chats}
        activeChatId={activeChatId}
        onSelect={loadChat}
        onNew={newChat}
        onDelete={deleteChat}
        onToggle={() => setSidebarOpen(o => !o)}
        user={user}
        onLogout={logout}
        activeView={activeView}
        onViewChange={setActiveView}
      />
      <main className={styles.main}>
        {activeView === 'dashboard'
          ? <Dashboard />
          : <ChatWindow
              messages={messages}
              loading={loading}
              onSend={sendMessage}
              onToggleSidebar={() => setSidebarOpen(o => !o)}
              theme={theme}
              onToggleTheme={toggle}
              userName={user?.name}
            />
        }
      </main>
    </div>
  );
}
