import { Bot, Expand, Send } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { chatService } from '../../services/chatService';
import Card from '../common/Card';
import ChatMessage from './ChatMessage';

const welcome = {
  role: 'assistant',
  content: 'Hi. I can help you understand your budget, savings, or debt plan. What would you like to work through?',
};

export default function MiniChatbot() {
  const navigate = useNavigate();
  const [messages, setMessages] = useState([welcome]);
  const [chatId, setChatId] = useState(null);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const bottomRef = useRef(null);
  const mountedRef = useRef(true);

  useEffect(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), [messages]);
  useEffect(() => () => { mountedRef.current = false; }, []);

  const sendMessage = async (event) => {
    event.preventDefault();
    const text = input.trim();
    if (!text || loading) return;
    if (text.length > 4000) {
      setError('Messages must be 4,000 characters or fewer.');
      return;
    }
    setError('');
    setInput('');
    setMessages((current) => [...current, { role: 'user', content: text }]);
    setLoading(true);
    try {
      const response = await chatService.send(text, chatId);
      if (!mountedRef.current) return;
      setChatId(response.chatId);
      setMessages((current) => [...current, { role: 'assistant', content: response.reply || 'The AI returned an empty response. Please try again.' }]);
    } catch (requestError) {
      if (!mountedRef.current) return;
      const message = requestError.response?.data?.message || 'The AI service is unavailable. Your message may not have been saved.';
      setError(message);
      setMessages((current) => [...current, { role: 'assistant', content: message }]);
    } finally {
      if (mountedRef.current) setLoading(false);
    }
  };

  return (
    <Card className="mini-chat">
      <div className="mini-chat__header">
        <div className="mini-chat__identity"><span><Bot size={19} /></span><div><h2>BudgetBrain AI</h2><p>General finance guidance</p></div></div>
        <button className="icon-button" onClick={() => navigate('/history')} aria-label="Open chat history"><Expand size={18} /></button>
      </div>
      <div className="mini-chat__messages">
        {messages.map((message, index) => <ChatMessage key={`${message.role}-${index}`} message={message} />)}
        {loading && <div className="mini-chat__typing"><span /><span /><span /></div>}
        <div ref={bottomRef} />
      </div>
      <form className="mini-chat__composer" onSubmit={sendMessage}>
        <input maxLength="4000" value={input} onChange={(event) => setInput(event.target.value)} placeholder="Ask about your finances..." aria-label="Message BudgetBrain AI" />
        <button type="submit" disabled={!input.trim() || loading} aria-label="Send message"><Send size={17} /></button>
      </form>
      {error && <p className="mini-chat__error" role="alert">{error}</p>}
      <p className="mini-chat__disclaimer">AI can make mistakes. Verify important financial decisions.</p>
    </Card>
  );
}
