/* E-fleet Web 4.3.87 · Geo Local visitas físicas, gestión Admin y cierre provisional */
(function(){
'use strict';
let api=null;
const embedded=window.self!==window.top;
const pageSection={local:'geoLocal',admin:'geoLocalAdmin',map:'mapaGeoLocal',kpi:'kpiGeoLocales',schedule:'mallaTurnos'};
let bootStarted=false;
function sectionActual(){return pageSection[document.body?.dataset?.geoPage]||String(window.__SGF_MODULO_SEGURO__?.seccion||'geoLocal')}
function postParent(message){if(!embedded)return;try{window.parent.postMessage(message,location.origin==='null'?'*':location.origin)}catch(_){}}
function sleep(ms){return new Promise(r=>setTimeout(r,ms))}
async function waitApi(timeout=12000){const until=Date.now()+timeout;while(Date.now()<until){if(window.ConexionFlotas){api=window.ConexionFlotas;return api}await sleep(40)}throw new Error('CONEXION_SGF_NO_INICIALIZADA')}
const $=(s,r=document)=>r.querySelector(s), $$=(s,r=document)=>[...r.querySelectorAll(s)];
const state={session:null,data:null,map:null,timer:null};
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function fmt(v){if(!v)return'—';try{return new Intl.DateTimeFormat('es-CL',{dateStyle:'short',timeStyle:'short'}).format(new Date(v));}catch{return String(v)}}
function time(v){if(!v)return'—';try{return new Intl.DateTimeFormat('es-CL',{hour:'2-digit',minute:'2-digit'}).format(new Date(v));}catch{return String(v)}}
function dateOnly(v){if(!v)return'—';try{return new Intl.DateTimeFormat('es-CL',{day:'2-digit',month:'2-digit',year:'numeric'}).format(new Date(v));}catch{return String(v)}}
function today(){return new Intl.DateTimeFormat('en-CA',{timeZone:'America/Santiago',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date())}
function plusDays(date,days){const d=new Date(`${date}T12:00:00Z`);d.setUTCDate(d.getUTCDate()+days);return d.toISOString().slice(0,10)}
function toast(t){let e=$('#geoToast');if(!e){e=document.createElement('div');e.id='geoToast';e.className='geo-toast';document.body.appendChild(e)}e.textContent=t;e.classList.add('show');clearTimeout(e._t);e._t=setTimeout(()=>e.classList.remove('show'),3500)}
function error(e){const m=String(e?.message||e||'Error');toast(m.replaceAll('_',' '));console.error(e)}
async function request(a,data={}){const client=api||await waitApi();return await client.request(a,{data,cache:false,force:true})}
async function session(){if(state.session)return state.session;const client=api||await waitApi();const localAuth=client.getAuth?.()||{};if(localAuth.user){state.session=localAuth.user;return state.session}const r=await request('me');state.session=r.user||r.usuario||{};return state.session}
function role(){return String(state.session?.ROL_ID_CANONICO||state.session?.ROL_ID||'').toUpperCase()}
function isAdmin(){return['ROL-ADMIN','ROL-GERENCIA','ROL-SYSADMIN'].includes(role())}
function loc(){return new Promise((res,rej)=>{if(!navigator.geolocation)return rej(new Error('GPS_NO_DISPONIBLE'));navigator.geolocation.getCurrentPosition(p=>res({LATITUD:p.coords.latitude,LONGITUD:p.coords.longitude,PRECISION_METROS:p.coords.accuracy}),rej,{enableHighAccuracy:true,timeout:15000,maximumAge:5000})})}
function openWaze(lat,lng){window.open(`https://www.waze.com/ul?ll=${encodeURIComponent(lat)},${encodeURIComponent(lng)}&navigate=yes`,'_blank','noopener')}
function openGoogleMaps(lat,lng){window.open(`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(lat+','+lng)}&travelmode=driving`,'_blank','noopener')}
async function registrarNavegacion(detalle,proveedor){let g={};try{g=await loc()}catch(_){}return await request('geoLocalRegistrarNavegacion',{DETALLE_ID:detalle,PROVEEDOR:proveedor,...g})}
async function navegarDetalle(item,proveedor){if(!item)return;const lat=Number(item.LOCAL_LATITUD??item.LATITUD),lng=Number(item.LOCAL_LONGITUD??item.LONGITUD);if(!Number.isFinite(lat)||!Number.isFinite(lng))return toast('El Local visitado no tiene coordenadas válidas.');if(!isAdmin()&&!state.data?.LISTO_PARA_VISITAS&&item.CHECKIN_EXENTO!=='SI')return toast('Debe completar el Check-in. Si informa una falla, la visita queda bloqueada hasta aprobación; las reasignaciones de emergencia quedan exentas de un nuevo Check-in.');try{await registrarNavegacion(item.ID,proveedor);if(proveedor==='WAZE')openWaze(lat,lng);else openGoogleMaps(lat,lng)}catch(e){error(e)}}
function abrirModuloCheckin(){if(embedded)postParent({tipo:'flotas:navegar',seccion:'checkin'});else location.assign('checkin-vehicular.html')}
const geoAddressCache=new Map();
function geoSessionToken(){try{return crypto.randomUUID()}catch(_){return `${Date.now()}-${Math.random()}`}}
const GEO_MEM_DIR_KEY='efleet_address_memory_v1';
function geoEmpresaIdMemoria(){const c=[];try{const e=window.ConexionFlotas?.getEmpresaConexion?.()||{};c.push(e.empresa_id,e.empresaId,e.EMPRESA_ID)}catch(_){}c.push(state.session?.EMPRESA_ID,state.session?.empresa_id);return String(c.find(v=>String(v||'').trim())||'SIN_EMPRESA').trim()}
function geoNormDir(v){return String(v||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/\b(avda|av\.|avda\.|avenida)\b/g,'avenida').replace(/\b(nro|n°|num|numero|#)\b/g,' ').replace(/[.,;:()[\]{}"'`´]/g,' ').replace(/\s+/g,' ').trim()}
function geoDirTokens(v){return[...new Set(geoNormDir(v).split(' ').filter(x=>x.length>1))]}
function geoNumDir(v){const m=geoNormDir(v).match(/\b(\d{1,6}[a-z]?)\b/i);return m?m[1].toLowerCase():''}
function geoMemAll(){try{const x=JSON.parse(localStorage.getItem(GEO_MEM_DIR_KEY)||'{}');return x&&typeof x==='object'&&!Array.isArray(x)?x:{}}catch(_){return{}}}
function geoMemSave(x){try{localStorage.setItem(GEO_MEM_DIR_KEY,JSON.stringify(x));return true}catch(_){return false}}
function geoScoreDir(q,e){const a=geoNormDir(q),b=geoNormDir(e?.direccion||'');if(!a||!b)return 0;if(a===b)return 1;if((e.aliases||[]).some(x=>geoNormDir(x)===a))return .995;const at=geoDirTokens(a),bt=geoDirTokens(b),inter=at.filter(x=>bt.includes(x)).length,union=new Set([...at,...bt]).size||1;let s=inter/union,an=geoNumDir(a),bn=geoNumDir(b);if(an&&bn)s+=an===bn?.22:-.28;if(b.includes(a)||a.includes(b))s+=.12;return Math.max(0,Math.min(1,s))}
function geoBuscarMemoria(query,lim=6){const rows=geoMemAll()[geoEmpresaIdMemoria()]||[];return rows.map(e=>({e,s:geoScoreDir(query,e)})).filter(x=>x.s>=.56).sort((a,b)=>b.s-a.s).slice(0,lim).map(x=>({ID:x.e.id||'MEM',PLACE_ID:'',DIRECCION:x.e.direccion,PRINCIPAL:x.e.direccion,SECUNDARIA:`Memoria E-fleet · ${Math.round(x.s*100)}%`,LATITUD:Number(x.e.lat),LONGITUD:Number(x.e.lon),RESUELTO:'SI',PROVEEDOR:'E_FLEET_MEMORIA',_MEMORIA:'SI',_CONFIDENCE:x.s})).filter(x=>Number.isFinite(x.LATITUD)&&Number.isFinite(x.LONGITUD))}
function geoAprenderDireccion(original,r){const direccion=String(r?.DIRECCION||original||'').trim(),lat=Number(r?.LATITUD),lng=Number(r?.LONGITUD);if(direccion.length<3||!Number.isFinite(lat)||!Number.isFinite(lng)||(Math.abs(lat)<.000001&&Math.abs(lng)<.000001))return;const all=geoMemAll(),empresa=geoEmpresaIdMemoria(),rows=Array.isArray(all[empresa])?all[empresa]:[],normal=geoNormDir(direccion),alias=String(original||'').trim();let e=rows.find(x=>geoNormDir(x.direccion)===normal||(Math.abs(Number(x.lat)-lat)<.00002&&Math.abs(Number(x.lon)-lng)<.00002)),now=new Date().toISOString();if(e){e.direccion=direccion;e.lat=lat;e.lon=lng;e.aliases=[...new Set([...(e.aliases||[]),alias,direccion].filter(Boolean))].slice(-18);e.usos=Number(e.usos||0)+1;e.ultima_utilizacion=now}else rows.unshift({id:`DIR-${Date.now()}-${Math.random().toString(36).slice(2,8)}`,empresa_id:empresa,direccion,normalizada:normal,aliases:[...new Set([alias,direccion].filter(Boolean))],lat,lon:lng,proveedor:String(r?.PROVEEDOR||'GEO_WEB'),confianza:.95,usos:1,creado_en:now,ultima_utilizacion:now,origen:'GEO_WEB'});all[empresa]=rows.slice(0,600);geoMemSave(all)}

async function geoBuscarMemoriaCentral(query,lim=8){try{const r=await request('buscarDireccionesMemoriaCentral',{QUERY:String(query||''),LIMITE:lim}),rows=r.SUGERENCIAS||r.rows||[];return rows.map(x=>({ID:x.DIRECCION_ID||x.ID||'',PLACE_ID:'',DIRECCION:x.DIRECCION,PRINCIPAL:x.PRINCIPAL||x.DIRECCION,SECUNDARIA:x.SECUNDARIA||'BD E-fleet central',LATITUD:Number(x.LATITUD),LONGITUD:Number(x.LONGITUD),RESUELTO:'SI',PROVEEDOR:'BD_EFLEET_CENTRAL',_CENTRAL:'SI',_CONFIDENCE:Number(x.PUNTAJE||x.CONFIANZA||0)})).filter(x=>x.DIRECCION&&Number.isFinite(x.LATITUD)&&Number.isFinite(x.LONGITUD))}catch(e){console.debug('[geo][memoria-central]',e);return[]}}
async function geoGuardarMemoriaCentral(original,r,origen='GEO_WEB'){try{const lat=Number(r?.LATITUD),lng=Number(r?.LONGITUD);if(!Number.isFinite(lat)||!Number.isFinite(lng))return;await request('guardarDireccionMemoriaCentral',{DIRECCION:r.DIRECCION||original,ALIAS:original,LATITUD:lat,LONGITUD:lng,PROVEEDOR:r.PROVEEDOR||origen,CONFIANZA:Number(r._CONFIDENCE||.95),ORIGEN:origen})}catch(e){console.debug('[geo][guardar-memoria-central]',e)}}

async function buscarDireccionesGeo(query,token,position){const local=geoBuscarMemoria(query,6);if(local.length&&Number(local[0]._CONFIDENCE||0)>=.96)return{rows:local,token};const central=await geoBuscarMemoriaCentral(query,8),memoria=[...local,...central].filter((x,i,a)=>a.findIndex(y=>geoNormDir(y.DIRECCION)===geoNormDir(x.DIRECCION))===i).sort((a,b)=>Number(b._CONFIDENCE||0)-Number(a._CONFIDENCE||0));if(memoria.length&&Number(memoria[0]._CONFIDENCE||0)>=.90){memoria.slice(0,6).forEach(x=>geoAprenderDireccion(query,x));return{rows:memoria.slice(0,8),token}}const key=normalizarFiltro(query);if(geoAddressCache.has(key)){const c=geoAddressCache.get(key),mix=[...memoria,...c.rows].filter((x,i,a)=>a.findIndex(y=>geoNormDir(y.DIRECCION)===geoNormDir(x.DIRECCION))===i);return{...c,rows:mix.slice(0,10)}}const data={QUERY:query,SESSION_TOKEN:token};if(position&&Number.isFinite(position.LATITUD)&&Number.isFinite(position.LONGITUD)){data.LATITUD=position.LATITUD;data.LONGITUD=position.LONGITUD}const r=await request('buscarDireccionesRapido',data),externas=r.SUGERENCIAS||[],mix=[...memoria,...externas].filter((x,i,a)=>a.findIndex(y=>geoNormDir(y.DIRECCION)===geoNormDir(x.DIRECCION))===i),out={rows:mix.slice(0,10),token:r.SESSION_TOKEN||token};geoAddressCache.set(key,{rows:externas,token:out.token});if(geoAddressCache.size>80)geoAddressCache.delete(geoAddressCache.keys().next().value);return out}
async function resolverDireccionGeo(item,token){if(String(item.RESUELTO||'').toUpperCase()==='SI')return item;return await request('resolverDireccionRapida',{PLACE_ID:item.PLACE_ID||item.ID,PROVEEDOR:item.PROVEEDOR,SESSION_TOKEN:token,DIRECCION:item.DIRECCION})}
async function geocodificarDireccionGeoExacta(texto){return await request('geocodificarDireccionExacta',{DIRECCION:String(texto||'').trim()})}
function bindGeoAddressAutocomplete(input,latInput,lngInput,onSelected){if(!input||input.dataset.geoAddressBound==='1')return;input.dataset.geoAddressBound='1';input.autocomplete='off';const box=document.createElement('div');box.className='geo-address-suggestions';box.hidden=true;input.insertAdjacentElement('afterend',box);let timer,seq=0,token=geoSessionToken(),items=[];const close=()=>{box.hidden=true;box.innerHTML=''};const apply=r=>{const original=input.value||r.DIRECCION||'';input.value=r.DIRECCION||input.value||'';latInput.value=String(r.LATITUD??'');lngInput.value=String(r.LONGITUD??'');input.dataset.placeId=r.PLACE_ID||r.ID||'';input.dataset.proveedorDireccion=r.PROVEEDOR||'NOMINATIM_OPENSTREETMAP';geoAprenderDireccion(original,r);void geoGuardarMemoriaCentral(original,r,r._CENTRAL==='SI'?'BD_EFLEET_CENTRAL':'GEO_WEB');onSelected?.(r)};const choose=async item=>{try{box.innerHTML='<p>Confirmando dirección…</p>';box.hidden=false;const r=await resolverDireccionGeo(item,token);apply({...item,...r});close();token=geoSessionToken()}catch(e){error(e)}};const exacta=async()=>{const q=input.value.trim();if(q.length<3)return false;try{box.hidden=false;box.innerHTML='<p>Nominatim · obteniendo coordenadas…</p>';const r=await geocodificarDireccionGeoExacta(q);apply(r);close();token=geoSessionToken();return true}catch(e){return false}};input.addEventListener('input',()=>{latInput.value='';lngInput.value='';clearTimeout(timer);const q=input.value.trim(),own=++seq;if(q.length<3)return close();timer=setTimeout(async()=>{box.hidden=false;box.innerHTML='<p>Nominatim · buscando direcciones…</p>';try{let pos=null;try{pos=await Promise.race([loc(),new Promise(r=>setTimeout(()=>r(null),350))])}catch(_){}const r=await buscarDireccionesGeo(q,token,pos);token=r.token;items=r.rows;if(own!==seq)return;box.innerHTML=items.length?items.map((x,i)=>`<button type="button" data-geo-address="${i}"><b>${esc(x.PRINCIPAL||x.DIRECCION||'Dirección')}</b><small>${esc(x.SECUNDARIA||x.DIRECCION||'')} · ${esc(x.PROVEEDOR||'Nominatim/OpenStreetMap')}</small></button>`).join(''):'<p>No encontramos coincidencias. Presione Enter para intentar coordenadas exactas.</p>';$$('[data-geo-address]',box).forEach(b=>b.onmousedown=e=>{e.preventDefault();choose(items[Number(b.dataset.geoAddress)])})}catch(e){if(own===seq)box.innerHTML='<p>No fue posible consultar direcciones. Presione Enter para reintentar con Nominatim.</p>'}},220)});input.addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();void exacta()}});input.addEventListener('blur',()=>setTimeout(async()=>{if(input.value.trim().length>=3&&(!Number.isFinite(Number(latInput.value))||!Number.isFinite(Number(lngInput.value))))await exacta();close()},260))}
function setLoading(on){document.body.style.cursor=on?'progress':'';$$('button').forEach(b=>b.disabled=on)}
function fileData(file){return new Promise((res,rej)=>{const r=new FileReader();r.onload=()=>res(r.result);r.onerror=rej;r.readAsDataURL(file)})}
function ring(label,value,tone='#000000',sub=''){const p=Math.max(0,Math.min(100,Number(value)||0));return `<div class="geo-card geo-kpi"><div class="geo-ring" style="--p:${p};--tone:${tone}"><strong>${p.toFixed(0)}%</strong></div><div><small>${esc(label)}</small><b>${esc(sub||p.toFixed(1)+'%')}</b></div></div>`}
function metric(label,value,detail=''){return `<div class="geo-card geo-metric"><small>${esc(label)}</small><strong>${esc(value)}</strong><span>${esc(detail)}</span></div>`}
function header(title,desc,actions=''){return `<div class="geo-hero"><div class="geo-hero-brand"><img class="geo-efleet-mark" src="efleet-mark-compact.png" alt="E-fleet"><div><div class="geo-eyebrow">E-fleet · Geo Planificación de Locales</div><h1>${esc(title)}</h1><p>${esc(desc)}</p></div></div><div class="geo-actions">${actions}</div></div>`}
function empresaBar(r){const e=r?.EMPRESA||{};if(!e.ID&&!e.NOMBRE&&!e.RUT)return'';return `<div class="geo-card geo-company"><b>${esc(e.NOMBRE||'Empresa SGF')}</b><span>RUT: ${esc(e.RUT||'—')}</span><small>ID empresa: ${esc(e.ID||'—')}</small></div>`}
function empty(t){return `<div class="geo-empty">${esc(t)}</div>`}
function badge(v){const x=String(v||'PENDIENTE').toUpperCase(),c=x==='VISITADO'?'ok':x.includes('NO_VIS')?'bad':x.includes('EN_VIS')?'info':x.includes('EVIDENCIA')?'warn':'warn';return `<span class="geo-badge ${c}">${esc(x.replaceAll('_',' '))}</span>`}

function movilidadHtml(sup){const m=sup?.MOVILIDAD||{},v=m.VEHICULO||{},c=m.CHECKIN||{};return `<div class="geo-mobility ${v.ID?'has-vehicle':'no-vehicle'}"><span><b>Vehículo</b> ${v.ID?`${esc(v.PATENTE||'Sin patente')} · ${esc([v.MARCA,v.MODELO].filter(Boolean).join(' ')||'Sin modelo')}`:'Sin vehículo asignado'}</span><span class="geo-checkin ${c.LISTO_PARA_VISITAS||c.APROBADO?'approved':'pending'}">${c.LISTO_PARA_VISITAS||c.APROBADO?'✓ Check-in aprobado y vigente':'! Check-in pendiente/no vigente'}${c.VIGENTE_HASTA?` · válido hasta ${esc(fmt(c.VIGENTE_HASTA))}`:c.FECHA_HORA?` · ${esc(fmt(c.FECHA_HORA))}`:''}</span></div>`}
function checkinGeoHtml(r,operable=true){const m=r?.MOVILIDAD||{},v=m.VEHICULO||{},c=m.CHECKIN||{},ok=Boolean(c.LISTO_PARA_VISITAS||r?.LISTO_PARA_VISITAS),patente=esc(v.PATENTE||'—');return `<section class="geo-card geo-checkin-gate geo-checkin-compact geo-checkin-bar ${ok?'ready':'blocked'}" data-compact-ui="1"><div class="geo-checkin-bar-main"><span class="geo-checkin-icon">${ok?'✓':'!'}</span><div class="geo-checkin-bar-copy"><h2>${ok?'Check-in aprobado':'Check-in requerido'}</h2><p>Vehículo ${patente}</p></div></div><div class="geo-checkin-compact-actions"><button class="geo-btn" id="openCheckinInfo">Detalle</button>${operable?`<button class="geo-btn ${ok?'ok':'primary'}" id="openCheckin">${ok?'Ver Check-in':'Hacer Check-in'}</button>`:''}</div></section>`}
function geoStageStatus(v,started=false){const x=String(v||'PENDIENTE').toUpperCase();if(x==='VISITADO')return '<span class="geo-stage-status visited">Visitado</span>';if(started||x.includes('EN_VIS'))return '<span class="geo-stage-status active">En visita</span>';return '<span class="geo-stage-status pending">Pendiente</span>'}
function geoMapBadge(v){return String(v||'').toUpperCase()==='VISITADO'?'<span class="geo-badge geo-visited">Visitado</span>':'<span class="geo-badge bad">Pendiente</span>'}


function normalizarFiltro(v){return String(v??'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().trim()}
function poblarSelectFiltrable(input,select,rows,labelFn,{todos='',valueFn=x=>x.ID,onChange=null}={}){
  let seleccionado=select?.value||'';
  const render=()=>{if(!select)return;const q=normalizarFiltro(input?.value),filas=(rows||[]).filter(x=>!q||normalizarFiltro(labelFn(x)).includes(q)||normalizarFiltro(valueFn(x)).includes(q));let html=todos?`<option value="">${esc(todos)}</option>`:'';html+=filas.map(x=>`<option value="${esc(valueFn(x))}">${esc(labelFn(x))}</option>`).join('');select.innerHTML=html;if([...select.options].some(o=>o.value===seleccionado))select.value=seleccionado;else if(todos)select.value='';else if(select.options.length){select.selectedIndex=0;seleccionado=select.value}};
  if(select)select.onchange=()=>{seleccionado=select.value;try{onChange?.(seleccionado)}catch(e){console.debug('combo Geo Local',e)}};if(input)input.oninput=render;render();return{render,seleccionar(v){seleccionado=String(v||'');render();if(select)select.value=seleccionado}}
}
function filtrarNodos(input,nodos){
  const apply=()=>{
    const q=normalizarFiltro(input?.value);
    let visibles=0;
    (nodos||[]).forEach(n=>{
      const coincide=!q||normalizarFiltro(n.dataset.search||n.textContent).includes(q);
      n.hidden=!coincide;
      n.setAttribute('aria-hidden',coincide?'false':'true');
      if(coincide){
        n.style.removeProperty('display');
        visibles++;
      }else{
        n.style.setProperty('display','none','important');
      }
    });
    if(input){
      input.dataset.geoFilterResults=String(visibles);
      input.setAttribute('aria-label',`Filtro rápido de Local visitado · ${visibles} resultado(s)`);
    }
    return visibles;
  };
  if(input)input.oninput=apply;
  apply();
  return apply;
}

function geoDialogHead(icon,eyebrow,title,desc=''){return `<header class="geo-dialog-head"><span class="geo-dialog-icon" aria-hidden="true">${esc(icon)}</span><div><div class="geo-eyebrow">${esc(eyebrow)}</div><h2>${esc(title)}</h2>${desc?`<p>${esc(desc)}</p>`:''}</div></header>`}
function geoPlanLocalRow(l,selected=false){const id=esc(l.ID),name=esc(l.NOMBRE||'Local visitado'),addr=esc(l.DIRECCION||'Sin dirección'),codigo=esc(l.CODIGO||''),ref=esc(l.REFERENCIA||''),radius=Number(l.RADIO_METROS||100),duration=Number(l.TIEMPO_OBJETIVO_MIN||30);return `<label class="geo-check geo-plan-local" data-search="${esc([l.NOMBRE,l.DIRECCION,l.CODIGO,l.REFERENCIA,l.ID].join(' '))}"><input class="geo-check-toggle" type="checkbox" value="${id}" ${selected?'checked':''}><span class="geo-check-main"><span class="geo-plan-name-line"><b>${name}</b>${codigo?`<span class="geo-plan-code">Código ${codigo}</span>`:''}</span><small class="geo-plan-address">${addr}</small>${ref?`<small class="geo-plan-reference">Referencia: ${ref}</small>`:''}<em>Radio ${radius} m</em></span><span class="geo-mini-field"><small>Duración</small><input aria-label="Duración estimada en minutos" type="number" min="5" value="${duration}" data-duration></span><span class="geo-mini-field"><small>Traslado</small><input aria-label="Traslado estimado en minutos" type="number" min="0" value="10" data-travel></span><span class="geo-mini-field"><small>Hora objetivo</small><input class="geo-hour" aria-label="Hora objetivo" type="time" data-hour></span></label>`}
async function catalogosGeo(){return await request('geoLocalCatalogos',{})}

function abrirCalendarioGeo(input){
  if(!input)return;
  try{
    input.focus({preventScroll:true});
    if(typeof input.showPicker==='function'){input.showPicker();return;}
  }catch(_){}
  try{input.click()}catch(_){}
}


function abrirDetalleCheckinCompacto(r){const m=r?.MOVILIDAD||{},v=m.VEHICULO||{},c=m.CHECKIN||{},ok=Boolean(c.LISTO_PARA_VISITAS||r?.LISTO_PARA_VISITAS),detalle=ok?`Autorizado para salir a los puntos de visita. Vigencia exacta de 24 horas para el mismo conductor y vehículo${c.VIGENTE_HASTA?` · hasta ${fmt(c.VIGENTE_HASTA)}`:''}.`:c.ESTADO==='SIN_CONDUCTOR'?'El usuario no tiene un conductor asociado.':c.ESTADO==='SIN_VEHICULO'?'No existe un vehículo asignado al conductor.':'El Check-in se aprueba automáticamente cuando no hay fallas informadas; una falla requiere revisión.';const ov=document.createElement('div');ov.className='geo-forced-overlay';ov.innerHTML=`<div class="geo-forced-card geo-compact-info-modal">${geoDialogHead('✓','Autorización de salida',ok?'Check-in aprobado':'Check-in requerido','Información completa del Check-in vigente.')}<div class="geo-dialog-body"><div class="geo-card geo-no-overflow"><p><b>Vehículo:</b> ${esc(v.PATENTE||'—')} · ${esc([v.MARCA,v.MODELO].filter(Boolean).join(' ')||'Sin modelo')}</p><p><b>Estado:</b> ${ok?'Aprobado y vigente':'Requiere revisión'}</p><p>${esc(detalle)}</p></div></div><div class="buttons"><button class="geo-btn primary" id="checkinDetailOpen">${ok?'Ver Check-in':'Hacer Check-in'}</button><button class="geo-btn" id="checkinDetailClose">Cerrar</button></div></div>`;document.body.appendChild(ov);$('#checkinDetailClose',ov).onclick=()=>ov.remove();$('#checkinDetailOpen',ov).onclick=()=>{ov.remove();abrirModuloCheckin()}}
function geoButtonLoader(button,active=true){
  if(!button)return;
  if(active){
    if(button.dataset.geoBusy==='1')return;
    button.dataset.geoBusy='1';
    button.dataset.geoDisabledBefore=button.disabled?'1':'0';
    button.disabled=true;
    button.classList.add('geo-btn-loading');
    const s=document.createElement('span');s.className='geo-btn-spinner';s.setAttribute('aria-hidden','true');button.appendChild(s);
  }else{
    button.dataset.geoBusy='0';
    button.classList.remove('geo-btn-loading');
    button.querySelector('.geo-btn-spinner')?.remove();
    button.disabled=button.dataset.geoDisabledBefore==='1';
  }
}
async function geoWithButtonLoader(button,task){
  geoButtonLoader(button,true);
  try{return await task()}finally{geoButtonLoader(button,false)}
}

async function initGeoLocal(){
  await session();const admin=isAdmin(),supervisor=role()==='ROL-SUPERVISOR-GEO';if(!admin&&!supervisor)return $('#geoApp').innerHTML=empty('Acceso no autorizado para Geo Planificador de Locales.');
  let supervisorSeleccionado=supervisor?String(state.session?.ID||state.session?.id||''):'',catalogo=null;
  let autoRefresh=localStorage.getItem('efleet_geo_local_auto_refresh')!=='OFF',autoTimer=null,autoBusy=false,actionBusy=0,lastSignature='';
  const root=$('#geoApp');root.innerHTML=header('Geo Planificador de Locales','Planificación diaria/semanal con múltiples Locales visitados, navegación, geocerca y evidencia.','<button class="geo-btn" id="planOwn">Planificar día / semana</button><button class="geo-btn" id="reload">Recargar</button><button class="geo-btn" id="autoRefresh">Auto ON</button><button class="geo-btn warn" id="earlyClose">Terminar anticipadamente</button><button class="geo-btn dark" id="closeDay">Cierre diario</button>')+`<div id="geoAdminViewer"></div><div class="geo-toolbar" style="margin-top:14px"><label class="geo-field"><span>Fecha de planificación</span><input id="geoViewDate" type="date" value="${today()}" aria-label="Fecha de planificación"></label><button class="geo-btn" id="geoViewCalendar" type="button">📅 Calendario</button><button class="geo-btn" id="geoViewApply" type="button">Ver fecha</button></div><div id="geoBody"></div>`;
  if(admin){catalogo=await catalogosGeo();$('#geoAdminViewer').innerHTML=`<div class="geo-card"><div class="geo-toolbar"><label class="geo-field"><span>Buscar Supervisor</span><input id="geoViewSupSearch" type="search" placeholder="Nombre, correo o ID"></label><label class="geo-field"><span>Supervisor</span><select id="geoViewSup"></select></label></div></div>`;const ctl=poblarSelectFiltrable($('#geoViewSupSearch'),$('#geoViewSup'),catalogo.SUPERVISORES||[],x=>x.NOMBRE||x.CORREO||x.ID,{valueFn:x=>x.ID});supervisorSeleccionado=$('#geoViewSup')?.value||'';$('#geoViewSup').onchange=()=>{supervisorSeleccionado=$('#geoViewSup').value;load({button:$('#reload')})}}
  const updateAutoLabel=()=>{const b=$('#autoRefresh');if(b)b.textContent=autoRefresh?'Auto ON':'Auto OFF'};
  const scheduleAuto=()=>{clearInterval(autoTimer);if(autoRefresh)autoTimer=setInterval(()=>load({silent:true}),30000)};
  $('#reload').onclick=()=>load({button:$('#reload')});
  $('#autoRefresh').onclick=()=>{autoRefresh=!autoRefresh;localStorage.setItem('efleet_geo_local_auto_refresh',autoRefresh?'ON':'OFF');updateAutoLabel();scheduleAuto()};
  updateAutoLabel();
  $('#geoViewApply').onclick=()=>load({button:$('#geoViewApply')});
  $('#geoViewCalendar').onclick=()=>abrirCalendarioGeo($('#geoViewDate'));
  $('#geoViewDate').onchange=()=>load({button:$('#geoViewApply')});
  $('#planOwn').onclick=()=>geoWithButtonLoader($('#planOwn'),()=>abrirPlanificacion());$('#earlyClose').onclick=abrirCierreAnticipado;$('#closeDay').onclick=()=>admin?toast('Use “Terminar anticipadamente” o Geo Planificador Admin para gestionar el Supervisor seleccionado.'):geoWithButtonLoader($('#closeDay'),()=>cierre(false));
  await load({initial:true});scheduleAuto();clearInterval(state.timer);state.timer=setInterval(()=>{if(!admin)checkForcedClose()},30000);
  async function load(opts={}){
    const silent=opts.silent===true,button=opts.button||null;
    if(silent){
      if(!autoRefresh||autoBusy||actionBusy>0||document.hidden||document.querySelector('.geo-forced-overlay'))return;
      const a=document.activeElement;if(a&&['INPUT','TEXTAREA','SELECT'].includes(a.tagName))return;
      autoBusy=true;
    }else if(button)geoButtonLoader(button,true);else if(opts.initial)setLoading(true);
    try{
      const fecha=$('#geoViewDate').value||today(),payload={FECHA:fecha};
      if(admin){if(!supervisorSeleccionado)throw new Error('SELECCIONE_SUPERVISOR');payload.SUPERVISOR_USUARIO_ID=supervisorSeleccionado}
      const r=await request('geoLocalMiPlan',payload),sig=JSON.stringify(r);
      if(silent&&sig===lastSignature)return;
      const y=window.scrollY;
      state.data=r;lastSignature=sig;render(r);
      if(silent)requestAnimationFrame(()=>window.scrollTo({top:y,behavior:'instant'}));
      if(!admin&&fecha===today()&&!silent)await checkForcedClose();
    }catch(e){if(!silent)error(e)}
    finally{if(silent)autoBusy=false;else if(button)geoButtonLoader(button,false);else if(opts.initial)setLoading(false)}
  }
  function render(r){
    const j=r.JORNADA||{},items=r.DETALLES||[],done=items.filter(x=>String(x.ESTADO).toUpperCase()==='VISITADO').length,evid=items.filter(x=>x.EVIDENCIA_ESTADO==='COMPLETA').length,checkinOk=Boolean(r.LISTO_PARA_VISITAS||r.MOVILIDAD?.CHECKIN?.LISTO_PARA_VISITAS),puedeNavegar=admin||checkinOk,operar=!admin&&($('#geoViewDate').value||today())===today();
    $('#geoBody').innerHTML=empresaBar(r)+checkinGeoHtml(r,!admin)+`<div class="geo-grid kpis">${ring('Cumplimiento',items.length?done/items.length*100:0,'#000000',`${done}/${items.length}`)}${ring('Capacidad utilizada',j.MINUTOS_DISPONIBLES?Math.min(100,(Number(r.PLAN?.MINUTOS_PLANIFICADOS||0)/j.MINUTOS_DISPONIBLES)*100):0,'#2563eb',j.ARTICULO_22==='SI'?'Art. 22':`${j.MINUTOS_DISPONIBLES||0} min disp.`)}${ring('Evidencias',items.length?evid/items.length*100:0,'#7c3aed',`${evid}/${items.length}`)}${ring('En horario',r.EN_HORARIO?100:0,r.EN_HORARIO?'#000000':'#dc2626',r.EN_HORARIO?'ACTIVO':'FUERA DE TURNO')}</div>
  <div class="geo-card"><h2>Jornada · ${esc(r.FECHA||'')}</h2><div class="geo-alert ${r.EN_HORARIO?'':'warn'}">${j.ARTICULO_22==='SI'?'Artículo 22 parametrizado · ventana operativa referencial':`${j.TURNO_INICIO||'—'} a ${j.TURNO_FIN||'—'} · descanso ${j.DESCANSO_MINUTOS||0} min · ${j.JORNADA_REGIMEN||''}`}</div></div>
  <div class="geo-card" style="margin-top:16px"><div class="geo-toolbar"><div><h2 style="margin:0">Planificación de múltiples destinos</h2><small>${checkinOk||admin?'Puntos habilitados según su planificación.':'Navegación y llegada bloqueadas solo si el Check-in tiene una falla pendiente. Las visitas reasignadas por emergencia pueden quedar exentas de un nuevo Check-in.'} La planificación permanece disponible hasta las 23:59.</small></div><label class="geo-field"><span>Filtro rápido</span><input id="geoOwnFilter" type="search" placeholder="Local visitado, dirección o estado"></label></div><div class="geo-list">${items.length?items.map((x,i)=>`<article class="geo-stop" data-search="${esc([x.LOCAL_NOMBRE,x.LOCAL_DIRECCION,x.ESTADO,x.LOCAL_CODIGO,x.LOCAL_REFERENCIA].join(' '))}"><div class="geo-order">${i+1}</div><div><div class="title">${esc(x.LOCAL_NOMBRE||'Local visitado')}</div><div class="meta"><span>${esc(x.LOCAL_DIRECCION)}</span><span>Objetivo ${x.DURACION_ESTIMADA_MIN||x.LOCAL_TIEMPO_OBJETIVO_MIN||30} min</span><span>Radio ${x.LOCAL_RADIO_METROS||100} m</span>${x.CHECKIN_EXENTO==='SI'?'<span class="geo-badge warning">EMERGENCIA · SIN NUEVO CHECK-IN</span>':''}${badge(x.ESTADO)}</div><div class="meta"><span>Llegada: ${time(x.LLEGADA_EFECTIVA_EN)}</span><span>Traslado: ${x.TRASLADO_DESDE_ANTERIOR_MINUTOS??'—'}${x.TRASLADO_DESDE_ANTERIOR_MINUTOS!=null?' min':''}</span><span>Permanencia: ${x.PERMANENCIA_MINUTOS??'—'}${x.PERMANENCIA_MINUTOS!=null?' min':''}</span><span>Salida: ${time(x.SALIDA_EFECTIVA_EN)}</span><span>Evidencia: ${esc(x.EVIDENCIA_ESTADO||'PENDIENTE')}</span><span><b>Visitas detectadas hoy: ${Number(x.VISITAS_DIA||0)}</b></span></div></div><div class="buttons"><button class="geo-btn" data-waze="${x.ID}" ${!puedeNavegar&&x.CHECKIN_EXENTO!=='SI'?'disabled':''}>Waze</button><button class="geo-btn" data-gmaps="${x.ID}" ${!puedeNavegar&&x.CHECKIN_EXENTO!=='SI'?'disabled':''}>Google Maps</button><button class="geo-btn ok" data-arrive="${x.ID}" ${!operar||(!checkinOk&&x.CHECKIN_EXENTO!=='SI')||x.LLEGADA_EFECTIVA_EN?'disabled':''}>He llegado</button><button class="geo-btn dark" data-photo="${x.ID}" ${!operar||(!checkinOk&&x.CHECKIN_EXENTO!=='SI')||!x.LLEGADA_EFECTIVA_EN||x.ESTADO==='VISITADO'?'disabled':''}>Foto</button><button class="geo-btn primary" data-finish="${x.ID}" ${!operar||(!checkinOk&&x.CHECKIN_EXENTO!=='SI')||!x.LLEGADA_EFECTIVA_EN||x.SALIDA_EFECTIVA_EN||x.EVIDENCIA_ESTADO!=='COMPLETA'?'disabled':''}>Finalizar visita</button><input type="file" accept="image/*" capture="environment" hidden data-file="${x.ID}"></div></article>`).join(''):empty('No hay Locales visitados planificados para esta fecha.')}</div></div>`;
    $('#openCheckin')?.addEventListener('click',abrirModuloCheckin);$('#openCheckinInfo')?.addEventListener('click',()=>abrirDetalleCheckinCompacto(r));$$('[data-waze]').forEach(b=>b.onclick=()=>geoWithButtonLoader(b,()=>navegarDetalle(items.find(y=>y.ID===b.dataset.waze),'WAZE')));$$('[data-gmaps]').forEach(b=>b.onclick=()=>geoWithButtonLoader(b,()=>navegarDetalle(items.find(y=>y.ID===b.dataset.gmaps),'GOOGLE_MAPS')));$$('[data-arrive]').forEach(b=>b.onclick=()=>arrive(b.dataset.arrive,b));$$('[data-finish]').forEach(b=>b.onclick=()=>finish(b.dataset.finish,b));$$('[data-photo]').forEach(b=>b.onclick=()=>document.querySelector(`[data-file="${b.dataset.photo}"]`).click());$$('[data-file]').forEach(i=>i.onchange=()=>photo(i.dataset.file,i.files[0]));filtrarNodos($('#geoOwnFilter'),$$('.geo-stop'));
  }
  async function arrive(id,button){
    actionBusy++;
    try{
      let respuesta=null;
      await geoWithButtonLoader(button,async()=>{
        const g=await loc();
        respuesta=await request('geoLocalRegistrarLlegada',{DETALLE_ID:id,...g});
      });

      const clas=String(respuesta?.CLASIFICACION_LLEGADA||'').toUpperCase(),
            estado=String(respuesta?.UBICACION_ESTADO||'').toUpperCase(),
            detalleReal=String(respuesta?.DETALLE_REAL_ID||''),
            nombreReal=String(respuesta?.LOCAL_REAL_NOMBRE||'');

      if(clas==='LOCAL_REGISTRADO_NO_PROGRAMADO'||estado==='LOCAL_REGISTRADO_NO_PROGRAMADO'){
        toast('Visita no programada registrada correctamente.');
      }else if(clas==='OTRO_LOCAL_PROGRAMADO'){
        toast(nombreReal?`Llegada validada en ${nombreReal}.`:'Llegada validada en otro Local programado.');
      }else if(estado==='UBICACION_VERIFICADA'){
        toast('Llegada registrada · ubicación verificada.');
      }else{
        toast('Llegada registrada correctamente.');
      }

      await load();

      if(detalleReal){
        const tarjeta=document.querySelector(`[data-stop="${CSS.escape(detalleReal)}"],[data-detalle="${CSS.escape(detalleReal)}"],[data-arrive="${CSS.escape(detalleReal)}"]`)?.closest('.geo-stop,.geo-collapsible-stop,.geo-card');
        if(tarjeta){
          tarjeta.classList.remove('geo-collapsed');
          tarjeta.scrollIntoView({behavior:'smooth',block:'center'});
        }
      }
    }catch(e){error(e)}
    finally{actionBusy=Math.max(0,actionBusy-1)}
  }
  async function finish(id,button){actionBusy++;try{await geoWithButtonLoader(button,async()=>{const g=await loc();await request('geoLocalFinalizarVisita',{DETALLE_ID:id,...g})});toast('Visita finalizada correctamente.');await load()}catch(e){error(e)}finally{actionBusy=Math.max(0,actionBusy-1)}}
  async function photo(id,file){if(!file)return;const button=document.querySelector(`[data-photo="${id}"]`);actionBusy++;try{await geoWithButtonLoader(button,async()=>{const[g,data]=await Promise.all([loc(),fileData(file)]);await request('geoLocalCargarEvidencia',{DETALLE_ID:id,CONTENIDO_BASE64:data,TIPO_MIME:file.type||'image/jpeg',...g})});toast('Fotografía georreferenciada guardada.');await load()}catch(e){error(e)}finally{actionBusy=Math.max(0,actionBusy-1)}}
  async function abrirRegistroLocalRapidoPlan(){const ov=document.createElement('div');ov.className='geo-forced-overlay';ov.innerHTML=`<div class="geo-forced-card">${geoDialogHead('◎','BD Locales','Registrar Local no existente','El Local quedará disponible inmediatamente para Geo Admin y Geo Supervisor.')}<div class="geo-dialog-body"><div class="geo-two"><label class="geo-field"><span>Código *</span><input id="quickLocalCode"></label><label class="geo-field"><span>Nombre *</span><input id="quickLocalName"></label></div><label class="geo-field"><span>Dirección *</span><input id="quickLocalAddress" placeholder="Escriba y seleccione una dirección"></label><label class="geo-field"><span>Referencia</span><input id="quickLocalRef"></label><div class="geo-two"><label class="geo-field"><span>Latitud</span><input id="quickLocalLat" readonly></label><label class="geo-field"><span>Longitud</span><input id="quickLocalLng" readonly></label></div></div><div class="buttons"><button class="geo-btn primary" id="quickLocalSave">Guardar en BD Locales</button><button class="geo-btn" id="quickLocalCancel">Cancelar</button></div></div>`;document.body.appendChild(ov);bindGeoAddressAutocomplete($('#quickLocalAddress'),$('#quickLocalLat'),$('#quickLocalLng'));$('#quickLocalCancel').onclick=()=>ov.remove();$('#quickLocalSave').onclick=async()=>{const data={CODIGO:$('#quickLocalCode').value.trim(),NOMBRE:$('#quickLocalName').value.trim(),DIRECCION:$('#quickLocalAddress').value.trim(),REFERENCIA:$('#quickLocalRef').value.trim(),LATITUD:$('#quickLocalLat').value,LONGITUD:$('#quickLocalLng').value,RADIO_METROS:100,TIEMPO_OBJETIVO_MIN:30};if(!data.CODIGO||!data.NOMBRE||!data.DIRECCION||!data.LATITUD||!data.LONGITUD)return toast('Complete código, nombre y seleccione una dirección válida.');try{actionBusy++;geoButtonLoader($('#quickLocalSave'),true);await request('geoLocalGuardarLocal',data);catalogo=await catalogosGeo();const box=$('#ownPlanLocals');if(box){box.innerHTML=(catalogo.LOCALES||[]).map(l=>geoPlanLocalRow(l)).join('');filtrarNodos($('#ownPlanFilter'),$$('#ownPlanLocals .geo-check'))}ov.remove();toast('Local agregado a BD Locales y disponible para planificación.')}catch(e){error(e)}finally{actionBusy=Math.max(0,actionBusy-1);geoButtonLoader($('#quickLocalSave'),false)}}}
  function mostrarConfirmacionGeoCheck(titulo,mensaje){
    const ov=document.createElement('div');ov.className='geo-forced-overlay geo-success-overlay';
    ov.innerHTML=`<div class="geo-forced-card geo-success-card"><div class="geo-success-check" aria-hidden="true">✓</div><h2>${esc(titulo||'Planificación actualizada')}</h2><p>${esc(mensaje||'Los cambios fueron guardados correctamente.')}</p><button type="button" class="geo-btn primary" id="geoSuccessOk">Aceptar</button></div>`;
    document.body.appendChild(ov);const cerrar=()=>ov.remove();$('#geoSuccessOk').onclick=cerrar;ov.addEventListener('click',e=>{if(e.target===ov)cerrar()});return ov;
  }
  async function abrirPlanificacion(){try{catalogo=catalogo||await catalogosGeo();const locals=catalogo.LOCALES||[],overlay=document.createElement('div');overlay.className='geo-forced-overlay';overlay.innerHTML=`<div class="geo-forced-card geo-plan-dialog">${geoDialogHead('▦','Geo Planificador de Locales',admin?'Planificar Supervisor':'Planificar mi día o semana','Seleccione fechas y Locales visitados. Los controles se adaptan al ancho de la pantalla.')}<div class="geo-dialog-body"><div class="geo-three"><label class="geo-field"><span>Tipo</span><select id="ownPlanType"><option value="DIARIA">Diaria</option><option value="SEMANAL">Semanal</option></select></label><label class="geo-field"><span>Inicio</span><span class="geo-date-box"><input id="ownPlanStart" type="date" value="${$('#geoViewDate').value||today()}"><button type="button" class="geo-date-open" data-calendar-for="ownPlanStart" aria-label="Abrir calendario de inicio">📅</button></span></label><label class="geo-field"><span>Fin semanal</span><span class="geo-date-box"><input id="ownPlanEnd" type="date" value="${plusDays($('#geoViewDate').value||today(),6)}"><button type="button" class="geo-date-open" data-calendar-for="ownPlanEnd" aria-label="Abrir calendario de fin">📅</button></span></label></div><label class="geo-field"><span>Filtro rápido de Local visitado</span><input id="ownPlanFilter" type="search" placeholder="Nombre, dirección, código o referencia"></label><button type="button" class="geo-btn" id="ownPlanNewLocal">Registrar Local no existente</button><div class="geo-plan-columns" aria-hidden="true"><span>Local visitado</span><span>Duración</span><span>Traslado</span><span>Hora objetivo</span></div><div id="ownPlanLocals" class="geo-plan-items">${locals.map(l=>geoPlanLocalRow(l)).join('')}</div><label class="geo-field"><span>Observaciones</span><textarea id="ownPlanObs" placeholder="Observaciones de la planificación"></textarea></label></div><div class="buttons"><button class="geo-btn primary" id="ownPlanSave">Guardar planificación</button><button class="geo-btn" id="ownPlanCancel">Cancelar</button></div></div>`;document.body.appendChild(overlay);filtrarNodos($('#ownPlanFilter'),$$('#ownPlanLocals .geo-check'));overlay.querySelectorAll('[data-calendar-for]').forEach(b=>b.addEventListener('click',()=>abrirCalendarioGeo(overlay.querySelector('#'+b.dataset.calendarFor))));$('#ownPlanNewLocal').onclick=abrirRegistroLocalRapidoPlan;$('#ownPlanCancel').onclick=()=>overlay.remove();$('#ownPlanSave').onclick=async()=>{const items=$$('#ownPlanLocals .geo-check').filter(x=>$('input[type=checkbox]',x).checked).map(x=>({LOCAL_ID:$('input[type=checkbox]',x).value,DURACION_ESTIMADA_MIN:$('[data-duration]',x).value,TRASLADO_ESTIMADO_MIN:$('[data-travel]',x).value,HORA_OBJETIVO:$('[data-hour]',x).value}));if(!items.length)return toast('Seleccione al menos un Local visitado.');try{actionBusy++;const saveButton=$('#ownPlanSave');geoButtonLoader(saveButton,true);const tipo=$('#ownPlanType').value,start=$('#ownPlanStart').value,end=$('#ownPlanEnd').value,payload={TIPO_PLANIFICACION:tipo,FECHA:start,FECHA_INICIO:start,FECHA_FIN:end,LOCALES:items,OBSERVACIONES:$('#ownPlanObs').value};if(admin)payload.SUPERVISOR_USUARIO_ID=supervisorSeleccionado;let guardado;if(tipo==='SEMANAL')guardado=await request('geoLocalGuardarPlanificacionSemanal',payload);else guardado=await request('geoLocalGuardarPlanificacion',payload);overlay.remove();$('#geoViewDate').value=start;const agregados=Number(guardado?.AGREGADOS??guardado?.AGREGADOS_TOTAL??0),existentes=Number(guardado?.YA_EXISTENTES??guardado?.YA_EXISTENTES_TOTAL??0),mensaje=guardado?.MENSAJE_CONFIRMACION||(agregados?`Planificación actualizada: ${agregados} Local(es) nuevo(s) agregado(s) · ${existentes} ya existente(s) conservado(s).`:`Planificación revisada: los Locales seleccionados ya estaban asignados y se conservaron.`);mostrarConfirmacionGeoCheck('✓ Planificación Geo guardada',mensaje);await load()}catch(e){error(e)}finally{actionBusy=Math.max(0,actionBusy-1);geoButtonLoader($('#ownPlanSave'),false)}}}catch(e){error(e)}}
  async function abrirCierreAnticipado(){const plan=state.data?.PLAN;if(!plan)return toast('No existe planificación para informar.');const overlay=document.createElement('div');overlay.className='geo-forced-overlay';overlay.innerHTML=`<div class="geo-forced-card">${geoDialogHead('!','Cierre anticipado','Informar cierre anticipado','La justificación queda auditada y no cierra la planificación. Dentro de su horario puede continuar visitas; el cierre definitivo permanece disponible hasta las 23:59.')}<div class="geo-dialog-body"><div class="geo-dialog-alert warn">Esta acción es provisional. Los Locales pendientes continúan disponibles hasta el cierre diario definitivo.</div><label class="geo-field"><span>Justificación *</span><textarea id="earlyObs" placeholder="Indique el motivo del cierre anticipado"></textarea></label></div><div class="buttons"><button class="geo-btn warn" id="earlyConfirm">Informar cierre anticipado</button><button class="geo-btn" id="earlyCancel">Cancelar</button></div></div>`;document.body.appendChild(overlay);$('#earlyCancel').onclick=()=>overlay.remove();$('#earlyConfirm').onclick=async()=>{const just=$('#earlyObs').value.trim();if(just.length<5)return toast('Ingrese una justificación válida.');try{actionBusy++;const b=$('#earlyConfirm');await geoWithButtonLoader(b,async()=>{const g=await loc(),payload={PLANIFICACION_ID:plan.ID,FECHA:plan.FECHA,JUSTIFICACION:just,...g};if(admin)payload.SUPERVISOR_USUARIO_ID=supervisorSeleccionado;await request('geoLocalCerrarAnticipadamente',payload)});overlay.remove();toast('Cierre anticipado informado. La planificación sigue abierta y el cierre definitivo permanece disponible hasta las 23:59.');await load()}catch(e){error(e)}finally{actionBusy=Math.max(0,actionBusy-1)}}}
  async function checkForcedClose(){try{const r=await request('geoLocalEstadoCierre',{});if(r.REQUIERE_CIERRE&&!r.CERRADO)mostrarCierreForzado(r)}catch(e){console.debug('geo cierre',e)}}
  async function cierre(forzado){try{const r=await request('geoLocalEstadoCierre',{});mostrarCierreForzado(r,forzado)}catch(e){error(e)}}
  function mostrarCierreForzado(r,forzado=true){if($('#geoForcedClose'))return;const no=Number(r.NO_VISITADOS||0),overlay=document.createElement('div');overlay.id='geoForcedClose';overlay.className='geo-forced-overlay';overlay.innerHTML=`<div class="geo-forced-card">${geoDialogHead('✓','Cierre diario Geo Local',forzado?'Confirmación obligatoria':'Cierre de jornada','Se guardará ubicación, resultado del día y observaciones para auditoría.')}<div class="geo-dialog-body"><div class="geo-close-score"><span class="ok">✓ ${r.VISITADOS||0} visitados</span><span class="bad">✕ ${no} no visitados</span></div><label class="geo-field"><span>${no?'Observaciones obligatorias':'Observaciones'}</span><textarea id="geoCloseObs" placeholder="${no?'Explique por qué no se completaron todos los Locales visitados…':'Observaciones opcionales…'}"></textarea></label></div><div class="buttons"><button class="geo-btn primary" id="geoCloseConfirm">Aceptar y confirmar cierre</button>${forzado?'':'<button class="geo-btn" id="geoCloseCancel">Volver</button>'}</div></div>`;document.body.appendChild(overlay);$('#geoCloseConfirm').onclick=async()=>{const obs=$('#geoCloseObs').value.trim();if(no&&obs.length<5)return toast('Debe ingresar observaciones del cierre.');try{actionBusy++;const b=$('#geoCloseConfirm');await geoWithButtonLoader(b,async()=>{const g=await loc();await request('geoLocalCerrarDia',{FECHA:r.FECHA||today(),OBSERVACIONES:obs,...g})});overlay.remove();toast('Cierre diario confirmado y auditado.');await load()}catch(e){error(e)}finally{actionBusy=Math.max(0,actionBusy-1)}};if(!forzado)$('#geoCloseCancel').onclick=()=>overlay.remove()}
}


function geoAdminLineaTiempoDetalle(d){
  const tramos=Array.isArray(d?.LINEA_TIEMPO_VISITAS)
    ?d.LINEA_TIEMPO_VISITAS:[];
  if(!tramos.length)return'';

  const filas=tramos.map((t,i)=>{
    const entrada=time(t.ENTRADA_EN),
          salida=t.SALIDA_EN?time(t.SALIDA_EN):'En curso',
          dur=t.DURACION_TEXTO||`${Number(t.DURACION_MINUTOS||0)} min`,
          enCurso=String(t.EN_CURSO||'').toUpperCase()==='SI',
          salidaTipo=String(t.SALIDA_TIPO||'').toUpperCase(),
          salidaTexto=enCurso
            ?'Dentro del Local'
            :salidaTipo==='SALIDA_LOCAL_RADIO'
              ?'Salida automática del perímetro'
              :salidaTipo==='SALIDA'
                ?'Salida al finalizar'
                :salidaTipo==='FINALIZACION_FUERA_UBICACION'
                  ?'Finalización fuera de ubicación'
                  :'Salida registrada';

    return `<div class="geo-admin-visit-row ${enCurso?'is-active':''}">
      <span class="geo-admin-visit-dot"></span>
      <div class="geo-admin-visit-main">
        <div class="geo-admin-visit-title">
          <b>Visita ${Number(t.NUMERO||i+1)}</b>
          ${enCurso?'<span class="geo-badge warning">EN CURSO</span>':''}
        </div>
        <div class="geo-admin-visit-times">
          <span><small>Entrada</small><strong>${esc(entrada)}</strong></span>
          <span><small>Salida</small><strong>${esc(salida)}</strong></span>
          <span><small>Duración</small><strong>${esc(dur)}</strong></span>
        </div>
        <em>${esc(salidaTexto)}</em>
      </div>
    </div>`;
  }).join('');

  const total=d.TIEMPO_TOTAL_VISITAS_TEXTO
    ||`${Number(d.TIEMPO_TOTAL_VISITAS_MINUTOS||0)} min`;

  return `<section class="geo-admin-local-timeline">
    <div class="geo-admin-local-timeline-head">
      <b>Línea de tiempo del Local</b>
      <span>${tramos.length} visita${tramos.length===1?'':'s'} registrada${tramos.length===1?'':'s'}</span>
    </div>
    <div class="geo-admin-visit-list">${filas}</div>
    <div class="geo-admin-visit-total">
      <span>Σ Tiempo total dentro del Local</span>
      <strong>${esc(total)}</strong>
    </div>
  </section>`;
}

async function initAdmin(){
  await session();if(!isAdmin())return $('#geoApp').innerHTML=empty('Acceso exclusivo de Administración y Gerencia.');
  const root=$('#geoApp');root.innerHTML=header('Geo Planificador Admin','Planifique Locales visitados y supervise en una sola vista la ejecución real de cada Supervisor.','<button class="geo-btn primary" id="adminNotify">Enviar alerta / notificación</button><button class="geo-btn" id="reload">Actualizar</button>')+`<div id="companyContext"></div><div class="geo-two geo-admin-workspace" style="margin-top:18px"><section class="geo-card geo-admin-panel"><div class="geo-section-head"><div><span class="geo-section-icon">◎</span><div><h2>Nuevo / editar Local visitado</h2><small>Dirección, coordenadas, radio y puntos programados en una sola vista.</small></div></div></div><form id="localForm" class="geo-grid"><div class="geo-two"><label class="geo-field"><span>Código / buscar Local</span><input name="CODIGO" id="localCode" list="bdLocalesList" autocomplete="off" placeholder="Escriba código o seleccione un Local"><datalist id="bdLocalesList"></datalist></label><label class="geo-field"><span>Nombre del Local visitado *</span><input name="NOMBRE" required></label></div><label class="geo-field"><span>Dirección *</span><input name="DIRECCION" id="localAddress" required placeholder="Escriba calle, número y comuna"></label><label class="geo-field"><span>Referencia</span><input name="REFERENCIA"></label><div class="geo-three"><label class="geo-field"><span>Latitud *</span><input name="LATITUD" id="localLat" required></label><label class="geo-field"><span>Longitud *</span><input name="LONGITUD" id="localLng" required></label><label class="geo-field"><span>Radio de tolerancia (m)</span><input name="RADIO_METROS" id="localRadius" type="number" min="30" max="1000" value="100"></label></div><div class="geo-map-head geo-admin-map-head"><div><h3>Mapa de puntos programados</h3><small>Muestra todos los Locales del período y la previsualización del formulario.</small></div><div class="geo-map-legend"><span><i class="visited"></i> Visitado</span><span><i class="bad"></i> Pendiente</span><span><i class="preview"></i> Edición</span></div></div><div id="localMapPreview" class="geo-map geo-map-mini geo-admin-map"></div><div id="adminMapStatus" class="geo-map-status">Preparando puntos programados…</div><small class="geo-help">Escriba y seleccione una dirección para centrar el punto y mostrar el radio. Los puntos programados permanecen visibles.</small><label class="geo-field"><span>Tiempo objetivo (min)</span><input name="TIEMPO_OBJETIVO_MIN" type="number" value="30"></label><button class="geo-btn primary">Guardar Local visitado</button></form></section><section class="geo-card geo-admin-panel"><div class="geo-section-head"><div><span class="geo-section-icon">▦</span><div><h2>Planificar Supervisor</h2><small>Seleccione desde la lista de Supervisores de esta empresa y filtre en tiempo real.</small></div></div></div><form id="planForm" class="geo-grid"><div class="geo-combo-grid"><label class="geo-field"><span>Filtro rápido de Supervisor</span><input id="supSearch" type="search" placeholder="Nombre, correo o ID"></label><label class="geo-field"><span>Supervisor</span><select name="SUPERVISOR_USUARIO_ID" id="supSelect"><option value="">Cargando Supervisores…</option></select></label></div><div class="geo-three"><label class="geo-field"><span>Tipo</span><select name="TIPO_PLANIFICACION" id="planType"><option value="DIARIA">Diaria</option><option value="SEMANAL">Semanal</option></select></label><label class="geo-field"><span>Fecha inicio</span><input type="date" name="FECHA" id="planStart" value="${today()}"></label><label class="geo-field"><span>Fecha fin semanal</span><input type="date" id="planEnd" value="${plusDays(today(),6)}"></label></div><label class="geo-field"><span>Filtro rápido de Local visitado</span><input id="localSearch" type="search" placeholder="Nombre, dirección, referencia o código"></label><div class="geo-plan-columns" aria-hidden="true"><span>Local visitado</span><span>Duración</span><span>Traslado</span><span>Hora objetivo</span></div><div id="planLocales" class="geo-plan-items"></div><label class="geo-field"><span>Observaciones</span><textarea name="OBSERVACIONES"></textarea></label><button class="geo-btn primary">Guardar planificación</button></form></section></div><section class="geo-card geo-admin-control" style="margin-top:16px"><div class="geo-toolbar"><div><h2 style="margin:0">Control de Supervisores</h2><small>Planificación y ejecución real: llegada, traslado, permanencia, salida, evidencia, reasignación y observaciones.</small></div><label class="geo-field"><span>Desde</span><input id="adminDateFrom" type="date" value="${today()}"></label><label class="geo-field"><span>Hasta</span><input id="adminDateTo" type="date" value="${plusDays(today(),6)}"></label><button type="button" class="geo-btn primary" id="adminApplyDateFilter">Aplicar filtro</button><label class="geo-field"><span>Filtro rápido Supervisor</span><input id="adminSupSearch" type="search" placeholder="Nombre, correo o ID"></label><label class="geo-field"><span>Supervisor</span><select id="adminSupFilter"><option value="">Cargando Supervisores…</option></select></label><label class="geo-field"><span>Filtro rápido Local visitado</span><input id="adminLocalFilter" type="search" placeholder="Nombre, dirección o estado"></label></div><div id="adminDateFilterStatus" class="geo-map-status">Período activo: ${today()} a ${plusDays(today(),6)}</div><div id="adminTable"></div></section>`;
  let localMap=null,adminMapProgramados=[],adminMapPreview=[],adminMapCirculos=[];
  const cargarDatalistLocales=()=>{const dl=$('#bdLocalesList');if(!dl)return;const ls=state.catalog?.LOCALES||state.data?.LOCALES||[];dl.innerHTML=ls.map(l=>`<option value="${esc(l.CODIGO||'')}">${esc(l.NOMBRE||'')} · ${esc(l.DIRECCION||'')}</option>`).join('')};
  const completarLocalPorCodigo=async()=>{const code=$('#localCode')?.value.trim();if(!code)return;try{const r=await request('geoLocalResolverLocal',{CODIGO:code});const l=r.LOCAL;if(!l)return;const f=$('#localForm');if(!f)return;['NOMBRE','DIRECCION','REFERENCIA','LATITUD','LONGITUD','RADIO_METROS','TIEMPO_OBJETIVO_MIN'].forEach(k=>{const e=f.elements.namedItem(k);if(e&&l[k]!=null)e.value=l[k]});updateLocalPreview();toast('Local cargado desde BD Locales.')}catch(e){console.debug('bd locales',e)}};
  const numeroCoordenadaGeo=value=>{let text=String(value??'').trim();if(!text)return NaN;if(text.includes(',')&&!text.includes('.'))text=text.replace(',','.');const n=Number(text);return Number.isFinite(n)?n:NaN};
  const coordenadaGeoValida=(lat,lng)=>Number.isFinite(lat)&&Number.isFinite(lng)&&lat>=-90&&lat<=90&&lng>=-180&&lng<=180&&!(Math.abs(lat)<0.000001&&Math.abs(lng)<0.000001);
  const ensureLocalMap=(centro=[-33.4489,-70.6693],nivel=12)=>{
    const cont=$('#localMapPreview');
    if(!cont)return null;
    if(localMap)return localMap;
    if(!window.MapaFlotas){cont.innerHTML='<div class="geo-map-failure"><b>Mapa no disponible</b><span>No se cargó el componente de mapas. Recargue el módulo.</span></div>';return null}
    try{
      localMap=new window.MapaFlotas(cont,{centro,nivel,estilo:'claro-rapido'});
      cont.classList.add('geo-map-ready');
      const aviso=cont.querySelector('.mapa-aviso');if(aviso)aviso.innerHTML='<b>Mapa listo</b><span>Escriba y seleccione la dirección del Local visitado.</span>';
      requestAnimationFrame(()=>localMap?.redibujar?.());setTimeout(()=>localMap?.redibujar?.(),180);
      return localMap;
    }catch(e){
      console.error('Inicialización mapa Local visitado',e);
      cont.innerHTML='<div class="geo-map-failure"><b>No fue posible iniciar el mapa</b><span>Actualice la página e intente nuevamente.</span></div>';
      return null;
    }
  };
  const sincronizarMapaAdmin=(ajustar=false)=>{const map=ensureLocalMap();if(!map)return;map.actualizarMarcadores([...adminMapProgramados,...adminMapPreview],ajustar);map.actualizarCirculos(adminMapCirculos);requestAnimationFrame(()=>map.redibujar?.())};
  const reconstruirPuntosProgramados=(ajustar=false)=>{
    const r=state.data||{},sid=$('#adminSupFilter')?.value||'',qLocal=normalizarFiltro($('#adminLocalFilter')?.value||''),planes=(r.PLANIFICACIONES||[]).filter(p=>!sid||String(p.SUPERVISOR_USUARIO_ID)===String(sid)),planIds=new Set(planes.map(p=>String(p.ID))),detalles=(r.DETALLES||[]).filter(d=>planIds.has(String(d.PLANIFICACION_ID))),lm=new Map((r.LOCALES||[]).map(l=>[String(l.ID),l])),pm=new Map(planes.map(p=>[String(p.ID),p])),sm=new Map((r.SUPERVISORES||[]).map(s=>[String(s.ID),s])),grupos=new Map();
    for(const d of detalles){const l=lm.get(String(d.LOCAL_ID));if(!l||qLocal&&!normalizarFiltro([l.NOMBRE,l.DIRECCION,l.REFERENCIA,d.ESTADO].join(' ')).includes(qLocal))continue;const lat=numeroCoordenadaGeo(l.LATITUD),lng=numeroCoordenadaGeo(l.LONGITUD);if(!coordenadaGeoValida(lat,lng))continue;const key=String(l.ID),lista=grupos.get(key)||[];lista.push({detalle:d,local:l,plan:pm.get(String(d.PLANIFICACION_ID))||{},supervisor:sm.get(String((pm.get(String(d.PLANIFICACION_ID))||{}).SUPERVISOR_USUARIO_ID))||{}});grupos.set(key,lista)}
    adminMapProgramados=[...grupos.entries()].map(([id,rows])=>{const primera=rows[0],visitados=rows.filter(x=>String(x.detalle.ESTADO||'').toUpperCase()==='VISITADO').length,todosVisitados=visitados===rows.length,lineas=rows.slice(0,8).map(x=>`${esc(x.plan.FECHA||'Sin fecha')} · ${esc(x.supervisor.NOMBRE||x.supervisor.CORREO||x.plan.SUPERVISOR_USUARIO_ID||'Supervisor')} · ${esc(String(x.detalle.ESTADO||'PENDIENTE').replaceAll('_',' '))}`).join('<br>');return{id:`admin-programado-${id}`,latitud:Number(primera.local.LATITUD),longitud:Number(primera.local.LONGITUD),nombre:`${todosVisitados?'✓':'✕'} ${primera.local.NOMBRE||'Local visitado'} · ${rows.length} visita(s)`,direccion:primera.local.DIRECCION||'',activo:false,seguido:false,clase:todosVisitados?'geo-local-visitado':'geo-local-pendiente',detalle:`<b>${esc(primera.local.NOMBRE||'Local visitado')}</b><br>${esc(primera.local.DIRECCION||'')}<br>${visitados}/${rows.length} visita(s) completada(s)<br>${lineas}${rows.length>8?`<br>+ ${rows.length-8} programación(es) adicional(es)`:''}`}});
    const status=$('#adminMapStatus');if(status)status.textContent=`${adminMapProgramados.length} punto(s) programado(s) · ${detalles.length} visita(s) del filtro actual`;
    sincronizarMapaAdmin(ajustar);
  };
  const updateLocalPreview=()=>{
    const lat=numeroCoordenadaGeo($('#localLat')?.value),lng=numeroCoordenadaGeo($('#localLng')?.value),radio=Math.max(30,Number($('#localRadius')?.value||100));
    const map=ensureLocalMap(coordenadaGeoValida(lat,lng)?[lat,lng]:[-33.4489,-70.6693],coordenadaGeoValida(lat,lng)?16:12);
    if(!map)return;
    if(!coordenadaGeoValida(lat,lng)){adminMapPreview=[];adminMapCirculos=[];sincronizarMapaAdmin(false);return}
    try{
      map.establecerVista?.(lat,lng,16);
      adminMapPreview=[{id:'local-preview',latitud:lat,longitud:lng,nombre:$('#localForm [name=NOMBRE]')?.value||'Local visitado en edición',direccion:$('#localAddress')?.value||'',activo:true,clase:'geo-admin-preview',detalle:`<b>Punto en edición</b><br>${esc($('#localAddress')?.value||'Dirección seleccionada')}<br>Radio ${radio} m`}];
      adminMapCirculos=[{id:'radio-preview',latitud:lat,longitud:lng,radio,etiqueta:`Radio ${radio} m`}];sincronizarMapaAdmin(false);
    }catch(e){console.debug('preview mapa local',e)}
  };
  ensureLocalMap();
  requestAnimationFrame(()=>localMap?.redibujar?.());
  // Si el navegador entrega ubicación rápidamente, centramos el mapa sin bloquear la carga.
  Promise.race([loc(),new Promise(r=>setTimeout(()=>r(null),900))]).then(g=>{if(!g||!localMap)return;const lat=numeroCoordenadaGeo(g.LATITUD),lng=numeroCoordenadaGeo(g.LONGITUD);if(coordenadaGeoValida(lat,lng)&&!String($('#localAddress')?.value||'').trim())localMap.establecerVista?.(lat,lng,13)}).catch(()=>{});
  bindGeoAddressAutocomplete($('#localAddress'),$('#localLat'),$('#localLng'),updateLocalPreview);$('#localRadius').oninput=updateLocalPreview;$('#localLat').onchange=updateLocalPreview;$('#localLng').onchange=updateLocalPreview;
  function pintarCatalogosRapidos(c){const supervisors=c?.SUPERVISORES||[];poblarSelectFiltrable($('#supSearch'),$('#supSelect'),supervisors,x=>{const v=x.MOVILIDAD?.VEHICULO;return `${x.NOMBRE||x.CORREO||x.ID} · ${x.JORNADA_REGIMEN||''}${x.ARTICULO_22==='SI'?' · Art. 22':''}${v?.ID?` · ${v.PATENTE||''} ${v.MODELO||''}`:''}`},{valueFn:x=>x.ID});poblarSelectFiltrable($('#adminSupSearch'),$('#adminSupFilter'),supervisors,x=>x.NOMBRE||x.CORREO||x.ID,{todos:'Todos los Supervisores',valueFn:x=>x.ID,onChange:renderControl})}
  const catalogosPromise=catalogosGeo().then(c=>{state.catalog=c;pintarCatalogosRapidos(c)}).catch(e=>console.debug('catálogos Geo Admin',e));
  const adminDateRange=()=>{
    const desde=$('#adminDateFrom')?.value||today(),hasta=$('#adminDateTo')?.value||plusDays(desde,6);
    if(!desde||!hasta)throw new Error('SELECCIONE_FECHA_DESDE_Y_HASTA');
    if(String(desde)>String(hasta))throw new Error('FECHA_DESDE_NO_PUEDE_SER_POSTERIOR_A_FECHA_HASTA');
    return{desde,hasta};
  };
  const aplicarFiltroFecha=async()=>{
    try{
      const rango=adminDateRange();
      await load();
      const status=$('#adminDateFilterStatus');
      if(status)status.textContent=`Período aplicado: ${rango.desde} a ${rango.hasta}`;
      toast(`Filtro de fecha aplicado · ${rango.desde} a ${rango.hasta}`);
    }catch(e){error(e)}
  };
  $('#reload').onclick=load;$('#adminNotify').onclick=abrirAvisoAdmin;$('#adminApplyDateFilter').onclick=aplicarFiltroFecha;
  ['adminDateFrom','adminDateTo'].forEach(id=>{const el=$('#'+id);if(el)el.addEventListener('keydown',ev=>{if(ev.key==='Enter'){ev.preventDefault();aplicarFiltroFecha()}})});
  $('#localForm').onsubmit=saveLocal;const lc=$('#localCode');if(lc){lc.onchange=completarLocalPorCodigo;lc.onblur=completarLocalPorCodigo;}cargarDatalistLocales();$('#planForm').onsubmit=savePlan;$('#adminLocalFilter').oninput=renderControl;await Promise.all([load(),catalogosPromise]);
  async function load(){try{setLoading(true);const rango=adminDateRange(),r=await request('geoLocalAdminResumen',{FECHA_DESDE:rango.desde,FECHA_HASTA:rango.hasta});state.data=r;$('#companyContext').innerHTML=empresaBar(r);const status=$('#adminDateFilterStatus');if(status)status.textContent=`Período activo: ${rango.desde} a ${rango.hasta}`;const supervisors=r.SUPERVISORES||[];poblarSelectFiltrable($('#supSearch'),$('#supSelect'),supervisors,x=>{const v=x.MOVILIDAD?.VEHICULO;return `${x.NOMBRE||x.CORREO||x.ID} · ${x.JORNADA_REGIMEN||''}${x.ARTICULO_22==='SI'?' · Art. 22':''}${v?.ID?` · ${v.PATENTE||''} ${v.MODELO||''}`:''}`},{valueFn:x=>x.ID});poblarSelectFiltrable($('#adminSupSearch'),$('#adminSupFilter'),supervisors,x=>x.NOMBRE||x.CORREO||x.ID,{todos:'Todos los Supervisores',valueFn:x=>x.ID,onChange:renderControl});$('#planLocales').innerHTML=(r.LOCALES||[]).map(l=>geoPlanLocalRow(l)).join('');filtrarNodos($('#localSearch'),$$('#planLocales .geo-check'));renderControl()}catch(e){error(e)}finally{setLoading(false)}}
  function renderControl(){
    const r=state.data||{},sid=$('#adminSupFilter')?.value||'',qLocal=normalizarFiltro($('#adminLocalFilter')?.value||''),supMap=new Map((r.SUPERVISORES||[]).map(x=>[x.ID,x])),lm=new Map((r.LOCALES||[]).map(x=>[x.ID,x]));
    const plans=(r.PLANIFICACIONES||[]).filter(p=>!sid||p.SUPERVISOR_USUARIO_ID===sid).sort((a,b)=>String(a.FECHA||'').localeCompare(String(b.FECHA||''))||String(a.SUPERVISOR_USUARIO_ID||'').localeCompare(String(b.SUPERVISOR_USUARIO_ID||'')));
    const planIds=new Set(plans.map(p=>p.ID)),details=(r.DETALLES||[]).filter(d=>planIds.has(d.PLANIFICACION_ID)),detailIds=new Set(details.map(d=>d.ID)),visits=(r.VISITAS||[]).filter(v=>detailIds.has(v.DETALLE_ID)),evidences=(r.EVIDENCIAS||[]).filter(e=>detailIds.has(e.DETALLE_ID)),vm=new Map(visits.map(v=>[v.DETALLE_ID,v])),em=new Map();for(const e of evidences)if(!em.has(e.DETALLE_ID))em.set(e.DETALLE_ID,e);
    const summary=`<div class="geo-table-wrap"><table class="geo-table"><thead><tr><th>Fecha</th><th>Supervisor</th><th>Movilidad</th><th>Jornada</th><th>Locales visitados</th><th>Completados</th><th>En visita</th><th>Evidencia</th><th>Estado</th></tr></thead><tbody>${plans.map(p=>{const ds=details.filter(d=>d.PLANIFICACION_ID===p.ID),ids=new Set(ds.map(d=>d.ID)),vs=visits.filter(v=>ids.has(v.DETALLE_ID)),visitados=ds.filter(d=>String(d.ESTADO||'').toUpperCase()==='VISITADO').length,enVisita=ds.filter(d=>String(d.ESTADO||'').toUpperCase().includes('EN_VIS')).length,evid=vs.filter(v=>String(v.EVIDENCIA_ESTADO||'').toUpperCase()==='COMPLETA').length,sup=supMap.get(p.SUPERVISOR_USUARIO_ID)||{};return `<tr><td>${esc(p.FECHA)}</td><td><b>${esc(sup.NOMBRE||sup.CORREO||p.SUPERVISOR_USUARIO_ID)}</b></td><td>${movilidadHtml(sup)}</td><td>${p.ARTICULO_22_SNAPSHOT==='SI'?'Art. 22':esc(p.JORNADA_REGIMEN_SNAPSHOT||'')}</td><td>${ds.length}<br><small>${p.MINUTOS_PLANIFICADOS||0}/${p.MINUTOS_DISPONIBLES||0} min</small></td><td>${visitados}/${ds.length}</td><td>${enVisita}</td><td>${evid}/${Math.max(vs.length,ds.length)}</td><td>${badge(p.ESTADO)}</td></tr>`}).join('')||`<tr><td colspan="9">Sin planificaciones para el filtro seleccionado.</td></tr>`}</tbody></table></div>`;
    const timelineCards=plans.map(p=>{const sup=supMap.get(p.SUPERVISOR_USUARIO_ID)||{},supervisor=sup.NOMBRE||sup.CORREO||p.SUPERVISOR_USUARIO_ID||'Supervisor',ds=details.filter(d=>d.PLANIFICACION_ID===p.ID).sort((a,b)=>Number(a.ORDEN||0)-Number(b.ORDEN||0)),visibles=ds.filter(d=>{if(!qLocal)return true;const l=lm.get(d.LOCAL_ID)||{},v=vm.get(d.ID)||{};return normalizarFiltro([l.NOMBRE,l.DIRECCION,l.REFERENCIA,d.ESTADO,v.OBSERVACIONES].join(' ')).includes(qLocal)});if(qLocal&&!visibles.length)return'';const visitados=ds.filter(d=>String(d.ESTADO||'').toUpperCase()==='VISITADO').length,enVisita=ds.filter(d=>String(d.ESTADO||'').toUpperCase().includes('EN_VIS')).length,llegadas=ds.map(d=>vm.get(d.ID)?.LLEGADA_EFECTIVA_EN).filter(Boolean).sort(),salidas=ds.map(d=>vm.get(d.ID)?.SALIDA_EFECTIVA_EN).filter(Boolean).sort(),totalPerm=ds.reduce((a,d)=>a+Number((d.TIEMPO_TOTAL_VISITAS_MINUTOS??vm.get(d.ID)?.PERMANENCIA_MINUTOS) || 0),0),totalTras=ds.reduce((a,d)=>a+Number(vm.get(d.ID)?.TRASLADO_DESDE_ANTERIOR_MINUTOS||0),0),visitasFisicas=ds.reduce((a,d)=>a+Number(d.VISITAS_DIA||0),0);
      const stages=visibles.map((d,index)=>{
        const l=lm.get(d.LOCAL_ID)||{},
              v=vm.get(d.ID)||{},
              e=em.get(d.ID),
              llegada=v.LLEGADA_EFECTIVA_EN||'',
              salida=v.SALIDA_EFECTIVA_EN||'',
              done=Boolean(salida)&&String(d.ESTADO||'').toUpperCase()==='VISITADO',
              started=Boolean(llegada),
              estadoDetalle=String(d.ESTADO||'').toUpperCase(),
              pending=estadoDetalle==='PENDIENTE',
              gestionable=!['VISITADO','CANCELADO','CANCELADA'].includes(estadoDetalle),
              origenSalida=v.SALIDA_MANUAL_EN?'Manual':v.SALIDA_AUTOMATICA_EN?'Geocerca automática':'Pendiente',
              cierreFuera=String(v.CIERRE_FUERA_UBICACION||'').toUpperCase()==='SI',
              cierreDireccion=v.CIERRE_DIRECCION||'',
              cierreLat=v.CIERRE_LATITUD??v.SALIDA_LATITUD,
              cierreLng=v.CIERRE_LONGITUD??v.SALIDA_LONGITUD,
              cierreDist=v.DISTANCIA_CIERRE_METROS??v.DISTANCIA_SALIDA_METROS,
              cierreFueraRadio=v.DISTANCIA_FUERA_RADIO_METROS,
              traceId=`geo-local-trace-${String(d.ID||index).replace(/[^a-zA-Z0-9_-]/g,'-')}`;

        return `<div class="${done?'completed':started?'active':'pending'} geo-local-trace-card" data-local-trace-card="${esc(String(d.ID||''))}">
          <i>${done?'✓':d.ORDEN||index+1}</i>
          <span class="geo-local-trace-content">
            <div class="geo-local-trace-summary">
              <div class="geo-local-trace-title">
                <b>${esc(l.NOMBRE||'Local visitado')}</b>
                ${geoStageStatus(d.ESTADO,started)}
              </div>

              <div class="geo-local-trace-mini-times">
                <span><small>Llegada</small><strong>${esc(time(llegada))}</strong></span>
                <span><small>Salida</small><strong>${esc(time(salida))}</strong></span>
              </div>

              <button type="button"
                class="geo-btn mini geo-local-trace-toggle"
                data-local-trace-toggle="${esc(String(d.ID||''))}"
                aria-expanded="false"
                aria-controls="${esc(traceId)}">Ver información</button>
            </div>

            <div class="geo-local-trace-detail" id="${esc(traceId)}" data-local-trace-detail hidden>
              <small class="geo-stage-address">${esc(l.DIRECCION||'')}</small>

              <div class="geo-stage-times">
                <span>
                  <small>Llegada</small>
                  <strong>${esc(time(llegada))}</strong>
                  <em>${esc(dateOnly(llegada))}</em>
                </span>
                <span>
                  <small>Permanencia total</small>
                  <strong>${d.TIEMPO_TOTAL_VISITAS_TEXTO||((d.TIEMPO_TOTAL_VISITAS_MINUTOS??v.PERMANENCIA_MINUTOS)!=null?`${d.TIEMPO_TOTAL_VISITAS_MINUTOS??v.PERMANENCIA_MINUTOS} min`:(started?'En curso':'—'))}</strong>
                  <em>Sumatoria dentro del perímetro</em>
                </span>
                <span>
                  <small>Traslado</small>
                  <strong>${v.TRASLADO_DESDE_ANTERIOR_MINUTOS??'—'}${v.TRASLADO_DESDE_ANTERIOR_MINUTOS!=null?' min':''}</strong>
                  <em>Desde punto anterior</em>
                </span>
                <span>
                  <small>Salida</small>
                  <strong>${esc(time(salida))}</strong>
                  <em>${esc(origenSalida)}</em>
                </span>
              </div>

              ${cierreFuera?`<div class="geo-close-outside">
                <b>Finalización fuera de ubicación planificada</b>
                <span>${esc(cierreDireccion||'Dirección no resuelta')}</span>
                <span>Coordenadas de término: ${Number(cierreLat).toFixed(6)}, ${Number(cierreLng).toFixed(6)}</span>
                <span>Distancia al Local: ${Number(cierreDist||0).toFixed(0)} m${cierreFueraRadio!=null?` · fuera del radio: ${Number(cierreFueraRadio).toFixed(0)} m`:''}</span>
              </div>`:''}

              <div class="geo-local-trace-detail-actions">
                ${e?`<button class="geo-btn mini" data-evidence="${esc(e.ID)}">Ver foto</button>`:`<em class="geo-evidence-label">Evidencia: ${esc(v.EVIDENCIA_ESTADO||'PENDIENTE')}</em>`}
                <em class="geo-evidence-label"><b>Visitas detectadas hoy: ${Number(d.VISITAS_DIA||0)}</b></em>
              </div>

              ${geoAdminLineaTiempoDetalle(d)}

              <div class="geo-local-trace-admin-actions">
                ${pending?`<button class="geo-btn mini" data-reassign-detail="${esc(d.ID)}" data-plan="${esc(p.ID)}" data-source="${esc(p.SUPERVISOR_USUARIO_ID)}" data-date="${esc(p.FECHA)}">Reasignar visita</button>`:''}
                ${gestionable?`<button class="geo-btn mini warn" data-cancel-detail="${esc(d.ID)}">Cancelar punto</button><button class="geo-btn mini danger" data-delete-detail="${esc(d.ID)}">Eliminar punto</button>`:''}
              </div>

              ${v.OBSERVACIONES||d.MOTIVO_NO_VISITA?`<em class="geo-local-trace-observation">${esc(v.OBSERVACIONES||d.MOTIVO_NO_VISITA)}</em>`:''}
            </div>
          </span>
        </div>`;
      }).join('');
      const traceId=`geo-trace-${String(p.ID||`${p.SUPERVISOR_USUARIO_ID||'sup'}-${p.FECHA||''}`).replace(/[^a-zA-Z0-9_-]/g,'-')}`;
      return `<article class="geo-trace-card geo-trace-compact" data-trace-card="${esc(String(p.ID||''))}">
        <div class="geo-trace-compact-bar">
          <div class="geo-trace-compact-main">
            <div class="geo-eyebrow">Trazabilidad · ${esc(p.FECHA||'')}</div>
            <h3>${esc(supervisor)}</h3>
            <div class="geo-trace-compact-chips">
              <span><b>${visitados}/${ds.length}</b> visitados</span>
              <span><b>${enVisita}</b> en visita</span>
              <span><b>${visitasFisicas}</b> visita${visitasFisicas===1?'':'s'} detectada${visitasFisicas===1?'':'s'}</span>
              ${qLocal?`<span class="geo-trace-filter-chip"><b>${visibles.length}</b> coincidencia${visibles.length===1?'':'s'}</span>`:''}
            </div>
          </div>
          <div class="geo-trace-compact-side">
            ${badge(p.ESTADO)}
            <button
              type="button"
              class="geo-btn geo-trace-toggle"
              data-trace-toggle="${esc(String(p.ID||''))}"
              aria-expanded="false"
              aria-controls="${esc(traceId)}">Ver información</button>
          </div>
        </div>
        <div class="geo-trace-body" id="${esc(traceId)}" data-trace-body hidden>
          <div class="geo-trace-detail-intro">
            ${movilidadHtml(sup)}
            <p>Llegada, traslado, permanencia, salida, evidencia y acciones administrativas de cada Local visitado.</p>
          </div>
          <div class="geo-trace-kpis">
            <span><small>Asignados</small><b>${ds.length}</b></span>
            <span><small>Visitados</small><b>${visitados}</b></span>
            <span><small>En visita</small><b>${enVisita}</b></span>
            <span><small>Primera llegada</small><b>${esc(time(llegadas[0]))}</b></span>
            <span><small>Última salida</small><b>${esc(time(salidas.at(-1)))}</b></span>
            <span><small>Permanencia total</small><b>${totalPerm} min</b></span>
            <span><small>Traslado total</small><b>${totalTras} min</b></span>
            <span><small>Visitas detectadas</small><b>${visitasFisicas}</b></span>
          </div>
          <div class="geo-trace-actions">
            <button class="geo-btn" data-notify-sup="${esc(p.SUPERVISOR_USUARIO_ID)}" data-plan="${esc(p.ID)}">Enviar alerta</button>
            <button class="geo-btn" data-reassign-day="${esc(p.ID)}" data-source="${esc(p.SUPERVISOR_USUARIO_ID)}" data-date="${esc(p.FECHA)}">Reasignar pendientes del día</button>
            <button class="geo-btn dark" data-reassign-week="${esc(p.ID)}" data-source="${esc(p.SUPERVISOR_USUARIO_ID)}" data-date="${esc(p.FECHA)}">Reasignar semana</button>
          </div>
          <div class="geo-route-timeline" aria-label="Trazabilidad de Locales visitados de ${esc(supervisor)}">${stages||empty('Sin Locales visitados que coincidan con el filtro.')}</div>
        </div>
      </article>`}).filter(Boolean).join('');
    $('#adminTable').innerHTML=summary+`<h3 class="geo-trace-title">Trazabilidad por Supervisor</h3><p class="geo-trace-subtitle">Vista compacta. Pulse <b>Ver información</b> para desplegar la trazabilidad completa de un Supervisor.</p>${timelineCards||empty('Sin trazabilidad para el filtro seleccionado.')}`;reconstruirPuntosProgramados(adminMapProgramados.length===0);
    $$('[data-trace-toggle]').forEach(b=>b.onclick=()=>{
      const card=b.closest('.geo-trace-card'),body=card?.querySelector('[data-trace-body]');
      if(!card||!body)return;
      const abrir=body.hidden;
      if(abrir){
        $$('.geo-trace-card.geo-trace-expanded').forEach(otra=>{
          if(otra===card)return;
          otra.classList.remove('geo-trace-expanded');
          const otroBody=otra.querySelector('[data-trace-body]'),otroBtn=otra.querySelector('[data-trace-toggle]');
          if(otroBody)otroBody.hidden=true;
          if(otroBtn){otroBtn.setAttribute('aria-expanded','false');otroBtn.textContent='Ver información'}
        });
      }
      body.hidden=!abrir;
      card.classList.toggle('geo-trace-expanded',abrir);
      b.setAttribute('aria-expanded',abrir?'true':'false');
      b.textContent=abrir?'Ocultar información':'Ver información';
      if(abrir){
        requestAnimationFrame(()=>card.scrollIntoView({behavior:'smooth',block:'nearest'}));
      }
    });
    $$('[data-local-trace-toggle]').forEach(b=>b.onclick=()=>{
      const card=b.closest('.geo-local-trace-card');
      const detail=card?.querySelector('[data-local-trace-detail]');
      if(!card||!detail)return;

      const abrir=detail.hidden;

      if(abrir){
        const timeline=card.closest('.geo-route-timeline');
        timeline?.querySelectorAll('.geo-local-trace-card.geo-local-trace-expanded').forEach(otra=>{
          if(otra===card)return;
          otra.classList.remove('geo-local-trace-expanded');
          const d=otra.querySelector('[data-local-trace-detail]');
          const bt=otra.querySelector('[data-local-trace-toggle]');
          if(d)d.hidden=true;
          if(bt){
            bt.setAttribute('aria-expanded','false');
            bt.textContent='Ver información';
          }
        });
      }

      detail.hidden=!abrir;
      card.classList.toggle('geo-local-trace-expanded',abrir);
      b.setAttribute('aria-expanded',abrir?'true':'false');
      b.textContent=abrir?'Ocultar información':'Ver información';
    });
    $$('[data-evidence]').forEach(b=>b.onclick=async()=>{try{const x=await request('geoLocalEvidenciaUrl',{EVIDENCIA_ID:b.dataset.evidence});if(x.url)window.open(x.url,'_blank','noopener')}catch(e){error(e)}});$$('[data-notify-sup]').forEach(b=>b.onclick=()=>abrirAvisoAdmin(b.dataset.notifySup,b.dataset.plan));$$('[data-reassign-detail]').forEach(b=>b.onclick=()=>abrirReasignacion({source:b.dataset.source,date:b.dataset.date,scope:'VISITAS_PENDIENTES',detailIds:[b.dataset.reassignDetail]}));$$('[data-cancel-detail]').forEach(b=>b.onclick=()=>abrirGestionPunto(b.dataset.cancelDetail,'CANCELAR'));$$('[data-delete-detail]').forEach(b=>b.onclick=()=>abrirGestionPunto(b.dataset.deleteDetail,'ELIMINAR'));$$('[data-reassign-day]').forEach(b=>b.onclick=()=>abrirReasignacion({source:b.dataset.source,date:b.dataset.date,scope:'DIA_COMPLETO'}));$$('[data-reassign-week]').forEach(b=>b.onclick=()=>abrirReasignacion({source:b.dataset.source,date:b.dataset.date,scope:'SEMANA_COMPLETA'}));
  }
  async function abrirGestionPunto(detalleId,operacion){
    const eliminar=operacion==='ELIMINAR',overlay=document.createElement('div');overlay.className='geo-forced-overlay';overlay.innerHTML=`<div class="geo-forced-card">${geoDialogHead(eliminar?'🗑':'×','Geo Planificador Admin',eliminar?'Eliminar punto':'Cancelar punto',eliminar?'El punto se retirará de la planificación. La acción queda auditada y no se permite sobre puntos ya visitados.':'El punto quedará cancelado, visible en trazabilidad y se notificará al Supervisor.')}<div class="geo-dialog-body"><div class="geo-dialog-alert ${eliminar?'warn':''}">Acción exclusiva de Administración/Gerencia dentro de la misma empresa.</div><label class="geo-field"><span>Motivo obligatorio</span><textarea id="pointManageReason" placeholder="Indique el motivo de esta acción"></textarea></label></div><div class="buttons"><button class="geo-btn ${eliminar?'danger':'warn'}" id="pointManageConfirm">${eliminar?'Eliminar punto':'Cancelar punto'}</button><button class="geo-btn" id="pointManageBack">Volver</button></div></div>`;document.body.appendChild(overlay);$('#pointManageBack').onclick=()=>overlay.remove();$('#pointManageConfirm').onclick=async()=>{const motivo=$('#pointManageReason').value.trim();if(motivo.length<3)return toast('Ingrese el motivo de la acción.');try{setLoading(true);await request('geoLocalGestionarPunto',{DETALLE_ID:detalleId,OPERACION:operacion,MOTIVO:motivo});overlay.remove();toast(eliminar?'Punto eliminado y auditado.':'Punto cancelado y auditado.');await load()}catch(e){error(e)}finally{setLoading(false)}};
  }
  async function abrirAvisoAdmin(preselect='',planId=''){
    const supervisors=state.data?.SUPERVISORES||state.catalog?.SUPERVISORES||[];if(!supervisors.length)return toast('No existen Supervisores disponibles.');const overlay=document.createElement('div');overlay.className='geo-forced-overlay';overlay.innerHTML=`<div class="geo-forced-card">${geoDialogHead('🔔','Geo Planificador Admin','Enviar alerta / notificación','La entrega se realiza dentro y fuera de la app. WhatsApp usa el canal configurado o abre el envío directo como respaldo.')}<div class="geo-dialog-body"><div class="geo-combo-grid"><label class="geo-field"><span>Buscar Supervisor</span><input id="notifySearch" type="search" placeholder="Nombre, correo, ID o patente"></label><label class="geo-field"><span>Supervisor</span><select id="notifySup"></select></label></div><label class="geo-field"><span>Tipo</span><select id="notifyType"><option value="ALERTA_EMERGENTE">Alerta emergente</option><option value="NOTIFICACION">Notificación</option></select></label><label class="geo-field"><span>Título</span><input id="notifyTitle" value="Geo Planificador · Asignación"></label><label class="geo-field"><span>Mensaje</span><textarea id="notifyMessage" placeholder="Escriba la instrucción o aviso para el Supervisor"></textarea></label><label class="geo-checkbox-line"><input id="notifyWhatsapp" type="checkbox"><span>Enviar también por WhatsApp</span></label><div id="notifyMobility" class="geo-dialog-alert"></div></div><div class="buttons"><button class="geo-btn primary" id="notifySend">Enviar</button><button class="geo-btn" id="notifyCancel">Cancelar</button></div></div>`;document.body.appendChild(overlay);const ctl=poblarSelectFiltrable($('#notifySearch'),$('#notifySup'),supervisors,x=>{const v=x.MOVILIDAD?.VEHICULO;return `${x.NOMBRE||x.CORREO||x.ID}${v?.ID?` · ${v.PATENTE||''} ${v.MODELO||''}`:''}`},{valueFn:x=>x.ID,onChange:id=>{const u=supervisors.find(x=>x.ID===id);$('#notifyMobility').innerHTML=u?movilidadHtml(u):''}});if(preselect)ctl.seleccionar(preselect);$('#notifySup').dispatchEvent(new Event('change'));$('#notifyCancel').onclick=()=>overlay.remove();$('#notifySend').onclick=async()=>{const sid=$('#notifySup').value,msg=$('#notifyMessage').value.trim();if(!sid)return toast('Seleccione un Supervisor.');if(msg.length<2)return toast('Escriba el mensaje.');try{setLoading(true);const out=await request('geoLocalEnviarAvisoSupervisor',{SUPERVISOR_USUARIO_ID:sid,PLANIFICACION_ID:planId,TIPO:$('#notifyType').value,TITULO:$('#notifyTitle').value.trim(),MENSAJE:msg,WHATSAPP:$('#notifyWhatsapp').checked?'SI':'NO'});overlay.remove();toast(`Aviso enviado · WhatsApp ${out.WHATSAPP_ESTADO||'NO SOLICITADO'}`);if(out.WHATSAPP_URL)window.open(out.WHATSAPP_URL,'_blank','noopener')}catch(e){error(e)}finally{setLoading(false)}}
  }
  async function abrirReasignacion({source,date,scope,detailIds=[]}){const supervisors=(state.data?.SUPERVISORES||[]).filter(x=>x.ID!==source);if(!supervisors.length)return toast('No existe otro Supervisor disponible.');const overlay=document.createElement('div');overlay.className='geo-forced-overlay';overlay.innerHTML=`<div class="geo-forced-card">${geoDialogHead('⇄','Reasignación auditada',scope==='VISITAS_PENDIENTES'?'Reasignar visita pendiente':scope==='SEMANA_COMPLETA'?'Reasignar pendientes de la semana':'Reasignar pendientes del día','Seleccione un Supervisor de la misma empresa. La reasignación se registra como emergencia y estas visitas no exigirán un nuevo Check-in al Supervisor destino.')}<div class="geo-dialog-body"><div class="geo-combo-grid"><label class="geo-field"><span>Filtro rápido Supervisor destino</span><input id="reassignSearch" type="search" placeholder="Nombre, correo o ID"></label><label class="geo-field"><span>Supervisor destino</span><select id="reassignSup"></select></label></div><label class="geo-field"><span>Motivo obligatorio</span><textarea id="reassignReason" placeholder="Indique el motivo de la reasignación"></textarea></label></div><div class="buttons"><button class="geo-btn primary" id="reassignConfirm">Confirmar reasignación</button><button class="geo-btn" id="reassignCancel">Cancelar</button></div></div>`;document.body.appendChild(overlay);poblarSelectFiltrable($('#reassignSearch'),$('#reassignSup'),supervisors,x=>x.NOMBRE||x.CORREO||x.ID,{valueFn:x=>x.ID});$('#reassignCancel').onclick=()=>overlay.remove();$('#reassignConfirm').onclick=async()=>{const reason=$('#reassignReason').value.trim(),dest=$('#reassignSup').value;if(!dest)return toast('Seleccione Supervisor destino.');if(reason.length<3)return toast('Ingrese el motivo.');try{setLoading(true);await request('geoLocalReasignar',{SUPERVISOR_ORIGEN_ID:source,SUPERVISOR_DESTINO_ID:dest,ALCANCE:scope,FECHA:date,FECHA_INICIO:date,FECHA_FIN:plusDays(date,6),DETALLE_IDS:detailIds,MOTIVO:reason,EMERGENCIA:'SI'});overlay.remove();toast('Reasignación completada y auditada.');await load()}catch(e){error(e)}finally{setLoading(false)}}}
  async function saveLocal(ev){ev.preventDefault();const form=ev.currentTarget||$('#localForm');try{setLoading(true);if(!form)throw new Error('FORMULARIO_LOCAL_NO_DISPONIBLE');const d=Object.fromEntries(new FormData(form).entries());await request('geoLocalGuardarLocal',d);form.reset();const radius=$('#localRadius');if(radius)radius.value='100';adminMapPreview=[];adminMapCirculos=[];sincronizarMapaAdmin(false);toast('Local visitado guardado correctamente.');await load()}catch(e){error(e)}finally{setLoading(false)}}
  async function savePlan(ev){ev.preventDefault();try{const f=ev.currentTarget,base=Object.fromEntries(new FormData(f).entries()),items=$$('#planLocales .geo-check').filter(x=>$('input[type=checkbox]',x).checked).map(x=>({LOCAL_ID:$('input[type=checkbox]',x).value,DURACION_ESTIMADA_MIN:$('[data-duration]',x).value,TRASLADO_ESTIMADO_MIN:$('[data-travel]',x).value,HORA_OBJETIVO:$('[data-hour]',x).value}));if(!base.SUPERVISOR_USUARIO_ID)throw new Error('SELECCIONE_SUPERVISOR');if(!items.length)throw new Error('SELECCIONE_LOCALES_VISITADOS');setLoading(true);if(base.TIPO_PLANIFICACION==='SEMANAL')await request('geoLocalGuardarPlanificacionSemanal',{...base,FECHA_INICIO:base.FECHA,FECHA_FIN:$('#planEnd').value,LOCALES:items});else await request('geoLocalGuardarPlanificacion',{...base,LOCALES:items});toast('Planificación guardada y enviada al Supervisor.');await load()}catch(e){error(e)}finally{setLoading(false)}}
}

async function initMap(){
  await session();if(!isAdmin())return $('#geoApp').innerHTML=empty('Acceso exclusivo de Administración y Gerencia.');
  const root=$('#geoApp');root.innerHTML=header('Mapa Geo Local','Puntos asignados, Supervisor en tiempo real y recorrido GPS en una sola vista.','<button class="geo-btn" id="reload">Actualizar</button>')+`<div id="companyContext"></div><section class="geo-card geo-map-filter-card"><div class="geo-toolbar"><label class="geo-field"><span>Fecha</span><input id="mapDate" type="date" value="${today()}"></label><label class="geo-field"><span>Buscar Supervisor</span><input id="mapSupSearch" type="search" placeholder="Nombre, correo, ID o patente"></label><label class="geo-field"><span>Supervisor</span><select id="mapSup"><option value="">Cargando Supervisores…</option></select></label><button class="geo-btn primary" id="filter">Filtrar</button></div></section><section class="geo-card geo-map-card"><div class="geo-map-head"><div><h2>Recorrido y Locales visitados</h2><small>Amarillo: visitado · Rojo: pendiente · Verde: Supervisor en línea. La línea verde conserva el recorrido realizado.</small></div><div class="geo-map-legend"><span><i class="visited"></i> Visitado</span><span><i class="bad"></i> Pendiente</span><span><i class="live"></i> Supervisor en línea</span></div></div><div class="geo-map geo-map-live" id="map"><div class="geo-empty">Preparando mapa…</div></div><div class="geo-map-status" id="mapStatus">Mapa listo · consultando puntos…</div></section><div class="geo-card" style="margin-top:16px"><h2>Detalle de Locales visitados</h2><div id="mapTable">${empty('Cargando Locales visitados asignados…')}</div></div>`;
  let mapLoadSeq=0,liveTimer=null,trailTimer=null;state.mapLocals=[];state.mapLive=[];state.map=new window.MapaFlotas($('#map'),{centro:[-33.4489,-70.6693],nivel:11,estilo:'claro-rapido'});
  const stopTimers=()=>{clearInterval(liveTimer);clearInterval(trailTimer);liveTimer=trailTimer=null};window.addEventListener('beforeunload',stopTimers,{once:true});
  $('#reload').onclick=load;$('#filter').onclick=load;$('#mapDate').onchange=load;catalogosGeo().then(c=>poblarSelectFiltrable($('#mapSupSearch'),$('#mapSup'),c.SUPERVISORES||[],x=>{const v=x.MOVILIDAD?.VEHICULO;return `${x.NOMBRE||x.CORREO||x.ID}${v?.ID?` · ${v.PATENTE||''} ${v.MODELO||''}`:''}`},{todos:'Todos los Supervisores',valueFn:x=>x.ID,onChange:()=>load()})).catch(e=>console.debug('catálogos mapa',e));await new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));await load();
  function renderMarkers(ajustar=false){state.map.actualizarMarcadores([...(state.mapLocals||[]),...(state.mapLive||[])],ajustar)}
  function localMarker(x){return{id:`local-${x.ID}`,latitud:Number(x.LATITUD),longitud:Number(x.LONGITUD),nombre:`${x.ESTADO==='VISITADO'?'✓':'✕'} ${x.TITULO}`,direccion:x.SUBTITULO,activo:false,seguido:false,clase:x.ESTADO==='VISITADO'?'geo-local-visitado':'geo-local-pendiente',detalle:`<b>Local visitado: ${esc(x.TITULO)}</b><br>${esc(x.SUBTITULO)}<br>Estado: ${esc(x.ESTADO)}<br>Llegada: ${esc(fmt(x.LLEGADA))}<br>Salida: ${esc(fmt(x.SALIDA))}<br>Permanencia: ${esc(x.PERMANENCIA_MINUTOS??'—')} min`}}
  function liveMarker(x){const v=x.VEHICULO||{},c=x.CHECKIN||{},online=x.EN_LINEA===true||String(x.EN_LINEA).toUpperCase()==='SI';return{id:`supervisor-live-${x.SUPERVISOR_USUARIO_ID}`,latitud:Number(x.LATITUD),longitud:Number(x.LONGITUD),nombre:`${online?'●':'○'} ${x.SUPERVISOR_NOMBRE||'Supervisor'}`,direccion:online?'En línea':'Última posición',activo:online,seguido:online,clase:online?'geo-supervisor-live':'geo-supervisor-offline',detalle:`<b>${esc(x.SUPERVISOR_NOMBRE||'Supervisor')}</b><br>${online?'En línea':'Última posición'} · ${esc(fmt(x.FECHA_HORA))}<br>Vehículo: ${v.ID?`${esc(v.PATENTE||'—')} · ${esc(v.MODELO||'—')}`:'Sin vehículo asignado'}<br>Check-in: ${c.APROBADO?'Aprobado':'Pendiente/no vigente'}<br>Precisión: ${esc(x.PRECISION_METROS??'—')} m`}}
  async function load(){const seq=++mapLoadSeq;stopTimers();const status=$('#mapStatus');if(status)status.textContent='Actualizando puntos del mapa…';try{const payload={FECHA:$('#mapDate').value,SUPERVISOR_USUARIO_ID:$('#mapSup')?.value||'',INCLUIR_RASTROS:'NO'},r=await request('geoLocalMapa',payload);if(seq!==mapLoadSeq)return;$('#companyContext').innerHTML=empresaBar(r);state.mapLocals=(r.MARCADORES||[]).filter(x=>Number.isFinite(Number(x.LATITUD))&&Number.isFinite(Number(x.LONGITUD))).map(localMarker);state.mapLive=(r.SUPERVISORES_TIEMPO_REAL||[]).filter(x=>Number.isFinite(Number(x.LATITUD))&&Number.isFinite(Number(x.LONGITUD))).map(liveMarker);renderMarkers(true);renderTable(r);if(status)status.textContent=`${state.mapLocals.length} local(es) · ${state.mapLive.length} Supervisor(es) posicionados · cargando recorrido…`;setTimeout(()=>cargarRastros({...payload,SOLO_RASTROS:'SI',INCLUIR_RASTROS:'SI'},seq),0);liveTimer=setInterval(()=>cargarTiempoReal(payload,seq),5000);trailTimer=setInterval(()=>cargarRastros({...payload,SOLO_RASTROS:'SI',INCLUIR_RASTROS:'SI'},seq),15000)}catch(e){if(status)status.textContent='No fue posible actualizar el mapa.';error(e)}}
  function renderTable(r){$('#mapTable').innerHTML=`<div class="geo-table-wrap"><table class="geo-table"><thead><tr><th>Local visitado</th><th>Estado</th><th>Llegada</th><th>Salida</th><th>Permanencia</th></tr></thead><tbody>${(r.MARCADORES||[]).map(x=>`<tr><td><b>${esc(x.TITULO)}</b><br><small>${esc(x.SUBTITULO)}</small></td><td>${geoMapBadge(x.ESTADO)}</td><td>${fmt(x.LLEGADA)}</td><td>${fmt(x.SALIDA)}</td><td>${x.PERMANENCIA_MINUTOS??'—'} min</td></tr>`).join('')||`<tr><td colspan="5">Sin Locales visitados planificados para el filtro.</td></tr>`}</tbody></table></div>`}
  async function cargarTiempoReal(payload,seq=mapLoadSeq){try{const r=await request('geoLocalMapa',{...payload,SOLO_TIEMPO_REAL:'SI',INCLUIR_RASTROS:'NO'});if(seq!==mapLoadSeq)return;state.mapLive=(r.SUPERVISORES_TIEMPO_REAL||[]).filter(x=>Number.isFinite(Number(x.LATITUD))&&Number.isFinite(Number(x.LONGITUD))).map(liveMarker);renderMarkers(false);const status=$('#mapStatus');if(status)status.textContent=`${state.mapLocals.length} local(es) · ${state.mapLive.length} Supervisor(es) · tiempo real ${new Intl.DateTimeFormat('es-CL',{hour:'2-digit',minute:'2-digit',second:'2-digit'}).format(new Date())}` }catch(e){console.debug('tiempo real Geo Local',e)}}
  async function cargarRastros(payload,seq=mapLoadSeq){try{const r=await request('geoLocalMapa',payload);if(seq!==mapLoadSeq)return;const rastros=(r.RASTROS||[]).map(x=>({id:x.SUPERVISOR_USUARIO_ID,clase:'geo-supervisor-rastro',maxPuntos:1000,puntos:(x.PUNTOS||[]).map(p=>({latitud:Number(p.LATITUD),longitud:Number(p.LONGITUD)}))}));state.map.actualizarRastros(rastros)}catch(e){console.debug('rastros Geo Local',e)}}
}

async function initKpi(){
  await session();if(!isAdmin())return $('#geoApp').innerHTML=empty('Acceso exclusivo de Administración y Gerencia.');
  const root=$('#geoApp');root.innerHTML=header('KPI Geo Locales','Centro ejecutivo de productividad, cumplimiento, tiempos, evidencia y ranking.','<button class="geo-btn" onclick="window.print()">Imprimir</button><button class="geo-btn" id="csv">CSV</button>')+`<div class="geo-toolbar"><label class="geo-field"><span>Desde</span><input id="from" type="date" value="${today()}"></label><label class="geo-field"><span>Hasta</span><input id="to" type="date" value="${today()}"></label><label class="geo-field"><span>Buscar Supervisor</span><input id="supSearch" type="search" placeholder="Nombre, correo o ID"></label><label class="geo-field"><span>Supervisor</span><select id="sup"><option value="">Todos los Supervisores</option></select></label><button id="filter" class="geo-btn primary">Aplicar</button></div><div id="kpiBody"></div>`;$('#filter').onclick=load;$('#csv').onclick=csv;const cat=catalogosGeo().then(c=>poblarSelectFiltrable($('#supSearch'),$('#sup'),c.SUPERVISORES||[],x=>x.NOMBRE||x.CORREO||x.ID,{todos:'Todos los Supervisores',valueFn:x=>x.ID})).catch(e=>console.debug('catálogos KPI',e));await Promise.all([load(),cat]);
  async function load(){try{setLoading(true);const r=await request('geoLocalKpis',{FECHA_DESDE:$('#from').value,FECHA_HASTA:$('#to').value,SUPERVISOR_USUARIO_ID:$('#sup')?.value||''});state.data=r;render(r)}catch(e){error(e)}finally{setLoading(false)}}
  function render(r){const k=r.RESUMEN||{},close=k.CIERRE_CUMPLIMIENTO??(k.CIERRES_TOTAL?100*(k.CIERRES_COMPLETOS||0)/k.CIERRES_TOTAL:0);$('#kpiBody').innerHTML=empresaBar(r)+`<div class="geo-grid kpis">${ring('Cumplimiento',k.CUMPLIMIENTO||0,'#000000',`${k.VISITADOS||0}/${k.ASIGNADOS||0}`)}${ring('Puntualidad',k.PUNTUALIDAD||0,'#2563eb')}${ring('Evidencia fotográfica',k.EVIDENCIA_CUMPLIMIENTO||0,'#7c3aed')}${ring('Cierre de jornada',close,'#000000',`${k.CIERRES_COMPLETOS||0}/${k.CIERRES_TOTAL||0}`)}</div><div class="geo-grid geo-metrics">${metric('Permanencia promedio',`${k.PERMANENCIA_PROMEDIO_MIN||0} min`,'Tiempo dentro del Local visitado')}${metric('Traslado promedio',`${k.TRASLADO_PROMEDIO_MIN||0} min`,'Entre Locales visitados')}${metric('Tiempo completar jornada',`${k.TIEMPO_TOTAL_COMPLETAR_PROMEDIO_MIN||0} min`,'Primera llegada → última salida')}${metric('Locales por hora',k.LOCALES_POR_HORA||0,'Productividad efectiva')}${metric('Distancia recorrida',`${k.DISTANCIA_RECORRIDA_KM||0} km`,'Trazado GPS Geo Planificador')}${metric('Exceso permanencia',`${k.EXCESO_PERMANENCIA_PROMEDIO_MIN||0} min`,'Sobre tiempo planificado')}</div><div class="geo-two"><section class="geo-card"><h2>Ranking de Supervisores</h2><div class="geo-bars">${(r.RANKING||[]).map(x=>`<div class="geo-bar-row"><b>${esc(x.NOMBRE)}</b><div class="geo-bar-track"><div class="geo-bar-fill" style="width:${Math.min(100,x.PUNTAJE||0)}%"></div></div><strong>${x.PUNTAJE||0}</strong></div>`).join('')||empty('Sin datos')}</div></section><section class="geo-card"><h2>Tendencia de cumplimiento</h2><div class="geo-bars">${(r.TENDENCIA||[]).map(x=>`<div class="geo-bar-row"><b>${esc(x.FECHA)}</b><div class="geo-bar-track"><div class="geo-bar-fill" style="width:${x.CUMPLIMIENTO||0}%"></div></div><strong>${x.CUMPLIMIENTO||0}%</strong></div>`).join('')||empty('Sin datos')}</div></section></div><section class="geo-card" style="margin-top:16px"><h2>Causas de incumplimiento</h2>${(r.CAUSAS_INCUMPLIMIENTO||[]).length?`<div class="geo-bars">${r.CAUSAS_INCUMPLIMIENTO.map(x=>`<div class="geo-bar-row"><b>${esc(x.CAUSA)}</b><div class="geo-bar-track"><div class="geo-bar-fill bad" style="width:${Math.min(100,100*x.CANTIDAD/Math.max(1,k.NO_VISITADOS||1))}%"></div></div><strong>${x.CANTIDAD}</strong></div>`).join('')}</div>`:empty('Sin incumplimientos en el período.')}</section><section class="geo-card" style="margin-top:16px"><h2>Tabla estadística</h2><div class="geo-table-wrap"><table class="geo-table"><thead><tr><th>Supervisor</th><th>Asignados</th><th>Visitados</th><th>Cumpl.</th><th>Puntual.</th><th>Evidencia</th><th>Permanencia</th><th>Traslado</th><th>Loc/h</th><th>Puntaje</th></tr></thead><tbody>${(r.TABLA||[]).map(x=>`<tr><td>${esc(x.NOMBRE)}</td><td>${x.ASIGNADOS}</td><td>${x.VISITADOS}</td><td>${x.CUMPLIMIENTO}%</td><td>${x.PUNTUALIDAD}%</td><td>${x.EVIDENCIA}%</td><td>${x.PERMANENCIA_PROMEDIO} min</td><td>${x.TRASLADO_PROMEDIO} min</td><td>${x.LOCALES_POR_HORA}</td><td><b>${x.PUNTAJE}</b></td></tr>`).join('')}</tbody></table></div></section>`}
  function csv(){const rows=state.data?.TABLA||[];if(!rows.length)return;const cols=['NOMBRE','ASIGNADOS','VISITADOS','CUMPLIMIENTO','PUNTUALIDAD','EVIDENCIA','PERMANENCIA_PROMEDIO','TRASLADO_PROMEDIO','TIEMPO_TOTAL_PROMEDIO','LOCALES_POR_HORA','EXCESO_PROMEDIO','PUNTAJE'],e=state.data?.EMPRESA||{},txt=[`Empresa SGF;${String(e.NOMBRE||'').replaceAll(';',',')}`,`RUT;${String(e.RUT||'').replaceAll(';',',')}`,`ID empresa;${String(e.ID||'').replaceAll(';',',')}`,'',cols.join(';'),...rows.map(r=>cols.map(c=>String(r[c]??'').replaceAll(';',',')).join(';'))].join('\n'),a=document.createElement('a');a.href=URL.createObjectURL(new Blob(['\ufeff'+txt],{type:'text/csv'}));a.download=`KPI_GEO_LOCALES_${today()}.csv`;a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000)}
}

async function initSchedule(){
  await session();
  const root=$('#geoApp'),admin=isAdmin(),params=new URLSearchParams(location.search),
    presetUser=params.get('usuario')||params.get('usuario_id')||sessionStorage.getItem('sgf_malla_usuario_v1')||'';
  try{sessionStorage.removeItem('sgf_malla_usuario_v1')}catch(_){}
  root.innerHTML=header('Malla de Turnos','Horario individual conectado a la planificación Geo Local.',
    `<button class="geo-btn" id="printSchedule">Imprimir / PDF</button>${admin?'<button class="geo-btn primary" id="programDay">Programar día</button>':''}`)
    +`<div class="geo-toolbar">${admin?'<label class="geo-field"><span>Buscar usuario</span><input id="userSearch" type="search" placeholder="Nombre, correo, rol o ID"></label><label class="geo-field"><span>Usuario</span><select id="userId"></select></label>':''}<label class="geo-field"><span>Desde</span><input id="from" type="date" value="${today()}"></label><label class="geo-field"><span>Hasta</span><input id="to" type="date" value="${plusDays(today(),30)}"></label><button class="geo-btn primary" id="load">Ver malla</button></div><div id="scheduleBody"></div>`;

  $('#load').onclick=load;
  $('#printSchedule').onclick=printSchedule;
  if(admin)$('#programDay').onclick=programDay;

  if(admin){
    try{
      const c=await catalogosGeo(),
        ctl=poblarSelectFiltrable($('#userSearch'),$('#userId'),c.USUARIOS||[],
          x=>`${x.NOMBRE||x.CORREO||x.ID} · ${x.ROL_NOMBRE||x.ROL_ID||''}`,{valueFn:x=>x.ID});
      if(presetUser)ctl.seleccionar(presetUser)
    }catch(e){error(e)}
  }
  await load();

  async function load(){
    try{
      const r=await request('jornadaMalla',{
        USUARIO_ID:admin?$('#userId')?.value||'':'',
        FECHA_DESDE:$('#from').value,FECHA_HASTA:$('#to').value
      }),u=r.USUARIO||{};
      $('#scheduleBody').innerHTML=empresaBar(r)+`<div class="geo-card">
        <div class="geo-print-only"><h1>Malla de Turnos · ${esc(u.NOMBRE)}</h1>
        <p>${esc(r.EMPRESA?.NOMBRE||'')} · RUT ${esc(r.EMPRESA?.RUT||'')} · ID ${esc(r.EMPRESA?.ID||'')}</p></div>
        <h2>${esc(u.NOMBRE||'Mi horario')}</h2>
        <div class="geo-alert">${u.ARTICULO_22==='SI'?'Artículo 22 parametrizado':`Jornada ${esc(u.JORNADA_REGIMEN||'')} · ${u.JORNADA_HORAS_SEMANALES||0} h semanales`}</div>
        <div class="geo-table-wrap" style="margin-top:14px"><table class="geo-table">
        <thead><tr><th>Fecha</th><th>Tipo</th><th>Inicio</th><th>Fin</th><th>Inicio flexible</th><th>Descanso</th><th>Observaciones</th></tr></thead>
        <tbody>${(r.MALLA||[]).map(x=>`<tr><td>${esc(x.FECHA)}</td><td>${esc(x.TIPO_DIA)}</td>
        <td>${esc(x.HORA_INICIO||'—')}</td><td>${esc(x.HORA_FIN||'—')}</td>
        <td>${String(x.INICIO_HORARIO_FLEXIBLE||'NO').toUpperCase()==='SI'?'<b>✓ Sí</b>':'No'}</td>
        <td>${x.DESCANSO_MINUTOS||0} min</td><td>${esc(x.OBSERVACIONES||'')}</td></tr>`).join('')}</tbody>
        </table></div></div>`;
    }catch(e){error(e)}
  }

  async function programDay(){
    const ov=document.createElement('div');ov.className='geo-forced-overlay';
    ov.innerHTML=`<div class="geo-forced-card geo-compact-info-modal">
      ${geoDialogHead('▦','Malla de Turnos','Programar día','Administración/Gerencia decide si el inicio debe respetar exactamente la hora programada.')}
      <div class="geo-dialog-body">
        <label class="geo-field"><span>Fecha</span><input id="mallaFecha" type="date" value="${today()}"></label>
        <label class="geo-field"><span>Tipo de día</span><select id="mallaTipo"><option>TRABAJO</option><option>DESCANSO</option><option>FERIADO</option><option>AUSENCIA</option></select></label>
        <div class="geo-toolbar">
          <label class="geo-field"><span>Hora inicio</span><input id="mallaInicio" type="time"></label>
          <label class="geo-field"><span>Hora fin</span><input id="mallaFin" type="time"></label>
          <label class="geo-field"><span>Descanso min</span><input id="mallaDescanso" type="number" min="0" max="360" value="60"></label>
        </div>
        <label class="geo-check-row"><input id="mallaFlexible" type="checkbox"><span><b>Permitir inicio flexible por decisión del jefe</b><small>No exige comenzar justo a la hora de inicio. La autorización queda guardada y auditada para ese día.</small></span></label>
        <label class="geo-field"><span>Observaciones</span><textarea id="mallaObs" rows="3"></textarea></label>
      </div>
      <div class="buttons"><button class="geo-btn" data-close>Cancelar</button><button class="geo-btn primary" id="mallaSave">Guardar</button></div>
    </div>`;
    document.body.appendChild(ov);
    $('[data-close]',ov).onclick=()=>ov.remove();
    $('#mallaSave',ov).onclick=async()=>{
      const b=$('#mallaSave',ov);
      try{
        await geoWithButtonLoader(b,()=>request('jornadaGuardarMalla',{
          USUARIO_ID:$('#userId')?.value||'',
          FECHA:$('#mallaFecha',ov).value,
          TIPO_DIA:$('#mallaTipo',ov).value,
          HORA_INICIO:$('#mallaInicio',ov).value,
          HORA_FIN:$('#mallaFin',ov).value,
          DESCANSO_MINUTOS:$('#mallaDescanso',ov).value,
          INICIO_HORARIO_FLEXIBLE:$('#mallaFlexible',ov).checked?'SI':'NO',
          OBSERVACIONES:$('#mallaObs',ov).value
        }));
        toast($('#mallaFlexible',ov).checked?'Malla guardada · inicio flexible autorizado.':'Malla guardada · inicio sujeto a horario.');
        ov.remove();await load();
      }catch(e){error(e)}
    };
  }

  async function printSchedule(){
    try{
      await request('jornadaRegistrarImpresion',{
        USUARIO_ID:admin?$('#userId')?.value||'':'',
        FECHA_DESDE:$('#from').value,FECHA_HASTA:$('#to').value,FORMATO:'PDF_IMPRESION'
      });
      window.print()
    }catch(e){error(e)}
  }
}

async function boot(){try{await waitApi();const page=document.body.dataset.geoPage;await ({local:initGeoLocal,admin:initAdmin,map:initMap,kpi:initKpi,schedule:initSchedule}[page]||initGeoLocal)()}catch(e){error(e);postParent({tipo:'flotas:error-modulo',seccion:sectionActual(),mensaje:String(e?.message||e||'Error al abrir el módulo')})}}
async function iniciarConAutenticacion(auth){if(bootStarted)return;try{const client=api||await waitApi();if(auth?.token&&auth?.user){client.setAuth?.(auth);state.session=auth.user}else{const existente=client.getAuth?.()||{};if(existente.user)state.session=existente.user}bootStarted=true;postParent({tipo:'flotas:modulo-listo',usuario:state.session||null,seccion:sectionActual(),actualizadoEn:Date.now()});await boot()}catch(e){bootStarted=false;error(e);postParent({tipo:'flotas:error-modulo',seccion:sectionActual(),mensaje:String(e?.message||e||'Error al abrir el módulo')})}}
window.addEventListener('message',event=>{if(!embedded||event.source!==window.parent)return;if(event.origin!==location.origin&&event.origin!=='null')return;const data=event.data||{};if(data.tipo==='flotas:autenticacion'){if(String(data.seccionAutorizada||'')!==sectionActual()){postParent({tipo:'flotas:autenticacion-requerida',codigo:'MODULO_NO_AUTORIZADO',seccion:sectionActual()});return}iniciarConAutenticacion(data.auth||{})}});
async function preparar(){try{await waitApi();if(embedded){if(!window.__SGF_MODULO_SEGURO__?.valido){postParent({tipo:'flotas:autenticacion-requerida',codigo:'MODULO_NO_AUTORIZADO',seccion:sectionActual()});return}postParent({tipo:'flotas:autenticacion-requerida',codigo:'VALIDAR_SESION_PADRE',seccion:sectionActual()});const existente=api.getAuth?.()||{};if(existente.token&&existente.user)setTimeout(()=>iniciarConAutenticacion(existente),1200);return}await iniciarConAutenticacion(api.getAuth?.()||{})}catch(e){error(e);postParent({tipo:'flotas:error-modulo',seccion:sectionActual(),mensaje:String(e?.message||e||'Error al preparar el módulo')})}}
window.GeoLocalUI={boot,request,loc,toast};document.addEventListener('DOMContentLoaded',preparar);
})();


/* E-fleet Web 4.4.02 · Geo UI compacta y tarjetas plegables */
(function(){
'use strict';
const q=(s,r=document)=>r.querySelector(s), qa=(s,r=document)=>[...r.querySelectorAll(s)];
function makeBtn(text,cls='geo-btn'){const b=document.createElement('button');b.type='button';b.className=cls;b.textContent=text;return b}
function modalDetalleCheckin(texto,titulo){
  const ov=document.createElement('div');ov.className='geo-forced-overlay';
  ov.innerHTML=`<div class="geo-forced-card geo-compact-info-modal"><div class="geo-dialog-head"><span class="geo-dialog-icon">✓</span><div><div class="geo-eyebrow">Autorización de salida</div><h2>${titulo||'Detalle de Check-in'}</h2><p>Información completa de la validación vigente.</p></div></div><div class="geo-dialog-body"><div class="geo-card"><p class="geo-checkin-full-text"></p></div></div><div class="buttons"><button class="geo-btn primary" data-close>Entendido</button></div></div>`;
  q('.geo-checkin-full-text',ov).textContent=texto||'Sin información adicional.';
  q('[data-close]',ov).onclick=()=>ov.remove();document.body.appendChild(ov);
}
function enhanceCheckin(scope=document){
  qa('.geo-checkin-gate',scope).forEach(card=>{
    if(card.dataset.compactUi==='1')return;card.dataset.compactUi='1';card.classList.add('geo-checkin-compact');
    const p=q('p',card),titulo=q('h2',card)?.textContent||'Detalle de Check-in',texto=p?.textContent||'';
    if(p){p.dataset.fullText=texto;p.textContent=texto.split(' · ').slice(0,2).join(' · ');}
    let actions=q('.geo-checkin-compact-actions',card);if(!actions){actions=document.createElement('div');actions.className='geo-checkin-compact-actions';card.appendChild(actions)}
    const ver=makeBtn('Ver detalle');ver.onclick=()=>modalDetalleCheckin(texto,titulo);actions.appendChild(ver);
    const original=q('#openCheckin',card);if(original){actions.appendChild(original)}
  });
}
function setStop(el,open){el.classList.toggle('geo-collapsed',!open);const b=q('[data-geo-toggle-stop]',el);if(b)b.textContent=open?'−':'+'}
function enhanceStops(scope=document){
  qa('.geo-stop',scope).forEach(card=>{
    if(card.dataset.compactUi==='1')return;card.dataset.compactUi='1';card.classList.add('geo-collapsible-stop','geo-collapsed');
    const content=card.children[1],buttons=card.querySelector('.buttons');
    if(content){content.classList.add('geo-stop-full-content');const title=q('.title',content);const badge=q('.geo-badge',content);const head=document.createElement('div');head.className='geo-stop-compact-head';
      const wrap=document.createElement('div');wrap.className='geo-stop-compact-title';if(title){const c=title.cloneNode(true);wrap.appendChild(c)}
      if(badge){const c=badge.cloneNode(true);wrap.appendChild(c)}head.appendChild(wrap);const toggle=makeBtn('+','geo-toggle-btn');toggle.dataset.geoToggleStop='1';toggle.onclick=e=>{e.preventDefault();e.stopPropagation();setStop(card,card.classList.contains('geo-collapsed'))};head.appendChild(toggle);card.insertBefore(head,card.firstChild);
    }
    if(buttons)buttons.classList.add('geo-stop-actions-original');
  });
  const list=q('.geo-list',scope);if(list&&!list.dataset.globalToggle){list.dataset.globalToggle='1';const host=list.closest('.geo-card');const toolbar=host?.querySelector('.geo-toolbar');if(toolbar){const actions=document.createElement('div');actions.className='geo-inline-actions';const all=makeBtn('+ Expandir todas');all.onclick=()=>{const cards=qa('.geo-collapsible-stop',list),open=cards.some(c=>c.classList.contains('geo-collapsed'));cards.forEach(c=>setStop(c,open));all.textContent=open?'− Contraer todas':'+ Expandir todas'};actions.appendChild(all);toolbar.appendChild(actions)}}
}
function setPlan(el,open){el.classList.toggle('geo-plan-collapsed',!open);const b=q('[data-geo-toggle-plan]',el);if(b)b.textContent=open?'−':'+'}
function enhancePlanList(list){
  if(!list)return;qa('.geo-plan-local',list).forEach(card=>{if(card.dataset.compactUi==='1')return;card.dataset.compactUi='1';card.classList.add('geo-plan-collapsible','geo-plan-collapsed');const b=makeBtn('+','geo-toggle-btn');b.dataset.geoTogglePlan='1';b.onclick=e=>{e.preventDefault();e.stopPropagation();setPlan(card,card.classList.contains('geo-plan-collapsed'))};card.appendChild(b)});
  if(list.dataset.controls==='1')return;list.dataset.controls='1';
  const controls=document.createElement('div');controls.className='geo-inline-actions geo-plan-size-controls';
  const all=makeBtn('+ Expandir todo'), minus=makeBtn('− Tamaño'), plus=makeBtn('+ Tamaño');
  all.onclick=()=>{const cards=qa('.geo-plan-local',list),open=cards.some(c=>c.classList.contains('geo-plan-collapsed'));cards.forEach(c=>setPlan(c,open));all.textContent=open?'− Contraer todo':'+ Expandir todo'};
  list.dataset.height='58';
  function height(delta){let n=Number(list.dataset.height||58)+delta;n=Math.max(38,Math.min(72,n));list.dataset.height=String(n);list.style.setProperty('max-height',n+'dvh','important')}
  minus.onclick=()=>height(-8);plus.onclick=()=>height(8);controls.append(all,minus,plus);list.parentNode.insertBefore(controls,list);
}
function enhancePlanLists(scope=document){qa('.geo-plan-items',scope).forEach(enhancePlanList)}
function enhanceTrace(scope=document){qa('.geo-route-timeline>div',scope).forEach(x=>x.classList.add('geo-trace-autoheight'))}
function run(){enhanceCheckin();enhanceStops();enhancePlanLists();enhanceTrace()}
const mo=new MutationObserver(()=>requestAnimationFrame(run));mo.observe(document.documentElement,{childList:true,subtree:true});
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',run);else run();
})();
