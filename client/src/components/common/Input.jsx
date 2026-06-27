export default function Input({ label, error, className = '', ...props }) {
  const id = props.id || props.name;
  return (
    <label className={`field ${className}`} htmlFor={id}>
      {label && <span className="field__label">{label}</span>}
      <input className={`input ${error ? 'input--error' : ''}`} id={id} {...props} />
      {error && <span className="field__error">{error}</span>}
    </label>
  );
}
