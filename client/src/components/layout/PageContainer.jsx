export default function PageContainer({ title, eyebrow, description, actions, children }) {
  return (
    <div className="page-container">
      {(title || description) && (
        <header className="page-header">
          <div>
            {eyebrow && <p className="eyebrow">{eyebrow}</p>}
            <h1>{title}</h1>
            {description && <p>{description}</p>}
          </div>
          {actions && <div className="page-header__actions">{actions}</div>}
        </header>
      )}
      {children}
    </div>
  );
}
