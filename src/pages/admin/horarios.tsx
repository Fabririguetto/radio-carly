import React, { useEffect, useRef, useState } from "react";
import { useRouter } from "next/router";
import Link from "next/link";

const DIAS       = ["", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"];
const DIAS_CORTO = ["", "Lun",   "Mar",    "Mié",       "Jue",    "Vie",     "Sáb",    "Dom"];
const HORA_INICIO = 0;
const HORA_FIN    = 24;
const PX_HR       = 56;          // px por hora
const TOTAL_HRS   = HORA_FIN - HORA_INICIO;
const HEADER_H    = 40;          // px del encabezado de días en desktop
const TIME_W      = 44;          // px del eje de tiempo

const COLORES = [
  { slot: "bg-blue-600/85 border-blue-400 text-white",      badge: "bg-blue-600/30 border-blue-500 text-blue-300" },
  { slot: "bg-purple-600/85 border-purple-400 text-white",  badge: "bg-purple-600/30 border-purple-500 text-purple-300" },
  { slot: "bg-emerald-600/85 border-emerald-400 text-white",badge: "bg-emerald-600/30 border-emerald-500 text-emerald-300" },
  { slot: "bg-amber-600/85 border-amber-400 text-white",    badge: "bg-amber-600/30 border-amber-500 text-amber-300" },
  { slot: "bg-pink-600/85 border-pink-400 text-white",      badge: "bg-pink-600/30 border-pink-500 text-pink-300" },
  { slot: "bg-orange-600/85 border-orange-400 text-white",  badge: "bg-orange-600/30 border-orange-500 text-orange-300" },
  { slot: "bg-teal-600/85 border-teal-400 text-white",      badge: "bg-teal-600/30 border-teal-500 text-teal-300" },
];

type Horario  = { idhorario:number; dia_semana:number; hora_inicio:string; hora_fin:string; idcliente:number; nombre:string };
type Cliente  = { idcliente:number; nombre:string; dni:string };
type Modal    = { horaInicio:string; horaFin:string } | null;

// ── helpers ─────────────────────────────────────────────────────────────────
function toMin(t:string){ const[h,m]=t.slice(0,5).split(":").map(Number); return h*60+m; }
function toTime(m:number){ const c=Math.max(0,Math.min(HORA_FIN*60,m)); return`${String(Math.floor(c/60)).padStart(2,"0")}:${String(c%60).padStart(2,"0")}`; }
function snapY(y:number){ return Math.round(y/(PX_HR/2))*(PX_HR/2); }
function yToTime(y:number){ return toTime(Math.round((y/PX_HR)*60/30)*30); }
function endTime(top:number,h:number){ return toTime(Math.round((top+h)/PX_HR*60/30)*30); }

// ── DayColumn ────────────────────────────────────────────────────────────────
type DayColProps = {
  dia:number; slots:Horario[]; colorIdx:Record<number,number>; slotActivo:number|null;
  isToday:boolean; nowY:number;
  onSelection:(dia:number,s:string,e:string)=>void;
  onSlotToggle:(id:number)=>void;
  onEliminar:(id:number)=>void;
};

function DayColumn({dia,slots,colorIdx,slotActivo,isToday,nowY,onSelection,onSlotToggle,onEliminar}:DayColProps){
  const ref  = useRef<HTMLDivElement>(null);
  const drag = useRef(false);
  const dragY= useRef(0);
  const tY   = useRef(0);
  const tT   = useRef(0);
  const [prev,setPrev]=useState<{top:number;height:number}|null>(null);

  function ry(cy:number){ const r=ref.current!.getBoundingClientRect(); return Math.max(0,Math.min(cy-r.top,TOTAL_HRS*PX_HR-1)); }

  // mouse drag
  function md(e:React.MouseEvent<HTMLDivElement>){
    if((e.target as HTMLElement).closest("[data-slot]"))return;
    e.preventDefault(); const y=ry(e.clientY);
    drag.current=true; dragY.current=y;
    setPrev({top:snapY(y),height:PX_HR});
  }
  function mm(e:React.MouseEvent<HTMLDivElement>){
    if(!drag.current)return;
    const y=ry(e.clientY);
    const top=snapY(Math.min(dragY.current,y));
    const bot=snapY(Math.max(dragY.current,y));
    setPrev({top,height:Math.max(bot-top,PX_HR/2)});
  }
  function mu(){
    if(!drag.current||!prev)return; drag.current=false;
    const s=yToTime(prev.top);
    const e2=toTime(Math.max(toMin(endTime(prev.top,prev.height)),toMin(s)+30));
    setPrev(null); onSelection(dia,s,e2);
  }
  function ml(){ if(drag.current){drag.current=false;setPrev(null);} }

  // touch tap (sin bloquear scroll)
  function ts(e:React.TouchEvent){ if((e.target as HTMLElement).closest("[data-slot]"))return; tY.current=e.touches[0].clientY; tT.current=Date.now(); }
  function te(e:React.TouchEvent){
    if((e.target as HTMLElement).closest("[data-slot]"))return;
    if(Math.abs(e.changedTouches[0].clientY-tY.current)<14&&Date.now()-tT.current<400){
      const y=ry(tY.current); const s=yToTime(y);
      const en=toTime(Math.min(toMin(s)+60,HORA_FIN*60));
      onSelection(dia,s,en);
    }
  }

  return(
    <div ref={ref} className="relative select-none" style={{height:TOTAL_HRS*PX_HR,cursor:"crosshair"}}
      onMouseDown={md} onMouseMove={mm} onMouseUp={mu} onMouseLeave={ml}
      onTouchStart={ts} onTouchEnd={te}
    >
      {/* Fondo alternado */}
      {Array.from({length:TOTAL_HRS}).map((_,i)=>i%2===1?(
        <div key={i} className="absolute w-full bg-white/[0.018]" style={{top:i*PX_HR,height:PX_HR}}/>
      ):null)}

      {/* Líneas */}
      {Array.from({length:TOTAL_HRS+1}).map((_,i)=>(
        <div key={i} className="absolute w-full border-t border-gray-800" style={{top:i*PX_HR}}/>
      ))}
      {Array.from({length:TOTAL_HRS}).map((_,i)=>(
        <div key={`m${i}`} className="absolute w-full border-t border-gray-800/20 border-dashed" style={{top:i*PX_HR+PX_HR/2}}/>
      ))}

      {/* Hora actual */}
      {isToday&&nowY>=0&&nowY<=TOTAL_HRS*PX_HR&&(
        <div className="absolute w-full flex items-center pointer-events-none z-30" style={{top:nowY-1}}>
          <div className="w-2 h-2 rounded-full bg-red-500 flex-shrink-0 -ml-1"/>
          <div className="flex-1 h-0.5 bg-red-500"/>
        </div>
      )}

      {/* Preview drag */}
      {prev&&(
        <div className="absolute left-0.5 right-0.5 bg-blue-500/20 border-2 border-blue-400 border-dashed rounded-md pointer-events-none z-10"
          style={{top:prev.top,height:prev.height}}>
          <p className="text-[10px] text-blue-300 font-semibold px-1 pt-0.5">{yToTime(prev.top)} – {endTime(prev.top,prev.height)}</p>
        </div>
      )}

      {/* Slots */}
      {slots.map(slot=>{
        const top=(toMin(slot.hora_inicio)-HORA_INICIO*60)/60*PX_HR;
        const height=(toMin(slot.hora_fin)-toMin(slot.hora_inicio))/60*PX_HR;
        const ci=colorIdx[slot.idcliente]??0;
        const active=slotActivo===slot.idhorario;
        return(
          <div key={slot.idhorario} data-slot="1"
            onClick={e=>{e.stopPropagation();onSlotToggle(slot.idhorario);}}
            className={`absolute left-0.5 right-0.5 rounded-md border px-1.5 py-0.5 cursor-pointer overflow-hidden transition-all ${COLORES[ci].slot} ${active?"ring-2 ring-white/70":""}`}
            style={{top:top+1,height:height-2,zIndex:active?20:5}}>
            {!active?(
              <>
                <p className="text-[11px] font-bold truncate leading-tight">{slot.nombre}</p>
                {height>30&&<p className="text-[10px] opacity-75">{slot.hora_inicio.slice(0,5)}–{slot.hora_fin.slice(0,5)}</p>}
              </>
            ):(
              <div className="absolute inset-0 flex items-center justify-center gap-2 bg-black/65 rounded-md">
                <Link href={`/admin/clientes/${slot.idcliente}`} onClick={e=>e.stopPropagation()}
                  className="text-[11px] bg-white/20 hover:bg-white/30 text-white px-2.5 py-1 rounded-md font-medium">
                  Ver cliente
                </Link>
                <button onClick={e=>{e.stopPropagation();onEliminar(slot.idhorario);}}
                  className="text-[11px] bg-red-600/80 hover:bg-red-600 text-white px-2.5 py-1 rounded-md font-medium">
                  Borrar
                </button>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ── TimeAxis ─────────────────────────────────────────────────────────────────
function TimeAxis({everyN=1}:{everyN?:number}){
  return(
    <div className="relative flex-shrink-0 overflow-hidden" style={{width:TIME_W,height:TOTAL_HRS*PX_HR}}>
      {Array.from({length:TOTAL_HRS}).map((_,i)=>{        // hasta 23:00, sin 24:00
        if(i%everyN!==0)return null;
        return(
          <span key={i} className="absolute right-1.5 text-[10px] text-gray-500 leading-none select-none"
            style={{top:i*PX_HR}}>                        {/* alineado exacto con la línea del grid */}
            {String(i).padStart(2,"0")}:00
          </span>
        );
      })}
    </div>
  );
}

// ── Página ────────────────────────────────────────────────────────────────────
export default function AdminHorarios(){
  const router=useRouter();
  const [horarios,setHorarios]=useState<Horario[]>([]);
  const [clientes,setClientes]=useState<Cliente[]>([]);
  const [cargando,setCargando]=useState(true);
  const [modal,setModal]=useState<Modal>(null);
  const [clienteId,setClienteId]=useState("");
  const [mInicio,setMInicio]=useState("");
  const [mFin,setMFin]=useState("");
  const [modalDias,setModalDias]=useState<number[]>([]);
  const [busquedaCliente,setBusquedaCliente]=useState("");
  const [dropdownAbierto,setDropdownAbierto]=useState(false);
  const [modalError,setModalError]=useState("");
  const [guardando,setGuardando]=useState(false);
  const [slotActivo,setSlotActivo]=useState<number|null>(null);
  const [diaActivo,setDiaActivo]=useState(1);
  const [hoy,setHoy]=useState(1);
  const [nowY,setNowY]=useState(0);
  const scrollRef=useRef<HTMLDivElement>(null);

  useEffect(()=>{
    if(sessionStorage.getItem("admin")!=="1"){router.replace("/");return;}
    const d=new Date().getDay(); const ds=d===0?7:d;
    setHoy(ds); setDiaActivo(ds);
    function upd(){ const n=new Date(); setNowY((n.getHours()*60+n.getMinutes())/60*PX_HR); }
    upd(); const t=setInterval(upd,60_000);
    cargar();
    return()=>clearInterval(t);
  },[]);

  // Scroll al horario actual al cargar (HEADER_H=40 está dentro del scroll en desktop)
  useEffect(()=>{
    if(!cargando&&scrollRef.current){
      const y=Math.max(0,nowY-80);
      scrollRef.current.scrollTop=y;
    }
  },[cargando]);

  async function cargar(){
    const[rh,rc]=await Promise.all([fetch("/api/admin/horarios"),fetch("/api/admin/clientes")]);
    setHorarios(await rh.json()); setClientes(await rc.json()); setCargando(false);
  }

  const clienteIds=[...new Set(horarios.map(h=>h.idcliente))];
  const colorIdx:Record<number,number>={};
  clienteIds.forEach((id,i)=>{colorIdx[id]=i%COLORES.length;});
  const porDia:Record<number,Horario[]>={};
  for(let d=1;d<=7;d++)porDia[d]=[];
  horarios.forEach(h=>porDia[h.dia_semana]?.push(h));

  function abrirModal(dia?:number,s?:string,e?:string){
    const preId=router.query.cliente?String(router.query.cliente):"";
    const preNombre=clientes.find(c=>String(c.idcliente)===preId)?.nombre??"";
    const eFin=e==="24:00"?"23:59":(e??"");
    setModal({horaInicio:s??"",horaFin:eFin});
    setMInicio(s??""); setMFin(eFin);
    setClienteId(preId);
    setBusquedaCliente(preNombre);
    setDropdownAbierto(false);
    setModalDias(dia!=null?[dia]:[]);
    setModalError(""); setSlotActivo(null);
  }
  function handleSel(dia:number,s:string,e:string){ abrirModal(dia,s,e); }

  function toggleModalDia(d:number){
    setModalDias(prev=>prev.includes(d)?prev.filter(x=>x!==d):[...prev,d].sort((a,b)=>a-b));
  }

  async function guardar(){
    if(!clienteId||!modal||modalDias.length===0){setModalError("Elegí al menos un día.");return;}
    setGuardando(true); setModalError("");
    try{
      await Promise.all(modalDias.map(dia=>
        fetch(`/api/admin/clientes/${clienteId}/horarios`,{
          method:"POST",headers:{"Content-Type":"application/json"},
          body:JSON.stringify({dia_semana:dia,hora_inicio:mInicio,hora_fin:mFin}),
        })
      ));
      setModal(null); cargar();
    }catch{setModalError("Error al guardar.");}
    setGuardando(false);
  }
  async function eliminar(id:number){
    await fetch(`/api/admin/horarios/${id}`,{method:"DELETE"});
    setSlotActivo(null); cargar();
  }
  function cp(dia:number):DayColProps{
    return{dia,slots:porDia[dia]??[],colorIdx,slotActivo,isToday:dia===hoy,nowY,
      onSelection:handleSel,
      onSlotToggle:id=>setSlotActivo(p=>p===id?null:id),
      onEliminar:eliminar};
  }

  return(
    <div className="h-[100dvh] bg-gray-950 flex flex-col overflow-hidden">

      {/* Header fijo */}
      <div className="flex-shrink-0 px-4 py-3 flex items-center justify-between border-b border-gray-800 bg-gray-950 z-40">
        <div className="flex items-center gap-2">
          <Link href="/admin/clientes" className="text-gray-400 text-sm py-1 pr-1">←</Link>
          <h1 className="text-white font-bold text-lg">Calendario</h1>
        </div>
        <div className="flex items-center gap-1">
          <button onClick={()=>abrirModal()}
            className="text-white bg-blue-600 hover:bg-blue-500 active:bg-blue-700 px-3 py-1.5 rounded-lg font-semibold text-sm mr-1">
            + Agregar
          </button>
          <Link href="/admin/config" title="Configuración"
            className="text-gray-400 hover:text-white p-1.5 rounded-lg hover:bg-gray-800 transition-colors">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.325.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 0 1 1.37.49l1.296 2.247a1.125 1.125 0 0 1-.26 1.431l-1.003.827c-.293.241-.438.613-.43.992a7.723 7.723 0 0 1 0 .255c-.008.378.137.75.43.991l1.004.827c.424.35.534.955.26 1.43l-1.298 2.247a1.125 1.125 0 0 1-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.47 6.47 0 0 1-.22.128c-.331.183-.581.495-.644.869l-.213 1.281c-.09.543-.56.94-1.11.94h-2.594c-.55 0-1.019-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 0 1-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 0 1-1.369-.49l-1.297-2.247a1.125 1.125 0 0 1 .26-1.431l1.004-.827c.292-.24.437-.613.43-.991a6.932 6.932 0 0 1 0-.255c.007-.38-.138-.751-.43-.992l-1.004-.827a1.125 1.125 0 0 1-.26-1.43l1.297-2.247a1.125 1.125 0 0 1 1.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.086.22-.128.332-.183.582-.495.644-.869l.214-1.28Z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
            </svg>
          </Link>
          <Link href="/admin/ayuda" title="Ayuda"
            className="text-gray-400 hover:text-white p-1.5 rounded-lg hover:bg-gray-800 transition-colors">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9.879 7.519c1.171-1.025 3.071-1.025 4.242 0 1.172 1.025 1.172 2.687 0 3.712-.203.179-.43.326-.67.442-.745.361-1.45.999-1.45 1.827v.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 5.25h.008v.008H12v-.008Z" />
            </svg>
          </Link>
          <button onClick={()=>{sessionStorage.removeItem("admin");router.push("/");}} title="Salir"
            className="text-red-400 hover:text-red-300 p-1.5 rounded-lg hover:bg-gray-800 transition-colors">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 9V5.25A2.25 2.25 0 0 1 10.5 3h6a2.25 2.25 0 0 1 2.25 2.25v13.5A2.25 2.25 0 0 1 16.5 21h-6a2.25 2.25 0 0 1-2.25-2.25V15M12 9l3 3m0 0-3 3m3-3H2.25" />
            </svg>
          </button>
        </div>
      </div>


      {cargando?(
        <div className="flex-1 flex items-center justify-center">
          <p className="text-gray-500 text-sm">Cargando...</p>
        </div>
      ):(
        /* Contenedor principal — flex-1 + min-h-0 para que los hijos puedan acotar su altura */
        <div className="flex-1 min-h-0 flex flex-col">

          {/* Leyenda */}

          {/* ── MOBILE ── */}
          <div className="flex flex-col sm:hidden flex-1 min-h-0">
            {/* Navegador de día */}
            <div className="flex-shrink-0 flex items-center justify-between px-2 py-1.5 border-b border-gray-800">
              <button onClick={()=>setDiaActivo(d=>d===1?7:d-1)} className="text-gray-400 text-3xl w-12 h-10 flex items-center justify-center">‹</button>
              <span className={`font-semibold text-base ${diaActivo===hoy?"text-blue-400":"text-white"}`}>
                {DIAS[diaActivo]}
                {diaActivo===hoy&&<span className="ml-2 text-xs bg-blue-600 text-white px-2 py-0.5 rounded-full">Hoy</span>}
              </span>
              <button onClick={()=>setDiaActivo(d=>d===7?1:d+1)} className="text-gray-400 text-3xl w-12 h-10 flex items-center justify-center">›</button>
            </div>
            {/* Scroll libre */}
            <div ref={scrollRef} className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden">
              <div className="flex">
                <TimeAxis everyN={2}/>
                <div className="flex-1 border-l border-gray-800 min-w-0">
                  <DayColumn {...cp(diaActivo)}/>
                </div>
              </div>
            </div>
          </div>

{/* ── DESKTOP ── */}
          <div className="hidden sm:flex flex-col flex-1 min-h-0">
            {/* Un único contenedor de scroll — header sticky adentro, así ambos comparten el mismo ancho y el scrollbar no desalinea */}
            <div ref={scrollRef} className="flex-1 min-h-0 overflow-y-auto overflow-x-auto">
              <div className="flex flex-col" style={{minWidth:560}}>

                {/* Encabezado sticky — se pega al tope del viewport de scroll */}
                <div className="sticky top-0 z-40 flex flex-shrink-0 border-b border-gray-800 bg-gray-950"
                  style={{paddingLeft:TIME_W}}>
                  {DIAS.slice(1).map((_,i)=>{
                    const n=i+1; const esHoy=n===hoy;
                    return(
                      <div key={n}
                        className={`flex-1 flex flex-col items-center justify-center border-l border-gray-800 text-xs font-semibold ${esHoy?"text-blue-400 bg-blue-950/20":"text-gray-400"}`}
                        style={{height:HEADER_H}}>
                        <span className="hidden lg:inline">{DIAS[n]}</span>
                        <span className="lg:hidden">{DIAS_CORTO[n]}</span>
                        {esHoy&&<span className="w-1.5 h-1.5 bg-blue-400 rounded-full mt-0.5"/>}
                      </div>
                    );
                  })}
                </div>

                {/* Grilla: eje de tiempo + columnas */}
                <div className="flex">
                  <TimeAxis/>
                  <div className="flex flex-1">
                    {DIAS.slice(1).map((_,i)=>{
                      const n=i+1; const esHoy=n===hoy;
                      return(
                        <div key={n} className={`flex-1 border-l border-gray-800 min-w-0 ${esHoy?"bg-blue-950/10":""}`}>
                          <DayColumn {...cp(n)}/>
                        </div>
                      );
                    })}
                  </div>
                </div>

              </div>
            </div>
          </div>

          
          {/* Hint */}
          <div className="flex-shrink-0 px-4 py-1.5 border-t border-gray-800 text-center">
            <p className="text-gray-700 text-xs">
              <span className="hidden sm:inline">Arrastrá para crear · </span>
              <span className="sm:hidden">Tocá para crear · </span>
              Tocá un turno para ver opciones
            </p>
          </div>

        </div>
      )}

      {/* Modal */}
      {modal&&(
        <div className="fixed inset-0 bg-black/70 z-50 flex items-end sm:items-center justify-center px-4 pb-6 sm:pb-0"
          onClick={()=>{setModal(null);setDropdownAbierto(false);}}>
          <div className="bg-gray-900 rounded-2xl p-5 w-full max-w-sm space-y-4" onClick={e=>e.stopPropagation()}>
            <h2 className="text-white font-bold text-lg">Nuevo horario</h2>

            {/* Cliente */}
            <div className="space-y-2">
              <label className="text-gray-400 text-xs uppercase tracking-wide">Cliente</label>
              <div className="relative">
                <input
                  type="text"
                  value={busquedaCliente}
                  onChange={e=>{setBusquedaCliente(e.target.value);setClienteId("");setDropdownAbierto(true);}}
                  onFocus={()=>setDropdownAbierto(true)}
                  onBlur={()=>setTimeout(()=>setDropdownAbierto(false),150)}
                  placeholder="Escribí nombre o DNI..."
                  className="w-full bg-gray-800 text-white border border-gray-700 rounded-xl px-3 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                />
                {dropdownAbierto&&(
                  <div className="absolute left-0 right-0 top-full mt-1 bg-gray-800 border border-gray-700 rounded-xl overflow-hidden z-10 max-h-44 overflow-y-auto">
                    {clientes
                      .filter(c=>!busquedaCliente||c.nombre.toLowerCase().includes(busquedaCliente.toLowerCase())||c.dni.includes(busquedaCliente))
                      .map(c=>{
                        const ci=colorIdx[c.idcliente]??0;
                        const activo=clienteId===String(c.idcliente);
                        return(
                          <button key={c.idcliente}
                            onPointerDown={e=>{e.preventDefault();setClienteId(String(c.idcliente));setBusquedaCliente(c.nombre);setDropdownAbierto(false);}}
                            className={`w-full text-left px-3 py-2.5 text-sm flex items-center gap-2 transition-colors ${activo?"bg-gray-700":"hover:bg-gray-700/60"}`}
                          >
                            <span className={`w-2 h-2 rounded-full flex-shrink-0 ${COLORES[ci].slot.split(" ")[0].replace("/85","")}`}/>
                            <span className="text-white">{c.nombre}</span>
                            <span className="text-gray-500 text-xs ml-auto">{c.dni}</span>
                          </button>
                        );
                      })
                    }
                  </div>
                )}
              </div>
            </div>

            {/* Días */}
            <div className="space-y-2">
              <label className="text-gray-400 text-xs uppercase tracking-wide">Días</label>
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={()=>setModalDias(modalDias.length===7?[]:[1,2,3,4,5,6,7])}
                  className={`text-xs font-medium px-3 py-1.5 rounded-full border transition-colors ${
                    modalDias.length===7
                      ? "bg-white/10 border-white/30 text-white"
                      : "border-gray-700 text-gray-400 hover:text-white"
                  }`}
                >
                  Todos
                </button>
                {DIAS_CORTO.slice(1).map((nombre,i)=>{
                  const d=i+1; const activo=modalDias.includes(d);
                  return(
                    <button key={d} onClick={()=>toggleModalDia(d)}
                      className={`text-xs font-medium px-3 py-1.5 rounded-full border transition-colors ${
                        activo
                          ? "bg-white/10 border-white/30 text-white"
                          : "border-gray-700 text-gray-400 hover:text-white"
                      }`}
                    >
                      {nombre}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Horario */}
            <div className="flex gap-3">
              <div className="flex-1 space-y-1.5">
                <label className="text-gray-400 text-xs uppercase tracking-wide">Desde</label>
                <input type="time" value={mInicio} onChange={e=>setMInicio(e.target.value)}
                  className="w-full bg-gray-800 text-white border border-gray-700 rounded-xl px-3 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500"/>
              </div>
              <div className="flex-1 space-y-1.5">
                <label className="text-gray-400 text-xs uppercase tracking-wide">Hasta</label>
                <input type="time" value={mFin} onChange={e=>setMFin(e.target.value)}
                  className="w-full bg-gray-800 text-white border border-gray-700 rounded-xl px-3 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500"/>
              </div>
            </div>

            {modalError&&<p className="text-red-400 text-sm">{modalError}</p>}
            <div className="flex gap-3">
              <button onClick={()=>{setModal(null);setDropdownAbierto(false);}}
                className="flex-1 bg-gray-800 hover:bg-gray-700 text-white font-semibold py-3.5 rounded-xl">
                Cancelar
              </button>
              <button onClick={guardar} disabled={guardando}
                className="flex-1 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-semibold py-3.5 rounded-xl">
                {guardando?"Guardando...":"Agregar"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
