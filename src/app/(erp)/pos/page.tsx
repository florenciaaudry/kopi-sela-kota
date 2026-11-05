import { ModulePage } from "../module-page";

export default function PointOfSalePage({ searchParams }: { searchParams: Promise<{ error?: string; success?: string }> }) {
  return <ModulePage module="pos" searchParams={searchParams} />;
}
