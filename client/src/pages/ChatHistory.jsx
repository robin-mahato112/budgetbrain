import { MessageSquareText, Trash2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import Card from '../components/common/Card';
import Loader from '../components/common/Loader';
import PageContainer from '../components/layout/PageContainer';
import { chatService } from '../services/chatService';

export default function ChatHistory() {
  const [chats, setChats] = useState([]);
  const [active, setActive] = useState(null);
  const [loading, setLoading] = useState(true);
  const [openingId, setOpeningId] = useState('');
  const [deletingId, setDeletingId] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    let activeRequest = true;
    chatService.list()
      .then((data) => activeRequest && setChats(Array.isArray(data) ? data : []))
      .catch(() => activeRequest && setError('Conversations could not be loaded.'))
      .finally(() => activeRequest && setLoading(false));
    return () => { activeRequest = false; };
  }, []);

  const openChat = async (id) => {
    if (openingId || deletingId) return;
    setOpeningId(id);
    setError('');
    try {
      const chat = await chatService.getById(id);
      setActive({ ...chat, messages: Array.isArray(chat.messages) ? chat.messages : [] });
    } catch {
      setError('That conversation could not be opened.');
    } finally {
      setOpeningId('');
    }
  };
  const deleteChat = async (id) => {
    if (deletingId || !window.confirm('Delete this conversation?')) return;
    setDeletingId(id);
    setError('');
    try {
      await chatService.remove(id);
      setChats((current) => current.filter((chat) => chat._id !== id));
      if (active?._id === id) setActive(null);
    } catch {
      setError('The conversation could not be deleted.');
    } finally {
      setDeletingId('');
    }
  };

  const formatDate = (value) => {
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? 'Date unavailable' : date.toLocaleDateString('en-AU');
  };

  return (
    <PageContainer eyebrow="Conversations" title="Chat history" description="Review and manage your saved conversations with BudgetBrain AI.">
      {error && <p className="data-warning" role="alert">{error}</p>}
      {loading ? <Loader label="Loading conversations" /> : (
        <div className="history-layout">
          <Card className="history-list">
            {chats.length === 0 && <div className="empty-state"><MessageSquareText size={30} /><h2>No conversations yet</h2><p>Start a conversation from the dashboard.</p></div>}
            {chats.map((chat) => (
              <div className={`history-item ${active?._id === chat._id ? 'history-item--active' : ''}`} key={chat._id}>
                <button disabled={openingId === chat._id} onClick={() => openChat(chat._id)}><strong>{chat.title || 'Untitled conversation'}</strong><span>{openingId === chat._id ? 'Opening...' : formatDate(chat.createdAt)}</span></button>
                <button disabled={deletingId === chat._id} className="icon-button" onClick={() => deleteChat(chat._id)} aria-label={`Delete ${chat.title || 'conversation'}`}><Trash2 size={16} /></button>
              </div>
            ))}
          </Card>
          <Card className="history-detail">
            {!active ? <div className="empty-state"><MessageSquareText size={30} /><h2>Select a conversation</h2><p>The messages will appear here.</p></div> : active.messages.map((message, index) => (
              <div className={`history-message history-message--${message.role}`} key={`${message.role}-${index}`}>
                {message.role === 'assistant' ? <ReactMarkdown>{message.content}</ReactMarkdown> : message.content}
              </div>
            ))}
          </Card>
        </div>
      )}
    </PageContainer>
  );
}
