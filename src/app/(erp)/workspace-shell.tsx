import Link from "next/link";
import type { ReactNode } from "react";
import { applicationAccess, roleLabels } from "@/lib/roles";
import type { AppRole } from "@/lib/supabase/database.types";
import { AppIcon } from "./app-icon";
import { NavigationLink } from "./navigation-link";
import { WorkspaceBreadcrumb } from "./workspace-breadcrumb";
import { MobileNavigation } from "./mobile-navigation";
import { signOutAction } from "./actions";

export function WorkspaceShell({ children, fullName, role, demo = false }: { children: ReactNode; fullName: string; role: AppRole; demo?: boolean }) {
  const apps = applicationAccess.filter(app => demo || app.roles.includes(role));
  const navigation = <>
    <NavigationLink className="ksk-nav-link" href="/"><AppIcon name="home" /><span>Beranda</span></NavigationLink>
    {apps.map(app => app.href ? <NavigationLink className="ksk-nav-link" key={app.name} href={app.href}><AppIcon name={app.name} /><span>{app.name}</span></NavigationLink> : null)}
    {demo || ["warehouse", "finance", "owner"].includes(role) ? <><p className="ksk-nav-label">MENU LAINNYA</p><NavigationLink className="ksk-nav-link" href="/returns"><AppIcon name="returns" /><span>Returns & Credit Notes</span></NavigationLink></> : null}
    {demo || ["finance", "owner"].includes(role) ? <NavigationLink className="ksk-nav-link" href="/#reporting"><AppIcon name="Accounting" /><span>Reporting</span></NavigationLink> : null}
    {!demo && role === "owner" ? <><p className="ksk-nav-label">SETTINGS</p><NavigationLink className="ksk-nav-link" href="/settings"><AppIcon name="home" /><span>Users &amp; Permissions</span></NavigationLink><NavigationLink className="ksk-nav-link" href="/audit"><AppIcon name="Accounting" /><span>Audit Log</span></NavigationLink></> : null}
  </>;
  return <div className="erp-shell ksk-shell">
    <a className="ksk-skip-link" href="#main-content">Langsung ke isi halaman</a>
    <aside className="ksk-sidebar">
      <Link className="ksk-brand" aria-label="Kopi Sela Kota beranda" href="/"><span className="ksk-monogram">ks<span>.</span></span><span><strong>Kopi Sela Kota</strong><small>Ruang kerja operasional</small></span></Link>
      <div className="ksk-company"><span>Kopi Sela Kota<small>Tebet, Jakarta</small></span><span>IDR</span></div>
      <nav aria-label="Aplikasi" className="ksk-sidebar-nav">{navigation}</nav>
      <div className="ksk-sidebar-footer"><span className="ksk-location-dot" aria-hidden="true" /><span>Satu tim, satu alur kerja.<small>Waktu operasional ditampilkan dalam WIB.</small></span></div>
    </aside>
    <div className="ksk-main-column">
      <header className="ksk-topbar"><MobileNavigation>{navigation}</MobileNavigation><WorkspaceBreadcrumb /><div className="ksk-user"><span className="ksk-avatar" aria-hidden="true">{fullName.trim().slice(0, 1).toUpperCase()}</span><span className="ksk-user-name">{fullName}</span><span className="role-pill">{demo ? "Demo lokal" : roleLabels[role]}</span>{demo ? <Link className="logout-button" href="/login">Info login</Link> : <form action={signOutAction}><button className="logout-button" type="submit">Keluar</button></form>}</div></header>
      {demo ? <div className="demo-mode-banner" role="status">MODE DEMO · Perubahan hanya tersimpan di browser ini.</div> : null}
      <main id="main-content" className="main-content ksk-content">{children}</main>
      <footer className="ksk-page-footer"><span>Kopi Sela Kota</span><span>Tebet, Jakarta · Rupiah (IDR)</span></footer>
    </div>
  </div>;
}
