"use client";
import {useEffect,useRef,type ReactNode} from 'react';
import {X} from 'lucide-react';
export async function api(payload?:unknown){const r=await fetch('/api/studio',payload?{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)}:{});const d=await r.json();if(!r.ok)throw new Error(d.error??'No fue posible completar la solicitud.');return d;}
export function Modal({title,children,onClose,wide=false}:{title:string;children:ReactNode;onClose:()=>void;wide?:boolean}){const ref=useRef<HTMLDialogElement>(null);useEffect(()=>{ref.current?.showModal();},[]);return <dialog className={`studio-dialog ${wide?'wide':''}`} ref={ref} aria-label={title} onCancel={e=>{e.preventDefault();onClose();}} onClick={e=>{if(e.target===e.currentTarget)onClose();}}><div className="dialog-header"><h2>{title}</h2><button title="Cerrar" aria-label="Cerrar" onClick={onClose}><X size={20}/></button></div>{children}</dialog>;}
