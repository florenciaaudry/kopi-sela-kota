"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";

const labels: Record<string, string> = { sales: "Penjualan", crm: "Peluang pelanggan", purchase: "Pembelian", inventory: "Produk & stok", accounting: "Akuntansi", invoicing: "Tagihan & pembayaran", pos: "Kasir", returns: "Retur & pemeriksaan" };

export function WorkspaceBreadcrumb() {
  const parts = usePathname().split("/").filter(Boolean);
  return <nav className="workspace-breadcrumb" aria-label="Lokasi halaman">
    <Link className="apps-home-button" href="/"><span aria-hidden="true">▦</span> Aplikasi</Link>
    <span className="breadcrumb-divider" aria-hidden="true">/</span>
    <span>{parts.length ? labels[parts[0]] ?? "Ruang kerja" : "Beranda"}</span>
    {parts[1] === "receipt" ? <><span aria-hidden="true">/</span><span>Struk</span></> : null}
  </nav>;
}
