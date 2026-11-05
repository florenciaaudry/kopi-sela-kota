import { ModulePage } from "../module-page";

export default function PurchasePage({ searchParams }: { searchParams: Promise<{ error?: string; success?: string }> }) {
  return <ModulePage module="purchase" searchParams={searchParams} />;
}
