import { createSupabaseServerClient } from "@/lib/supabase/server";
import { requireRole } from "@/lib/auth";

export type InventoryRow = {
  sku: string;
  name: string;
  size: string;
  unit: string;
  standardCost: number;
  locationCode: string;
  onHand: number;
  reserved: number;
  available: number;
};

export type InventorySnapshot =
  | { error: string }
  | {
      rows: InventoryRow[];
      productCount: number;
      locationCount: number;
      onHand: number;
      reserved: number;
      available: number;
      inventoryValue: number;
    };

export async function getInventorySnapshot(): Promise<InventorySnapshot> {
  await requireRole(["warehouse", "procurement", "owner"]);
  const supabase = await createSupabaseServerClient();
  const [productsResult, costsResult, locationsResult, stockResult] =
    await Promise.all([
      supabase
        .from("products")
        .select("sku, name, size, unit")
        .order("sku"),
      supabase.from("product_costs").select("sku, standard_cost").order("sku"),
      supabase.from("locations").select("code").order("code"),
      supabase
        .from("inventory_availability")
        .select("sku, location_code, on_hand, reserved, available")
        .order("sku")
        .order("location_code"),
    ]);

  if (productsResult.error) {
    return { error: productsResult.error.message };
  }
  if (costsResult.error) {
    return { error: costsResult.error.message };
  }
  if (locationsResult.error) {
    return { error: locationsResult.error.message };
  }
  if (stockResult.error) {
    return { error: stockResult.error.message };
  }
  if (
    !productsResult.data ||
    !costsResult.data ||
    !locationsResult.data ||
    !stockResult.data
  ) {
    return { error: "Database mengembalikan data stok yang tidak lengkap." };
  }

  const costsBySku = new Map(
    costsResult.data.map((cost) => [cost.sku, Number(cost.standard_cost)]),
  );
  const productsBySku = new Map(
    productsResult.data.map((product) => [product.sku, product]),
  );
  const missingProduct = stockResult.data.find(
    (stock) => !productsBySku.has(stock.sku),
  );
  if (missingProduct) {
    return {
      error: `SKU ${missingProduct.sku} pada saldo stok tidak ditemukan di master produk.`,
    };
  }
  const missingCost = productsResult.data.find(
    (product) => !costsBySku.has(product.sku),
  );
  if (missingCost) {
    return {
      error: `Biaya standar untuk SKU ${missingCost.sku} tidak ditemukan.`,
    };
  }

  const rows: InventoryRow[] = stockResult.data.map((stock) => {
    const product = productsBySku.get(stock.sku);
    if (!product) {
      throw new Error(`Master produk untuk SKU ${stock.sku} tidak ditemukan.`);
    }
    const standardCost = costsBySku.get(stock.sku);
    if (standardCost === undefined) {
      throw new Error(`Biaya standar untuk SKU ${stock.sku} tidak ditemukan.`);
    }

    return {
      sku: stock.sku,
      name: product.name,
      size: product.size,
      unit: product.unit,
      standardCost,
      locationCode: stock.location_code,
      onHand: stock.on_hand,
      reserved: stock.reserved,
      available: stock.available,
    };
  });

  return {
    rows,
    productCount: productsResult.data.length,
    locationCount: locationsResult.data.length,
    onHand: rows.reduce((total, row) => total + row.onHand, 0),
    reserved: rows.reduce((total, row) => total + row.reserved, 0),
    available: rows.reduce((total, row) => total + row.available, 0),
    inventoryValue: rows.reduce(
      (total, row) => total + row.onHand * row.standardCost,
      0,
    ),
  };
}
