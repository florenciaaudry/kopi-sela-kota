"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef, type ReactNode } from "react";

export function ModuleNavigation({ children }: { children: ReactNode }) {
  const path = usePathname();
  const picker = useRef<HTMLDetailsElement>(null);
  useEffect(() => {
    if (picker.current) picker.current.open = false;
  }, [path]);
  return <details className="ksk-module-picker" ref={picker}>
    <summary><span aria-hidden="true">▦</span> Pilih aplikasi</summary>
    <div onClick={event => {
      if (event.target instanceof Element && event.target.closest("a[href]") && picker.current) picker.current.open = false;
    }}>{children}</div>
  </details>;
}
