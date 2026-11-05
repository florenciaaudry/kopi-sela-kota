"use client";

import { useId, useState } from "react";
import Link from "next/link";

export function DataTable({ headers, rows, linkColumn }: { headers: string[]; rows: (string | number)[][]; linkColumn?: { index: number; prefix: string } }) {
  const id = useId();
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("");
  const [groupBy, setGroupBy] = useState(-1);
  const statusIndex = headers.findIndex((header) => header === "Status" || header === "Tahap");
  const statuses = statusIndex < 0 ? [] : [...new Set(rows.map((row) => String(row[statusIndex])))].sort();
  const matches = rows.filter((row) => row.some((cell) => String(cell).toLocaleLowerCase("id-ID").includes(query.trim().toLocaleLowerCase("id-ID"))) && (!status || String(row[statusIndex]) === status));
  const groups = new Map<string, typeof rows>();
  for (const row of matches) {
    const key = groupBy < 0 ? "" : String(row[groupBy]);
    groups.set(key, [...(groups.get(key) ?? []), row]);
  }
  return (
    <div className="data-browser">
      <div className="table-controls">
        <label className="demo-field" htmlFor={`${id}-search`}><span>Cari data</span><input id={`${id}-search`} type="search" placeholder="Nomor, pelanggan, produk…" value={query} onChange={(event) => setQuery(event.target.value)} /></label>
        <details className="record-filter-menu"><summary>Filter &amp; Group By{status || groupBy >= 0 ? " · aktif" : ""}</summary><div className="record-filter-panel">
          {statusIndex >= 0 ? <label className="demo-field"><span>Filter {headers[statusIndex].toLowerCase()}</span><select value={status} onChange={(event) => setStatus(event.target.value)}><option value="">Semua</option>{statuses.map((value) => <option key={value}>{value}</option>)}</select></label> : null}
          <label className="demo-field"><span>Kelompokkan menurut</span><select value={groupBy} onChange={(event) => setGroupBy(Number(event.target.value))}><option value={-1}>Tanpa pengelompokan</option>{headers.map((header, index) => <option key={`${header}-${index}`} value={index}>{header}</option>)}</select></label>
        </div></details>
        {query || status || groupBy >= 0 ? <button className="text-button" type="button" onClick={() => { setQuery(""); setStatus(""); setGroupBy(-1); }}>Reset</button> : null}
      </div>
      <p className="muted-copy" role="status">{matches.length} dari {rows.length} data dimuat{query || status ? " · filter aktif" : ""}</p>
      {matches.length === 0 ? <p className="demo-empty">{rows.length ? "Tidak ada data yang cocok. Ubah pencarian atau reset filter." : "Belum ada data."}</p> : (
        <div className="table-scroll"><table><thead><tr>{headers.map((header) => <th key={header} scope="col">{header}</th>)}</tr></thead>
          {[...groups].map(([group, items]) => <tbody key={group}>
            {groupBy >= 0 ? <tr className="table-group"><th scope="rowgroup" colSpan={headers.length}>{headers[groupBy]}: {group} ({items.length})</th></tr> : null}
            {items.map((row, index) => <tr key={`${String(row[0])}-${index}`}>{row.map((cell, cellIndex) => <td key={cellIndex}>{linkColumn?.index === cellIndex ? <Link className="text-button" href={`${linkColumn.prefix}${encodeURIComponent(String(cell))}`}>{cell}</Link> : cellIndex === statusIndex ? <span className="demo-status">{cell}</span> : cell}</td>)}</tr>)}
          </tbody>)}
        </table></div>
      )}
    </div>
  );
}
