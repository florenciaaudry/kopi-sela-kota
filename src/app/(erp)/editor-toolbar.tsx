"use client";

import { ReturnContextField } from "./contextual-back-link";
import { SubmitButton } from "./submit-button";
import { useRouter } from "next/navigation";
import { useFormStatus } from "react-dom";

export function EditorToolbar({label="Save",discardHref}:{label?:string;discardHref?:string}) {
  const {pending}=useFormStatus();
  const router=useRouter();
  return <><ReturnContextField/><div className="editor-toolbar" aria-label="Editing actions">
    <SubmitButton label={label}/>
    <button type="button" className="secondary-button" disabled={pending} onClick={event=>{
      const form=event.currentTarget.closest("form");
      if(!form)return;
      // Changing the key resets controlled fields to their server-provided defaults.
      form.dispatchEvent(new CustomEvent("erp-discard",{bubbles:true}));
      if(discardHref)router.push(discardHref);
    }}>Discard</button>
    <span className="editor-save-hint" aria-live="polite">{pending?"Saving…":""}</span>
  </div></>;
}
