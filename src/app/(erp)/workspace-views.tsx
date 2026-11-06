"use client";

import { odooLabel } from "@/lib/erp-terminology";

import { useEffect, useId, useRef, useState, type ReactNode } from "react";

export type WorkspaceSection = { id: string; title: string; content: ReactNode };

export function WorkspaceViews({ actions, views }: { actions: WorkspaceSection[]; views: WorkspaceSection[] }) {
  const [selected, setSelected] = useState(views[0]?.id ?? "");
  const [activeAction, setActiveAction] = useState<string | null>(null);
  const dialog = useRef<HTMLDialogElement>(null);
  const opener = useRef<HTMLButtonElement | null>(null);
  const backdropPointerDown = useRef(false);
  const submitting = useRef(false);
  const id = useId();
  const currentView = views.find((view) => view.id === selected) ?? views[0];
  const currentAction = actions.find((action) => action.id === activeAction);
  const close = () => dialog.current?.close();

  useEffect(() => {
    if (submitting.current && dialog.current?.open) {
      submitting.current = false;
      dialog.current.close();
    }
  }, [actions, views]);

  return <div className="document-workspace">
    {actions.length ? <div className="document-actions" aria-label="Aksi dokumen">
      {actions.map((action, index) => <button key={action.id} className={index === 0 ? "primary-button" : "secondary-button"} type="button" onClick={(event) => {
        opener.current = event.currentTarget;
        setActiveAction(action.id);
        if (!dialog.current?.open) {
          dialog.current?.showModal();
        }
      }}>{index === 0 ? "+ " : ""}{odooLabel(action.title)}</button>)}
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
        }}>{odooLabel(view.title)}</button>)}
      </div>
      {views.map((view) => <div key={view.id} id={`${id}-${view.id}-panel`} role="tabpanel" hidden={view.id !== currentView?.id} aria-labelledby={`${id}-${view.id}-tab`} tabIndex={0}>{view.content}</div>)}
    </> : <p className="muted-copy">Pilih aksi untuk mulai mengelola dokumen.</p>}
    <dialog
      ref={dialog}
      className="workflow-dialog"
      aria-labelledby={`${id}-dialog-title`}
      onCancel={close}
      onClose={() => {
        submitting.current = false;
        backdropPointerDown.current = false;
        setActiveAction(null);
        opener.current?.focus();
      }}
      onPointerDown={(event) => {
        backdropPointerDown.current = event.target === dialog.current;
      }}
      onClick={(event) => {
        if (backdropPointerDown.current && event.target === dialog.current && event.detail > 0) {
          backdropPointerDown.current = false;
          close();
        }
      }}
    >
      <div className="workflow-dialog-body" onClick={(event) => event.stopPropagation()}>
        <header className="workflow-dialog-header"><div><p className="eyebrow">KOPI SELA KOTA / FORMULIR</p><h2 id={`${id}-dialog-title`}>{odooLabel(currentAction?.title ?? "Formulir transaksi")}</h2></div><button className="dialog-close" aria-label="Tutup formulir" type="button" onClick={close}>×</button></header>
        <p className="workflow-help">Periksa data sebelum menyimpan. Menutup formulir tidak mencatat transaksi.</p>
        {currentAction ? <div key={currentAction.id} className="workflow-dialog-content" onSubmit={(event) => {
          if (!event.defaultPrevented) {
            submitting.current = true;
          }
        }}>{currentAction.content}</div> : null}
        <div className="dialog-cancel"><button type="button" className="secondary-button" onClick={close}>Batal / Kembali</button></div>
      </div>
    </dialog>
  </div>;
}
