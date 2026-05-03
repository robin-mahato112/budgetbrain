import styles from './Sidebar.module.css';

export default function Sidebar({ open, chats, activeChatId, onSelect, onNew, onDelete, onToggle, user, onLogout, activeView, onViewChange }) {
  return (
    <>
      {!open && (
        <button className={styles.openBtn} onClick={onToggle}>☰</button>
      )}
      <aside className={`${styles.sidebar} ${open ? styles.open : styles.closed}`}>
        <div className={styles.top}>
          <span className={styles.logo}>Budget<span>Brain</span></span>
          <button className={styles.iconBtn} onClick={onToggle}>✕</button>
        </div>

        <div className={styles.navBtns}>
          <button
            className={`${styles.navBtn} ${activeView === 'chat' ? styles.activeNav : ''}`}
            onClick={() => { onNew(); onViewChange('chat'); }}
          >
            💬 AI Advisor
          </button>
          <button
            className={`${styles.navBtn} ${activeView === 'dashboard' ? styles.activeNav : ''}`}
            onClick={() => onViewChange('dashboard')}
          >
            📊 Finance Tools
          </button>
        </div>

        <div className={styles.chatList}>
          <p className={styles.sectionLabel}>Recent Chats</p>
          {chats.length === 0 && <p className={styles.empty}>No chats yet</p>}
          {chats.map(chat => (
            <div
              key={chat._id}
              className={`${styles.chatItem} ${activeChatId === chat._id ? styles.active : ''}`}
              onClick={() => onSelect(chat._id)}
            >
              <span className={styles.chatTitle}>{chat.title}</span>
              <button className={styles.deleteBtn} onClick={e => { e.stopPropagation(); onDelete(chat._id); }}>🗑</button>
            </div>
          ))}
        </div>

        <div className={styles.footer}>
          <div className={styles.userInfo}>
            <div className={styles.avatar}>{user?.name?.[0]?.toUpperCase()}</div>
            <span className={styles.userName}>{user?.name}</span>
          </div>
          <button className={styles.logoutBtn} onClick={onLogout}>Logout</button>
        </div>
      </aside>
    </>
  );
}