export default function Loader({ label = 'Loading' }) {
  return (
    <div className="loader" role="status">
      <span className="loader__spinner" />
      <span>{label}</span>
    </div>
  );
}
