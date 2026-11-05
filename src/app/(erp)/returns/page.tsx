import { ModulePage } from "../module-page";

export default function ReturnsPage({ searchParams }: { searchParams: Promise<{ error?: string; success?: string }> }) {
  return <ModulePage module="returns" searchParams={searchParams} />;
}
