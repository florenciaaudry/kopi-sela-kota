"use client";

import { useEffect } from "react";

export function UnsavedChangesGuard(){
 useEffect(()=>{
   const dirty=new Set<HTMLFormElement>();
   const prune=()=>{for(const form of dirty)if(!form.isConnected)dirty.delete(form);return dirty.size>0;};
   const input=(event:Event)=>{const target=event.target;if(target instanceof Element){const form=target.closest<HTMLFormElement>("form[data-unsaved-guard]");if(form)dirty.add(form);}};
   const clear=(event:Event)=>{if(event.target instanceof HTMLFormElement)dirty.delete(event.target);};
   const submit=(event:Event)=>{
     if(!(event.target instanceof HTMLFormElement))return;
     if(dirty.has(event.target)){dirty.delete(event.target);return;}
     if(prune()){
       if(!window.confirm("Ada perubahan yang belum disimpan. Lanjutkan tindakan dengan data yang sudah tersimpan?")){event.preventDefault();event.stopImmediatePropagation();}
       else dirty.clear();
     }
   };
   const click=(event:MouseEvent)=>{
     if(event.defaultPrevented||event.button!==0||event.ctrlKey||event.metaKey||event.shiftKey||event.altKey||!prune())return;
     const link=event.target instanceof Element?event.target.closest<HTMLAnchorElement>("a[href]"):null;
     if(!link||link.download||link.target==="_blank")return;
     const next=new URL(link.href,location.href);
     if(next.pathname===location.pathname&&next.search===location.search)return;
     if(!window.confirm("Perubahan belum disimpan. Tinggalkan halaman dan buang perubahan?")){event.preventDefault();event.stopImmediatePropagation();}
     else dirty.clear();
   };
   const unload=(event:BeforeUnloadEvent)=>{if(prune()){event.preventDefault();event.returnValue="";}};
   document.addEventListener("input",input,true);document.addEventListener("change",input,true);
   document.addEventListener("submit",submit,true);document.addEventListener("reset",clear,true);
   document.addEventListener("click",click,true);window.addEventListener("beforeunload",unload);
   return ()=>{document.removeEventListener("input",input,true);document.removeEventListener("change",input,true);document.removeEventListener("submit",submit,true);document.removeEventListener("reset",clear,true);document.removeEventListener("click",click,true);window.removeEventListener("beforeunload",unload);};
 },[]);
 return null;
}
