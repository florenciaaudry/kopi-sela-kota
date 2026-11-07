"use client";
import { useActionState } from "react";
import { signInTestAccountAction, type SignInState } from "./actions";
import type { AppRole } from "@/lib/supabase/database.types";

export function TestAccountPicker({ accounts }: { accounts: { role: AppRole; label: string; name: string; task: string }[] }) {
  const [state, action, pending] = useActionState(signInTestAccountAction, {} as SignInState);
  return <section className="test-accounts" aria-labelledby="test-accounts-title">
    <div className="test-accounts-heading"><h3 id="test-accounts-title">Demo Login Accounts</h3><span>{accounts.length} roles</span></div>
    <p>Pilih role untuk langsung masuk. Akun uji ini memakai data bersama; transaksi yang dibuat akan tersimpan.</p>
    <form action={action} className="test-account-grid" aria-busy={pending}>
      {accounts.map(account => <button type="submit" className="test-account-card" name="role" value={account.role} key={account.role} disabled={pending}>
        <span className="test-account-role">{account.label}<span aria-hidden="true">↗</span></span><strong>{account.name}</strong><small>{account.task}</small>
      </button>)}
    </form>
    {pending ? <p role="status">Memeriksa akun dan akses…</p> : null}
    {state.error ? <p role="alert" className="form-error">{state.error}</p> : null}
  </section>;
}
