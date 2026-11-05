import { ModulePage } from "../module-page";

export default function CrmPage({ searchParams }: { searchParams: Promise<{ error?: string; success?: string }> }) {
  return <ModulePage module="crm" searchParams={searchParams} />;
}
