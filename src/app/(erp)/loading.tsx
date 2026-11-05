export default function Loading() {
  return (
    <div aria-live="polite" className="loading-state" role="status">
      <span className="loading-indicator" aria-hidden="true" />
      <span>Memuat data operasional...</span>
    </div>
  );
}
