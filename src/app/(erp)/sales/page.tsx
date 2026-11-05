import { ModulePage } from "../module-page";

export default function SalesPage({ searchParams }: { searchParams: Promise<{ error?: string; success?: string }> }) {
  return <ModulePage module="sales" searchParams={searchParams} />;
}
