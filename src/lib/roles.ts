import type { AppRole } from "@/lib/supabase/database.types";

export const roleLabels: Record<AppRole, string> = {
  sales: "Sales",
  warehouse: "Warehouse",
  procurement: "Procurement",
  finance: "Finance",
  cashier: "Cashier",
  owner: "Owner",
};

export const routeAccess = {
  "/quotations": ["sales", "owner"],
  "/rfqs": ["procurement", "owner"],
  "/master-data": ["sales", "procurement", "finance", "owner"],
  "/inspections": ["warehouse", "finance", "owner"],
  "/sales": ["sales", "warehouse", "owner"],
  "/crm": ["sales", "owner"],
  "/purchase": ["procurement", "warehouse", "owner"],
  "/inventory": ["warehouse", "procurement", "owner"],
  "/accounting": ["finance", "owner"],
  "/invoicing": ["finance", "owner"],
  "/pos": ["cashier", "owner"],
  "/returns": ["warehouse", "finance", "owner"],
  "/settings": ["owner"],
  "/audit": ["owner"],
  "/reporting": ["finance", "owner"],
} satisfies Record<string, AppRole[]>;

export const applicationAccess: {
  name: string;
  group: "Komersial" | "Rantai pasok" | "Keuangan" | "Kasir";
  roles: AppRole[];
  href?: string;
  available: boolean;
}[] = [
  { name: "Sales", group: "Komersial", roles: ["sales", "warehouse", "owner"], href: "/sales", available: true },
  { name: "CRM", group: "Komersial", roles: ["sales", "owner"], href: "/crm", available: true },
  { name: "Purchase", group: "Rantai pasok", roles: ["procurement", "warehouse", "owner"], href: "/purchase", available: true },
  {
    name: "Inventory",
    group: "Rantai pasok",
    roles: ["warehouse", "procurement", "owner"],
    href: "/inventory",
    available: true,
  },
  { name: "Accounting", group: "Keuangan", roles: ["finance", "owner"], href: "/accounting", available: true },
  { name: "Invoicing", group: "Keuangan", roles: ["finance", "owner"], href: "/invoicing", available: true },
  { name: "Point of Sale", group: "Kasir", roles: ["cashier", "owner"], href: "/pos", available: true },
];
