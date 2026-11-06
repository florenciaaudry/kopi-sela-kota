"use client";

export function PrintButton() {
  return <button className="primary-button" type="button" onClick={() => window.print()}>Print Receipt / PDF</button>;
}
