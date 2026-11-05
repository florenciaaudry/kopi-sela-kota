import Link from "next/link";

export default function NotFound() {
  return (
    <main className="full-page-message">
      <p className="eyebrow">404 / AKSES</p>
      <h1>Halaman tidak tersedia</h1>
      <p>
        Halaman tidak ditemukan atau role Anda tidak memiliki izin untuk
        membukanya.
      </p>
      <Link className="secondary-button" href="/">
        Kembali ke beranda
      </Link>
    </main>
  );
}
