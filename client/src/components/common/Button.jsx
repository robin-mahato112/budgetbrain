export default function Button({
  children,
  variant = 'primary',
  size = 'medium',
  icon: Icon,
  className = '',
  ...props
}) {
  return (
    <button className={`button button--${variant} button--${size} ${className}`} {...props}>
      {Icon && <Icon size={17} aria-hidden="true" />}
      <span>{children}</span>
    </button>
  );
}
