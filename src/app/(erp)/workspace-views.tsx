"use client";

import { useId, useRef, useState, type ReactNode } from "react";

export type WorkspaceSection = { id: string; title: string; content: ReactNode };

export function WorkspaceViews({ actions, views }: { actions: WorkspaceSection[]; views: WorkspaceSection[] }) {
  const [selected, setSelected] = useState(views[0]?.id ?? "");
  const [activeAction, setActiveAction] = useState<string | null>(null);
  const dialog = useRef<HTMLDialogElement>(null);
  const opener = useRef<HTMLButtonElement | null>(null);
  const id = useId();
  const currentView = views.find((view) => view.id === selected) ?? views[0];
  const currentAction = actions.find((action) => action.id === activeAction);
  const close = () => dialog.current?.close();

  return <div className="document-workspace">
    {actions.length ? <div className="document-actions" aria-label="Aksi dokumen">
      {actions.map((action, index) => <button key={action.id} className={index === 0 ? "primary-button" : "secondary-button"} type="button" onClick={(event) => {
        opener.current = event.currentTarget;
        setActiveAction(action.id);
        dialog.current?.showModal();
      }}>{index === 0 ? "+ " : ""}{action.title}</button>)}
    </div> : null}
    {views.length ? <>
      <div className="document-tabs" role="tablist" aria-label="Tampilan dokumen">
        {views.map((view, index) => <button key={view.id} id={`${id}-${view.id}-tab`} type="button" role="tab" aria-selected={view.id === currentView?.id} aria-controls={`${id}-${view.id}-panel`} tabIndex={view.id === currentView?.id ? 0 : -1} onClick={() => setSelected(view.id)} onKeyDown={(event) => {
          let next = index;
          if (event.key === "ArrowRight") next = (index + 1) % views.length;
          else if (event.key === "ArrowLeft") next = (index - 1 + views.length) % views.length;
          else if (event.key === "Home") next = 0;
          else if (event.key === "End") next = views.length - 1;
          else return;
          event.preventDefault();
          setSelected(views[next].id);
          document.getElementById(`${id}-${views[next].id}-tab`)?.focus();
        }}>{view.title}</button>)}
      </div>
      {views.map((view) => <div key={view.id} id={`${id}-${view.id}-panel`} role="tabpanel" hidden={view.id !== currentView?.id} aria-labelledby={`${id}-${view.id}-tab`} tabIndex={0}>{view.content}</div>)}
    </> : <p className="muted-copy">Pilih aksi untuk mulai mengelola dokumen.</p>}
    <dialog ref={dialog} className="workflow-dialog" aria-labelledby={`${id}-dialog-title`} onCancel={close} onClose={() => { setActiveAction(null); opener.current?.focus(); }} onClick={(event) => { if (event.target === dialog.current) close(); }}>
      <div className="workflow-dialog-body">
        <header className="workflow-dialog-header"><div><p className="eyebrow">KOPI SELA KOTA / FORMULIR</p><h2 id={`${id}-dialog-title`}>{currentAction?.title ?? "Formulir transaksi"}</h2></div><button className="dialog-close" aria-label="Tutup formulir" type="button" onClick={close}>×</button></header>
        <p className="workflow-help">Periksa data sebelum menyimpan. Menutup formulir tidak mencatat transaksi.</p>
        {currentAction?.content}
        <div className="dialog-cancel"><button type="button" className="secondary-button" onClick={close}>Batal / Kembali</button></div>
      </div>
    </dialog>
  </div>;
}
