"use client";

import { odooLabel } from "@/lib/erp-terminology";

import { useFormStatus } from "react-dom";

export function SubmitButton({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return <button className="primary-button" disabled={pending} aria-disabled={pending} type="submit">{pending ? "Sedang diproses…" : odooLabel(label)}</button>;
}
