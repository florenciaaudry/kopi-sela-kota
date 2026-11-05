"use client";

export default function ErpError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <section className="notice notice-error" role="alert">
      <strong>Halaman tidak dapat dimuat.</strong>
      <p>{error.message}</p>
      {error.digest ? <p>Referensi: {error.digest}</p> : null}
      <button className="secondary-button retry-button" onClick={reset} type="button">
        Coba lagi
      </button>
    </section>
  );
}
