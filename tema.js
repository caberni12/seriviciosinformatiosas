(function(){
  'use strict';
  const CLAVE='flotas_paleta_global_v1';
  /* Compatibilidad Web 4.2.50: fallbacks seguros para Safari/Firefox/Chromium. */
  if(!window.requestIdleCallback){window.requestIdleCallback=function(cb,opts){const inicio=Date.now();return setTimeout(function(){cb({didTimeout:false,timeRemaining:function(){return Math.max(0,50-(Date.now()-inicio));}});},Math.min(Number(opts&&opts.timeout)||1,50));};}
  if(!window.cancelIdleCallback){window.cancelIdleCallback=function(id){clearTimeout(id);};}
  if(!String.prototype.replaceAll){Object.defineProperty(String.prototype,'replaceAll',{configurable:true,writable:true,value:function(search,replacement){if(search instanceof RegExp){if(!search.global)throw new TypeError('replaceAll requiere una expresión regular global');return this.replace(search,replacement);}return this.split(String(search)).join(String(replacement));}});}

  const HEX=/^#[0-9A-F]{6}$/i;
  const CAMPOS=Object.freeze({
    principal:'COLOR_PRINCIPAL',secundario:'COLOR_SECUNDARIO',acento:'COLOR_ACENTO',
    fondo:'COLOR_FONDO',superficie:'COLOR_SUPERFICIE',texto:'COLOR_TEXTO',suave:'COLOR_TEXTO_SECUNDARIO',borde:'COLOR_BORDE',
    menu:'COLOR_MENU',menuSecundario:'COLOR_MENU_SECUNDARIO',exito:'COLOR_EXITO',advertencia:'COLOR_ADVERTENCIA',peligro:'COLOR_PELIGRO',
    fondoOscuro:'COLOR_FONDO_OSCURO',superficieOscura:'COLOR_SUPERFICIE_OSCURO',textoOscuro:'COLOR_TEXTO_OSCURO',suaveOscuro:'COLOR_TEXTO_SECUNDARIO_OSCURO',bordeOscuro:'COLOR_BORDE_OSCURO',
    modo:'TEMA_PREDETERMINADO'
  });
  const PREDETERMINADOS=Object.freeze({
    COLOR_PRINCIPAL:'#0B1F33',COLOR_SECUNDARIO:'#102A43',COLOR_ACENTO:'#2563EB',
    COLOR_FONDO:'#F4F7FB',COLOR_SUPERFICIE:'#FFFFFF',COLOR_TEXTO:'#142033',COLOR_TEXTO_SECUNDARIO:'#64748B',COLOR_BORDE:'#D8E1EA',
    COLOR_MENU:'#0B1F33',COLOR_MENU_SECUNDARIO:'#102A43',COLOR_EXITO:'#047857',COLOR_ADVERTENCIA:'#F59E0B',COLOR_PELIGRO:'#DC2626',
    COLOR_FONDO_OSCURO:'#06111F',COLOR_SUPERFICIE_OSCURO:'#0D1B2A',COLOR_TEXTO_OSCURO:'#F8FAFC',COLOR_TEXTO_SECUNDARIO_OSCURO:'#B7C4D1',COLOR_BORDE_OSCURO:'#27415B',
    TEMA_PREDETERMINADO:'Sistema'
  });
  const PREAJUSTES=Object.freeze({
    monocromo:{nombre:'E-fleet logística profesional',valores:{...PREDETERMINADOS}},
    claro:{nombre:'E-fleet claro logístico',valores:{...PREDETERMINADOS,TEMA_PREDETERMINADO:'Claro'}},
  });
  function valido(value){return HEX.test(String(value||''));}
  function hex(value,fallback){return valido(value)?String(value).toUpperCase():fallback;}
  function rgb(value){const h=hex(value,'#000000').slice(1);return [parseInt(h.slice(0,2),16),parseInt(h.slice(2,4),16),parseInt(h.slice(4,6),16)];}
  function aHex(values){return '#'+values.map(v=>Math.max(0,Math.min(255,Math.round(v))).toString(16).padStart(2,'0')).join('').toUpperCase();}
  function mezclar(a,b,peso=.5){const x=rgb(a),y=rgb(b);return aHex(x.map((v,i)=>v*(1-peso)+y[i]*peso));}
  function luminancia(value){return rgb(value).map(v=>{v/=255;return v<=.03928?v/12.92:Math.pow((v+.055)/1.055,2.4);}).reduce((s,v,i)=>s+v*[.2126,.7152,.0722][i],0);}
  function contraste(a,b){const l1=luminancia(a),l2=luminancia(b);return (Math.max(l1,l2)+.05)/(Math.min(l1,l2)+.05);}
  function normalizar(datos={}){
    const out={};
    Object.values(CAMPOS).forEach(campo=>{
      if(campo==='TEMA_PREDETERMINADO')return;
      out[campo]=hex(datos[campo],PREDETERMINADOS[campo]);
    });
    /* Migra automáticamente paletas anteriores a la identidad logística oficial. */
    const migracionesClaro={
      COLOR_FONDO:new Set(['#FFFFFF','#F3F7FA','#F3F7F8','#F1F5F9','#EEF5F4']),
      COLOR_TEXTO:new Set(['#000000','#173047','#17312F','#15312F']),
      COLOR_TEXTO_SECUNDARIO:new Set(['#444444','#65798B','#667B79','#667B78']),
      COLOR_BORDE:new Set(['#D9D9D9','#DCE6EC','#D9E5E4','#D8E5E3'])
    };
    if(migracionesClaro.COLOR_FONDO.has(out.COLOR_FONDO))out.COLOR_FONDO=PREDETERMINADOS.COLOR_FONDO;
    if(migracionesClaro.COLOR_TEXTO.has(out.COLOR_TEXTO))out.COLOR_TEXTO=PREDETERMINADOS.COLOR_TEXTO;
    if(migracionesClaro.COLOR_TEXTO_SECUNDARIO.has(out.COLOR_TEXTO_SECUNDARIO))out.COLOR_TEXTO_SECUNDARIO=PREDETERMINADOS.COLOR_TEXTO_SECUNDARIO;
    if(migracionesClaro.COLOR_BORDE.has(out.COLOR_BORDE))out.COLOR_BORDE=PREDETERMINADOS.COLOR_BORDE;
    const legadoVerde=new Set(['#000000','#0B5F59','#000000','#000000','#000000','#0F766E']);
    if(legadoVerde.has(out.COLOR_PRINCIPAL)){
      out.COLOR_PRINCIPAL=PREDETERMINADOS.COLOR_PRINCIPAL;out.COLOR_SECUNDARIO=PREDETERMINADOS.COLOR_SECUNDARIO;out.COLOR_ACENTO=PREDETERMINADOS.COLOR_ACENTO;
      out.COLOR_MENU=PREDETERMINADOS.COLOR_MENU;out.COLOR_MENU_SECUNDARIO=PREDETERMINADOS.COLOR_MENU_SECUNDARIO;out.COLOR_EXITO=PREDETERMINADOS.COLOR_EXITO;
      out.COLOR_FONDO_OSCURO=PREDETERMINADOS.COLOR_FONDO_OSCURO;out.COLOR_SUPERFICIE_OSCURO=PREDETERMINADOS.COLOR_SUPERFICIE_OSCURO;out.COLOR_TEXTO_OSCURO=PREDETERMINADOS.COLOR_TEXTO_OSCURO;out.COLOR_TEXTO_SECUNDARIO_OSCURO=PREDETERMINADOS.COLOR_TEXTO_SECUNDARIO_OSCURO;out.COLOR_BORDE_OSCURO=PREDETERMINADOS.COLOR_BORDE_OSCURO;
    }
    const modo=String(datos.TEMA_PREDETERMINADO||PREDETERMINADOS.TEMA_PREDETERMINADO);
    out.TEMA_PREDETERMINADO='Claro';
    return out;
  }
  function guardado(){try{return normalizar(JSON.parse(localStorage.getItem(CLAVE)||'{}'));}catch(_){return normalizar({});}}
  function establecer(variable,value,target=document.documentElement){target.style.setProperty(variable,value);}
  function aplicar(datos={},opciones={}){
    const tema=normalizar(datos),r=document.documentElement;
    const suavePrimario=mezclar(tema.COLOR_PRINCIPAL,tema.COLOR_SUPERFICIE,.88);
    const suaveAcento=mezclar(tema.COLOR_ACENTO,tema.COLOR_SUPERFICIE,.89);
    const suavePeligro=mezclar(tema.COLOR_PELIGRO,tema.COLOR_SUPERFICIE,.90);
    const suaveAdvertencia=mezclar(tema.COLOR_ADVERTENCIA,tema.COLOR_SUPERFICIE,.87);
    const superficie2=mezclar(tema.COLOR_SUPERFICIE,tema.COLOR_FONDO,.45);
    const superficie3=mezclar(tema.COLOR_SUPERFICIE,tema.COLOR_BORDE,.62);
    const superficieOscura2=mezclar(tema.COLOR_SUPERFICIE_OSCURO,tema.COLOR_FONDO_OSCURO,.35);
    const superficieOscura3=mezclar(tema.COLOR_SUPERFICIE_OSCURO,tema.COLOR_BORDE_OSCURO,.55);
    const vars={
      '--tema-principal':tema.COLOR_PRINCIPAL,'--tema-secundario':tema.COLOR_SECUNDARIO,'--tema-acento':tema.COLOR_ACENTO,
      '--tema-fondo':tema.COLOR_FONDO,'--tema-superficie':tema.COLOR_SUPERFICIE,'--tema-superficie-2':superficie2,'--tema-superficie-3':superficie3,
      '--tema-texto':tema.COLOR_TEXTO,'--tema-texto-suave':tema.COLOR_TEXTO_SECUNDARIO,'--tema-borde':tema.COLOR_BORDE,
      '--tema-menu':tema.COLOR_MENU,'--tema-menu-2':tema.COLOR_MENU_SECUNDARIO,'--tema-exito':tema.COLOR_EXITO,'--tema-advertencia':tema.COLOR_ADVERTENCIA,'--tema-peligro':tema.COLOR_PELIGRO,
      '--tema-fondo-oscuro':tema.COLOR_FONDO_OSCURO,'--tema-superficie-oscura':tema.COLOR_SUPERFICIE_OSCURO,'--tema-superficie-oscura-2':superficieOscura2,'--tema-superficie-oscura-3':superficieOscura3,
      '--tema-texto-oscuro':tema.COLOR_TEXTO_OSCURO,'--tema-texto-suave-oscuro':tema.COLOR_TEXTO_SECUNDARIO_OSCURO,'--tema-borde-oscuro':tema.COLOR_BORDE_OSCURO,
      '--primary':tema.COLOR_PRINCIPAL,'--primary-dark':tema.COLOR_SECUNDARIO,'--primary-soft':suavePrimario,'--blue':tema.COLOR_ACENTO,'--blue-soft':suaveAcento,
      '--bg':tema.COLOR_FONDO,'--surface':tema.COLOR_SUPERFICIE,'--surface-2':superficie2,'--surface-3':superficie3,'--surface-soft':superficie2,
      '--text':tema.COLOR_TEXTO,'--muted':tema.COLOR_TEXTO_SECUNDARIO,'--line':tema.COLOR_BORDE,'--border':tema.COLOR_BORDE,
      '--sidebar':tema.COLOR_MENU,'--sidebar-2':tema.COLOR_MENU_SECUNDARIO,'--active-green':tema.COLOR_EXITO,'--active-green-soft':mezclar(tema.COLOR_EXITO,tema.COLOR_SUPERFICIE,.88),
      '--amber':tema.COLOR_ADVERTENCIA,'--amber-soft':suaveAdvertencia,'--red':tema.COLOR_PELIGRO,'--red-soft':suavePeligro,'--danger':tema.COLOR_PELIGRO,'--inactive-red':tema.COLOR_PELIGRO,
      '--primario':tema.COLOR_PRINCIPAL,'--primario-fuerte':tema.COLOR_SECUNDARIO,'--fondo':tema.COLOR_FONDO,'--superficie':tema.COLOR_SUPERFICIE,'--superficie-suave':superficie2,
      '--texto':tema.COLOR_TEXTO,'--texto-suave':tema.COLOR_TEXTO_SECUNDARIO,'--suave':tema.COLOR_TEXTO_SECUNDARIO,'--borde':tema.COLOR_BORDE,'--error':tema.COLOR_PELIGRO,
      '--menu-fondo':tema.COLOR_MENU,'--menu-fondo-2':tema.COLOR_MENU_SECUNDARIO
    };
    Object.entries(vars).forEach(([k,v])=>establecer(k,v,r));
    const meta=document.querySelector('meta[name="theme-color"]');if(meta)meta.content=tema.COLOR_PRINCIPAL;
    if(opciones.guardar!==false){try{localStorage.setItem(CLAVE,JSON.stringify(tema));}catch(_){}}
    window.dispatchEvent(new CustomEvent('flotas:paleta-aplicada',{detail:tema}));
    return tema;
  }
  function aplicarEmpresa(empresa={},opciones={}){return aplicar(empresa,opciones);}
  function modoOscuroInicial(){
    try{localStorage.setItem('flotas_tema','light');}catch(_){}
    return false;
  }
  function aplicarGuardado(){return aplicar(guardado(),{guardar:false});}
  window.TemaFlotas=Object.freeze({CAMPOS,PREDETERMINADOS,PREAJUSTES,normalizar,guardado,aplicar,aplicarEmpresa,aplicarGuardado,modoOscuroInicial,contraste,mezclar,valido});
  const oscuroInicial=false;
  try{localStorage.setItem('flotas_tema','light');}catch(_){}
  document.documentElement.classList.remove('tema-oscuro-inicial');
  document.documentElement.style.colorScheme='light';
  aplicarGuardado();
})();
