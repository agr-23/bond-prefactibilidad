"use client";
import {useEffect,useState} from 'react';
import {Stamp,ArrowUpRight,AlertTriangle} from 'lucide-react';
import type {MunicipalHit} from '../../lib/studio/types';

// Ruta de tramites regulatorios para la ubicacion del proyecto. Los datos (fichas, operadores de red
// y corporaciones por departamento, con excepciones municipales) provienen del artefacto "Ruta de
// Tramites BOND" de un companero de equipo; aqui se integran con el estilo de la plataforma y se
// resuelven contra el municipio del proyecto. La seleccion fina por potencia o excedentes queda pendiente.
type Ficha={t:string;r?:string;ap?:string;qn?:string;an?:string;pa?:string[][];rq?:string[];dc?:string[][];pl?:string[];co?:string[];ri?:string[];pe?:string[]};
type Dataset={groups:[string,string][];fichaGroup:Record<string,string>;det:Record<string,Ficha>;ors:Record<string,any>;orDep:Record<string,[string,string]>;orMun:Record<string,[string,string]>;cars:Record<string,string>;carDep:Record<string,string[]>;carMun:Record<string,string[]>;source:string;retrievedAt:string};

export default function Tramites({municipalities}:{municipalities:MunicipalHit[]}){
 const [data,setData]=useState<Dataset|null>(null);
 const [err,setErr]=useState('');
 const [open,setOpen]=useState<string|null>(null);
 useEffect(()=>{let live=true;fetch('/data/tramites.json').then(r=>{if(!r.ok)throw new Error('No se pudo cargar la ruta de trámites.');return r.json();}).then(d=>{if(live)setData(d);}).catch(e=>live&&setErr(e.message));return()=>{live=false;};},[]);

 if(err)return <div className="studio-content"><div className="page-intro"><h2>Ruta de trámites</h2></div><p className="finding"><AlertTriangle size={15}/>{err}</p></div>;
 if(!data)return <div className="studio-content"><div className="page-intro"><h2>Ruta de trámites</h2><p>Cargando…</p></div></div>;

 const main=municipalities.slice().sort((a,b)=>b.share-a.share)[0]??null;
 const code=main?.code??'';
 const dep=code.slice(0,2);
 const orKey=(data.orMun[code]??data.orDep[dep])?.[0];
 const or=orKey?data.ors[orKey]:null;
 const carKeys=data.carMun[code]??data.carDep[dep]??[];

 return <div className="studio-content tramites">
  <div className="page-intro"><h2>Ruta de trámites</h2><p>Trámites, entidades y normas para conectar un proyecto, según la ubicación del proyecto activo.</p></div>
  {!main?<div className="empty-state"><Stamp size={35}/><h2>Primero analiza un área</h2><p>La ruta se arma con el municipio del proyecto. Dibuja un área y analízala en el Mapa.</p></div>:<>
   <div className="entities">
    <div className="entity-card"><span className="eyebrow-studio">OPERADOR DE RED</span><strong>{or?or.n:orKey??'Por confirmar'}</strong><small>{main.name}, {main.department}</small>{or?.c&&<p className="small">{or.c}</p>}{Array.isArray(or?.inf)&&<a className="source-link" href={or.inf[0]} target="_blank" rel="noreferrer">Autogeneradores del operador <ArrowUpRight size={14}/></a>}{Array.isArray(or?.di)&&<a className="source-link" href={or.di[0]} target="_blank" rel="noreferrer">Mapa de disponibilidad de red <ArrowUpRight size={14}/></a>}</div>
    <div className="entity-card"><span className="eyebrow-studio">CORPORACIÓN AMBIENTAL</span><strong>{carKeys.map(k=>data.cars[k]??k).join(' · ')||'Por confirmar'}</strong><small>Autoridad ambiental competente en el área</small></div>
   </div>
   {data.groups.map(([g,title])=>{
    const fichas=Object.keys(data.det).filter(k=>data.fichaGroup[k]===g);
    if(!fichas.length)return null;
    return <section className="result-section" key={g}><div className="section-row"><h3>{title}</h3><span>{fichas.length}</span></div>
     {fichas.map(k=>{const f=data.det[k];const isOpen=open===k;
      return <details className="municipality-detail" key={k} open={isOpen} onToggle={e=>{if((e.target as HTMLDetailsElement).open)setOpen(k);}}>
       <summary><span>{f.t}</span></summary>
       <div className="ficha">
        {f.r&&<p>{f.r}</p>}
        {f.ap&&<p className="small muted"><b>Aplica a:</b> {f.ap}</p>}
        {f.an&&<p className="small muted"><b>Ante quién:</b> {f.an}</p>}
        {bullets('Pasos',flat(f.pa))}
        {bullets('Requisitos',f.rq)}
        {links('Documentos',f.dc)}
        {bullets('Plazos',f.pl)}
        {bullets('Costos',f.co)}
        {bullets('Riesgos',f.ri)}
        {bullets('Pendientes por validar',f.pe)}
       </div>
      </details>;})}
    </section>;})}
   <section className="result-section"><h3>Fuente</h3><small className="source-note">{data.source} · {data.retrievedAt}. Las entidades se asignan por departamento con excepciones municipales; la selección de trámites por potencia y excedentes está pendiente de afinar.</small></section>
  </>}
 </div>;
}
const flat=(pa?:string[][])=>pa?pa.map(p=>Array.isArray(p)?p.filter(Boolean).join(': '):String(p)):undefined;
function bullets(label:string,items?:string[]){if(!items||!items.length)return null;return <div className="ficha-block"><h4>{label}</h4><ul>{items.map((t,i)=><li key={i}>{t}</li>)}</ul></div>;}
function links(label:string,items?:string[][]){if(!items||!items.length)return null;return <div className="ficha-block"><h4>{label}</h4><ul>{items.map((d,i)=><li key={i}>{Array.isArray(d)&&d[1]?<a className="source-link" href={d[1]} target="_blank" rel="noreferrer">{d[0]} <ArrowUpRight size={13}/></a>:(Array.isArray(d)?d[0]:String(d))}</li>)}</ul></div>;}
