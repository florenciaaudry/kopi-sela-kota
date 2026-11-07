"use client";

import Link from "./record-link";
import { documentHref } from "@/lib/document-navigation";
import { useState } from "react";

type Opportunity = {
  number: string;
  customer: string;
  product: string;
  quantity: number;
  stage: string;
  revenue: number;
  probability: number;
  lostReason: string | null;
};
const stages = ["New", "Qualified", "Proposition", "Won", "Lost"];
const labels: Record<string, string> = Object.fromEntries(stages.map(stage => [stage, stage]));

export function CrmPipeline({ opportunities }: { opportunities: Opportunity[] }) {
  const [query, setQuery] = useState("");
  const [selectedStage, setSelectedStage] = useState("");
  const currency = (value: number) => new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(value);
  const matching = opportunities.filter((item) => (!selectedStage || item.stage === selectedStage) && [item.number, item.customer, item.product].some((value) => value.toLocaleLowerCase("id-ID").includes(query.trim().toLocaleLowerCase("id-ID"))));
  return <div className="crm-pipeline">
    <div className="table-controls">
      <label className="demo-field"><span>Search Opportunities</span><input type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Nomor, pelanggan, produk…" /></label>
      <label className="demo-field"><span>Filter Stage</span><select value={selectedStage} onChange={(event) => setSelectedStage(event.target.value)}><option value="">Semua tahap</option>{stages.map((stage) => <option key={stage} value={stage}>{labels[stage]}</option>)}</select></label>
    </div>
    <p className="muted-copy" role="status">{matching.length} peluang · Gunakan formulir Update Stage untuk memindahkan peluang.</p>
    <div className="kanban-board" aria-label="Pipeline peluang penjualan">
      {stages.filter((stage) => !selectedStage || stage === selectedStage).map((stage) => {
        const items = matching.filter((item) => item.stage === stage);
        return <section className="kanban-column" key={stage} aria-label={labels[stage]}>
          <header><h3>{labels[stage]} <span>({items.length})</span></h3><p>{currency(items.reduce((sum, item) => sum + item.revenue, 0))}</p></header>
          {items.length ? items.map((item) => <article className="opportunity-card" key={item.number}>
            <span className="demo-status">{item.stage}</span><h4><Link className="record-link" href={documentHref("lead",item.number)}>{item.number} · {item.customer}</Link></h4><p>{item.product} × {item.quantity}</p>
            <strong>{currency(item.revenue)}</strong><p>Probability {item.probability}%</p><p>Weighted Revenue <strong>{currency(Math.round(item.revenue * item.probability / 100))}</strong></p>
            {item.lostReason ? <p>Alasan: {item.lostReason}</p> : null}
          </article>) : <p className="muted-copy">Belum ada peluang pada tahap ini.</p>}
        </section>;
      })}
    </div>
  </div>;
}
