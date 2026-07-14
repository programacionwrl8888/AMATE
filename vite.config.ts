{
  "entities": {
    "Clinic": {
      "title": "Clinic",
      "description": "Configuración de Marca Blanca y Cuentas de Pago para una clínica del SaaS.",
      "type": "object",
      "properties": {
        "id": { "type": "string", "description": "Identificador único de la clínica" },
        "name": { "type": "string", "description": "Nombre de la clínica" },
        "logoType": { "type": "string", "enum": ["icon", "uploaded"] },
        "logoIcon": { "type": "string", "description": "Nombre del icono de Lucide" },
        "logoColor": { "type": "string", "description": "Color del logo" },
        "logoBase64": { "type": "string", "description": "Logotipo de Marca Blanca en Base64" },
        "status": { "type": "string", "enum": ["active", "inactive"] },
        "themeColor": { "type": "string", "description": "Tema visual de la clínica" },
        "nequiPhone": { "type": "string" },
        "nequiHolder": { "type": "string" },
        "daviplataPhone": { "type": "string" },
        "daviplataHolder": { "type": "string" },
        "bancolombiaAccount": { "type": "string" },
        "bancolombiaHolder": { "type": "string" }
      },
      "required": ["id", "name", "status"]
    },
    "UserProfile": {
      "title": "UserProfile",
      "description": "Perfil del usuario con afiliación multi-inquilino.",
      "type": "object",
      "properties": {
        "uid": { "type": "string" },
        "email": { "type": "string" },
        "name": { "type": "string" },
        "phone": { "type": "string" },
        "role": { "type": "string", "enum": ["superadmin", "psicologo", "paciente"] },
        "clinicId": { "type": "string", "description": "ID de la clínica a la que pertenece" },
        "status": { "type": "string", "enum": ["active", "inactive"] },
        "avatar": { "type": "string", "description": "URL o base64 de la foto de perfil" },
        "specialty": { "type": "string", "description": "Especialidad en caso de ser psicólogo" }
      },
      "required": ["uid", "email", "role", "clinicId", "status"]
    },
    "TenantConfig": {
      "title": "TenantConfig",
      "description": "Configuración de monetización del SaaS para cada clínica inquilina.",
      "type": "object",
      "properties": {
        "id": { "type": "string", "description": "ID del tenant (clinicId)" },
        "clinicId": { "type": "string" },
        "monetizationMode": { "type": "string", "enum": ["fixed_fee", "commission_percentage", "fixed_per_session"] },
        "fixedFeeAmount": { "type": "number", "description": "Mensualidad fija cobrada" },
        "commissionPercentage": { "type": "number", "description": "Porcentaje por sesión cobrada" },
        "fixedPerSessionAmount": { "type": "number", "description": "Cobro fijo por sesión/paciente" },
        "paymentRoute": { "type": "string", "enum": ["direct", "centralized"] },
        "status": { "type": "string", "enum": ["active", "suspended"] },
        "updatedAt": { "type": "string" }
      },
      "required": ["id", "clinicId", "monetizationMode", "paymentRoute", "status"]
    },
    "FinancialRecord": {
      "title": "FinancialRecord",
      "description": "Control de transacciones, retención de comisión y saldos de liquidación para el SaaS.",
      "type": "object",
      "properties": {
        "id": { "type": "string" },
        "clinicId": { "type": "string" },
        "appointmentId": { "type": "string" },
        "patientName": { "type": "string" },
        "totalAmount": { "type": "number" },
        "paymentRoute": { "type": "string", "enum": ["direct", "centralized"] },
        "monetizationMode": { "type": "string", "enum": ["fixed_fee", "commission_percentage", "fixed_per_session"] },
        "calculatedCommission": { "type": "number" },
        "netClinicBalance": { "type": "number" },
        "payoutStatus": { "type": "string", "enum": ["liquidado", "pendiente_payout", "facturado_mes"] },
        "createdAt": { "type": "string" }
      },
      "required": ["id", "clinicId", "appointmentId", "totalAmount", "paymentRoute", "monetizationMode", "calculatedCommission", "netClinicBalance", "payoutStatus"]
    },
    "Appointment": {
      "title": "Appointment",
      "description": "Consulta o cita agendada de telepsicología o consulta presencial.",
      "type": "object",
      "properties": {
        "id": { "type": "string" },
        "clinicId": { "type": "string", "description": "ID de la clínica donde se agenda" },
        "patientId": { "type": "string" },
        "patientName": { "type": "string" },
        "patientPhone": { "type": "string" },
        "psychologistId": { "type": "string" },
        "psychologistName": { "type": "string" },
        "date": { "type": "string" },
        "time": { "type": "string" },
        "modality": { "type": "string", "enum": ["Virtual", "Presencial"] },
        "channel": { "type": "string", "enum": ["WhatsApp", "Google Meet", "Llamada Telefónica"] },
        "locationId": { "type": "string", "description": "ID de la sede física si es presencial" },
        "locationName": { "type": "string" },
        "locationAddress": { "type": "string" },
        "locationCity": { "type": "string" },
        "consultorio": { "type": "string" },
        "paymentMethod": { "type": "string" },
        "paymentStatus": { "type": "string", "enum": ["Pendiente de Verificación", "Confirmada", "Rechazada"] },
        "status": { "type": "string", "enum": ["Agendada", "Pendiente de Reasignación", "Reasignada", "Realizada"] },
        "changeRequested": { "type": "boolean" },
        "changeRequestReason": { "type": "string" },
        "receiptImage": { "type": "string" },
        "meetingLink": { "type": "string" },
        "notes": { "type": "string" }
      },
      "required": ["clinicId", "patientId", "psychologistId", "date", "time", "paymentStatus", "status"]
    },
    "Location": {
      "title": "Location",
      "description": "Sede física de la clínica con consultorios disponibles.",
      "type": "object",
      "properties": {
        "id": { "type": "string" },
        "clinicId": { "type": "string" },
        "name": { "type": "string" },
        "address": { "type": "string" },
        "city": { "type": "string" },
        "consultorios": { "type": "array", "items": { "type": "string" } }
      },
      "required": ["id", "clinicId", "name", "address", "city", "consultorios"]
    },
    "ClinicalRecord": {
      "title": "ClinicalRecord",
      "description": "Ficha o nota clínica de la sesión de psicología.",
      "type": "object",
      "properties": {
        "id": { "type": "string" },
        "clinicId": { "type": "string", "description": "ID de la clínica donde se realizó la consulta" },
        "patientId": { "type": "string" },
        "psychologistId": { "type": "string" },
        "psychologistName": { "type": "string" },
        "notes": { "type": "string" },
        "isConfidential": { "type": "boolean" }
      },
      "required": ["clinicId", "patientId", "psychologistId", "notes"]
    }
  },
  "firestore": {
    "clinics/{clinicId}": {
      "schema": { "$ref": "#/entities/Clinic" },
      "description": "Colección de clínicas clientes registradas en el SaaS."
    },
    "clinics/{clinicId}/locations/{locationId}": {
      "schema": { "$ref": "#/entities/Location" },
      "description": "Sedes físicas de cada clínica."
    },
    "users/{userId}": {
      "schema": { "$ref": "#/entities/UserProfile" },
      "description": "Colección de usuarios (global_admin, psicólogos y pacientes) asociados a un clinicId."
    },
    "tenants_config/{configId}": {
      "schema": { "$ref": "#/entities/TenantConfig" },
      "description": "Configuraciones de cobros y liquidación para cada clínica."
    },
    "financials/{financialId}": {
      "schema": { "$ref": "#/entities/FinancialRecord" },
      "description": "Control financiero y dispersión de comisiones de las clínicas."
    },
    "appointments/{appointmentId}": {
      "schema": { "$ref": "#/entities/Appointment" },
      "description": "Citas de telepsicología."
    },
    "clinical_records/{recordId}": {
      "schema": { "$ref": "#/entities/ClinicalRecord" },
      "description": "Notas e historias clínicas."
    }
  }
}
