export type CartLine = { sku: string; quantity: number };

/** Validate untrusted repeated form fields before calling the stock RPC. */
export function parseCartLines(skus: FormDataEntryValue[], quantities: FormDataEntryValue[]): CartLine[] {
  if (skus.length === 0 || skus.length !== quantities.length) {
    throw new Error("Tambahkan minimal satu produk dengan kuantitasnya.");
  }
  const seen = new Set<string>();
  return skus.map((value, index) => {
    const sku = typeof value === "string" ? value.trim() : "";
    const raw = quantities[index];
    const quantity = typeof raw === "string" && raw.trim() !== "" ? Number(raw) : NaN;
    if (!sku) throw new Error(`Pilih produk pada baris ${index + 1}.`);
    if (!Number.isSafeInteger(quantity) || quantity <= 0) {
      throw new Error(`Kuantitas baris ${index + 1} harus bilangan bulat lebih besar dari nol.`);
    }
    if (seen.has(sku)) throw new Error("Gabungkan kuantitas jika SKU sama.");
    seen.add(sku);
    return { sku, quantity };
  });
}
