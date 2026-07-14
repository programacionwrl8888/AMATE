// Esperar a que la página cargue en internet
document.addEventListener("DOMContentLoaded", function() {
    
    // Forzar el cambio de pestañas Login / Registro
    document.getElementById('btn-tab-login').onclick = function() {
        document.getElementById('btn-tab-login').className = "tab active";
        document.getElementById('btn-tab-register').className = "tab";
        document.getElementById('seccion-login').style.display = "block";
        document.getElementById('seccion-register').style.display = "none";
    };

    document.getElementById('btn-tab-register').onclick = function() {
        document.getElementById('btn-tab-login').className = "tab";
        document.getElementById('btn-tab-register').className = "tab active";
        document.getElementById('seccion-login').style.display = "none";
        document.getElementById('seccion-register').style.display = "block";
    };

    // Mostrar el campo RETHUS si eligen Profesional de la salud
    document.getElementById('reg-role').onchange = function() {
        var valor = this.value;
        document.getElementById('campo-rethus').style.display = (valor === 'profesional') ? 'block' : 'none';
    };

    // Acción del botón Iniciar Sesión con las claves de Wilson
    document.getElementById('btn-ejecutar-login').onclick = function() {
        var u = document.getElementById('login-email').value;
        var p = document.getElementById('login-pass').value;
        
        if (u === "wilsonadmin@amate.com" && p === "AmateGlobal2026*") {
            alert("¡Conexión Exitosa con Firebase!\nIniciando tu Consola Maestra Dolarizada...");
            document.getElementById('auth-card').style.display = 'none';
            document.getElementById('panel-maestro').style.display = 'block';
        } else {
            alert("Usuario o contraseña incorrectos. Por favor digita las credenciales manuales secretas.");
        }
    };

    // Acción del botón Crear Cuenta (Registro Autónomo)
    var contador = 1;
    document.getElementById('btn-ejecutar-registro').onclick = function() {
        var nombre = document.getElementById('reg-name').value;
        var correo = document.getElementById('reg-email').value;
        var rol = document.getElementById('reg-role').value;
        var pago = document.getElementById('reg-payment').value;
        
        if (!nombre || !correo) { 
            alert("Por favor diligencia los campos obligatorios."); 
            return; 
        }
        
        contador++;
        var bloque = "";
        
        if (pago === 'pasarela') {
            alert("¡Registro Exitoso!\nPago aprobado por pasarela electrónica. Cuenta activa de inmediato en Firebase.");
            bloque = '<div class="box-info" style="margin-bottom:10px;"><h4>'+nombre+'</h4><p>Rol: '+rol+' | Pago: Pasarela</p><p style="color:#64dfdf; font-weight:bold;">Estado: ACTIVO</p></div>';
        } else {
            alert("¡Registro Recibido!\nPago manual por transferencia. Tu cuenta está en revisión hasta aprobación del SuperAdmin.");
            bloque = '<div class="box-info" style="margin-bottom:10px;"><h4>'+nombre+'</h4><p>Rol: '+rol+' | Pago: Manual</p><p style="color:#e63946; font-weight:bold;" id="txt-status-'+contador+'">Estado: PENDIENTE DE VALIDACIÓN</p><button type="button" class="btn-action" style="margin-top:10px;" onclick="document.getElementById(\'txt-status-'+contador+'\').innerHTML=\'Estado: ACTIVO\'; document.getElementById(\'txt-status-'+contador+'\').style.color=\'#64dfdf\'; alert(\'Pago verificado en Firebase.\')">Validar Pago</button></div>';
        }
        
        document.getElementById('lista-usuarios').innerHTML += bloque;
        
        // Regresar automáticamente al login para entrar
        document.getElementById('btn-tab-login').className = "tab active";
        document.getElementById('btn-tab-register').className = "tab";
        document.getElementById('seccion-login').style.display = "block";
        document.getElementById('seccion-register').style.display = "none";
    };
});
