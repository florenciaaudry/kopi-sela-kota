import Link from "../record-link";
import { requireRole } from "@/lib/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { formatRupiah } from "@/lib/format";
import { financialReport, reportMetrics, validReportDate, type ReportMetric } from "@/lib/financial-report";
export const metadata={title:"Reporting"};
async function readAll<T>(load:(start:number,end:number)=>PromiseLike<{data:T[]|null;error:{message:string}|null}>) {
  const rows:T[]=[];
  for(let start=0;start<100000;start+=1000) {const result=await load(start,start+999);if(result.error||!result.data)throw new Error(result.error?.message??"Data tidak lengkap");rows.push(...result.data);if(result.data.length<1000)return rows;}
  throw new Error("Laporan melebihi kapasitas pembacaan; ringkasan tidak diterbitkan.");
}
export default async function ReportingPage({searchParams}:{searchParams:Promise<{from?:string;to?:string;metric?:string}>}) {
 const profile=await requireRole(["finance","owner"]);const filters=await searchParams;
 const today=new Intl.DateTimeFormat("en-CA",{timeZone:"Asia/Jakarta",year:"numeric",month:"2-digit",day:"2-digit"}).format(new Date());
 const from=filters.from??"2026-10-01",to=filters.to??today;
 if(!validReportDate(from)||!validReportDate(to)||from>to)return <section className="notice notice-warning" role="alert"><h1>Reporting</h1><p>Gunakan tanggal mulai sebelum atau sama dengan tanggal akhir.</p><Link href="/reporting">Reset Period</Link></section>;
 const metric:ReportMetric=Object.hasOwn(reportMetrics,filters.metric??"") ? filters.metric as ReportMetric : "sales";
 const client=await createSupabaseServerClient();
 const loaded=await Promise.all([
  readAll((start,end)=>client.from("journal_entries").select("id,number,entry_date,status,source_type,source_reference,memo").lte("entry_date",to).eq("status","posted").order("id").range(start,end)),
  readAll((start,end)=>client.from("journal_lines").select("journal_entry_id,account_code,debit,credit").order("id").range(start,end)),
 ]).then(([entries,lines])=>({entries,lines,report:financialReport(entries,lines,from,to)})).catch(error=>{console.error("Reporting failed",error);return null;});
 if(!loaded)return <section className="notice notice-error" role="alert"><h1>Reporting</h1><p>Laporan tidak dapat dimuat secara lengkap. Coba muat ulang atau hubungi administrator.</p></section>;
 const {entries,lines,report}=loaded;const selected=reportMetrics[metric];
 const sourceEntries=entries.filter(entry=>report.contributions[metric].has(entry.id)).sort((a,b)=>b.entry_date.localeCompare(a.entry_date)||a.number.localeCompare(b.number));
 const linesByEntry=new Map<string,typeof lines>();for(const line of lines){const current=linesByEntry.get(line.journal_entry_id)??[];current.push(line);linesByEntry.set(line.journal_entry_id,current);}
 function metricUrl(key:string){return "/reporting?"+new URLSearchParams({from,to,metric:key}).toString()+"#sources";}
 return <div className="page-stack module-workspace"><div className="page-heading"><div><p className="eyebrow">REPORTING</p><h1>Reporting</h1><p className="muted-copy">Telusuri angka laporan sampai ke jurnal dan dokumen sumber.</p></div><Link className="secondary-button" href="/accounting">Journal Entries</Link></div>
 <section className="section-card"><form method="get" className="table-controls"><input type="hidden" name="metric" value={metric}/><label className="demo-field"><span>From</span><input type="date" required name="from" defaultValue={from}/></label><label className="demo-field"><span>To</span><input type="date" required name="to" defaultValue={to}/></label><button className="primary-button" type="submit">Apply Period</button></form><p className="muted-copy">Net Sales, PBJT, COGS, dan Margin mengikuti periode. Saldo akun dihitung sampai tanggal akhir, termasuk saldo awal.</p></section>
 <section className="ksk-overview-grid" aria-label="Ringkasan periode">{(Object.keys(reportMetrics) as ReportMetric[]).map(key=><Link className="ksk-overview-card" href={metricUrl(key)} key={key} aria-current={key===metric?"true":undefined}><span>{reportMetrics[key].label}</span><strong>{formatRupiah(report.totals[key])}</strong><p>{reportMetrics[key].period?"Dalam periode":"Saldo akhir"} · Lihat sumber</p></Link>)}</section>
 <p className="muted-copy">Margin = Net Sales - COGS. PBJT tidak termasuk pendapatan atau margin. Nilai Inventory berasal dari akun persediaan.</p>
 <section id="sources" className="section-card"><div className="section-heading"><h2>{selected.label} · Source Documents</h2></div><p>{sourceEntries.length} jurnal · Total {formatRupiah(report.totals[metric])}</p>{sourceEntries.length===0?<p className="demo-empty">Tidak ada jurnal untuk pilihan ini.</p>:<div className="table-scroll"><table><thead><tr><th>Date</th><th>Journal Entry</th><th>Source Document</th><th>Contribution</th><th>Journal Items</th></tr></thead><tbody>{sourceEntries.map(entry=><tr key={entry.id}><td>{entry.entry_date}</td><td><Link className="record-link" href={"/documents/journal/"+encodeURIComponent(entry.number).replace(/%2F/gi,"~")}>{entry.number}</Link></td><td>{entry.source_type==="customer_invoice"?<Link className="text-button" href={"/documents/invoice/"+encodeURIComponent(entry.source_reference)}>{entry.source_reference}</Link>:["pos_receipt","pos_sale"].includes(entry.source_type)&&profile.role==="owner"?<Link className="text-button" href={"/pos/receipt/"+encodeURIComponent(entry.source_reference)}>{entry.source_reference}</Link>:entry.source_reference}<small className="muted-copy"> · {entry.memo}</small></td><td>{formatRupiah(report.contributions[metric].get(entry.id)??0)}</td><td><details><summary>View Entries</summary>{(linesByEntry.get(entry.id)??[]).map((line,index)=><p key={index}>{line.account_code}: Debit {formatRupiah(Number(line.debit))} / Credit {formatRupiah(Number(line.credit))}</p>)}</details></td></tr>)}</tbody></table></div>}</section></div>;

}
