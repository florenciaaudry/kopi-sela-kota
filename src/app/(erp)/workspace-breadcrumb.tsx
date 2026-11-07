"use client";

import { moduleTitles } from "@/lib/erp-terminology";

import { usePathname } from "next/navigation";


const labels = moduleTitles;

export function WorkspaceBreadcrumb() {
  const parts = usePathname().split("/").filter(Boolean);
  return <nav className="workspace-breadcrumb" aria-label="Lokasi halaman">
    <span className="workspace-company">Kopi Sela Kota</span>
    <span className="breadcrumb-divider" aria-hidden="true">/</span>
    <span>{parts.length ? labels[parts[0]] ?? "Ruang kerja" : "Dashboard"}</span>
    {parts[1] === "receipt" ? <><span aria-hidden="true">/</span><span>Receipt</span></> : null}
  </nav>;
}
