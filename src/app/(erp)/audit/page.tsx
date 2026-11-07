import Link from "../record-link";
import { requireRole } from "@/lib/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { DataTable } from "../data-table";

export const metadata = { title: "Audit Log" };
const actions: Record<string,string> = { create:"Create", deliver:"Validate Delivery", invoice:"Post Customer Invoice", payment:"Register Payment", receive:"Validate Receipt", bill:"Post Vendor Bill", transfer:"Internal Transfer", open:"Open Session", sell:"POS Sale", close:"Close Session", approve_variance:"Approve Cash Variance", credit_note:"Post Credit Note", update_stage:"Update Stage", expire:"Expire Hold", cancel:"Cancel Hold", complete:"Complete Hold", align_scenario_name:"Update Profile Name", repair_receipt_details:"Restore Receipt Details" };
function readable(value:string) { return value.replaceAll("_"," ").replace(/\b[a-z]/g, letter => letter.toUpperCase()); }
type Filters = { document?: string; action?: string; from?: string; to?: string; page?: string };
function validDate(value?: string) {
  return value && /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(value)) && new Date(value).toISOString().slice(0,10) === value ? value : "";
}
export default async function AuditPage({ searchParams }: { searchParams: Promise<Filters> }) {
  await requireRole(["owner"]);
  const filters = await searchParams;
  const document = (filters.document ?? "").trim().slice(0,100);
  const action = (filters.action ?? "").trim().slice(0,100);
  const from = validDate(filters.from), to = validDate(filters.to);
  const page = /^\d+$/.test(filters.page ?? "") ? Math.min(10000,Math.max(0,Number(filters.page))) : 0;
  if ((filters.from && !from) || (filters.to && !to) || (from && to && from > to)) return <section className="notice notice-warning" role="alert"><h1>Audit Log</h1><p>Rentang tanggal tidak valid. Gunakan tanggal mulai sebelum atau sama dengan tanggal akhir.</p><Link href="/audit">Reset Filters</Link></section>;
  const client = await createSupabaseServerClient();
  let query = client.from("audit_events").select("id,actor_label,action,document_type,document_number,occurred_at", {count:"exact"}).order("occurred_at",{ascending:false}).order("id",{ascending:false});
  if (document) query = query.ilike("document_number", "%" + document.replace(/[\\%_]/g, "\\$&") + "%");
  if (action) query = query.eq("action", action);
  if (from) query = query.gte("occurred_at",from+"T00:00:00+07:00");
  if (to) query = query.lte("occurred_at",to+"T23:59:59.999999+07:00");
  const {data, error, count} = await query.range(page*50,page*50+49);
  if (error) {
    console.error("Audit list failed", error.code);
    return <section className="notice notice-error" role="alert"><h1>Audit Log</h1><p>Riwayat aktivitas tidak dapat dimuat. Coba muat ulang atau hubungi administrator.</p></section>;
  }
  function pageUrl(next:number) { const p=new URLSearchParams(); if(document)p.set("document",document);if(action)p.set("action",action);if(from)p.set("from",from);if(to)p.set("to",to);p.set("page",String(next));return "/audit?"+p.toString(); }
  return <div className="page-stack module-workspace">
    <div className="page-heading"><div><p className="eyebrow">SETTINGS</p><h1>Audit Log</h1><p className="muted-copy">Telusuri pelaku, waktu, tindakan, dan dokumen terkait.</p></div><Link className="secondary-button" href="/settings">Users &amp; Permissions</Link></div>
    <section className="section-card"><form method="get" className="table-controls">
      <label className="demo-field"><span>Document Reference</span><input name="document" defaultValue={document} maxLength={100} placeholder="Contoh: PO00001" /></label>
      <label className="demo-field"><span>Action</span><select name="action" defaultValue={action}><option value="">Semua tindakan</option>{action && !actions[action] ? <option value={action}>{readable(action)}</option> : null}{Object.entries(actions).map(([value,label]) => <option value={value} key={value}>{label}</option>)}</select></label>
      <label className="demo-field"><span>From (WIB)</span><input name="from" type="date" defaultValue={from} /></label>
      <label className="demo-field"><span>To (WIB)</span><input name="to" type="date" defaultValue={to} /></label>
      <button className="primary-button" type="submit">Apply Filters</button><Link className="text-button" href="/audit">Reset</Link>
    </form></section>
    <section className="section-card"><div className="section-heading"><h2>Activity History</h2></div><p className="muted-copy">{count ?? 0} aktivitas cocok · halaman {page+1}. Waktu ditampilkan dalam WIB.</p><DataTable rowDocumentTypes={{index:4,types:Object.fromEntries((data??[]).map(e=>[e.document_number,e.document_type]))}} headers={["Date & Time (WIB)","User","Action","Document Type","Document Reference"]} rows={(data ?? []).map(event => [new Date(event.occurred_at).toLocaleString("id-ID",{timeZone:"Asia/Jakarta"}),event.actor_label,actions[event.action] ?? readable(event.action),readable(event.document_type),event.document_number])} /><nav className="inline-actions" aria-label="Halaman riwayat">{page>0 ? <Link className="secondary-button" href={pageUrl(page-1)}>Previous</Link> : null}{(page+1)*50<(count ?? 0) ? <Link className="secondary-button" href={pageUrl(page+1)}>Next</Link> : null}</nav></section>
  </div>;
}
