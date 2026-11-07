"use client";
import { useActionState } from "react";
import { addNoteAction, type NoteState } from "./workflow-actions";
export function NoteComposer({kind,reference,transactionKey}:{kind:string;reference:string;transactionKey:string}){
 const [state,action,pending]=useActionState(addNoteAction,{} as NoteState);
 return <form action={action} className="demo-form"><input type="hidden" name="kind" value={kind}/><input type="hidden" name="reference" value={reference}/><input type="hidden" name="idempotency_key" value={transactionKey}/><label className="demo-field"><span>New Log Note</span><textarea name="body" required maxLength={2000} rows={3} placeholder="Tulis catatan terkait dokumen ini…"/></label>{state.error?<p role="alert" className="form-error">{state.error}</p>:state.success?<p role="status">{state.success}</p>:null}<button className="primary-button" disabled={pending} type="submit">{pending?"Menyimpan…":"Log Note"}</button></form>;
}
