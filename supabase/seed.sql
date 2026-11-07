begin;

insert into public.payment_terms (code, name, days, rule) values
  ('COD', 'Lunas saat transaksi', 0, 'C06 dan POS wajib langsung lunas'),
  ('NET7', 'Kredit tujuh hari', 7, 'Jatuh tempo tanggal invoice + 7 hari kalender')
on conflict (code) do update set
  name = excluded.name, days = excluded.days, rule = excluded.rule;

-- Source dataset: contacts_customers (id, name, type, city, credit limit, payment terms).
insert into public.customers (id, name, type, city, credit_limit, payment_terms_code) values
  ('C01', 'PT Sinar Karsa', 'Perusahaan', 'Jakarta', 1000000, 'NET7'),
  ('C02', 'CV Bina Citra', 'Perusahaan', 'Jakarta', 300000, 'NET7'),
  ('C03', 'Koperasi Tunas Mentari', 'Perusahaan', 'Jakarta', 1000000, 'NET7'),
  ('C04', 'Klinik Harapan Ibu', 'Perusahaan', 'Jakarta', 750000, 'NET7'),
  ('C05', 'Yayasan Cendekia Kota', 'Perusahaan', 'Jakarta', 500000, 'NET7'),
  ('C06', 'Pelanggan Tunai', 'Perorangan', 'Jakarta', 0, 'COD')
on conflict (id) do update set
  name = excluded.name, type = excluded.type, city = excluded.city,
  credit_limit = excluded.credit_limit, payment_terms_code = excluded.payment_terms_code;

-- Source dataset: contacts_vendors (id, name, city, payment terms, tax profile).
insert into public.vendors (id, name, city, payment_terms_code, tax_profile) values
  ('V01', 'Kedai Seduh Mitra', 'Jakarta', 'NET7', 'Bukan pemungut PBJT; bukan PPN'),
  ('V02', 'Kedai Kopi Pagi', 'Jakarta', 'NET7', 'Bukan pemungut PBJT; bukan PPN'),
  ('V03', 'Kedai Pastri Rumi', 'Jakarta', 'NET7', 'Bukan pemungut PBJT; bukan PPN'),
  ('V04', 'Kedai Teh Embun', 'Jakarta', 'COD', 'Bukan pemungut PBJT; bukan PPN')
on conflict (id) do update set
  name = excluded.name, city = excluded.city,
  payment_terms_code = excluded.payment_terms_code, tax_profile = excluded.tax_profile;

-- Source dataset: products (variant SKU, name, size, color, unit, sales price, cost, default vendor).
insert into public.products (sku, name, size, color, unit, sales_price, default_vendor_id) values
  ('CBW-250', 'Cold brew botolan', '250 ml', 'Tidak berlaku', 'unit', 30000, 'V01'),
  ('KSU-250', 'Kopi susu aren botolan', '250 ml', 'Tidak berlaku', 'unit', 25000, 'V02'),
  ('KLT-250', 'Kopi latte botolan', '250 ml', 'Tidak berlaku', 'unit', 24000, 'V02'),
  ('KAP-250', 'Kapucino botolan', '250 ml', 'Tidak berlaku', 'unit', 22000, 'V02'),
  ('KFV-250', 'Kopi vanila botolan', '250 ml', 'Tidak berlaku', 'unit', 28000, 'V01'),
  ('KMC-250', 'Mokacino botolan', '250 ml', 'Tidak berlaku', 'unit', 32000, 'V01'),
  ('CKB-PCS', 'Brownies mini', '1 buah', 'Tidak berlaku', 'unit', 8000, 'V03'),
  ('KUK-PCS', 'Kukis mentega', '1 buah', 'Tidak berlaku', 'unit', 5000, 'V03'),
  ('CRO-PCS', 'Croissant mini', '1 buah', 'Tidak berlaku', 'unit', 7000, 'V03'),
  ('MUF-PCS', 'Muffin mini', '1 buah', 'Tidak berlaku', 'unit', 5000, 'V03'),
  ('GRN-PCS', 'Granola bite', '1 buah', 'Tidak berlaku', 'unit', 4000, 'V03'),
  ('AIR-250', 'Air mineral siap saji', '250 ml', 'Tidak berlaku', 'unit', 7000, 'V03'),
  ('CBW-500', 'Cold brew botolan', '500 ml', 'Tidak berlaku', 'unit', 40000, 'V01'),
  ('TEH-250', 'Teh manis botolan', '250 ml', 'Tidak berlaku', 'unit', 6000, 'V04'),
  ('LEM-250', 'Teh lemon botolan', '250 ml', 'Tidak berlaku', 'unit', 10000, 'V04')
on conflict (sku) do update set
  name = excluded.name, size = excluded.size, color = excluded.color, unit = excluded.unit,
  sales_price = excluded.sales_price, default_vendor_id = excluded.default_vendor_id;

insert into public.product_costs (sku, standard_cost) values
  ('CBW-250', 15000), ('KSU-250', 13000), ('KLT-250', 12000),
  ('KAP-250', 11000), ('KFV-250', 16000), ('KMC-250', 18000),
  ('CKB-PCS', 4000), ('KUK-PCS', 2000), ('CRO-PCS', 3000),
  ('MUF-PCS', 2000), ('GRN-PCS', 1000), ('AIR-250', 3000),
  ('CBW-500', 22000), ('TEH-250', 2000), ('LEM-250', 4000)
on conflict (sku) do update set standard_cost = excluded.standard_cost;

-- Source dataset: vendor_pricelist (vendor id, variant SKU, unit, minimum quantity, purchase price, purchase tax).
insert into public.vendor_pricelist (vendor_id, sku, unit, minimum_quantity, purchase_price, purchase_tax) values
  ('V01', 'CBW-250', 'unit', 1, 15000, 'BUY0'),
  ('V02', 'KSU-250', 'unit', 1, 13000, 'BUY0'),
  ('V02', 'KLT-250', 'unit', 1, 12000, 'BUY0'),
  ('V02', 'KAP-250', 'unit', 1, 11000, 'BUY0'),
  ('V01', 'KFV-250', 'unit', 1, 16000, 'BUY0'),
  ('V01', 'KMC-250', 'unit', 1, 18000, 'BUY0'),
  ('V03', 'CKB-PCS', 'unit', 1, 4000, 'BUY0'),
  ('V03', 'KUK-PCS', 'unit', 1, 2000, 'BUY0'),
  ('V03', 'CRO-PCS', 'unit', 1, 3000, 'BUY0'),
  ('V03', 'MUF-PCS', 'unit', 1, 2000, 'BUY0'),
  ('V03', 'GRN-PCS', 'unit', 1, 1000, 'BUY0'),
  ('V03', 'AIR-250', 'unit', 1, 3000, 'BUY0'),
  ('V01', 'CBW-500', 'unit', 1, 22000, 'BUY0'),
  ('V04', 'TEH-250', 'unit', 1, 2000, 'BUY0'),
  ('V04', 'LEM-250', 'unit', 1, 4000, 'BUY0')
on conflict (vendor_id, sku) do update set
  unit = excluded.unit, minimum_quantity = excluded.minimum_quantity,
  purchase_price = excluded.purchase_price, purchase_tax = excluded.purchase_tax;

-- Source dataset: warehouses_locations (code, name, type, company).
insert into public.locations (code, name, type, company) values
  ('WH-TBT', 'Penerimaan dan cadangan Tebet', 'Internal', 'Kopi Sela Kota'),
  ('CAFE-TBT', 'Loket penjualan Tebet', 'Internal / stok POS', 'Kopi Sela Kota')
on conflict (code) do update set
  name = excluded.name, type = excluded.type, company = excluded.company;

-- Source dataset: opening_stock (variant SKU, WH-TBT, CAFE-TBT, company total, standard value).
insert into public.stock_balances (sku, location_code, on_hand) values
  ('CBW-250', 'WH-TBT', 40), ('CBW-250', 'CAFE-TBT', 20),
  ('KSU-250', 'WH-TBT', 20), ('KSU-250', 'CAFE-TBT', 10),
  ('KLT-250', 'WH-TBT', 20), ('KLT-250', 'CAFE-TBT', 10),
  ('KAP-250', 'WH-TBT', 20), ('KAP-250', 'CAFE-TBT', 10),
  ('KFV-250', 'WH-TBT', 20), ('KFV-250', 'CAFE-TBT', 10),
  ('KMC-250', 'WH-TBT', 20), ('KMC-250', 'CAFE-TBT', 10),
  ('CKB-PCS', 'WH-TBT', 20), ('CKB-PCS', 'CAFE-TBT', 10),
  ('KUK-PCS', 'WH-TBT', 20), ('KUK-PCS', 'CAFE-TBT', 10),
  ('CRO-PCS', 'WH-TBT', 20), ('CRO-PCS', 'CAFE-TBT', 10),
  ('MUF-PCS', 'WH-TBT', 20), ('MUF-PCS', 'CAFE-TBT', 10),
  ('GRN-PCS', 'WH-TBT', 20), ('GRN-PCS', 'CAFE-TBT', 10),
  ('AIR-250', 'WH-TBT', 20), ('AIR-250', 'CAFE-TBT', 10),
  ('CBW-500', 'WH-TBT', 20), ('CBW-500', 'CAFE-TBT', 10),
  ('TEH-250', 'WH-TBT', 20), ('TEH-250', 'CAFE-TBT', 10),
  ('LEM-250', 'WH-TBT', 20), ('LEM-250', 'CAFE-TBT', 10)
on conflict (sku, location_code) do update set on_hand = excluded.on_hand;

-- Source dataset: chart_of_accounts (code, name, type).
insert into public.chart_of_accounts (code, name, type) values
  ('1101', 'Kas', 'Bank and Cash'),
  ('1102', 'Bank', 'Bank and Cash'),
  ('1201', 'Piutang usaha', 'Receivable'),
  ('1301', 'Persediaan unit siap jual', 'Current Assets'),
  ('1302', 'Uang muka pemasok', 'Current Assets'),
  ('1399', 'Akun antara dana', 'Current Assets'),
  ('2101', 'Utang usaha', 'Payable'),
  ('2102', 'Utang PBJT', 'Current Liabilities'),
  ('2103', 'Barang diterima belum ditagih', 'Current Liabilities'),
  ('2104', 'Utang pengembalian pelanggan', 'Current Liabilities'),
  ('2201', 'Uang muka pelanggan', 'Current Liabilities'),
  ('3101', 'Modal/saldo awal', 'Equity'),
  ('4101', 'Pendapatan makanan/minuman', 'Income'),
  ('5101', 'Biaya penjualan', 'Cost of Revenue'),
  ('6101', 'Selisih kas', 'Expenses')
on conflict (code) do update set name = excluded.name, type = excluded.type;

-- Source dataset: tax_rates (id, name, rate, base, rounding, account).
insert into public.tax_rates (id, name, rate, base, rounding, account_code) values
  ('PBJT10', 'PBJT makanan/minuman', 10, 'Nilai baris setelah diskon', 'Half-up per baris ke Rp1', '2102'),
  ('BUY0', 'Pajak beli dataset', 0, 'Harga beli bersih', 'Half-up per baris ke Rp1', null)
on conflict (id) do update set
  name = excluded.name, rate = excluded.rate, base = excluded.base,
  rounding = excluded.rounding, account_code = excluded.account_code;

insert into public.leads (
  number, customer_id, sku, quantity, stage, expected_revenue, probability_percent, created_at
) values (
  'L00001', 'C03', 'CBW-250', 10, 'New', 300000, 40,
  timestamptz '2026-10-20 09:00:00+07'
)
on conflict (number) do update set
  customer_id = excluded.customer_id, sku = excluded.sku, quantity = excluded.quantity,
  stage = excluded.stage, expected_revenue = excluded.expected_revenue,
  probability_percent = excluded.probability_percent, created_at = excluded.created_at;

insert into public.sales_orders (
  number, customer_id, status, order_date, location_code, discount_percent,
  subtotal, tax_total, total, locked_at, created_at
) values (
  'S00001', 'C01', 'Sales Order', date '2026-10-20', 'WH-TBT', 0,
  300000, 30000, 330000, timestamptz '2026-10-20 09:00:00+07',
  timestamptz '2026-10-20 09:00:00+07'
)
on conflict (number) do update set
  customer_id = excluded.customer_id, status = excluded.status,
  order_date = excluded.order_date, location_code = excluded.location_code,
  discount_percent = excluded.discount_percent, subtotal = excluded.subtotal,
  tax_total = excluded.tax_total, total = excluded.total, locked_at = excluded.locked_at,
  created_at = excluded.created_at;

insert into public.sales_order_lines (
  sales_order_number, sku, quantity, unit_price, discount_percent,
  tax_code, subtotal, tax_amount
) values (
  'S00001', 'CBW-250', 10, 30000, 0, 'PBJT10', 300000, 30000
)
on conflict (sales_order_number, sku) do update set
  quantity = excluded.quantity, unit_price = excluded.unit_price,
  discount_percent = excluded.discount_percent, tax_code = excluded.tax_code,
  subtotal = excluded.subtotal, tax_amount = excluded.tax_amount;

insert into public.inventory_reservations (
  sku, location_code, source_type, source_reference, quantity, status, created_at
) values (
  'CBW-250', 'WH-TBT', 'sales_order', 'S00001', 10, 'active',
  timestamptz '2026-10-20 09:00:00+07'
)
on conflict (source_type, source_reference, sku, location_code) do update set
  quantity = excluded.quantity, status = excluded.status, created_at = excluded.created_at;

insert into public.purchase_orders (
  number, vendor_id, status, order_date, destination_code, total, locked_at, created_at
) values (
  'PO00001', 'V01', 'Purchase Order', date '2026-10-20', 'WH-TBT',
  300000, timestamptz '2026-10-20 09:00:00+07',
  timestamptz '2026-10-20 09:00:00+07'
)
on conflict (number) do update set
  vendor_id = excluded.vendor_id, status = excluded.status,
  order_date = excluded.order_date, destination_code = excluded.destination_code,
  total = excluded.total, locked_at = excluded.locked_at, created_at = excluded.created_at;

insert into public.purchase_order_lines (
  purchase_order_number, sku, quantity, unit_price, purchase_tax
) values ('PO00001', 'CBW-250', 20, 15000, 'BUY0')
on conflict (purchase_order_number, sku) do update set
  quantity = excluded.quantity, unit_price = excluded.unit_price,
  purchase_tax = excluded.purchase_tax;

-- Source dataset: existing_documents. Opening-balance documents are references only and are not posted again.
insert into public.customer_invoices (
  number, customer_id, status, issue_date, due_date, subtotal, tax_total,
  total, amount_paid, is_opening_balance
) values (
  'OPEN-AR-C02', 'C02', 'Posted', null, date '2026-10-19',
  220000, 0, 220000, 0, true
)
on conflict (number) do update set
  customer_id = excluded.customer_id, status = excluded.status,
  issue_date = excluded.issue_date, due_date = excluded.due_date,
  subtotal = excluded.subtotal, tax_total = excluded.tax_total,
  total = excluded.total, amount_paid = excluded.amount_paid,
  is_opening_balance = excluded.is_opening_balance;

insert into public.vendor_bills (
  number, vendor_id, status, issue_date, due_date, subtotal, tax_total,
  total, amount_paid, is_opening_balance
) values (
  'OPEN-AP-V02', 'V02', 'Posted', null, date '2026-10-19',
  300000, 0, 300000, 0, true
)
on conflict (number) do update set
  vendor_id = excluded.vendor_id, status = excluded.status,
  issue_date = excluded.issue_date, due_date = excluded.due_date,
  subtotal = excluded.subtotal, tax_total = excluded.tax_total,
  total = excluded.total, amount_paid = excluded.amount_paid,
  is_opening_balance = excluded.is_opening_balance;

insert into public.pos_configuration (
  id, location_code, counter, opening_cash,
  cash_account_code, bank_account_code, service_charge_percent
) values (
  'POS-TBT', 'CAFE-TBT', 'Loket Tebet', 100000, '1101', '1102', 0
)
on conflict (id) do update set
  location_code = excluded.location_code, counter = excluded.counter,
  opening_cash = excluded.opening_cash, cash_account_code = excluded.cash_account_code,
  bank_account_code = excluded.bank_account_code,
  service_charge_percent = excluded.service_charge_percent;

insert into public.pos_payment_methods (id, name, account_code, settlement) values
  ('CASH', 'Cash', '1101', 'Langsung'),
  ('BANK', 'Bank', '1102', 'Langsung; tanpa biaya transaksi'),
  ('MIXED', 'Cash + Bank', '1101', 'Split tender')
on conflict (id) do update set
  name = excluded.name, account_code = excluded.account_code,
  settlement = excluded.settlement;

insert into public.pos_sessions (number, cashier_label, status, opening_cash, opened_at)
values (
  'POS/00001', 'Maya / Cashier', 'Opening Control', 100000,
  timestamptz '2026-10-20 09:00:00+07'
)
on conflict (number) do update set
  cashier_label = excluded.cashier_label, status = excluded.status,
  opening_cash = excluded.opening_cash, opened_at = excluded.opened_at;

insert into public.journal_entries (
  number, source_type, source_reference, idempotency_key,
  entry_date, memo, status, created_at
) values (
  'JRN/OPEN/20261020', 'opening_balance', 'OPENING-2026-10-20',
  'opening-balance-2026-10-20', date '2026-10-20',
  'Saldo pembuka dataset tugas; dokumen historis tidak diposting ulang',
  'draft', timestamptz '2026-10-20 09:00:00+07'
)
on conflict (source_type, source_reference) do nothing;

insert into public.journal_lines (journal_entry_id, account_code, debit, credit)
select je.id, seed.account_code, seed.debit, seed.credit
from public.journal_entries je
cross join (values
  ('1101', 500000::numeric, 0::numeric),
  ('1102', 10000000::numeric, 0::numeric),
  ('1201', 220000::numeric, 0::numeric),
  ('1301', 4290000::numeric, 0::numeric),
  ('2101', 0::numeric, 300000::numeric),
  ('3101', 0::numeric, 14710000::numeric)
) as seed(account_code, debit, credit)
where je.source_type = 'opening_balance'
  and je.source_reference = 'OPENING-2026-10-20'
  and je.status = 'draft'
  and not exists (
    select 1 from public.journal_lines existing
    where existing.journal_entry_id = je.id
  );

update public.journal_entries
set status = 'posted'
where source_type = 'opening_balance'
  and source_reference = 'OPENING-2026-10-20'
  and status = 'draft';

commit;
