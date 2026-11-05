import type { AppRole } from "@/lib/supabase/database.types";

export const roleLabels: Record<AppRole, string> = {
  sales: "Sales",
  warehouse: "Warehouse",
  procurement: "Procurement",
  finance: "Finance",
  cashier: "Cashier",
  owner: "Owner",
};

export const applicationAccess: {
  name: string;
  roles: AppRole[];
  href?: string;
  available: boolean;
}[] = [
  { name: "Sales", roles: ["sales", "warehouse", "owner"], href: "/sales", available: true },
  { name: "CRM", roles: ["sales", "owner"], href: "/crm", available: true },
  { name: "Purchase", roles: ["procurement", "warehouse", "owner"], href: "/purchase", available: true },
  {
    name: "Inventory",
    roles: ["warehouse", "procurement", "owner"],
    href: "/inventory",
    available: true,
  },
  { name: "Accounting", roles: ["finance", "owner"], href: "/accounting", available: true },
  { name: "Invoicing", roles: ["finance", "owner"], href: "/invoicing", available: true },
  { name: "Point of Sale", roles: ["cashier", "owner"], href: "/pos", available: true },
  { name: "Retur", roles: ["sales", "finance", "owner"], href: "/returns", available: true },
];
