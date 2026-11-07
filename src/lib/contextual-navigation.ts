import { moduleTitles } from "./erp-terminology";
import { documentDefinitions, knownDocumentKind } from "./document-navigation";

const screens=new Set(["/", "/sales","/crm","/purchase","/inventory","/accounting","/invoicing","/pos","/returns","/quotations","/rfqs","/inspections","/master-data","/reporting","/audit","/settings"]);
export function validReturnPath(value:string|null|undefined):string|null {
 if(!value||value.length>1800||!value.startsWith("/")||value.startsWith("//")||/[\\\r\n]/.test(value))return null;
 try{
  const url=new URL(value,"https://erp.invalid");
  if(url.origin!=="https://erp.invalid")return null;
  const parts=url.pathname.split("/").filter(Boolean);
  const document=parts.length===3&&parts[0]==="documents"&&knownDocumentKind(parts[1])&&/^[-A-Za-z0-9~%]+$/.test(parts[2]);
  const receipt=/^\/pos\/receipt\/[A-Za-z0-9-]+$/.test(url.pathname);
  return screens.has(url.pathname)||document||receipt?url.pathname+url.search+url.hash:null;
 }catch{return null;}
}
export function contextualDocumentHref(href:string,source:string):string {
 if(!href.startsWith("/documents/")&&!href.startsWith("/pos/receipt/"))return href;
 const origin=validReturnPath(source);if(!origin)return href;
 const target=new URL(href,"https://erp.invalid");
 if(target.pathname===new URL(origin,"https://erp.invalid").pathname)return href;
 target.searchParams.set("from",origin.length<=1200?origin:new URL(origin,"https://erp.invalid").pathname);
 return target.pathname+target.search+target.hash;
}
export function returnLabel(path:string):string {
 const url=new URL(path,"https://erp.invalid"),parts=url.pathname.split("/").filter(Boolean);
 if(parts[0]==="documents"&&Object.hasOwn(documentDefinitions,parts[1])){
  const kind=parts[1] as keyof typeof documentDefinitions;
  let reference=parts[2];try{reference=decodeURIComponent(reference).replaceAll("~","/");}catch{}
  return documentDefinitions[kind].title+" "+reference;
 }
 if(parts[0]==="documents"&&parts[1]==="invoice")return "Customer Invoice "+parts[2];
 if(parts[0]==="pos"&&parts[1]==="receipt")return "Sales Receipt "+parts[2];
 return url.pathname==="/"?"Dashboard":moduleTitles[parts[0]]??"Previous Page";
}
