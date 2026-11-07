import Link from "next/link";
export function DocumentHeading({back,backLabel,title,reference,status}:{back:string;backLabel:string;title:string;reference:string;status?:string}){
 return <header className="record-heading"><nav className="record-breadcrumb" aria-label="Document navigation"><Link href={back} className="record-back"><span aria-hidden="true">←</span> Back to {backLabel}</Link><span aria-hidden="true">/</span><span aria-current="page">{reference}</span></nav><div className="record-title-row"><div><p className="record-type">{title}</p><h1>{reference}</h1></div>{status?<span className="demo-status">{status}</span>:null}</div></header>;
}
