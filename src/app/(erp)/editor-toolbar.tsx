"use client";

import { SubmitButton } from "./submit-button";
import { useFormStatus } from "react-dom";

export function EditorToolbar({label="Save"}:{label?:string}) {
  const {pending}=useFormStatus();
  return <div className="editor-toolbar" aria-label="Editing actions">
    <SubmitButton label={label}/>
    <button type="button" className="secondary-button" disabled={pending} onClick={event=>{
      const form=event.currentTarget.closest("form");
      if(!form)return;
      // Changing the key resets controlled fields to their server-provided defaults.
      form.dispatchEvent(new CustomEvent("erp-discard",{bubbles:true}));
    }}>Discard</button>
    <span className="editor-save-hint" aria-live="polite">{pending?"Saving…":""}</span>
  </div>;
}
