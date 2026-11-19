import "server-only";
import { readFile } from "node:fs/promises";
import { headers } from "next/headers";
import type { AppRole } from "./supabase/database.types";

const roles: AppRole[] = ["owner", "sales", "warehouse", "procurement", "finance", "cashier"];
type TestAccount = { role: AppRole; email: string; password: string; id: string };

// Hosted QA reads server-only configuration; local development reads the ignored local file.
export async function readLocalTestAccounts(requireOrigin = false): Promise<TestAccount[]> {
  if (process.env.QA_DEMO_HOST && process.env.QA_DEMO_ACCOUNTS) {
    try {
      if (new URL(process.env.NEXT_PUBLIC_SUPABASE_URL ?? "").hostname !== "pokgfkiiomyonpyzvwcn.supabase.co") return [];
      const h = await headers();
      const expected = process.env.QA_DEMO_HOST;
      if (h.get("host") !== expected) return [];
      const forwarded = h.get("x-forwarded-host");
      if (forwarded && forwarded !== expected) return [];
      const origin = h.get("origin");
      if (requireOrigin && !origin) return [];
      if (origin && new URL(origin).origin !== `https://${expected}`) return [];
      const stored: {project:string;accounts:TestAccount[]} = JSON.parse(process.env.QA_DEMO_ACCOUNTS);
      if (stored.project !== "pokgfkiiomyonpyzvwcn.supabase.co") return [];
      return roles.flatMap(role => {
        const account = stored.accounts.find(a => a.role === role && a.email === `qa-${role}@kopiselakota.test`);
        return account?.password && account.id ? [account] : [];
      });
    } catch { return []; }
  }
  if (process.env.NODE_ENV !== "development") return [];
  const h = await headers();
  const host = h.get("host");
  if (!host) return [];
  try {
    const local = new URL(`http://${host}`);
    if (!["127.0.0.1", "localhost", "[::1]"].includes(local.hostname)) return [];
    const forwarded = h.get("x-forwarded-host");
    if (forwarded && forwarded !== host) return [];
    const origin = h.get("origin");
    if (requireOrigin && !origin) return [];
    if (origin && new URL(origin).host !== local.host) return [];
    const stored: { project: string; accounts: TestAccount[] } = JSON.parse(await readFile(".env.role-accounts.local", "utf8"));
    if (stored.project !== new URL(process.env.NEXT_PUBLIC_SUPABASE_URL ?? "").hostname) return [];
    return roles.flatMap(role => {
      const account = stored.accounts.find(a => a.role === role && a.email === `qa-${role}@kopiselakota.test`);
      return account?.password && account.id ? [account] : [];
    });
  } catch { return []; }
}
