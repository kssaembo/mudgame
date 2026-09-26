import {useEffect,useRef,type ReactNode} from 'react';

export default function Modal({title,children,onClose,busy=false}:{title:string;children:ReactNode;onClose:()=>void;busy?:boolean}) {
 const ref=useRef<HTMLDialogElement>(null);
 useEffect(()=>{const dialog=ref.current;dialog?.showModal();return()=>dialog?.close();},[]);
 return <dialog ref={ref} className="mud-modal" aria-label={title} onCancel={e=>{e.preventDefault();if(!busy)onClose();}}>
 <div className="modal-heading"><h2>{title}</h2><button type="button" disabled={busy} onClick={onClose} aria-label="팝업 닫기">[닫기 · Esc]</button></div>
 <div className="modal-body">{children}</div></dialog>;
}
