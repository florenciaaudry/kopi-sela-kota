"use client";

import { useState } from "react";
import Link from "next/link";
import { AppIcon, appDescriptions } from "./app-icon";

type AppItem = { name: string; group: string; href?: string };
export function AppDirectory({ applications }: { applications: AppItem[] }) {
  const [query, setQuery] = useState("");
  const [group, setGroup] = useState("Semua");
  const groups = ["Semua", ...new Set(applications.map(app => app.group))];
  const shown = applications.filter(app => {
    const text = `${app.name} ${app.group} ${appDescriptions[app.name].label} ${appDescriptions[app.name].description}`.toLocaleLowerCase("id-ID");
    return (group === "Semua" || group === app.group) && text.includes(query.trim().toLocaleLowerCase("id-ID"));
  });
  return <section className="ksk-app-section" aria-labelledby="app-directory-heading">
    <div className="ksk-section-header"><div><p className="eyebrow">APLIKASI</p><h2 id="app-directory-heading">Mau mengerjakan apa hari ini?</h2><p>Pilih aplikasi untuk memulai. Menu mengikuti peran akunmu.</p></div><label className="ksk-app-search"><span className="ksk-visually-hidden">Cari aplikasi</span><svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><circle cx="10.5" cy="10.5" r="6.5"/><path d="m16 16 5 5"/></svg><input type="search" placeholder="Cari aplikasi…" value={query} onChange={event => setQuery(event.target.value)} /></label></div>
    <div className="ksk-group-filters" aria-label="Kelompok aplikasi">{groups.map(item => <button type="button" key={item} aria-pressed={group === item} onClick={() => setGroup(item)}>{item}</button>)}</div>
    <div className="ksk-app-grid">{shown.map(app => {
      const detail = appDescriptions[app.name];
      return <Link className="ksk-app-card" href={app.href ?? "/"} key={app.name}><div className="ksk-card-top"><span className={`ksk-app-icon tone-${detail.tone}`}><AppIcon name={app.name} /></span><span className="ksk-card-arrow" aria-hidden="true">↗</span></div><h3>{detail.label}</h3><p>{detail.description}</p><span className="ksk-card-group">{app.group}</span></Link>;
    })}</div>
    {shown.length === 0 ? <div className="ksk-no-results"><h3>Aplikasinya belum ditemukan</h3><p>Coba nama lain, misalnya “stok” atau “pembayaran”.</p><button className="secondary-button" type="button" onClick={() => { setQuery(""); setGroup("Semua"); }}>Tampilkan semua aplikasi</button></div> : null}
  </section>;
}
