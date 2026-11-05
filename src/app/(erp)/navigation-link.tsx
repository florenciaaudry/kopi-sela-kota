"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

export function NavigationLink({ href, className, children }: { href: string; className: string; children: ReactNode }) {
  const path = usePathname();
  const active = href === "/" ? path === "/" : !href.includes("#") && (path === href || path.startsWith(`${href}/`));
  return <Link href={href} className={`${className}${active ? " is-active" : ""}`} aria-current={active ? "page" : undefined}>{children}</Link>;
}
