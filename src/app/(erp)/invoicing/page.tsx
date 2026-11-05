import { ModulePage } from "../module-page";

export default function InvoicingPage({ searchParams }: { searchParams: Promise<{ error?: string; success?: string }> }) {
  return <ModulePage module="invoicing" searchParams={searchParams} />;
}
