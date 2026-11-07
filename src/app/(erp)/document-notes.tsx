import { createSupabaseServerClient } from "@/lib/supabase/server";
import { NoteComposer } from "./note-composer";
export async function DocumentNotes({kind,reference}:{kind:string;reference:string}){
 const c=await createSupabaseServerClient();const result=await c.from("document_notes").select("id,body,actor_label,created_at").eq("document_kind",kind).eq("document_reference",reference).order("created_at");
 if(result.error?.code==="42P01"||result.error?.code==="PGRST205")return null;
 return <section className="section-card" id="log-notes"><h2>Log Notes</h2>{result.error?<p role="alert">Catatan belum dapat dimuat. Coba muat ulang.</p>:<><p className="muted-copy">Catatan internal tersimpan bersama dokumen dan identitas penulis.</p>{result.data?.length?<ol className="document-note-list">{result.data.map(n=><li key={n.id}><strong>{n.actor_label}</strong><time>{new Date(n.created_at).toLocaleString("id-ID",{timeZone:"Asia/Jakarta"})} WIB</time><p>{n.body}</p></li>)}</ol>:<p>Belum ada catatan.</p>}<NoteComposer kind={kind} reference={reference} transactionKey={crypto.randomUUID()}/></>}</section>;
}
