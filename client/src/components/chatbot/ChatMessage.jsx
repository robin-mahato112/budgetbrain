import ReactMarkdown from 'react-markdown';

export default function ChatMessage({ message }) {
  return (
    <div className={`mini-chat__message mini-chat__message--${message.role}`}>
      {message.role === 'assistant' ? <ReactMarkdown>{message.content}</ReactMarkdown> : message.content}
    </div>
  );
}
