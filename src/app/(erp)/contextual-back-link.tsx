"use client";
import Link from "next/link";
import { usePathname,useSearchParams } from "next/navigation";
import { validReturnPath,returnLabel } from "@/lib/contextual-navigation";
export function ContextualBackLink({fallback,label}:{fallback:string;label:string}){
 const params=useSearchParams(),path=usePathname();const candidate=validReturnPath(params.get("from"));const source=candidate&&candidate.split(/[?#]/)[0]!==path?candidate:null;
 return <Link href={source??fallback} className="record-back" aria-label={"Back to "+(source?returnLabel(source):label)}><span aria-hidden="true">←</span> {source?returnLabel(source):label}</Link>;
}
export function ReturnContextField(){
 const params=useSearchParams();return <input type="hidden" name="return_context" value={validReturnPath(params.get("from"))??""}/>;
}
