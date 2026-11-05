"use client";

import { useSearchParams } from "next/navigation";

export function LoginSessionNotice() {
  const searchParams = useSearchParams();
  if (searchParams.get("session") !== "expired") {
    return null;
  }

  return (
    <div className="notice notice-warning" role="alert">
      Sesi tidak dapat diperbarui. Silakan masuk kembali.
    </div>
  );
}
