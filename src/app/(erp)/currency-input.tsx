"use client";

import { useState } from "react";
import { formatRibuan, normalizeCurrencyText } from "@/lib/format";

export function CurrencyInput({
  label,
  name,
  defaultValue,
  required = true,
  allowZero = false,
  placeholder = "Contoh: 330.000",
}: {
  label: string;
  name: string;
  defaultValue?: number;
  required?: boolean;
  allowZero?: boolean;
  placeholder?: string;
}) {
  const initial =
    defaultValue !== undefined && Number.isFinite(defaultValue)
      ? {
          display: formatRibuan(defaultValue),
          numericValue: String(Math.trunc(defaultValue)),
        }
      : { display: "", numericValue: "" };

  const [displayValue, setDisplayValue] = useState(initial.display);
  const [numericValue, setNumericValue] = useState(initial.numericValue);

  return (
    <label className="demo-field">
      <span>{label}</span>
      <input type="hidden" name={name} value={numericValue} />
      <input
        type="text"
        inputMode="numeric"
        autoComplete="off"
        required={required}
        placeholder={placeholder}
        value={displayValue}
        aria-label={label}
        pattern={allowZero ? "[0-9.,\\s]+" : "[1-9][0-9.,\\s]*"}
        title="Masukkan nominal Rupiah utuh, misalnya 330.000 atau 330000"
        onChange={(event) => {
          const next = normalizeCurrencyText(event.target.value);
          setDisplayValue(next.display);
          setNumericValue(next.numericValue);
        }}
      />
    </label>
  );
}

