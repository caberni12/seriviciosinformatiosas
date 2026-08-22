(function(){
  'use strict';
  const $=(selector,root=document)=>root.querySelector(selector);
  const api=window.ConexionFlotas;
  const loginForm=$('#formularioAcceso');
  const setupForm=$('#formularioPreconfiguracion');
  const companyForm=$('#formularioConexionEmpresa');
  const loginButton=$('#botonAcceso');
  const setupButton=$('#botonPreconfiguracion');
  const companyButton=$('#botonConexionEmpresa');
  const estado=$('#estadoConexion');
  const mensaje=$('#mensajeFormulario');
  const mensajeSetup=$('#mensajePreconfiguracion');
  const mensajeEmpresa=$('#mensajeConexionEmpresa');

  const errores={
    CREDENCIALES_INVALIDAS:'Correo o contraseña incorrectos.',
    AUTENTICACION_REQUERIDA:'Debe iniciar sesión para continuar.',
    SESION_INVALIDA:'La sesión dejó de ser válida. Ingrese nuevamente.',
    SESION_EXPIRADA:'La sesión expiró. Ingrese nuevamente.',
    USUARIO_DESHABILITADO:'El usuario fue deshabilitado.',
    DIRECCION_APLICACION_NO_CONFIGURADA:'Configure la dirección /exec en configuracion.js.',
    TIEMPO_DE_ESPERA_AGOTADO:'El servicio tardó demasiado en responder.',
    SISTEMA_NO_INICIALIZADO:'El sistema requiere la preconfiguración inicial.',
    SISTEMA_YA_INICIALIZADO:'La preconfiguración ya fue completada por otro usuario.',
    CONTRASENAS_NO_COINCIDEN:'Las contraseñas no coinciden.',
    CONTRASENA_REQUERIDA:'Ingrese una contraseña.',
    ULTIMO_ADMINISTRADOR_PROTEGIDO:'Debe existir al menos un administrador activo.'
    ,DIRECTORIO_EMPRESAS_NO_CONFIGURADO:'La Base de Datos empresarial no está configurada.'
    ,DIRECTORIO_EMPRESAS_NO_DISPONIBLE:'La Base de Datos empresarial no está disponible temporalmente.'
    ,TIEMPO_DE_ESPERA_DIRECTORIO:'La Base de Datos tardó demasiado en responder.'
    ,RUT_EMPRESA_INVALIDO:'Ingrese un RUT de empresa válido.'
    ,RUT_INVALIDO:'Ingrese un RUT de empresa válido.'
    ,EMPRESA_NO_REGISTRADA:'El RUT no está registrado en la Base de Datos empresarial.'
    ,EMPRESA_INACTIVA:'La conexión de esta empresa está inactiva. Contacte al Administrador.'
    ,EMPRESA_BLOQUEADA:'La empresa está bloqueada. Contacte al Administrador.'
    ,CONEXION_EMPRESA_NO_DISPONIBLE:'La empresa fue encontrada, pero su servicio no respondió correctamente.'
    ,RESPUESTA_DIRECTORIO_INVALIDA:'La Base de Datos devolvió una configuración empresarial incompleta.'
    ,CONEXION_EMPRESA_REQUERIDA:'Primero conecte este dispositivo con una empresa.'
    ,CLAVE_INSTALACION_REQUERIDA:'Esta empresa requiere la clave de instalación para su primera activación.'
    ,CLAVE_INSTALACION_INVALIDA:'La clave de instalación no es correcta.'
    ,CLAVE_INSTALACION_BLOQUEADA:'La clave de instalación está bloqueada. Contacte al Administrador.'
    ,CLAVE_INSTALACION_REVOCADA:'La autorización de instalación fue revocada. Contacte al Administrador.'
    ,CLAVE_INSTALACION_NO_CONFIGURADA:'La empresa no tiene una clave de instalación activa.'
  };
  function textoError(error){const clave=api.authErrorCode?.(error)||String(error?.message||error||'ERROR');return errores[clave]||clave.replaceAll('_',' ').toLowerCase().replace(/^./,letra=>letra.toUpperCase());}
  function mostrarMensaje(texto,tipo='error',destino=mensaje){destino.textContent=texto;destino.className=`mensaje-formulario ${tipo==='exito'?'exito':''}`;}
  function ocultarMensaje(destino=mensaje){destino.className='mensaje-formulario oculto';destino.textContent='';}
  function cambiarEstado(texto,tipo=''){estado.className=`estado-conexion ${tipo}`;$('span',estado).textContent=texto;}
  function bloquear(boton,activo,texto,normal){boton.disabled=activo;boton.textContent=activo?texto:normal;}
  function aplicarEmpresa(empresa){if(!empresa)return;window.TemaFlotas?.aplicarEmpresa?.(empresa,{guardar:true});const nombre=empresa.NOMBRE_FANTASIA||empresa.RAZON_SOCIAL||empresa.NOMBRE||'';if(nombre)$('#nombreEmpresaAcceso').textContent=nombre;const marca=$('#logoEmpresaAcceso');if(marca){marca.src='efleet-mark-compact.png';marca.onerror=()=>{marca.onerror=null;marca.src='logo.svg';};}}
  function entrar(){location.replace('main.html?v=4.3.61');}
  function mostrarPreconfiguracion(){companyForm.classList.add('oculto');loginForm.classList.add('oculto');setupForm.classList.remove('oculto');cambiarEstado('Preconfiguración requerida','preconfig');$('#detalleServicio').textContent='Sin usuarios registrados';setTimeout(()=>setupForm.elements.nombreEmpresa?.focus(),80);}
  function mostrarAcceso(){companyForm.classList.add('oculto');setupForm.classList.add('oculto');loginForm.classList.remove('oculto');}
  function mostrarSeleccionEmpresa(){loginForm.classList.add('oculto');setupForm.classList.add('oculto');companyForm.classList.remove('oculto');setTimeout(()=>$('#rutConexionEmpresa')?.focus(),80);}
  function aplicarConexionEmpresa(empresa){
    if(!empresa?.configurada)return;
    $('#nombreEmpresaConectada').textContent=empresa.nombre||'Empresa conectada';
    $('#rutEmpresaConectada').textContent=`RUT ${empresa.rut} · Conexión establecida`;
    if(empresa.nombre)$('#nombreEmpresaAcceso').textContent=empresa.nombre;
  }

  async function comprobar({redirigir=true}={}){
    ocultarMensaje();ocultarMensaje(mensajeSetup);
    let empresaConexion=api.getEmpresaConexion?.()||{configurada:true};
    if(api.conexionEmpresaRequerida?.()&&!empresaConexion.configurada){mostrarSeleccionEmpresa();return false;}
    aplicarConexionEmpresa(empresaConexion);
    cambiarEstado('Validando empresa y Base de Datos…');
    try{
      empresaConexion=await api.validarEmpresaActivaParaAcceso({comprobarServicio:false});
      aplicarConexionEmpresa(empresaConexion);
      const auth=api.getAuth();
      if(redirigir&&auth.token&&auth.user){cambiarEstado('Sesión guardada','conectado');entrar();return true;}
      const meResult=auth.token?await api.request('me',{cache:false}).then(value=>({value})).catch(error=>({error})):null;
      const usuarioSesion=meResult?.value?.user||meResult?.value?.usuario;if(usuarioSesion){api.setAuth({...auth,user:usuarioSesion});if(redirigir){entrar();return true;}}
      else if(meResult?.error&&api.isAuthError?.(meResult.error))api.setAuth({});
      const status=await api.request('status',{cache:false});
      aplicarEmpresa(status.company);$('#detalleServicio').textContent='Base de Datos disponible';
      if(status.needsSetup){mostrarPreconfiguracion();return false;}
      mostrarAcceso();cambiarEstado('Servicio conectado','conectado');return true;
    }catch(error){api.setAuth({});mostrarAcceso();cambiarEstado(String(error?.message||'')==='EMPRESA_BLOQUEADA'?'Empresa bloqueada':'Conexión temporalmente inestable','error');$('#detalleServicio').textContent='Base de Datos';mostrarMensaje(textoError(error));return false;}
  }

  companyForm.addEventListener('submit',async event=>{
    event.preventDefault();ocultarMensaje(mensajeEmpresa);if(!companyForm.reportValidity())return;
    bloquear(companyButton,true,'Buscando empresa…','Buscar y conectar');
    try{
      let claveInstalacion='';
      let empresa;
      try{
        empresa=await api.resolverConexionEmpresa(companyForm.elements.rutEmpresaConexion.value);
      }catch(errorInicial){
        const codigo=api.authErrorCode?.(errorInicial)||String(errorInicial?.message||'');
        if(codigo!=='CLAVE_INSTALACION_REQUERIDA') throw errorInicial;
        claveInstalacion=window.prompt('Primera activación de esta empresa. Ingrese la clave de instalación generada desde el cPanel empresarial:')||'';
        if(!claveInstalacion.trim()) throw new Error('CLAVE_INSTALACION_REQUERIDA');
        empresa=await api.resolverConexionEmpresa(companyForm.elements.rutEmpresaConexion.value,claveInstalacion.trim());
      }
      api.setAuth({});
      loginForm.reset();
      aplicarConexionEmpresa(empresa);
      const indicador=$('#estadoEmpresaPendiente');
      indicador.querySelector('i').textContent='✓';
      indicador.querySelector('b').textContent='Conexión establecida';
      indicador.querySelector('span').textContent=`${empresa.nombre} · RUT ${empresa.rut}`;
      indicador.style.borderColor='#dbdbdb';indicador.style.background='#edf9f5';
      mostrarMensaje('Empresa validada. La configuración de Base de Datos quedó guardada y será revalidada antes de cada acceso.','exito',mensajeEmpresa);
      // La validación empresarial solo habilita el formulario. El usuario
      // siempre debe escribir sus credenciales para iniciar una sesión nueva.
      setTimeout(()=>comprobar({redirigir:false}),650);
    }catch(error){mostrarMensaje(textoError(error),'error',mensajeEmpresa);}
    finally{bloquear(companyButton,false,'Buscando empresa…','Buscar y conectar');}
  });

  setupForm.addEventListener('submit',async event=>{
    event.preventDefault();ocultarMensaje(mensajeSetup);if(!setupForm.reportValidity())return;
    const datos=Object.fromEntries(new FormData(setupForm).entries());
    if(datos.contrasena!==datos.contrasenaConfirmacion){mostrarMensaje('Las contraseñas no coinciden.','error',mensajeSetup);setupForm.elements.contrasenaConfirmacion.focus();return;}
    bloquear(setupButton,true,'Configurando…','Configurar y entrar');
    try{
      await api.request('bootstrap',datos);
      const ipPromise=api.getClientIp?.().catch(()=> '')||Promise.resolve('');const resultado=await api.request('login',{correo:datos.correo,contrasena:datos.contrasena});
      api.setAuth({token:resultado.token,sessionId:resultado.sessionId||'',user:resultado.user,expiresAt:resultado.expiresAt||''});
      
      ipPromise.then(IP_PUBLICA=>api.registerConnectionIp?.({IP_PUBLICA})).catch(()=>{});
      cambiarEstado('Sistema configurado','conectado');mostrarMensaje('Preconfiguración terminada. Abriendo el panel principal…','exito',mensajeSetup);entrar();
    }catch(error){mostrarMensaje(textoError(error),'error',mensajeSetup);if(String(error?.message||'')==='SISTEMA_YA_INICIALIZADO')setTimeout(()=>comprobar({redirigir:false}),800);}
    finally{bloquear(setupButton,false,'Configurando…','Configurar y entrar');}
  });

  loginForm.addEventListener('submit',async event=>{
    event.preventDefault();ocultarMensaje();if(!loginForm.reportValidity())return;bloquear(loginButton,true,'Ingresando…','Ingresar');
    try{
      const datos=Object.fromEntries(new FormData(loginForm).entries());
      const ipPromise=api.getClientIp?.().catch(()=> '')||Promise.resolve('');
      let resultado;
      try{resultado=await api.request('login',datos);}
      catch(errorInicial){
        const codigo=String(api.authErrorCode?.(errorInicial)||errorInicial?.message||errorInicial||'').toUpperCase();
        const recuperable=/EMPRESA_RUTA_API_NO_COINCIDE|DIRECTORIO_EMPRESAS_NO_DISPONIBLE|CONEXION_EMPRESA_NO_DISPONIBLE|RESPUESTA_NO_VALIDA|FAILED TO FETCH|TIEMPO_DE_ESPERA/.test(codigo);
        if(!recuperable)throw errorInicial;
        await api.validarEmpresaActivaParaAcceso({forzar:true,comprobarServicio:true});
        resultado=await api.request('login',datos);
      }
      api.actualizarEstadoEmpresaLocal?.(resultado?.estadoEmpresa||resultado?.empresa?.ESTADO||'ACTIVA');
      api.setAuth({token:resultado.token,sessionId:resultado.sessionId||'',user:resultado.user,expiresAt:resultado.expiresAt||''});
      try{sessionStorage.setItem('sgf_login_rendimiento_ultimo',JSON.stringify(resultado?.rendimiento||{}));}catch(_){}
      ipPromise.then(IP_PUBLICA=>api.registerConnectionIp?.({IP_PUBLICA})).catch(()=>{});
      cambiarEstado('Acceso correcto','conectado');mostrarMensaje('Sesión iniciada. Abriendo el panel principal…','exito');entrar();
    }
    catch(error){mostrarMensaje(textoError(error));cambiarEstado('Acceso no autorizado','error');$('#contrasenaAcceso').select();}
    finally{bloquear(loginButton,false,'Ingresando…','Ingresar');}
  });
  function ocultarTecladoMovil(){
    const activo=document.activeElement;
    if(activo&&/^(INPUT|TEXTAREA|SELECT)$/.test(activo.tagName))activo.blur();
  }
  function mantenerControlVisible(control){
    if(!control)return;
    setTimeout(()=>control.scrollIntoView({block:'center',behavior:'smooth'}),120);
  }
  document.addEventListener('pointerdown',event=>{
    if(!event.target.closest('input,textarea,select,button'))ocultarTecladoMovil();
  },{passive:true});
  loginForm.querySelectorAll('input').forEach(input=>input.addEventListener('focus',()=>{
    document.body.classList.add('teclado-movil-activo');
    mantenerControlVisible(input.id==='contrasenaAcceso'?loginButton:input);
  }));
  loginForm.addEventListener('focusout',()=>setTimeout(()=>{
    if(!loginForm.contains(document.activeElement))document.body.classList.remove('teclado-movil-activo');
  },100));
  if(window.visualViewport){
    const ajustarVista=()=>{
      const reducido=window.visualViewport.height<window.innerHeight*0.78;
      document.body.classList.toggle('teclado-movil-activo',reducido);
      document.documentElement.style.setProperty('--alto-visible-login',`${Math.round(window.visualViewport.height)}px`);
    };
    window.visualViewport.addEventListener('resize',ajustarVista);
    window.visualViewport.addEventListener('scroll',ajustarVista);
    ajustarVista();
  }
  $('#mostrarContrasena').addEventListener('click',()=>{const input=$('#contrasenaAcceso');input.type=input.type==='password'?'text':'password';$('#mostrarContrasena').setAttribute('aria-label',input.type==='password'?'Mostrar contraseña':'Ocultar contraseña');});
  $('#abrirConfiguracionEmpresa').addEventListener('click',()=>{
    const dialogo=$('#dialogoConexionAvanzada');
    $('#urlDirectorioAvanzada').value=window.CONFIGURACION_FLOTAS.DIRECTORIO_EMPRESAS_URL||'';
    $('#urlDirectorioAvanzada').readOnly=true;
    $('#confirmarCambioDirectorio').checked=false;
    $('#confirmarCambioDirectorio').disabled=true;
    ocultarMensaje($('#mensajeConexionAvanzada'));
    mostrarMensaje('La Base de Datos central está integrada y no es editable. Antes de cada acceso se valida el estado de la empresa.','exito',$('#mensajeConexionAvanzada'));
    if(typeof dialogo.showModal==='function')dialogo.showModal();else dialogo.setAttribute('open','');
  });
  $('#cerrarConexionAvanzada')?.addEventListener('click',()=>$('#dialogoConexionAvanzada')?.close?.());
  $('#restaurarDirectorio')?.addEventListener('click',()=>{
    $('#urlDirectorioAvanzada').value=window.CONFIGURACION_FLOTAS.DIRECTORIO_EMPRESAS_URL||'';
    mostrarMensaje('La configuración central de Base de Datos ya está integrada y permanece protegida.','exito',$('#mensajeConexionAvanzada'));
  });
  $('#formularioConexionAvanzada')?.addEventListener('submit',event=>{
    event.preventDefault();
    mostrarMensaje('La configuración central de Base de Datos está protegida y se valida antes de cada acceso.','exito',$('#mensajeConexionAvanzada'));
  });

  $('#reintentarConexion').addEventListener('click',()=>comprobar({redirigir:false}));
  $('#limpiarConexionEmpresa').addEventListener('click',()=>{
    const empresa=api.getEmpresaConexion?.();
    if(!empresa?.configurada){mostrarSeleccionEmpresa();return;}
    if(!confirm(`¿Desea borrar la conexión de ${empresa.nombre||'esta empresa'} y las credenciales de sesión guardadas en este navegador?\n\nLos datos de la Base de Datos no se eliminarán.`))return;
    api.setAuth({});api.borrarConexionEmpresa?.();loginForm.reset();companyForm.reset();ocultarMensaje();ocultarMensaje(mensajeEmpresa);
    cambiarEstado('Conexión borrada del dispositivo');mostrarSeleccionEmpresa();mostrarMensaje('La conexión y la sesión guardadas fueron eliminadas. Ingrese el RUT de la nueva empresa.','exito',mensajeEmpresa);
  });
  const parametros=new URLSearchParams(location.search),avisoSesion=parametros.get('sesion');
  comprobar().then(()=>{if(avisoSesion==='cerrada')mostrarMensaje('La sesión fue cerrada correctamente.','exito');if(avisoSesion==='expirada')mostrarMensaje('La sesión realmente expiró o fue invalidada. Ingrese nuevamente.');if(avisoSesion==='conexion')mostrarMensaje('No fue posible validar la empresa o su flotas-api real. Revise la conexión y vuelva a intentar.');});
})();
