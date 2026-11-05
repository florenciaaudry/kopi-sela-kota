import Link from "next/link";
import { redirect } from "next/navigation";

import { applicationAccess, roleLabels } from "@/lib/roles";
import type { AppRole } from "@/lib/supabase/database.types";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { isDemoMode } from "@/lib/runtime-mode";

import { signOutAction } from "./actions";

export const dynamic = "force-dynamic";

export default async function ErpLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  if (isDemoMode()) {
    const demoApplications = applicationAccess;
    return (
      <div className="erp-shell">
        <header className="topbar">
          <Link aria-label="Kopi Sela Kota beranda" className="brand-lockup" href="/">
            <span className="brand-mark brand-mark-small" aria-hidden="true">KS</span>
            <span>Kopi Sela Kota</span>
          </Link>
          <div className="topbar-user">
            <span className="user-name">Pengguna Demo</span>
            <span className="role-pill">Mode demo · lokal</span>
            <Link className="logout-button demo-exit" href="/login">Info login</Link>
          </div>
        </header>
        <div className="demo-mode-banner" role="status">
          MODE DEMO AKTIF · Data fixture dan perubahan hanya berada di browser ini; belum tersambung ke Supabase.
        </div>
        <div className="app-switcher">
          <Link className="switcher-home" href="/">Beranda</Link>
          <span className="switcher-divider" aria-hidden="true">/</span>
          <nav aria-label="Aplikasi">
            {demoApplications.map((app) => (
              app.href ? <Link className="app-link" href={app.href} key={app.name}>{app.name}</Link> : null
            ))}
          </nav>
        </div>
        <div className="workspace">
          <aside className="sidebar">
            <p className="sidebar-label">WORKSPACE DEMO</p>
            <Link className="sidebar-link" href="/">Ringkasan</Link>
            {demoApplications.map((app) => app.href ? (
              <Link className="sidebar-link" href={app.href} key={app.name}>{app.name}</Link>
            ) : null)}
            <div className="sidebar-note">Simulasi lokal untuk mencoba alur. Tidak ada perubahan ke database.</div>
          </aside>
          <main className="main-content">{children}</main>
        </div>
      </div>
    );
  }

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    redirect("/login");
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("full_name, role")
    .eq("id", user.id)
    .maybeSingle();

  if (profileError) {
    return (
      <main className="full-page-message">
        <h1>Profil tidak dapat dimuat</h1>
        <p role="alert">{profileError.message}</p>
      </main>
    );
  }

  if (!profile) {
    return (
      <main className="full-page-message">
        <h1>Akses belum diberikan</h1>
        <p>
          Akun berhasil masuk, tetapi belum memiliki role aplikasi. Minta
          administrator menetapkan role melalui Supabase.
        </p>
        <form action={signOutAction}>
          <button className="secondary-button" type="submit">
            Keluar
          </button>
        </form>
      </main>
    );
  }

  const role = profile.role as AppRole;
  const applications = applicationAccess.filter((app) =>
    app.roles.includes(role),
  );

  return (
    <div className="erp-shell">
      <header className="topbar">
        <Link aria-label="Kopi Sela Kota beranda" className="brand-lockup" href="/">
          <span className="brand-mark brand-mark-small" aria-hidden="true">
            KS
          </span>
          <span>Kopi Sela Kota</span>
        </Link>
        <div className="topbar-user">
          <span className="user-name">{profile.full_name}</span>
          <span className="role-pill">{roleLabels[role]}</span>
          <form action={signOutAction}>
            <button className="logout-button" type="submit">
              Keluar
            </button>
          </form>
        </div>
      </header>

      <div className="app-switcher">
        <Link className="switcher-home" href="/">
          Beranda
        </Link>
        <span className="switcher-divider" aria-hidden="true">
          /
        </span>
        <nav aria-label="Aplikasi">
          {applications.map((app) =>
            app.available && app.href ? (
              <Link className="app-link" href={app.href} key={app.name}>
                {app.name}
              </Link>
            ) : (
              <span
                aria-disabled="true"
                className="app-link app-link-disabled"
                key={app.name}
                title="Modul ini belum diimplementasikan"
              >
                {app.name}
                <span className="coming-soon">Segera</span>
              </span>
            ),
          )}
        </nav>
      </div>

      <div className="workspace">
        <aside className="sidebar">
          <p className="sidebar-label">WORKSPACE</p>
          <Link className="sidebar-link" href="/">
            Ringkasan
          </Link>
          {applications.some((app) => app.name === "Inventory") ? (
            <Link className="sidebar-link" href="/inventory">
              Produk &amp; stok
            </Link>
          ) : null}
          <div className="sidebar-note">
            Menu modul yang belum aktif ditampilkan tanpa tautan transaksi.
          </div>
        </aside>
        <main className="main-content">{children}</main>
      </div>
    </div>
  );
}
