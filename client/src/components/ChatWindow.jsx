import { useEffect, useRef, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import styles from './ChatWindow.module.css';

const QUICK_PROMPTS = [
  "Help me create a monthly budget",
  "How do I start investing with $1000?",
  "Tips to save money fast",
  "How to pay off credit card debt?",
  "Explain the 50/30/20 budget rule",
  "How to build an emergency fund?",
];

export default function ChatWindow({ messages, loading, onSend, onToggleSidebar, theme, onToggleTheme, userName }) {
  const [input, setInput] = useState('');
  const bottomRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  const handleSend = () => {
    const text = input.trim();
    if (!text) return;
    setInput('');
    onSend(text);
  };

  const handleKey = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); }
  };

  return (
    <div className={styles.window}>
      <header className={styles.header}>
        <button className={styles.iconBtn} onClick={onToggleSidebar}>☰</button>
        <span className={styles.title}>Budget<span>Brain</span> AI</span>
        <button className={styles.themeBtn} onClick={onToggleTheme}>{theme === 'dark' ? '☀️' : '🌙'}</button>
      </header>

      <div className={styles.messages}>
        {messages.length === 0 && (
          <div className={styles.empty}>
            <p className={styles.emptyIcon}>💰</p>
            <p className={styles.emptyTitle}>Hi {userName?.split(' ')[0]}! I'm BudgetBrain</p>
            <p className={styles.emptySub}>Your personal AI financial advisor. Ask me anything about money!</p>
            <div className={styles.quickPrompts}>
              {QUICK_PROMPTS.map((prompt, i) => (
                <button key={i} className={styles.quickBtn} onClick={() => onSend(prompt)}>
                  {prompt}
                </button>
              ))}
            </div>
          </div>
        )}
        {messages.map((msg, i) => (
          <div key={i} className={`${styles.message} ${msg.role === 'user' ? styles.user : styles.ai}`}>
            <div className={styles.bubble}>
              {msg.role === 'assistant'
                ? <ReactMarkdown>{msg.content}</ReactMarkdown>
                : msg.content
              }
            </div>
          </div>
        ))}
        {loading && (
          <div className={`${styles.message} ${styles.ai}`}>
            <div className={styles.bubble}>
              <span className={styles.typing}><span/><span/><span/></span>
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      <div className={styles.inputArea}>
        <textarea
          className={styles.input}
          placeholder="Ask BudgetBrain about budgeting, saving, investing..."
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={handleKey}
          rows={1}
        />
        <button className={styles.sendBtn} onClick={handleSend} disabled={!input.trim() || loading}>➤</button>
      </div>
    </div>
  );
}
