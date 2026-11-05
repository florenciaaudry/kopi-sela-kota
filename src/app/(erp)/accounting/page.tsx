import { ModulePage } from "../module-page";

export default function AccountingPage({ searchParams }: { searchParams: Promise<{ error?: string; success?: string }> }) {
  return <ModulePage module="accounting" searchParams={searchParams} />;
}
