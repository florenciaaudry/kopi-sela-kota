"use client";

import { moduleTitles } from "@/lib/erp-terminology";

import { usePathname } from "next/navigation";
import Link from "next/link";

const labels = moduleTitles;

export function WorkspaceBreadcrumb() {
  const parts = usePathname().split("/").filter(Boolean);
  return <nav className="workspace-breadcrumb" aria-label="Lokasi halaman">
    <Link className="apps-home-button" href="/"><span aria-hidden="true">▦</span> Apps</Link>
    <span className="breadcrumb-divider" aria-hidden="true">/</span>
    <span>{parts.length ? labels[parts[0]] ?? "Ruang kerja" : "Beranda"}</span>
    {parts[1] === "receipt" ? <><span aria-hidden="true">/</span><span>Receipt</span></> : null}
  </nav>;
}
