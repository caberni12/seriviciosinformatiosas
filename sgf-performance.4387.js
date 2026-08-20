(()=>{
  'use strict';
  const VERSION='4.3.87';
  const STATIC_MODULES=[
    'panel-principal.html','rutas.html','operaciones.html','checkin-vehicular.html','vehiculos.html','conductores.html',
    'documentos.html','combustible.html','mantenciones.html','notificaciones.html','alertas.html','ubicacion-tiempo-real.html'
  ];
  const stats={startedAt:Date.now(),requests:0,totalMs:0,last:[],prefetchRuns:0,serviceWorker:false};
  let apiInstrumentada=false,precargaProgramada=false;
  function idle(fn,timeout=1400){
    if('requestIdleCallback' in window) return requestIdleCallback(fn,{timeout});
    return setTimeout(fn,250);
  }
  function link(rel,href,as){
    if(!href||document.head.querySelector(`link[rel="${rel}"][href="${href}"]`))return;
    const e=document.createElement('link');e.rel=rel;e.href=href;if(as)e.as=as;e.crossOrigin='anonymous';document.head.appendChild(e);
  }
  function preconnect(){
    try{
      link('dns-prefetch','https://mykndxvshtfydsetcync.supabase.co');
      link('preconnect','https://mykndxvshtfydsetcync.supabase.co');
      const api=window.ConexionFlotas,empresa=api?.getEmpresaConexion?.()||{};
      const raw=String(empresa.url||empresa.URL||empresa.url_real||'');
      if(raw){const u=new URL(raw);link('dns-prefetch',u.origin);link('preconnect',u.origin);}
    }catch(_){}
  }
  async function registrarSW(){
    try{
      if(!('serviceWorker' in navigator)||!/^https?:$/.test(location.protocol))return;
      const reg=await navigator.serviceWorker.register('./sw-sgf-4387.js',{scope:'./',updateViaCache:'none'});
      stats.serviceWorker=true;
      reg.update().catch(()=>{});
    }catch(e){console.debug('[SGF Performance] Service Worker no disponible',e?.message||e);}
  }
  function prefetchEstatico(){
    link('prefetch','sgf-module.4386.js','script');
    link('prefetch','sgf-shell.4386.js','script');
    link('prefetch','estilos.css','style');
    link('prefetch','responsive.css','style');
    link('prefetch','interfaz-moderna.css','style');
    STATIC_MODULES.forEach(h=>link('prefetch',h,'document'));
  }
  function esAdmin(user){return ['ROL-SYSADMIN','ROL-ADMIN','ROL-GERENCIA'].includes(String(user?.ROL_ID_CANONICO||user?.ROL_ID||'').toUpperCase());}
  function puede(user,modulo){
    if(esAdmin(user))return true;
    const m=String(modulo||'').toUpperCase();
    if(user?.MATRIZ_PERMISOS && user.MATRIZ_PERMISOS[`${m}:LEER`]===true)return true;
    const p=Array.isArray(user?.PERMISOS)?user.PERMISOS:[];
    return p.includes('*:*')||p.includes(`${m}:LEER`);
  }
  function clavePrecarga(api){
    try{
      const a=api.getAuth?.()||{},u=a.user||{},e=api.getEmpresaConexion?.()||{};
      return `efleet_perf_4370_${e.empresa_id||u.EMPRESA_ID||'sin'}_${u.ID||'sin'}_${u.VERSION_PERMISOS||0}`;
    }catch(_){return 'efleet_perf_4370_sin';}
  }
  async function precargarDatos(){
    const api=window.ConexionFlotas;if(!api?.prefetch||!api?.getAuth)return;
    const auth=api.getAuth()||{},user=auth.user;
    if(!auth.token||!user)return;
    const k=clavePrecarga(api),ahora=Date.now();
    try{const anterior=Number(sessionStorage.getItem(k)||0);if(anterior&&ahora-anterior<45000)return;}catch(_){}
    const q=[{key:'dashboard',action:'dashboard',payload:{}}];
    const agregar=(modulo,resource,limit=150)=>{if(puede(user,modulo))q.push({key:resource,action:'list',payload:{resource,limit}});};
    agregar('VEHICULOS','vehicles');
    agregar('CONDUCTORES','drivers');
    agregar('RUTAS','routes');
    agregar('OPERACIONES','operations');
    agregar('CHECKIN','checkins',100);
    agregar('DOCUMENTOS','documents',100);
    agregar('MANTENCIONES','maintenance',100);
    // Alertas/notificaciones/GPS/conexiones se excluyen: deben conservar frescura de tiempo real.
    stats.prefetchRuns++;
    const t=performance.now();
    try{await api.prefetch(q);try{sessionStorage.setItem(k,String(Date.now()));}catch(_){}}
    catch(_){}
    finally{registrarMetrica('PREFETCH_LOTE',performance.now()-t);}
  }
  function registrarMetrica(action,ms){
    stats.requests++;stats.totalMs+=Number(ms)||0;
    stats.last.unshift({action:String(action||''),ms:Math.round((Number(ms)||0)*10)/10,at:new Date().toISOString()});
    if(stats.last.length>30)stats.last.length=30;
  }
  function instrumentarApi(){
    const api=window.ConexionFlotas;if(!api||apiInstrumentada||typeof api.request!=='function')return false;
    apiInstrumentada=true;
    const original=api.request.bind(api);
    api.request=async function(action,payload){const t=performance.now();try{return await original(action,payload);}finally{registrarMetrica(action,performance.now()-t);}};
    return true;
  }
  function programarPrecarga(){
    if(precargaProgramada)return;precargaProgramada=true;
    idle(async()=>{precargaProgramada=false;instrumentarApi();await precargarDatos();},1600);
  }
  function status(){
    const avg=stats.requests?stats.totalMs/stats.requests:0;
    return {version:VERSION,serviceWorker:stats.serviceWorker,requests:stats.requests,promedioMs:Math.round(avg*10)/10,prefetchRuns:stats.prefetchRuns,last:[...stats.last]};
  }
  preconnect();registrarSW();
  if(/(?:^|\/)index\.html$/.test(location.pathname)||location.pathname.endsWith('/'))link('prefetch','main.html?v=4.3.87','document');
  idle(prefetchEstatico,1000);
  // El bundle puede instalar ConexionFlotas después de este archivo (Blob loader). Reintento corto y no bloqueante.
  let intentos=0;const timer=setInterval(()=>{intentos++;if(instrumentarApi()){clearInterval(timer);programarPrecarga();}else if(intentos>30)clearInterval(timer);},100);
  window.addEventListener('flotas:sesion-cambiada',()=>{preconnect();programarPrecarga();});
  window.addEventListener('flotas:conexion-empresa-cambiada',()=>{preconnect();programarPrecarga();});
  window.addEventListener('online',()=>programarPrecarga());
  window.SGFRendimiento={version:VERSION,precargarNavegacion:()=>{prefetchEstatico();return precargarDatos();},status};
})();
