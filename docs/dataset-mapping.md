# Pemetaan dataset PDF ke skema aplikasi

Nama sumber dan header di bawah mengikuti tabel dataset PDF. Nilai uang disimpan sebagai `numeric(14,2)`; kuantitas sebagai integer. Kolom sumber yang memakai spasi dinormalisasi menjadi `snake_case` di skema aplikasi.

| Tabel sumber | Header sumber | Tabel aplikasi |
|---|---|---|
| `contacts_customers` | `id`, `name`, `type`, `city`, `credit limit`, `payment terms` | `customers`; `credit limit` → `credit_limit`, `payment terms` → `payment_terms_code` |
| `contacts_vendors` | `id`, `name`, `city`, `payment terms`, `tax profile` | `vendors`; `payment terms` → `payment_terms_code`, `tax profile` → `tax_profile` |
| `products` | `variant SKU`, `name`, `size`, `color`, `unit`, `sales price`, `cost`, `default vendor` | `products`; `variant SKU` → `sku`, `sales price` → `sales_price`, `default vendor` → `default_vendor_id`; `cost` → `product_costs.standard_cost` agar biaya terpisah dari katalog yang dibaca Cashier/Sales |
| `vendor_pricelist` | `vendor id`, `variant SKU`, `unit`, `minimum quantity`, `purchase price`, `purchase tax` | `vendor_pricelist`; source identifiers → `vendor_id`/`sku` |
| `warehouses_locations` | `code`, `name`, `type`, `company` | `locations` |
| `opening_stock` | `variant SKU`, `WH-TBT`, `CAFE-TBT`, `company total`, `standard value` | `stock_balances` per SKU/lokasi; total dan nilai direkonsiliasi dari saldo dan biaya standar, bukan disimpan sebagai saldo terpisah |
| `chart_of_accounts` | `code`, `name`, `type` | `chart_of_accounts` |
| `tax_rates` | `id`, `name`, `rate`, `base`, `rounding`, `account` | `tax_rates`; `account` → `account_code` |
| `payment_terms` | `code`, `name`, `days`, `rule` | `payment_terms` |
| `existing_documents` | `number`, `type`, `party / lines`, `status`, `stock state`, `financial state` | Tabel dokumen sesuai jenis; saldo piutang/utang awal ditandai `is_opening_balance`; status/line non-normalized tetap tercatat di sumber PDF |
| `pos_configuration` | `id`, `location`, `counter`, `opening cash`, `cash account`, `bank account`, `service charge` | `pos_configuration` |
| `pos_payment_methods` | `id`, `name`, `account`, `settlement` | `pos_payment_methods` |
| `pos_sessions` | `number`, `cashier`, `status`, `opening cash`, `orders`, `held orders` | `pos_sessions`; cashier dan hitungan awal menjadi atribut/rekap, tanpa membuat order sintetis |
| `application_roles` | `role`, `write scope`, `restricted actions` | `app_role` dan kebijakan akses; role `Owner` dimapping ke enum `owner`, dan seterusnya |

Seed SQL memuat data baseline yang tercetak: 6 pelanggan, 4 pemasok, 15 SKU, 15 baris vendor pricelist, 2 lokasi, saldo stok awal, akun, pajak, termin, dokumen awal, serta konfigurasi POS. Saldo historis OPEN-AR-C02 dan OPEN-AP-V02 hanya menjelaskan saldo pembuka dan tidak membuat jurnal kedua.
