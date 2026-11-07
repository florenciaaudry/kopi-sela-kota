"use client";

import { useRef, type ReactNode } from "react";

export function MobileNavigation({ children }: { children: ReactNode }) {
  const menu = useRef<HTMLDetailsElement>(null);
  return <details className="ksk-mobile-nav" ref={menu}>
    <summary aria-label="Buka daftar aplikasi"><span className="ksk-app-switcher-mark" aria-hidden="true">▦</span><span>Apps</span></summary>
    <nav aria-label="Aplikasi" onClick={event => {
      if (event.target instanceof Element && event.target.closest("a[href]") && menu.current) menu.current.open = false;
    }}>{children}</nav>
  </details>;
}
