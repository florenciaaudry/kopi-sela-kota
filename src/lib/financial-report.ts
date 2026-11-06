export type ReportEntry = {id:string;number:string;entry_date:string;status:string;source_type:string;source_reference:string;memo:string};
export type ReportLine = {journal_entry_id:string;account_code:string;debit:number;credit:number};
export const reportMetrics = {
  sales:{label:"Net Sales",accounts:["4101"],credit:true,period:true},
  pbjt:{label:"PBJT",accounts:["2102"],credit:true,period:true},
  cogs:{label:"COGS",accounts:["5101"],credit:false,period:true},
  margin:{label:"Margin",accounts:["4101","5101"],credit:true,period:true},
  receivable:{label:"Accounts Receivable",accounts:["1201"],credit:false,period:false},
  payable:{label:"Accounts Payable",accounts:["2101"],credit:true,period:false},
  cash:{label:"Cash",accounts:["1101"],credit:false,period:false},
  bank:{label:"Bank",accounts:["1102"],credit:false,period:false},
  inventory:{label:"Inventory Value",accounts:["1301"],credit:false,period:false},
} satisfies Record<string,{label:string;accounts:string[];credit:boolean;period:boolean}>;
export type ReportMetric = keyof typeof reportMetrics;
export function validReportDate(value:string) {return /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(value)) && new Date(value).toISOString().slice(0,10) === value;}
export function financialReport(entries:ReportEntry[], lines:ReportLine[], from:string, to:string) {
  if (!validReportDate(from)||!validReportDate(to)||from>to) throw new Error("Rentang tanggal tidak valid.");
  const posted = new Map(entries.filter(e=>e.status==="posted" && e.entry_date<=to).map(e=>[e.id,e]));
  const totals = Object.fromEntries(Object.keys(reportMetrics).map(key=>[key,0])) as Record<ReportMetric,number>;
  const contributions = Object.fromEntries(Object.keys(reportMetrics).map(key=>[key,new Map<string,number>()])) as Record<ReportMetric,Map<string,number>>;
  for(const line of lines) {
    const entry=posted.get(line.journal_entry_id);if(!entry)continue;
    const debit=Number(line.debit),credit=Number(line.credit);
    if(!Number.isFinite(debit)||!Number.isFinite(credit))throw new Error("Nilai jurnal tidak valid.");
    for(const key of Object.keys(reportMetrics) as ReportMetric[]) {
      const metric=reportMetrics[key];
      if((metric.period && entry.entry_date<from)||!(metric.accounts as readonly string[]).includes(line.account_code))continue;
      const value=metric.credit ? credit-debit : debit-credit;
      totals[key]+=value;contributions[key].set(entry.id,(contributions[key].get(entry.id)??0)+value);
    }
  }
  return {totals,contributions};
}
