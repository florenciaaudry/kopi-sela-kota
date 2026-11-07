"use client";

import { useState, type ReactNode } from "react";

export function EditSession({children}:{children:ReactNode}){
 const [revision,setRevision]=useState(0);
 return <div key={revision} className="edit-session" ref={element=>{
   if(!element)return;
   const discard=()=>{
     element.querySelectorAll("form").forEach(form=>form.dispatchEvent(new Event("reset",{bubbles:true})));
     const details=element.closest("details");if(details)details.open=false;
     setRevision(v=>v+1);
   };
   element.addEventListener("erp-discard",discard);
   return ()=>element.removeEventListener("erp-discard",discard);
 }}>{children}</div>;
}
