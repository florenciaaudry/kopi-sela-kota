export type AppRole =
  | "sales"
  | "warehouse"
  | "procurement"
  | "finance"
  | "cashier"
  | "owner";

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

type Table<Row> = {
  Row: Row;
  Insert: Partial<Row>;
  Update: Partial<Row>;
  Relationships: [];
};

type Rpc<Args, Returns> = {
  Args: Args;
  Returns: Returns;
};

type Customer = {
  id: string;
  name: string;
  type: string;
  city: string;
  credit_limit: number;
  payment_terms_code: string;
};

type Vendor = {
  id: string;
  name: string;
  city: string;
  payment_terms_code: string;
  tax_profile: string;
};

type Product = {
  sku: string;
  name: string;
  size: string;
  color: string;
  unit: string;
  sales_price: number;
  default_vendor_id: string;
};

type InventoryAvailability = {
  sku: string;
  location_code: string;
  on_hand: number;
  reserved: number;
  available: number;
};

export type OwnerDashboard = {
  sku_count: number;
  location_count: number;
  on_hand: number;
  reserved: number;
  receivables: number;
  payables: number;
  cash: number;
  bank: number;
  inventory_value: number;
};

export type Database = {
  public: {
    Tables: {
      profiles: Table<{
        id: string;
        full_name: string;
        role: AppRole;
        created_at: string;
      }>;
      customers: Table<Customer>;
      vendors: Table<Vendor>;
      products: Table<Product>;
      product_costs: Table<{ sku: string; standard_cost: number }>;
      vendor_pricelist: Table<{
        vendor_id: string;
        sku: string;
        unit: string;
        minimum_quantity: number;
        purchase_price: number;
        purchase_tax: string;
      }>;
      locations: Table<{ code: string; name: string; type: string; company: string }>;
      stock_balances: Table<{ sku: string; location_code: string; on_hand: number }>;
      leads: Table<{
        number: string;
        customer_id: string;
        sku: string;
        quantity: number;
        stage: string;
        expected_revenue: number;
        probability_percent: number;
        lost_reason: string | null;
        created_at: string;
      }>;
      sales_orders: Table<{
        number: string;
        customer_id: string;
        source_lead_number: string | null;
        status: string;
        order_date: string;
        location_code: string;
        discount_percent: number;
        subtotal: number;
        tax_total: number;
        total: number;
        locked_at: string | null;
        created_at: string;
      }>;
      sales_order_lines: Table<{
        id: string;
        sales_order_number: string;
        sku: string;
        quantity: number;
        unit_price: number;
        discount_percent: number;
        tax_code: string;
        subtotal: number;
        tax_amount: number;
      }>;
      delivery_notes: Table<{
        number: string;
        sales_order_number: string;
        idempotency_key: string;
        delivered_at: string;
        created_by: string;
      }>;
      delivery_note_lines: Table<{
        id: string;
        delivery_number: string;
        sales_order_line_id: string;
        sku: string;
        quantity: number;
      }>;
      purchase_orders: Table<{
        number: string;
        vendor_id: string;
        status: string;
        order_date: string;
        destination_code: string;
        total: number;
        locked_at: string | null;
        created_at: string;
      }>;
      purchase_order_lines: Table<{
        id: string;
        purchase_order_number: string;
        sku: string;
        quantity: number;
        unit_price: number;
        purchase_tax: string;
        received_quantity: number;
        rejected_quantity: number;
        billed_quantity: number;
      }>;
      goods_receipts: Table<{
        number: string;
        purchase_order_number: string;
        idempotency_key: string;
        received_at: string;
        created_by: string;
      }>;
      goods_receipt_lines: Table<{
        id: string;
        receipt_number: string;
        purchase_order_line_id: string;
        sku: string;
        accepted_quantity: number;
        rejected_quantity: number;
      }>;
      customer_invoices: Table<{
        number: string;
        customer_id: string;
        source_document: string | null;
        status: string;
        issue_date: string | null;
        due_date: string;
        subtotal: number;
        tax_total: number;
        total: number;
        amount_paid: number;
        amount_credited: number;
        is_opening_balance: boolean;
      }>;
      customer_invoice_lines: Table<{
        id: string;
        invoice_number: string;
        sales_order_line_id: string | null;
        sku: string;
        quantity: number;
        unit_price: number;
        discount_percent: number;
        subtotal: number;
        tax_amount: number;
      }>;
      customer_payments: Table<{
        number: string;
        invoice_number: string;
        amount: number;
        account_code: string;
        idempotency_key: string;
        paid_at: string;
        created_by: string;
      }>;
      vendor_bills: Table<{
        number: string;
        vendor_id: string;
        source_document: string | null;
        status: string;
        issue_date: string | null;
        due_date: string;
        subtotal: number;
        tax_total: number;
        total: number;
        amount_paid: number;
        is_opening_balance: boolean;
      }>;
      vendor_bill_lines: Table<{
        id: string;
        bill_number: string;
        purchase_order_line_id: string | null;
        sku: string;
        quantity: number;
        unit_price: number;
        subtotal: number;
      }>;
      vendor_payments: Table<{
        number: string;
        bill_number: string;
        amount: number;
        account_code: string;
        idempotency_key: string;
        paid_at: string;
        created_by: string;
      }>;
      inventory_transfers: Table<{
        number: string;
        sku: string;
        source_location: string;
        destination_location: string;
        quantity: number;
        idempotency_key: string;
        transferred_at: string;
        created_by: string;
      }>;
      chart_of_accounts: Table<{ code: string; name: string; type: string }>;
      journal_entries: Table<{
        id: string;
        number: string;
        source_type: string;
        source_reference: string;
        idempotency_key: string;
        entry_date: string;
        memo: string;
        status: string;
        created_by: string | null;
      }>;
      journal_lines: Table<{
        id: string;
        journal_entry_id: string;
        account_code: string;
        debit: number;
        credit: number;
      }>;
      pos_configuration: Table<{
        id: string;
        location_code: string;
        counter: string;
        opening_cash: number;
        cash_account_code: string;
        bank_account_code: string;
        service_charge_percent: number;
      }>;
      pos_payment_methods: Table<{
        id: string;
        name: string;
        account_code: string;
        settlement: string;
      }>;
      pos_sessions: Table<{
        number: string;
        cashier_label: string;
        status: string;
        opening_cash: number;
        opened_at: string | null;
        closed_at: string | null;
        opened_by: string | null;
        idempotency_key: string | null;
        expected_cash: number | null;
        counted_cash: number | null;
        cash_difference: number | null;
        variance_reason: string | null;
        approved_by: string | null;
      }>;
      pos_receipts: Table<{
        number: string;
        session_number: string;
        sku: string;
        quantity: number;
        subtotal: number;
        tax_amount: number;
        total: number;
        payment_method: string;
        idempotency_key: string;
        sold_at: string;
        created_by: string;
        hold_number: string | null;
        customer_id: string | null;
      }>;
      pos_holds: Table<{
        number: string;
        session_number: string;
        idempotency_key: string;
        status: string;
        expires_in_minutes: number;
        expires_at: string;
        created_by: string;
        created_at: string;
      }>;
      pos_hold_lines: Table<{
        id: string;
        hold_number: string;
        sku: string;
        quantity: number;
        unit_price: number;
        subtotal: number;
        tax_amount: number;
        standard_cost: number;
      }>;
      pos_receipt_lines: Table<{
        id: string;
        receipt_number: string;
        sku: string;
        quantity: number;
        unit_price: number;
        subtotal: number;
        tax_amount: number;
      }>;
      pos_receipt_tenders: Table<{
        id: string;
        receipt_number: string;
        payment_method: string;
        amount: number;
      }>;
      credit_notes: Table<{
        number: string;
        invoice_number: string;
        idempotency_key: string;
        subtotal: number;
        tax_amount: number;
        total: number;
        created_by: string;
        created_at: string;
      }>;
      credit_note_lines: Table<{
        id: string;
        credit_note_number: string;
        invoice_line_id: string;
        sku: string;
        quantity: number;
        item_condition: "sealed" | "damaged";
        subtotal: number;
        tax_amount: number;
      }>;
      audit_events: Table<{
        id: string;
        actor_id: string | null;
        actor_label: string;
        action: string;
        document_type: string;
        document_number: string;
        details: Record<string, unknown>;
        occurred_at: string;
      }>;
    };
    Views: {
      inventory_availability: {
        Row: InventoryAvailability;
        Relationships: [];
      };
    };
    Functions: {
      create_sales_order: Rpc<{
        p_customer_id: string;
        p_sku: string;
        p_quantity: number;
        p_discount_percent?: number;
        p_idempotency_key?: string;
        p_source_lead_number?: string;
      }, string>;
      deliver_sales_order: Rpc<{
        p_sales_order_number: string;
        p_quantity: number;
        p_idempotency_key: string;
      }, string>;
      invoice_delivered_sales_order: Rpc<{
        p_sales_order_number: string;
        p_idempotency_key: string;
      }, string>;
      record_customer_payment: Rpc<{
        p_invoice_number: string;
        p_amount: number;
        p_account_code: string;
        p_idempotency_key: string;
      }, string>;
      create_purchase_order: Rpc<{
        p_vendor_id: string;
        p_sku: string;
        p_quantity: number;
        p_idempotency_key: string;
      }, string>;
      receive_purchase_order: Rpc<{
        p_purchase_order_number: string;
        p_accepted_quantity: number;
        p_rejected_quantity: number;
        p_idempotency_key: string;
      }, string>;
      create_vendor_bill: Rpc<{
        p_purchase_order_number: string;
        p_idempotency_key: string;
      }, string>;
      record_vendor_payment: Rpc<{
        p_bill_number: string;
        p_amount: number;
        p_account_code: string;
        p_idempotency_key: string;
      }, string>;
      transfer_inventory: Rpc<{
        p_sku: string;
        p_source_location: string;
        p_destination_location: string;
        p_quantity: number;
        p_idempotency_key: string;
      }, string>;
      open_pos_session: Rpc<{ p_opening_cash: number; p_idempotency_key: string }, string>;
      create_pos_sale: Rpc<{
        p_sku: string;
        p_quantity: number;
        p_payment_method: string;
        p_idempotency_key: string;
      }, string>;
      create_pos_sale_for_customer: Rpc<{
        p_sku: string;
        p_quantity: number;
        p_payment_method: string;
        p_idempotency_key: string;
        p_customer_id?: string | null;
      }, string>;
      close_pos_session: Rpc<{
        p_session_number: string;
        p_counted_cash: number;
        p_variance_reason?: string;
      }, string>;
      approve_pos_session_variance: Rpc<{ p_session_number: string }, string>;
      create_customer_credit_note: Rpc<{
        p_invoice_number: string;
        p_sku: string;
        p_quantity: number;
        p_item_condition: string;
        p_idempotency_key: string;
      }, string>;
      update_lead_stage: Rpc<{
        p_lead_number: string;
        p_stage: string;
        p_lost_reason?: string;
      }, string>;
      create_lead: Rpc<{
        p_customer_id: string;
        p_sku: string;
        p_quantity: number;
        p_probability: number;
        p_idempotency_key: string;
      }, string>;
      get_owner_dashboard: Rpc<Record<string, never>, OwnerDashboard>;
      expire_pos_holds: Rpc<Record<string, never>, number>;
      create_pos_hold: Rpc<{
        p_lines: Json;
        p_expires_in_minutes: number;
        p_idempotency_key: string;
      }, string>;
      cancel_pos_hold: Rpc<{ p_hold_number: string }, string>;
      complete_pos_hold: Rpc<{
        p_hold_number: string;
        p_tenders: Json;
        p_idempotency_key: string;
      }, string>;
    };
    Enums: {
      app_role: AppRole;
    };
    CompositeTypes: Record<string, never>;
  };
};
