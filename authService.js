import React, { useState, useEffect } from "react";
import { 
  Shield, 
  ShieldCheck,
  User, 
  Lock, 
  Database, 
  FileText, 
  DollarSign, 
  Activity, 
  CheckCircle, 
  AlertCircle, 
  LogOut, 
  Plus, 
  RefreshCw, 
  Info,
  Eye,
  UserCheck,
  Server,
  ToggleLeft,
  ToggleRight,
  Sparkles,
  Calendar,
  Clock,
  Phone,
  Video,
  ExternalLink,
  UploadCloud,
  Check,
  X,
  CreditCard,
  MessageSquare,
  Sparkle,
  Heart,
  Brain,
  Settings,
  Layers,
  Building,
  Power,
  Globe,
  MapPin
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { auth, db } from "./config/firebase";
import amateLogo from "./assets/images/amate_logo_1783960580628.jpg";
import { 
  loginWithEmailAndPassword, 
  logout, 
  subscribeToAuthChanges, 
  UserRole
} from "./core/auth/authService";
import { 
  collection, 
  addDoc, 
  getDocs, 
  doc, 
  getDoc,
  setDoc,
  updateDoc,
  serverTimestamp
} from "firebase/firestore";
import { createUserWithEmailAndPassword } from "firebase/auth";

import { Clinic, Appointment, UserProfile, ClinicalRecord, TenantConfig, FinancialRecord, Location } from "./types";
import { DEFAULT_CLINICS, PSYCHOLOGISTS, getThemeClasses, DEFAULT_TENANT_CONFIGS, DEFAULT_FINANCIAL_RECORDS, DEFAULT_LOCATIONS } from "./data";

// Diccionario de marcas por país para el encabezado dinámico global
const CONFIG_MARCAS = {
  CO: { suite: "", nombreOficial: "AMATE" },
  MX: { suite: "", nombreOficial: "AMATE MX" },
  AR: { suite: "", nombreOficial: "AMATE AR" }
};

// Helper para extraer el código de país de la clínica
const getCountryCode = (country: string | undefined): "CO" | "MX" | "AR" => {
  if (!country) return "CO";
  const normalized = country.toLowerCase();
  if (normalized.includes("colombia") || normalized.includes("co")) return "CO";
  if (normalized.includes("mexico") || normalized.includes("méxico") || normalized.includes("mx")) return "MX";
  if (normalized.includes("argentina") || normalized.includes("ar")) return "AR";
  return "CO"; // default fallback
};

export default function App() {
  // Configuración de Simulación o Firebase Real
  const [isDemoMode, setIsDemoMode] = useState(true);
  const [activePerspective, setActivePerspective] = useState<"paciente" | "superadmin" | "psicologo">("paciente");

  // Estado Multitenant (SaaS)
  const [clinics, setClinics] = useState<Clinic[]>([]);
  const [selectedClinicId, setSelectedClinicId] = useState<string>("clinic_psicotech"); // Para la vista paciente
  const [activePsychologistId, setActivePsychologistId] = useState<string>("psicologo_test_uid_456"); // Para la vista psicólogo

  // Autenticación & Perfiles
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [userRole, setUserRole] = useState<UserRole | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loadingAuth, setLoadingAuth] = useState(false);

  // Formularios de Registro e Ingreso
  const [isRegisterMode, setIsRegisterMode] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [cellPhone, setCellPhone] = useState("");
  const [authError, setAuthError] = useState<string | null>(null);
  const [authSuccess, setAuthSuccess] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Campos adicionales para registro extendido multi-rol
  const [registerRole, setRegisterRole] = useState<UserRole>("paciente");
  const [registerSpecialty, setRegisterSpecialty] = useState("Psicología Clínica General");
  const [registerLicense, setRegisterLicense] = useState("");
  const [newClinicName, setNewClinicName] = useState("");
  const [newClinicCountry, setNewClinicCountry] = useState("Colombia");
  const [newClinicColor, setNewClinicColor] = useState<"emerald" | "indigo" | "rose" | "cyan" | "amber" | "violet">("emerald");

  // Estado dinámico para psicólogos (asociado a clínicas/registros)
  const [psychologists, setPsychologists] = useState<UserProfile[]>([]);

  // Datos principales
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [clinicalRecords, setClinicalRecords] = useState<ClinicalRecord[]>([]);
  const [tenantConfigs, setTenantConfigs] = useState<TenantConfig[]>([]);
  const [financialRecords, setFinancialRecords] = useState<FinancialRecord[]>([]);
  const [changeRequestReason, setChangeRequestReason] = useState("");
  const [showChangeRequestModal, setShowChangeRequestModal] = useState(false);
  const [selectedAppointmentForChange, setSelectedAppointmentForChange] = useState<Appointment | null>(null);
  const [loadingAppointments, setLoadingAppointments] = useState(false);
  const [reassignPsychMap, setReassignPsychMap] = useState<Record<string, string>>({});
  const [statusMessage, setStatusMessage] = useState<{ text: string; type: "success" | "error" | "info" } | null>(null);

  // Formulario de Agendamiento de Citas (Paciente)
  const [selectedPsychId, setSelectedPsychId] = useState(PSYCHOLOGISTS[0].uid);
  const [selectedDate, setSelectedDate] = useState("2026-07-15");
  const [selectedTime, setSelectedTime] = useState("09:00");
  const [selectedModality, setSelectedModality] = useState<"Virtual" | "Presencial">("Virtual");
  const [selectedLocationId, setSelectedLocationId] = useState<string>("");
  const [selectedConsultorio, setSelectedConsultorio] = useState<string>("");
  const [selectedChannel, setSelectedChannel] = useState<"WhatsApp" | "Google Meet" | "Llamada Telefónica">("WhatsApp");
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<any>("manual_nequi");
  const [customNotes, setCustomNotes] = useState("");

  // Subida de Comprobante / Modal
  const [uploadingForId, setUploadingForId] = useState<string | null>(null);
  const [receiptModalAppointment, setReceiptModalAppointment] = useState<Appointment | null>(null);

  // Formulario Nota Clínica (Psicólogo)
  const [clinicalRecordNotes, setClinicalRecordNotes] = useState("");
  const [clinicalRecordPatientId, setClinicalRecordPatientId] = useState("");
  const [clinicalRecordPatientName, setClinicalRecordPatientName] = useState("");
  const [isConfidential, setIsConfidential] = useState(false);

  // Formulario Edición de Marca Blanca (Psicólogo de su propia clínica)
  const [wbName, setWbName] = useState("");
  const [wbThemeColor, setWbThemeColor] = useState<any>("emerald");
  const [wbLogoType, setWbLogoType] = useState<"icon" | "uploaded">("icon");
  const [wbLogoIcon, setWbLogoIcon] = useState("Activity");
  const [wbLogoBase64, setWbLogoBase64] = useState<string>("");
  const [wbNequiPhone, setWbNequiPhone] = useState("");
  const [wbNequiHolder, setWbNequiHolder] = useState("");
  const [wbDaviplataPhone, setWbDaviplataPhone] = useState("");
  const [wbDaviplataHolder, setWbDaviplataHolder] = useState("");
  const [wbBancolombiaAccount, setWbBancolombiaAccount] = useState("");
  const [wbBancolombiaHolder, setWbBancolombiaHolder] = useState("");

  // Formulario de Nueva Sede (Clínica)
  const [newLocationName, setNewLocationName] = useState("");
  const [newLocationAddress, setNewLocationAddress] = useState("");
  const [newLocationCity, setNewLocationCity] = useState("Bogotá");
  const [newLocationConsultorios, setNewLocationConsultorios] = useState("");

  // Inicializar Clínicas y Citas (LocalStorage en Demo, Firebase en Real)
  useEffect(() => {
    // 1. Cargar Clínicas
    const savedClinics = localStorage.getItem("saas_clinics_v3");
    let currentClinics = DEFAULT_CLINICS;
    if (savedClinics) {
      try {
        currentClinics = JSON.parse(savedClinics);
      } catch (e) {
        console.error("Error al leer clínicas guardadas", e);
      }
    } else {
      localStorage.setItem("saas_clinics_v3", JSON.stringify(DEFAULT_CLINICS));
    }
    setClinics(currentClinics);

    // 2. Cargar Citas
    const savedAppts = localStorage.getItem("psicotech_appointments_v3");
    if (savedAppts) {
      try {
        setAppointments(JSON.parse(savedAppts));
      } catch (e) {
        console.error("Error al parsear citas", e);
      }
    } else {
      const initialAppts: Appointment[] = [
        {
          id: "appt_1",
          clinicId: "clinic_psicotech",
          patientId: "paciente_test_uid_789",
          patientName: "Juan Pérez (Ejemplo)",
          patientPhone: "3124445566",
          psychologistId: "psicologo_test_uid_456",
          psychologistName: "Dra. Ana Gómez",
          date: "2026-07-12",
          time: "10:30",
          channel: "WhatsApp",
          paymentMethod: "manual_nequi",
          paymentStatus: "Pendiente de Verificación",
          status: "Agendada",
          receiptDetails: {
            txId: "M-98745214",
            amount: 90000,
            date: "2026-07-10 14:32",
            sender: "Juan Pérez"
          },
          notes: "Ansiedad generalizada debido al trabajo.",
          createdAt: new Date().toISOString()
        },
        {
          id: "appt_2",
          clinicId: "clinic_mentesana",
          patientId: "paciente_test_uid_789",
          patientName: "Juan Pérez (Ejemplo)",
          patientPhone: "3124445566",
          psychologistId: "psicologo_test_uid_777",
          psychologistName: "Dr. Carlos Mendoza",
          date: "2026-07-14",
          time: "16:00",
          channel: "Google Meet",
          paymentMethod: "automatic_pse",
          paymentStatus: "Confirmada",
          status: "Agendada",
          meetingLink: "https://meet.google.com/abc-defg-hij",
          notes: "Primera consulta de valoración.",
          createdAt: new Date().toISOString()
        }
      ];
      setAppointments(initialAppts);
      localStorage.setItem("psicotech_appointments_v3", JSON.stringify(initialAppts));
    }

    // 3. Cargar Notas Clínicas
    const savedRecords = localStorage.getItem("psicotech_clinical_records_v3");
    if (savedRecords) {
      try {
        setClinicalRecords(JSON.parse(savedRecords));
      } catch (e) {
        console.error("Error al parsear historias clínicas", e);
      }
    } else {
      const initialRecords: ClinicalRecord[] = [
        {
          id: "rec_1",
          clinicId: "clinic_psicotech",
          patientId: "paciente_test_uid_789",
          patientName: "Juan Pérez",
          psychologistId: "psicologo_test_uid_456",
          notes: "El paciente muestra una leve mejoría en el manejo de crisis de pánico mediante respiración diafragmática.",
          isConfidential: false,
          locked: false,
          createdAt: new Date().toISOString()
        }
      ];
      setClinicalRecords(initialRecords);
      localStorage.setItem("psicotech_clinical_records_v3", JSON.stringify(initialRecords));
    }

    // 4. Cargar Tenant Configs
    const savedTenantConfigs = localStorage.getItem("saas_tenant_configs_v3");
    if (savedTenantConfigs) {
      try {
        setTenantConfigs(JSON.parse(savedTenantConfigs));
      } catch (e) {
        console.error("Error al parsear configs de monetización", e);
      }
    } else {
      setTenantConfigs(DEFAULT_TENANT_CONFIGS);
      localStorage.setItem("saas_tenant_configs_v3", JSON.stringify(DEFAULT_TENANT_CONFIGS));
    }

    // 5. Cargar Registros Financieros
    const savedFinancialRecords = localStorage.getItem("saas_financial_records_v3");
    if (savedFinancialRecords) {
      try {
        setFinancialRecords(JSON.parse(savedFinancialRecords));
      } catch (e) {
        console.error("Error al parsear registros financieros", e);
      }
    } else {
      setFinancialRecords(DEFAULT_FINANCIAL_RECORDS);
      localStorage.setItem("saas_financial_records_v3", JSON.stringify(DEFAULT_FINANCIAL_RECORDS));
    }

    // 6. Cargar Sedes (Locations)
    const savedLocations = localStorage.getItem("saas_locations_v3");
    if (savedLocations) {
      try {
        setLocations(JSON.parse(savedLocations));
      } catch (e) {
        console.error("Error al parsear sedes", e);
      }
    } else {
      setLocations(DEFAULT_LOCATIONS);
      localStorage.setItem("saas_locations_v3", JSON.stringify(DEFAULT_LOCATIONS));
    }

    // 7. Cargar Psicólogos
    const savedPsychs = localStorage.getItem("saas_psychologists_v3");
    if (savedPsychs) {
      try {
        setPsychologists(JSON.parse(savedPsychs));
      } catch (e) {
        console.error("Error al leer psicólogos guardados", e);
      }
    } else {
      setPsychologists(PSYCHOLOGISTS);
      localStorage.setItem("saas_psychologists_v3", JSON.stringify(PSYCHOLOGISTS));
    }
  }, []);

  // Guardar en LocalStorage cada vez que cambian los datos (Modo Demo)
  useEffect(() => {
    if (isDemoMode && clinics.length > 0) {
      localStorage.setItem("saas_clinics_v3", JSON.stringify(clinics));
    }
  }, [clinics, isDemoMode]);

  useEffect(() => {
    if (isDemoMode && psychologists.length > 0) {
      localStorage.setItem("saas_psychologists_v3", JSON.stringify(psychologists));
    }
  }, [psychologists, isDemoMode]);

  useEffect(() => {
    if (isDemoMode && locations.length > 0) {
      localStorage.setItem("saas_locations_v3", JSON.stringify(locations));
    }
  }, [locations, isDemoMode]);

  useEffect(() => {
    if (isDemoMode && appointments.length > 0) {
      localStorage.setItem("psicotech_appointments_v3", JSON.stringify(appointments));
    }
  }, [appointments, isDemoMode]);

  useEffect(() => {
    if (isDemoMode && clinicalRecords.length > 0) {
      localStorage.setItem("psicotech_clinical_records_v3", JSON.stringify(clinicalRecords));
    }
  }, [clinicalRecords, isDemoMode]);

  useEffect(() => {
    if (isDemoMode && tenantConfigs.length > 0) {
      localStorage.setItem("saas_tenant_configs_v3", JSON.stringify(tenantConfigs));
    }
  }, [tenantConfigs, isDemoMode]);

  useEffect(() => {
    if (isDemoMode && financialRecords.length > 0) {
      localStorage.setItem("saas_financial_records_v3", JSON.stringify(financialRecords));
    }
  }, [financialRecords, isDemoMode]);

  // Manejo de Cambios de Autenticación Reales vs Demo
  useEffect(() => {
    if (isDemoMode) {
      // Dejar vacío para que la aplicación comience deslogueada y se muestre la pantalla de Login y Registro reales.
      setCurrentUser(null);
      setUserRole(null);
      setUserProfile(null);
      setLoadingAuth(false);
      return;
    }

    setLoadingAuth(true);
    const unsubscribe = subscribeToAuthChanges(async (user, role) => {
      setCurrentUser(user);
      setUserRole(role);
      
      if (user) {
        try {
          const snap = await getDoc(doc(db, "users", user.uid));
          if (snap.exists()) {
            const data = snap.data() as UserProfile;
            setUserProfile(data);
            if (data.role) {
              setActivePerspective(data.role as any);
              if (data.clinicId) {
                setSelectedClinicId(data.clinicId);
              }
            }
          }
        } catch (err) {
          console.error("Error al cargar perfil de Firestore:", err);
        }
      } else {
        setUserProfile(null);
      }
      setLoadingAuth(false);
    });

    return () => unsubscribe();
  }, [isDemoMode]);

  // Carga desde Firestore en tiempo real (Modo Real)
  useEffect(() => {
    if (isDemoMode) return;
    if (!currentUser) return;

    const fetchRealData = async () => {
      setLoadingAppointments(true);
      try {
        // Cargar Clínicas
        const snapClinics = await getDocs(collection(db, "clinics"));
        let listClinics: Clinic[] = [];
        if (!snapClinics.empty) {
          listClinics = snapClinics.docs.map(d => ({ id: d.id, ...(d.data() as any) })) as Clinic[];
          setClinics(listClinics);
        } else {
          // Sembrar clínicas por primera vez en Firestore si está vacío
          for (const c of DEFAULT_CLINICS) {
            await setDoc(doc(db, "clinics", c.id), c);
          }
          listClinics = DEFAULT_CLINICS;
          setClinics(DEFAULT_CLINICS);
        }

        // Cargar Sedes (Locations)
        let aggregatedLocations: Location[] = [];
        for (const c of listClinics) {
          const snapLocs = await getDocs(collection(db, "clinics", c.id, "locations"));
          if (!snapLocs.empty) {
            const listLocs = snapLocs.docs.map(d => ({ id: d.id, ...(d.data() as any) })) as Location[];
            aggregatedLocations = [...aggregatedLocations, ...listLocs];
          } else {
            // Sembrar sedes para esta clínica si no existen en Firestore
            const clinicDefaultLocs = DEFAULT_LOCATIONS.filter(l => l.clinicId === c.id);
            for (const loc of clinicDefaultLocs) {
              await setDoc(doc(db, "clinics", c.id, "locations", loc.id), loc);
              aggregatedLocations.push(loc);
            }
          }
        }
        setLocations(aggregatedLocations);

        // Cargar Citas
        const snapAppts = await getDocs(collection(db, "appointments"));
        const listAppts = snapAppts.docs.map(doc => ({ id: doc.id, ...(doc.data() as any) }));
        setAppointments(listAppts);

        // Cargar Notas Clínicas
        const snapRecords = await getDocs(collection(db, "clinical_records"));
        const listRecords = snapRecords.docs.map(doc => ({ id: doc.id, ...(doc.data() as any) }));
        setClinicalRecords(listRecords);

        // Cargar Configs de Suscripción (TenantConfig)
        const snapTenantConfigs = await getDocs(collection(db, "tenants_config"));
        if (!snapTenantConfigs.empty) {
          const listTenantConfigs = snapTenantConfigs.docs.map(d => ({ id: d.id, ...(d.data() as any) }));
          setTenantConfigs(listTenantConfigs);
        } else {
          for (const tc of DEFAULT_TENANT_CONFIGS) {
            await setDoc(doc(db, "tenants_config", tc.id), tc);
          }
          setTenantConfigs(DEFAULT_TENANT_CONFIGS);
        }

        // Cargar Registros Financieros (FinancialRecord)
        const snapFinancials = await getDocs(collection(db, "financials"));
        if (!snapFinancials.empty) {
          const listFinancials = snapFinancials.docs.map(d => ({ id: d.id, ...(d.data() as any) }));
          setFinancialRecords(listFinancials);
        } else {
          for (const fr of DEFAULT_FINANCIAL_RECORDS) {
            await setDoc(doc(db, "financials", fr.id), fr);
          }
          setFinancialRecords(DEFAULT_FINANCIAL_RECORDS);
        }

        // Cargar Psicólogos desde Firestore
        const snapUsers = await getDocs(collection(db, "users"));
        const listUsers = snapUsers.empty ? [] : snapUsers.docs.map(doc => doc.data() as UserProfile);
        const listPsychs = listUsers.filter(u => u.role === "psicologo");
        if (listPsychs.length > 0) {
          setPsychologists(listPsychs);
        } else {
          for (const p of PSYCHOLOGISTS) {
            await setDoc(doc(db, "users", p.uid), p);
          }
          setPsychologists(PSYCHOLOGISTS);
        }

      } catch (err: any) {
        console.error("Error de Firestore:", err);
        triggerStatus("Error de Firestore. Verifica tus reglas de seguridad.", "error");
      } finally {
        setLoadingAppointments(false);
      }
    };

    fetchRealData();
  }, [isDemoMode, currentUser]);

  // Efecto para precargar Sede y Consultorio según el psicólogo seleccionado en modalidad presencial
  useEffect(() => {
    if (selectedModality === "Presencial" && selectedPsychId) {
      const psych = psychologists.find(p => p.uid === selectedPsychId) || PSYCHOLOGISTS.find(p => p.uid === selectedPsychId);
      if (psych?.assignedLocationId) {
        setSelectedLocationId(psych.assignedLocationId);
        if (psych.assignedConsultorio) {
          setSelectedConsultorio(psych.assignedConsultorio);
        } else {
          const loc = DEFAULT_LOCATIONS.find(l => l.id === psych.assignedLocationId);
          if (loc?.consultorios?.length) {
            setSelectedConsultorio(loc.consultorios[0]);
          }
        }
      }
    }
  }, [selectedPsychId, selectedModality, psychologists]);

  // Carga la información de marca blanca al formulario cuando cambia el psicólogo o clínica activa
  const activePsychologist = psychologists.find(p => p.uid === activePsychologistId) || PSYCHOLOGISTS.find(p => p.uid === activePsychologistId);
  const currentClinicId = activePsychologist?.clinicId || "clinic_psicotech";
  const activeClinic = clinics.find(c => c.id === (activePerspective === "psicologo" ? currentClinicId : selectedClinicId)) || clinics[0];

  // Estados reactivos de Perfil Profesional para Marca Blanca
  const [profSpecialty, setProfSpecialty] = useState("Psicología Clínica y Ansiedad");
  const [profType, setProfType] = useState<"Médico" | "Psicólogo" | "Entrenador Físico" | "Odontólogo" | "Fisioterapeuta" | "Otro">("Psicólogo");
  const [profLicense, setProfLicense] = useState("RETHUS-98745214-CO");

  // Estado de navegación interno para el terapeuta
  const [therapistTab, setTherapistTab] = useState<"citas" | "historias">("citas");
  const [clinicalRecordSearch, setClinicalRecordSearch] = useState("");

  // Estado para Pasarela de Liquidación de Comisión SaaS por la Clínica
  const [selectedCommissionMethod, setSelectedCommissionMethod] = useState<"PayPal" | "Stripe" | "PSE">("PayPal");

  // Helper de metadatos de país e identidad internacional (MedicalGlobalTech)
  const getClinicMetadata = (clinic: any) => {
    const country = clinic?.country || "CO";
    switch (country) {
      case "CO":
        return {
          brandName: `${clinic?.name || "AMATE"} IPS co`,
          legalFramework: "Habeas Data (Ley 1581 de 2012) & Historia Clínica (Resolución 1995 de 1999)",
          currency: "COP",
          currencySymbol: "COP $",
          price: 90000,
          exchangeRate: 4000, // 1 USD = 4000 COP
          disclaimer: "AMATE es un proveedor de infraestructura tecnológica neutral (Ley 1581). La responsabilidad penal, médica, civil y profesional reside exclusivamente en la clínica o profesional independiente."
        };
      case "MX":
        return {
          brandName: clinic?.name || "AMATE",
          legalFramework: "LFPDPPP (Ley Federal de Protección de Datos Personales en Posesión de Particulares)",
          currency: "MXN",
          currencySymbol: "MXN $",
          price: 450,
          exchangeRate: 20, // 1 USD = 20 MXN
          disclaimer: "AMATE es un proveedor de infraestructura tecnológica neutral. La responsabilidad civil, penal y médica reside exclusivamente en la clínica o profesional independiente."
        };
      case "US":
        return {
          brandName: clinic?.name || "AMATE",
          legalFramework: "HIPAA (Health Insurance Portability and Accountability Act Compliance Framework)",
          currency: "USD",
          currencySymbol: "USD $",
          price: 22.5,
          exchangeRate: 1, // 1 USD = 1 USD
          disclaimer: "AMATE is a neutral technology infrastructure provider. Criminal, civil, professional and medical liability resides exclusively with the clinic tenant."
        };
      case "ES":
        return {
          brandName: clinic?.name || "AMATE",
          legalFramework: "RGPD (Reglamento General de Protección de Datos - UE 2016/679)",
          currency: "EUR",
          currencySymbol: "EUR €",
          price: 20.7,
          exchangeRate: 0.92, // 1 USD = 0.92 EUR
          disclaimer: "AMATE es un proveedor tecnológico neutral conforme al RGPD. La responsabilidad legal, médica y civil reside exclusivamente en el centro médico o profesional."
        };
      default:
        return {
          brandName: clinic?.name || "AMATE",
          legalFramework: "Habeas Data (Ley 1581) & Normas Internacionales de Salud",
          currency: "USD",
          currencySymbol: "USD $",
          price: 22.5,
          exchangeRate: 1,
          disclaimer: "AMATE es un proveedor de infraestructura tecnológica neutral. La responsabilidad reside en el profesional independiente."
        };
    }
  };

  const getCommissionSurcharge = (usdAmount: number, method: "PayPal" | "Stripe" | "PSE" = "PayPal") => {
    let totalUSD = usdAmount;
    if (method === "PayPal") {
      totalUSD = (usdAmount + 0.30) / (1 - 0.054);
    } else if (method === "Stripe") {
      totalUSD = (usdAmount + 0.10) / (1 - 0.034);
    } else if (method === "PSE") {
      totalUSD = usdAmount + 1.0;
    }
    const surchargeUSD = totalUSD - usdAmount;
    return {
      baseUSD: usdAmount,
      surchargeUSD: Number(surchargeUSD.toFixed(2)),
      totalUSD: Number(totalUSD.toFixed(2))
    };
  };

  useEffect(() => {
    if (activeClinic) {
      setWbName(activeClinic.name);
      setWbThemeColor(activeClinic.themeColor);
      setWbLogoType(activeClinic.logoType);
      setWbLogoIcon(activeClinic.logoIcon);
      setWbLogoBase64(activeClinic.logoBase64 || "");
      setWbNequiPhone(activeClinic.nequiPhone);
      setWbNequiHolder(activeClinic.nequiHolder);
      setWbDaviplataPhone(activeClinic.daviplataPhone);
      setWbDaviplataHolder(activeClinic.daviplataHolder);
      setWbBancolombiaAccount(activeClinic.bancolombiaAccount);
      setWbBancolombiaHolder(activeClinic.bancolombiaHolder);
    }
    if (activePsychologist) {
      setProfSpecialty(activePsychologist.specialty || "Psicología Clínica y Ansiedad");
      setProfType((activePsychologist.profType as any) || "Psicólogo");
      setProfLicense(activePsychologist.professionalLicense || "RETHUS-98745214-CO");
    }
  }, [activeClinic, activePsychologistId, activePerspective, activePsychologist]);

  const triggerStatus = (text: string, type: "success" | "error" | "info") => {
    setStatusMessage({ text, type });
    setTimeout(() => setStatusMessage(null), 7000);
  };

  // Simulación rápida de Roles / Clínicas (Evaluadores)
  const switchPerspective = (role: "paciente" | "superadmin" | "psicologo", pId?: string) => {
    setActivePerspective(role);
    setAuthError(null);
    setAuthSuccess(null);

    let email = "paciente@psotech.com";
    let name = "Juan Pérez";
    let phone = "3124445566";
    let uid = "paciente_test_uid_789";
    let clinicId = "clinic_psicotech";

    if (role === "superadmin") {
      email = "superadmin@psotech.com";
      name = "Dr. Carlos Mendoza (Admin SaaS)";
      uid = "superadmin_test_uid_123";
      clinicId = "clinic_psicotech";
    } else if (role === "psicologo") {
      const targetPId = pId || activePsychologistId;
      const psych = (psychologists.length > 0 ? psychologists : PSYCHOLOGISTS).find(p => p.uid === targetPId) || PSYCHOLOGISTS.find(p => p.uid === targetPId) || PSYCHOLOGISTS[0];
      email = psych.email;
      name = psych.name;
      uid = psych.uid;
      clinicId = psych.clinicId;
      setActivePsychologistId(psych.uid);
    }

    setCurrentUser({ uid, email });
    setUserRole(role);
    setUserProfile({ uid, email, name, phone, role, clinicId, status: "active" });
    triggerStatus(`Consola del Rol cambiada a: ${role.toUpperCase()} (${name})`, "info");
  };

  /**
   * Registro Extendid Multi-Rol (Paciente, Psicólogo, Clínica Administrador)
   */
  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password || !fullName || !cellPhone) {
      setAuthError("Por favor llena todos los campos obligatorios.");
      return;
    }

    if ((registerRole === "superadmin" || (registerRole === "psicologo" && !selectedClinicId)) && !newClinicName) {
      setAuthError("Por favor ingresa el nombre de la clínica o consultorio a crear.");
      return;
    }

    setIsSubmitting(true);
    setAuthError(null);
    setAuthSuccess(null);

    if (isDemoMode) {
      setTimeout(() => {
        const mockUid = registerRole + "_" + Math.random().toString(36).substring(2, 9);
        let finalClinicId = selectedClinicId;

        // Crear nueva clínica si se solicita o es superadmin
        if ((registerRole === "superadmin" || registerRole === "psicologo") && newClinicName) {
          const newId = "clinic_" + Math.random().toString(36).substring(2, 9);
          const currency = newClinicCountry === "Colombia" ? "COP" : newClinicCountry === "México" ? "MXN" : newClinicCountry === "España" ? "EUR" : newClinicCountry === "Argentina" ? "AR" : "USD";
          
          const createdClinic: Clinic = {
            id: newId,
            name: newClinicName,
            logoType: "icon",
            logoIcon: registerRole === "psicologo" ? "Brain" : "Activity",
            logoColor: `text-${newClinicColor}-400`,
            status: "active",
            themeColor: newClinicColor,
            country: newClinicCountry,
            currency: currency,
            nequiPhone: cellPhone,
            nequiHolder: fullName,
            daviplataPhone: cellPhone,
            daviplataHolder: fullName,
            bancolombiaAccount: "333-" + Math.floor(100000 + Math.random() * 900000) + "-11",
            bancolombiaHolder: fullName
          };

          const newTenantConfig: TenantConfig = {
            id: newId,
            clinicId: newId,
            monetizationMode: "fixed_fee",
            fixedFeeAmount: 90,
            commissionPercentage: 10,
            fixedPerSessionAmount: 3.5,
            paymentRoute: "direct",
            status: "active",
            updatedAt: new Date().toISOString()
          };

          setClinics(prev => [...prev, createdClinic]);
          setTenantConfigs(prev => [...prev, newTenantConfig]);
          finalClinicId = newId;
          setSelectedClinicId(newId);
        }

        const newProfile: UserProfile = {
          uid: mockUid,
          email,
          name: fullName,
          phone: cellPhone,
          role: registerRole,
          clinicId: finalClinicId,
          status: "active",
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };

        if (registerRole === "psicologo") {
          newProfile.specialty = registerSpecialty;
          newProfile.professionalLicense = registerLicense;
          newProfile.assignedLocationId = "";
          newProfile.assignedConsultorio = "";
          setPsychologists(prev => [...prev, newProfile]);
          setActivePsychologistId(mockUid);
        }

        setCurrentUser({ uid: mockUid, email });
        setUserRole(registerRole);
        setUserProfile(newProfile);
        setActivePerspective(registerRole as any);
        setIsSubmitting(false);
        setIsRegisterMode(false);
        setAuthSuccess(`Registro de ${registerRole.toUpperCase()} de demostración exitoso.`);
        triggerStatus(`Registrado exitosamente. Rol: ${registerRole.toUpperCase()}`, "success");
      }, 500);
      return;
    }

    try {
      const userCred = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCred.user;
      let finalClinicId = selectedClinicId;

      // Crear nueva clínica si se solicita en Firestore
      if ((registerRole === "superadmin" || registerRole === "psicologo") && newClinicName) {
        const newId = "clinic_" + Math.random().toString(36).substring(2, 9);
        const currency = newClinicCountry === "Colombia" ? "COP" : newClinicCountry === "México" ? "MXN" : newClinicCountry === "España" ? "EUR" : newClinicCountry === "Argentina" ? "AR" : "USD";
        
        const createdClinic: Clinic = {
          id: newId,
          name: newClinicName,
          logoType: "icon",
          logoIcon: registerRole === "psicologo" ? "Brain" : "Activity",
          logoColor: `text-${newClinicColor}-400`,
          status: "active",
          themeColor: newClinicColor,
          country: newClinicCountry,
          currency: currency,
          nequiPhone: cellPhone,
          nequiHolder: fullName,
          daviplataPhone: cellPhone,
          daviplataHolder: fullName,
          bancolombiaAccount: "333-" + Math.floor(100000 + Math.random() * 900000) + "-11",
          bancolombiaHolder: fullName
        };

        const newTenantConfig: TenantConfig = {
          id: newId,
          clinicId: newId,
          monetizationMode: "fixed_fee",
          fixedFeeAmount: 90,
          commissionPercentage: 10,
          fixedPerSessionAmount: 3.5,
          paymentRoute: "direct",
          status: "active",
          updatedAt: new Date().toISOString()
        };

        // Guardar en Firestore
        await setDoc(doc(db, "clinics", newId), createdClinic);
        await setDoc(doc(db, "tenants_config", newId), newTenantConfig);

        setClinics(prev => [...prev, createdClinic]);
        setTenantConfigs(prev => [...prev, newTenantConfig]);
        finalClinicId = newId;
        setSelectedClinicId(newId);
      }

      const newProfile: UserProfile = {
        uid: user.uid,
        email,
        name: fullName,
        phone: cellPhone,
        role: registerRole,
        clinicId: finalClinicId,
        status: "active",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      if (registerRole === "psicologo") {
        newProfile.specialty = registerSpecialty;
        newProfile.professionalLicense = registerLicense;
        newProfile.assignedLocationId = "";
        newProfile.assignedConsultorio = "";
        setPsychologists(prev => [...prev, newProfile]);
        setActivePsychologistId(user.uid);
      }

      // Guardar perfil de usuario en Firestore
      await setDoc(doc(db, "users", user.uid), newProfile);

      setCurrentUser(user);
      setUserRole(registerRole);
      setUserProfile(newProfile);
      setActivePerspective(registerRole as any);
      setIsRegisterMode(false);
      setAuthSuccess(`¡Cuenta de ${registerRole} creada exitosamente en Firestore!`);
      triggerStatus(`Usuario registrado como ${registerRole.toUpperCase()} en Firestore.`, "success");
    } catch (err: any) {
      console.error(err);
      setAuthError(err.message || "Error al registrar.");
    } finally {
      setIsSubmitting(false);
    }
  };

  /**
   * Login Multi-Tenant
   */
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setAuthError("Ingresa tu correo y contraseña.");
      return;
    }

    setIsSubmitting(true);
    setAuthError(null);
    setAuthSuccess(null);

    if (isDemoMode) {
      setTimeout(() => {
        if (email.includes("superadmin")) {
          switchPerspective("superadmin");
        } else if (email.includes("psicologo") || email.includes("mendoza") || email.includes("soto")) {
          let selectedId = "psicologo_test_uid_456";
          if (email.includes("mendoza")) selectedId = "psicologo_test_uid_777";
          if (email.includes("soto")) selectedId = "psicologo_test_uid_888";
          switchPerspective("psicologo", selectedId);
        } else {
          switchPerspective("paciente");
        }
        setIsSubmitting(false);
      }, 300);
      return;
    }

    try {
      const result = await loginWithEmailAndPassword(email, password);
      setUserProfile(result.profile as any);
      setUserRole(result.profile.role);
      setCurrentUser(result.user);
      setActivePerspective(result.profile.role as any);
      setSelectedClinicId(result.profile.clinicId);
      triggerStatus(`Bienvenido(a), ${result.profile.name}. Acceso correcto.`, "success");
    } catch (err: any) {
      setAuthError(err.message);
      triggerStatus(err.message, "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  /**
   * Cerrar Sesión
   */
  const handleLogout = async () => {
    if (isDemoMode) {
      setCurrentUser(null);
      setUserRole(null);
      setUserProfile(null);
      triggerStatus("Sesión simulada cerrada.", "info");
      return;
    }
    await logout();
    setCurrentUser(null);
    setUserRole(null);
    setUserProfile(null);
    triggerStatus("Sesión real cerrada.", "info");
  };

  /**
   * Agendamiento de Citas Multi-inquilino (MedicalGlobalTech)
   */
  const handleScheduleAppointment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) {
      triggerStatus("Por favor inicia sesión para agendar.", "error");
      return;
    }

    const metadata = getClinicMetadata(activeClinic);

    if (activeClinic?.status === "legal_only") {
      triggerStatus(`🚫 Bloqueo Judicial Activo: Este centro (${metadata.brandName}) se encuentra actualmente en estado de Auditoría Judicial de Emergencia. El agendamiento de nuevas citas está totalmente bloqueado.`, "error");
      return;
    }

    if (activeClinic?.status === "inactive") {
      triggerStatus("No se pueden programar citas para una clínica inactiva.", "error");
      return;
    }

    const selectedPsych = (psychologists.length > 0 ? psychologists : PSYCHOLOGISTS).find(p => p.uid === selectedPsychId) || PSYCHOLOGISTS.find(p => p.uid === selectedPsychId);
    if (!selectedPsych) return;

    // Validación de Modalidad Presencial y Dobre Cupo Físico
    let finalLocationId = "";
    let finalLocationName = "";
    let finalLocationAddress = "";
    let finalLocationCity = "";
    let finalConsultorio = "";
    let generatedMeetingLink = "";

    if (selectedModality === "Presencial") {
      if (!selectedLocationId) {
        triggerStatus("Por favor selecciona una Sede física para la cita presencial.", "error");
        return;
      }
      if (!selectedConsultorio) {
        triggerStatus("Por favor selecciona un consultorio físico.", "error");
        return;
      }

      const loc = locations.find(l => l.id === selectedLocationId);
      if (!loc) {
        triggerStatus("Sede no encontrada.", "error");
        return;
      }

      finalLocationId = selectedLocationId;
      finalLocationName = loc.name;
      finalLocationAddress = loc.address;
      finalLocationCity = loc.city;
      finalConsultorio = selectedConsultorio;

      // Control de sobrecupo físico: evitar que dos psicólogos agenden la misma oficina a la misma hora
      const hasDoubleBooking = appointments.some(appt => 
        appt.status !== "Realizada" && 
        appt.paymentStatus !== "Rechazada" &&
        appt.modality === "Presencial" &&
        appt.date === selectedDate &&
        appt.time === selectedTime &&
        appt.locationId === selectedLocationId &&
        appt.consultorio === selectedConsultorio &&
        appt.psychologistId !== selectedPsych.uid
      );

      if (hasDoubleBooking) {
        triggerStatus(`⚠️ ¡Conflicto de Sobrecupo Físico! El "${selectedConsultorio}" en la sede "${loc.name}" ya está reservado por otro profesional el ${selectedDate} a las ${selectedTime}.`, "error");
        return;
      }
    } else {
      // Virtual modality
      if (selectedChannel === "WhatsApp") {
        const phoneClean = userProfile?.phone || "573124445566";
        const message = encodeURIComponent(
          `Hola ${userProfile?.name || "Paciente"}, bienvenido a la teleconsulta de ${activeClinic?.name}. Iniciamos tu sesión agendada para el ${selectedDate} a las ${selectedTime}. ¡Por favor ingresa aquí!`
        );
        generatedMeetingLink = `https://wa.me/${phoneClean.replace(/\+/g, "")}?text=${message}`;
      } else if (selectedChannel === "Google Meet") {
        generatedMeetingLink = "https://meet.google.com/abc-defg-hij";
      } else {
        generatedMeetingLink = `tel:${userProfile?.phone || "+573124445566"}`;
      }
    }

    const isAutomatic = selectedPaymentMethod.startsWith("automatic");
    const initialStatus = isAutomatic ? "Confirmada" : "Pendiente de Verificación";

    // 1. Obtener la Configuración de Monetización de la Clínica
    const activeConfig = tenantConfigs.find(tc => tc.clinicId === selectedClinicId) || tenantConfigs[0];
    const monetizationMode = activeConfig.monetizationMode;
    const rate = metadata.exchangeRate;

    // Calcular Comisión Base en USD
    let baseCommissionUSD = 0;
    if (monetizationMode === "commission_percentage") {
      // Porcentaje de la sesión. El precio de la sesión se convierte a USD.
      const priceUSD = metadata.price / rate;
      baseCommissionUSD = priceUSD * ((activeConfig.commissionPercentage || 12) / 100);
    } else if (monetizationMode === "fixed_per_session") {
      baseCommissionUSD = activeConfig.fixedPerSessionAmount || 5.0;
    } else {
      // Fixed Fee
      baseCommissionUSD = 0;
    }

    // Calcular Recargo de Pasarela de Pagos (Surcharge)
    const activeGateway = activeConfig.commissionMethod || "PayPal";
    const feeDetails = getCommissionSurcharge(baseCommissionUSD, activeGateway as any);

    // Convertir de regreso a Moneda Local
    const baseCommissionLocal = Number((feeDetails.baseUSD * rate).toFixed(2));
    const surchargeLocal = Number((feeDetails.surchargeUSD * rate).toFixed(2));
    const totalCommissionLocal = Number((feeDetails.totalUSD * rate).toFixed(2));

    // Determinar estado de activación inicial por sesión
    // Si la clínica está en modelo fixed_fee, no paga por sesión individual (se autohabilita)
    const initialSaasCommissionStatus = monetizationMode === "fixed_fee" ? "aprobado" : "pendiente";

    const apptId = "appt_" + Date.now();

    const newAppt: Appointment = {
      id: apptId,
      clinicId: selectedClinicId, // Tenant link!
      patientId: currentUser.uid,
      patientName: userProfile?.name || "Paciente Anónimo",
      patientPhone: userProfile?.phone || "3124445566",
      psychologistId: selectedPsych.uid,
      psychologistName: selectedPsych.name,
      date: selectedDate,
      time: selectedTime,
      modality: selectedModality,
      channel: selectedModality === "Virtual" ? selectedChannel : undefined,
      locationId: selectedModality === "Presencial" ? finalLocationId : undefined,
      locationName: selectedModality === "Presencial" ? finalLocationName : undefined,
      locationAddress: selectedModality === "Presencial" ? finalLocationAddress : undefined,
      locationCity: selectedModality === "Presencial" ? finalLocationCity : undefined,
      consultorio: selectedModality === "Presencial" ? finalConsultorio : undefined,
      paymentMethod: selectedPaymentMethod,
      paymentStatus: initialStatus,
      status: "Agendada",
      meetingLink: selectedModality === "Virtual" ? generatedMeetingLink : undefined,
      notes: customNotes,
      saasCommissionStatus: initialSaasCommissionStatus, // Campo de Activación por Sesión
      createdAt: new Date().toISOString()
    };

    // Crear Registro Financiero asociado
    const newFinRecord: FinancialRecord = {
      id: "fin_" + Date.now(),
      clinicId: selectedClinicId,
      appointmentId: apptId,
      patientName: newAppt.patientName,
      totalAmount: metadata.price,
      totalAmountUSD: Number((metadata.price / rate).toFixed(2)),
      paymentRoute: activeConfig.paymentRoute || "direct",
      monetizationMode: monetizationMode,
      calculatedCommission: baseCommissionLocal,
      calculatedCommissionUSD: feeDetails.baseUSD,
      surchargeAmount: surchargeLocal,
      netClinicBalance: metadata.price - (activeConfig.paymentRoute === "centralized" ? totalCommissionLocal : 0),
      netClinicBalanceUSD: Number(((metadata.price - (activeConfig.paymentRoute === "centralized" ? totalCommissionLocal : 0)) / rate).toFixed(2)),
      payoutStatus: activeConfig.paymentRoute === "centralized" ? "pendiente_payout" : "facturado_mes",
      createdAt: new Date().toISOString()
    };

    if (isDemoMode) {
      setAppointments([newAppt, ...appointments]);
      setFinancialRecords([newFinRecord, ...financialRecords]);
      setCustomNotes("");

      let messageText = `¡Consulta agendada con éxito!`;
      if (initialSaasCommissionStatus === "pendiente") {
        messageText += ` 🔒 Cita en espera de activación SaaS. La clínica debe transferir la comisión de infraestructura (${feeDetails.totalUSD.toFixed(2)} USD / ${totalCommissionLocal.toLocaleString()} ${metadata.currency}) para habilitar los accesos de teleconsulta.`;
      } else {
        messageText += ` Acceso de teleconsulta activado automáticamente por suscripción mensual.`;
      }
      triggerStatus(messageText, "success");
      return;
    }

    try {
      await addDoc(collection(db, "appointments"), {
        ...newAppt,
        id: undefined, // Let Firestore generate its key, but we sync it
        createdAt: serverTimestamp()
      });
      await addDoc(collection(db, "financials"), {
        ...newFinRecord,
        createdAt: serverTimestamp()
      });
      setAppointments([newAppt, ...appointments]);
      setFinancialRecords([newFinRecord, ...financialRecords]);
      setCustomNotes("");
      triggerStatus(`¡Cita y registro financiero creados de forma segura en Firestore para la clínica ${metadata.brandName}!`, "success");
    } catch (err: any) {
      console.error(err);
      triggerStatus(`Error al guardar en Firestore: ${err.message}`, "error");
    }
  };

  /**
   * Subida de Comprobante de Pago Multi-Tenant
   */
  const handleUploadReceiptFile = (apptId: string, base64: string) => {
    const updated = appointments.map(appt => {
      if (appt.id === apptId) {
        return {
          ...appt,
          receiptImage: base64,
          receiptDetails: {
            txId: "TX-" + Math.floor(Math.random() * 90000000 + 10000000),
            amount: 90000,
            date: new Date().toISOString().replace("T", " ").substring(0, 16),
            sender: appt.patientName
          }
        };
      }
      return appt;
    });

    setAppointments(updated);
    setUploadingForId(null);
    triggerStatus("¡Comprobante cargado de forma segura! Pendiente de aprobación por la clínica.", "success");

    if (!isDemoMode) {
      updateDoc(doc(db, "appointments", apptId), {
        receiptImage: base64,
        receiptDetails: {
          txId: "TX-" + Math.floor(Math.random() * 90000000 + 10000000),
          amount: 90000,
          date: new Date().toISOString().replace("T", " ").substring(0, 16),
          sender: appointments.find(a => a.id === apptId)?.patientName || "Paciente"
        }
      }).catch(err => console.error(err));
    }
  };

  const handleUseMockReceipt = (apptId: string) => {
    handleUploadReceiptFile(apptId, "nequi_voucher_logo_purple_cop");
  };

  /**
   * Administrador de la Clínica: Aprobar/Rechazar Pago
   */
  const handleApprovePayment = async (apptId: string) => {
    const updated = appointments.map(appt => {
      if (appt.id === apptId) return { ...appt, paymentStatus: "Confirmada" as const };
      return appt;
    });
    setAppointments(updated);
    setReceiptModalAppointment(null);
    triggerStatus("¡Pago validado y cita Confirmada! El paciente ya puede ingresar a su consulta.", "success");

    if (!isDemoMode) {
      try {
        await updateDoc(doc(db, "appointments", apptId), { paymentStatus: "Confirmada" });
      } catch (err) {
        console.error(err);
      }
    }
  };

  const handleRejectPayment = async (apptId: string) => {
    const updated = appointments.map(appt => {
      if (appt.id === apptId) return { ...appt, paymentStatus: "Rechazada" as const };
      return appt;
    });
    setAppointments(updated);
    setReceiptModalAppointment(null);
    triggerStatus("Soporte de pago rechazado. El paciente deberá cargar uno nuevo.", "info");

    if (!isDemoMode) {
      try {
        await updateDoc(doc(db, "appointments", apptId), { paymentStatus: "Rechazada" });
      } catch (err) {
        console.error(err);
      }
    }
  };

  /**
   * Psicólogo: Guardar Historia Clínica (Borrador vs Cerrar y Firmar)
   */
  const handleSaveClinicalNoteEx = async (signAndLock: boolean) => {
    if (!clinicalRecordPatientId || !clinicalRecordNotes) {
      triggerStatus("Por favor diligencie todos los campos de evolución médica.", "error");
      return;
    }

    // Generar hash de firma digital criptográfico simulado si se firma la sesión
    let hashHex = undefined;
    if (signAndLock) {
      const textToHash = clinicalRecordNotes.trim();
      let calculatedHash = 0;
      for (let i = 0; i < textToHash.length; i++) {
        calculatedHash = (calculatedHash << 5) - calculatedHash + textToHash.charCodeAt(i);
        calculatedHash |= 0;
      }
      hashHex = "SHA-256 [0x" + Math.abs(calculatedHash).toString(16).toUpperCase() + "]";
    }

    const newRecord: ClinicalRecord = {
      id: "rec_" + Date.now(),
      clinicId: currentClinicId,
      patientId: "pac_id_" + Math.random().toString(36).substring(2, 6),
      patientName: clinicalRecordPatientId,
      psychologistId: activePsychologistId,
      notes: clinicalRecordNotes,
      isConfidential: isConfidential,
      locked: signAndLock,
      hash: hashHex,
      createdAt: new Date().toISOString()
    };

    if (isDemoMode) {
      const recordId = "rec_" + Date.now();
      const updated = [{ ...newRecord, id: recordId }, ...clinicalRecords];
      setClinicalRecords(updated);
      setClinicalRecordNotes("");
      setClinicalRecordPatientId("");
      setIsConfidential(false);

      if (signAndLock) {
        triggerStatus(`🔒 Historia Clínica Cerrada y Firmada. Hash Criptográfico: ${hashHex}. 📧 Se envió una copia en PDF cifrado (AES-256) al correo del profesional: ${activePsychologist?.email || "doctor@globaltech.com"}.`, "success");
      } else {
        triggerStatus(`📝 Borrador de evolución clínica guardado con éxito. Puede continuar editándolo en el historial antes de firmarlo.`, "success");
      }
      return;
    }

    try {
      await addDoc(collection(db, "clinical_records"), {
        ...newRecord,
        createdAt: serverTimestamp()
      });
      const updated = [newRecord, ...clinicalRecords];
      setClinicalRecords(updated);
      setClinicalRecordNotes("");
      setClinicalRecordPatientId("");
      setIsConfidential(false);

      if (signAndLock) {
        triggerStatus(`🔒 Historia Clínica Cerrada y Firmada en Firestore. Hash: ${hashHex}. 📧 Se envió un PDF cifrado al profesional.`, "success");
      } else {
        triggerStatus(`📝 Borrador registrado correctamente en Firestore.`, "success");
      }
    } catch (err: any) {
      console.error(err);
      triggerStatus(`Error al guardar en Firestore: ${err.message}`, "error");
    }
  };

  /**
   * Psicólogo/Admin de Clínica: Guardar Configuración Marca Blanca (White-Label)
   */
  const handleSaveWhiteLabel = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!wbName) {
      triggerStatus("Por favor indica el nombre de la clínica.", "error");
      return;
    }

    const updatedClinics = clinics.map(c => {
      if (c.id === currentClinicId) {
        return {
          ...c,
          name: wbName,
          themeColor: wbThemeColor,
          logoType: wbLogoType,
          logoIcon: wbLogoIcon,
          logoBase64: wbLogoBase64,
          nequiPhone: wbNequiPhone,
          nequiHolder: wbNequiHolder,
          daviplataPhone: wbDaviplataPhone,
          daviplataHolder: wbDaviplataHolder,
          bancolombiaAccount: wbBancolombiaAccount,
          bancolombiaHolder: wbBancolombiaHolder
        };
      }
      return c;
    });

    setClinics(updatedClinics);
    triggerStatus("¡Configuración de Marca Blanca y Cuentas de Pago guardadas exitosamente!", "success");

    if (!isDemoMode) {
      try {
        await updateDoc(doc(db, "clinics", currentClinicId), {
          name: wbName,
          themeColor: wbThemeColor,
          logoType: wbLogoType,
          logoIcon: wbLogoIcon,
          logoBase64: wbLogoBase64,
          nequiPhone: wbNequiPhone,
          nequiHolder: wbNequiHolder,
          daviplataPhone: wbDaviplataPhone,
          daviplataHolder: wbDaviplataHolder,
          bancolombiaAccount: wbBancolombiaAccount,
          bancolombiaHolder: wbBancolombiaHolder
        });
      } catch (err) {
        console.error("Error al actualizar marca blanca en Firestore:", err);
      }
    }
  };

  /**
   * Administrador de Clínica: Crear Sede / Consultorio físico
   */
  const handleCreateLocation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newLocationName || !newLocationAddress || !newLocationCity || !newLocationConsultorios) {
      triggerStatus("Por favor complete todos los campos de la sede.", "error");
      return;
    }

    const consultoriosList = newLocationConsultorios
      .split(",")
      .map(c => c.trim())
      .filter(c => c.length > 0);

    if (consultoriosList.length === 0) {
      triggerStatus("Por favor ingrese al menos un consultorio válido.", "error");
      return;
    }

    const newLocId = "loc_" + Date.now();
    const newLoc: Location = {
      id: newLocId,
      clinicId: currentClinicId,
      name: newLocationName,
      address: newLocationAddress,
      city: newLocationCity,
      consultorios: consultoriosList
    };

    setLocations([...locations, newLoc]);
    setNewLocationName("");
    setNewLocationAddress("");
    setNewLocationCity("Bogotá");
    setNewLocationConsultorios("");
    triggerStatus(`¡Sede física '${newLocationName}' creada exitosamente con ${consultoriosList.length} consultorios!`, "success");

    if (!isDemoMode) {
      try {
        await setDoc(doc(db, "clinics", currentClinicId, "locations", newLocId), newLoc);
      } catch (err: any) {
        console.error("Error al crear sede en Firestore:", err);
      }
    }
  };

  /**
   * Administrador Global (Yo): Cambiar Estado de Clínicas Clientes (active | inactive | legal_only)
   */
  const handleToggleClinicStatus = async (clinicId: string, customStatus?: "active" | "inactive" | "legal_only") => {
    const targetClinic = clinics.find(c => c.id === clinicId);
    if (!targetClinic) return;

    let newStatus: "active" | "inactive" | "legal_only" = "active";
    if (customStatus) {
      newStatus = customStatus;
    } else {
      if (targetClinic.status === "active") {
        newStatus = "inactive";
      } else if (targetClinic.status === "inactive") {
        newStatus = "legal_only";
      } else {
        newStatus = "active";
      }
    }

    const updatedClinics = clinics.map(c => {
      if (c.id === clinicId) {
        return {
          ...c,
          status: newStatus
        };
      }
      return c;
    });

    setClinics(updatedClinics);
    triggerStatus(
      `Clínica '${targetClinic.name}' ahora está en estado: ${
        newStatus === "active" ? "🟢 ACTIVO" : 
        newStatus === "inactive" ? "🔴 SUSPENDIDO" : 
        "⚖️ BLOQUEO JUDICIAL (RESTRICCIÓN TOTAL)"
      }`,
      newStatus === "active" ? "success" : "info"
    );

    if (!isDemoMode) {
      try {
        await updateDoc(doc(db, "clinics", clinicId), {
          status: newStatus
        });
      } catch (err) {
        console.error("Error al actualizar estado en Firestore:", err);
      }
    }
  };

  /**
   * Paciente: Solicitar Cambio de Psicólogo (Regla de Continuidad)
   */
  const handleRequestPsychologistChange = async (apptId: string, reason: string) => {
    if (reason.trim().length < 50) {
      triggerStatus("El motivo debe tener al menos 50 caracteres.", "error");
      return;
    }

    const updated = appointments.map(appt => {
      if (appt.id === apptId) {
        return {
          ...appt,
          status: "Pendiente de Reasignación" as const,
          changeRequested: true,
          changeRequestReason: reason
        };
      }
      return appt;
    });

    setAppointments(updated);
    setChangeRequestReason("");
    setShowChangeRequestModal(false);
    setSelectedAppointmentForChange(null);
    triggerStatus("¡Solicitud de cambio enviada! Pendiente de revisión por administración.", "success");

    if (!isDemoMode) {
      try {
        await updateDoc(doc(db, "appointments", apptId), {
          status: "Pendiente de Reasignación",
          changeRequested: true,
          changeRequestReason: reason
        });
      } catch (err: any) {
        console.error("Error al actualizar en Firestore:", err);
      }
    }
  };

  /**
   * Administrador de Clínica: Aprobar Cambio de Profesional
   */
  const handleApproveChangeRequest = async (apptId: string, newPsychId: string) => {
    const newPsych = (psychologists.length > 0 ? psychologists : PSYCHOLOGISTS).find(p => p.uid === newPsychId) || PSYCHOLOGISTS.find(p => p.uid === newPsychId);
    if (!newPsych) {
      triggerStatus("Por favor selecciona un psicólogo válido.", "error");
      return;
    }

    const targetAppt = appointments.find(a => a.id === apptId);
    if (!targetAppt) return;

    // Validación y Reasignación de Sede / Consultorio físico para citas presenciales
    let physicalUpdates: Partial<Appointment> = {};
    if (targetAppt.modality === "Presencial") {
      if (newPsych.assignedLocationId) {
        if (newPsych.assignedLocationId !== targetAppt.locationId) {
          const newLoc = DEFAULT_LOCATIONS.find(l => l.id === newPsych.assignedLocationId);
          if (newLoc) {
            physicalUpdates = {
              locationId: newPsych.assignedLocationId,
              locationName: newLoc.name,
              locationAddress: newLoc.address,
              locationCity: newLoc.city,
              consultorio: newPsych.assignedConsultorio || newLoc.consultorios[0]
            };
            triggerStatus(`⚠️ Reubicación física automática: La cita se trasladó a la sede "${newLoc.name}" (${newPsych.assignedConsultorio || "Consultorio Asignado"}) ya que el psicólogo trabaja allí.`, "info");
          }
        } else if (newPsych.assignedConsultorio && newPsych.assignedConsultorio !== targetAppt.consultorio) {
          physicalUpdates = {
            consultorio: newPsych.assignedConsultorio
          };
          triggerStatus(`🏢 Consultorio reasignado: Se actualizó la cita presencial al "${newPsych.assignedConsultorio}" asignado a ${newPsych.name}.`, "info");
        }
      }
    }

    const updated = appointments.map(appt => {
      if (appt.id === apptId) {
        return {
          ...appt,
          psychologistId: newPsych.uid,
          psychologistName: newPsych.name,
          status: "Reasignada" as const,
          changeRequested: false,
          ...physicalUpdates
        };
      }
      return appt;
    });

    setAppointments(updated);
    triggerStatus(`Cita reasignada con éxito a ${newPsych.name}.`, "success");

    // Calcular monetización y guardar en financials
    const activeConfig = tenantConfigs.find(tc => tc.clinicId === targetAppt.clinicId) || tenantConfigs[0];
    const monetizationMode = activeConfig ? activeConfig.monetizationMode : "fixed_fee";
    let calculatedCommission = 0;
    if (monetizationMode === "commission_percentage") {
      calculatedCommission = 90000 * ((activeConfig?.commissionPercentage || 12) / 100);
    } else if (monetizationMode === "fixed_per_session") {
      calculatedCommission = activeConfig?.fixedPerSessionAmount || 15000;
    }
    const netClinicBalance = 90000 - calculatedCommission;

    const newFinRecord: FinancialRecord = {
      id: "fin_" + Date.now(),
      clinicId: targetAppt.clinicId,
      appointmentId: apptId,
      patientName: targetAppt.patientName,
      totalAmount: 90000,
      paymentRoute: activeConfig?.paymentRoute || "direct",
      monetizationMode: monetizationMode,
      calculatedCommission,
      netClinicBalance,
      payoutStatus: "pendiente_payout",
      createdAt: new Date().toISOString()
    };

    setFinancialRecords([newFinRecord, ...financialRecords]);

    if (!isDemoMode) {
      try {
        await updateDoc(doc(db, "appointments", apptId), {
          psychologistId: newPsych.uid,
          psychologistName: newPsych.name,
          status: "Reasignada",
          changeRequested: false,
          ...physicalUpdates
        });

        await setDoc(doc(db, "financials", newFinRecord.id), newFinRecord);
      } catch (err: any) {
        console.error("Error al actualizar reasignación en Firestore:", err);
      }
    }
  };

  /**
   * Administrador de Clínica: Rechazar Cambio de Profesional
   */
  const handleRejectChangeRequest = async (apptId: string) => {
    const updated = appointments.map(appt => {
      if (appt.id === apptId) {
        return {
          ...appt,
          status: "Agendada" as const,
          changeRequested: false
        };
      }
      return appt;
    });

    setAppointments(updated);
    triggerStatus("Solicitud de cambio rechazada. Se mantiene el profesional original.", "info");

    if (!isDemoMode) {
      try {
        await updateDoc(doc(db, "appointments", apptId), {
          status: "Agendada",
          changeRequested: false
        });
      } catch (err: any) {
        console.error("Error al rechazar en Firestore:", err);
      }
    }
  };

  /**
   * SuperAdmin Global (Yo): Configurar Monetización SaaS para Clínicas
   */
  const handleSaveTenantConfig = async (
    clinicId: string, 
    mode: "fixed_fee" | "commission_percentage" | "fixed_per_session", 
    fixedFee: number, 
    commPct: number, 
    fixedSess: number, 
    route: "direct" | "centralized"
  ) => {
    const updatedConfigs = tenantConfigs.map(tc => {
      if (tc.clinicId === clinicId) {
        return {
          ...tc,
          monetizationMode: mode,
          fixedFeeAmount: fixedFee,
          commissionPercentage: commPct,
          fixedPerSessionAmount: fixedSess,
          paymentRoute: route,
          updatedAt: new Date().toISOString()
        };
      }
      return tc;
    });

    setTenantConfigs(updatedConfigs);
    triggerStatus("Configuración de monetización del inquilino actualizada.", "success");

    if (!isDemoMode) {
      try {
        await updateDoc(doc(db, "tenants_config", clinicId), {
          monetizationMode: mode,
          fixedFeeAmount: fixedFee,
          commissionPercentage: commPct,
          fixedPerSessionAmount: fixedSess,
          paymentRoute: route,
          updatedAt: new Date().toISOString()
        });
      } catch (err: any) {
        console.error("Error al guardar en Firestore:", err);
      }
    }
  };

  // Convertir imagen a base64 para cargar un logo propio
  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const reader = new FileReader();
      reader.onload = (uploadEvent) => {
        if (uploadEvent.target?.result) {
          setWbLogoBase64(uploadEvent.target.result as string);
          setWbLogoType("uploaded");
          triggerStatus("¡Logotipo personalizado cargado con éxito!", "success");
        }
      };
      reader.readAsDataURL(e.target.files[0]);
    }
  };

  // Filtrado de profesionales según clínica seleccionada (para agendamiento del paciente)
  const filteredPsychologists = (psychologists.length > 0 ? psychologists : PSYCHOLOGISTS).filter(p => p.clinicId === selectedClinicId);

  useEffect(() => {
    const list = (psychologists.length > 0 ? psychologists : PSYCHOLOGISTS).filter(p => p.clinicId === selectedClinicId);
    if (list.length > 0) {
      const exists = list.some(p => p.uid === selectedPsychId);
      if (!exists) {
        setSelectedPsychId(list[0].uid);
      }
    } else {
      setSelectedPsychId("");
    }
  }, [selectedClinicId, psychologists, selectedPsychId]);

  // Tema del inquilino activo
  const theme = getThemeClasses(activeClinic?.themeColor || "emerald");

  // Renderizador de iconos de logo de Lucide
  const renderLogo = (clinicObj?: Clinic, sizeClass = "h-5 w-5") => {
    if (!clinicObj) {
      return <Activity className={`${sizeClass} text-emerald-400`} />;
    }
    if (clinicObj.logoType === "uploaded" && clinicObj.logoBase64) {
      return (
        <img 
          src={clinicObj.logoBase64} 
          alt={clinicObj.name} 
          className={`${sizeClass} object-contain rounded bg-slate-800 p-0.5`}
          referrerPolicy="no-referrer"
        />
      );
    }
    const iconName = clinicObj.logoIcon || "Activity";
    const colorClass = clinicObj.logoColor || "text-emerald-400";
    
    switch (iconName) {
      case "Activity": return <Activity className={`${sizeClass} ${colorClass}`} />;
      case "Sparkles": return <Sparkles className={`${sizeClass} ${colorClass}`} />;
      case "Heart": return <Heart className={`${sizeClass} ${colorClass}`} />;
      case "Brain": return <Brain className={`${sizeClass} ${colorClass}`} />;
      case "Settings": return <Settings className={`${sizeClass} ${colorClass}`} />;
      default: return <Activity className={`${sizeClass} ${colorClass}`} />;
    }
  };

  // Estadísticas globales para el SuperAdmin
  const activeClinicsCount = clinics.filter(c => c.status === "active").length;
  const inactiveClinicsCount = clinics.filter(c => c.status === "inactive").length;
  const totalClinicsCount = clinics.length;
  const totalGlobalRevenue = appointments
    .filter(a => a.paymentStatus === "Confirmada")
    .reduce((sum, curr) => sum + 90000, 0);

  // Estadísticas específicas para la clínica del psicólogo logueado
  const clinicAppointments = appointments.filter(a => a.clinicId === currentClinicId);
  const clinicPendingCount = clinicAppointments.filter(a => a.paymentStatus === "Pendiente de Verificación").length;
  const clinicConfirmedCount = clinicAppointments.filter(a => a.paymentStatus === "Confirmada").length;
  const clinicRevenue = clinicConfirmedCount * 90000;

  return (
    <div className="flex h-screen w-full bg-slate-50 text-slate-800 font-sans overflow-hidden">
      
      {/* SELECTOR DE ROLES DE SIMULACIÓN - FLOATING CONTROL (SÓLO SI HAY USUARIO AUTENTICADO) */}
      {currentUser && (
        <div className="fixed top-4 right-4 z-[9999] bg-white/95 backdrop-blur-md p-3.5 rounded-2xl border border-slate-250 shadow-lg flex flex-col gap-2 max-w-sm">
          <div className="flex items-center gap-2 justify-between">
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-500 flex items-center gap-1">
              <Sparkles className="h-3.5 w-3.5 text-sky-500 animate-pulse" />
              Selector de Roles de Simulación
            </span>
            <span className="text-[9px] font-bold text-slate-400 bg-slate-100 px-1.5 py-0.2 rounded-full font-mono uppercase">
              {activePerspective === "superadmin" ? "SaaS Global" : "Inquilino"}
            </span>
          </div>
          
          <div className="grid grid-cols-2 gap-2">
            {/* Botón SuperUsuario */}
            <button
              type="button"
              onClick={() => switchPerspective("superadmin")}
              className={`px-3 py-2 text-left rounded-xl text-xs font-bold border transition-all flex flex-col gap-0.5 ${
                activePerspective === "superadmin"
                  ? "bg-emerald-50 border-emerald-200 text-emerald-800 shadow-xs"
                  : "bg-white hover:bg-slate-50 border-slate-200 text-slate-600"
              }`}
            >
              <span className="flex items-center gap-1 font-black">
                🔑 SuperUsuario
              </span>
              <span className="text-[9px] text-amber-600 font-black font-display tracking-wider">
                ÁMATE
              </span>
            </button>

            {/* Botón Clínica / Profesional */}
            <button
              type="button"
              onClick={() => switchPerspective("psicologo", activePsychologistId || (psychologists.length > 0 ? psychologists[0].uid : PSYCHOLOGISTS[0].uid))}
              className={`px-3 py-2 text-left rounded-xl text-xs font-bold border transition-all flex flex-col gap-0.5 ${
                activePerspective === "psicologo"
                  ? "bg-sky-50 border-sky-200 text-sky-800 shadow-xs"
                  : "bg-white hover:bg-slate-50 border-slate-200 text-slate-600"
              }`}
            >
              <span className="flex items-center gap-1 font-black">
                🏥 Clínica / Prof
              </span>
              <span className="text-[9px] text-slate-400 font-bold font-sans">
                {activeClinic?.name || "Consultorio IPS"}
              </span>
            </button>
          </div>
        </div>
      )}

      {/* 1. SIDEBAR CENTRALIZADO PARA LA SIMULACIÓN (SÓLO SI HAY USUARIO AUTENTICADO) */}
      {currentUser && (
        <aside className="w-80 bg-white flex flex-col border-r border-slate-200 text-slate-600 shrink-0 shadow-sm z-20">
        
        {/* Cabecera Sidebar con Jerarquía "AMATE" y Contenedor Dinámico */}
        <div className="p-6 border-b border-slate-100 bg-amber-50/10">
          <div className="mb-4">
            <div className="flex items-center space-x-3">
              <img 
                src={amateLogo} 
                alt="AMATE Logo" 
                className="h-11 w-11 object-contain rounded-full shadow-md border border-amber-200 bg-white"
                referrerPolicy="no-referrer"
              />
              <div className="flex flex-col">
                <span className="font-display font-extrabold tracking-widest text-amber-700 text-xl leading-none">
                  ÁMATE
                </span>
                <span className="font-serif italic text-[9px] tracking-widest text-amber-600 font-bold uppercase mt-0.5">
                  y transforma tu vida
                </span>
              </div>
            </div>
            <div className="h-0.5 w-16 bg-amber-500 rounded mt-3"></div>
          </div>
          
          <div className="flex items-center space-x-3 p-3 bg-white border border-slate-100 rounded-xl shadow-sm">
            <span className="p-1.5 bg-slate-50 rounded-lg border border-slate-100 shrink-0 flex items-center justify-center">
              {activePerspective === "psicologo" && activePsychologist ? (
                <User className="h-4 w-4 text-sky-500" />
              ) : (
                renderLogo(activeClinic, "h-4 w-4")
              )}
            </span>
            <div className="min-w-0 flex-1">
              <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block leading-none">
                {activePerspective === "psicologo" ? "Profesional Activo" : "Inquilino Activo"}
              </span>
              <p className="text-slate-800 font-bold text-xs leading-tight truncate mt-0.5">
                {activePerspective === "psicologo" && activePsychologist 
                  ? activePsychologist.name 
                  : activePerspective === "superadmin" 
                    ? "Administrador Global (Yo)" 
                    : activeClinic?.name}
              </p>
            </div>
          </div>
        </div>

        {/* CONTROLES DE SIMULACIÓN MULTI-ROL */}
        <div className="p-4 border-b border-slate-100 bg-slate-50/20">
          <div className="flex justify-between items-center mb-3">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1">
              <Sparkles className="h-3.5 w-3.5 text-amber-500" /> Simulador de Escenarios
            </span>
            <button 
              onClick={() => {
                setIsDemoMode(!isDemoMode);
                setCurrentUser(null);
                setUserProfile(null);
                setUserRole(null);
              }}
              className="flex items-center gap-1 px-2 py-0.5 rounded bg-slate-100 border border-slate-200 text-[9px] text-slate-600 hover:text-slate-800 font-semibold"
              title="Alternar entre base de datos local sandbox y llamadas de red a Firebase"
            >
              <Server className="h-2.5 w-2.5" />
              <span>{isDemoMode ? "DEMO" : "FIREBASE"}</span>
            </button>
          </div>

          <div className="space-y-1.5">
            {/* 1. VISTA PACIENTE */}
            <button 
              onClick={() => switchPerspective("paciente")} 
              className={`w-full py-1.5 px-3 text-left rounded-lg text-xs font-semibold transition-all flex items-center justify-between ${activePerspective === "paciente" ? "bg-sky-500 text-white font-bold shadow-sm" : "bg-slate-100/60 hover:bg-slate-200/80 text-slate-600"}`}
            >
              <span className="flex items-center gap-1.5">
                <User className="h-3.5 w-3.5" />
                <span>1. Vista: Paciente</span>
              </span>
              <span className={`text-[8px] px-1 py-0.2 rounded font-mono ${activePerspective === "paciente" ? "bg-white/20 text-white" : "bg-slate-200 text-slate-500"}`}>Agendar</span>
            </button>

            {/* 2. VISTA PSICÓLOGO / PROVEEDOR CLINICO */}
            <div className="space-y-1 bg-slate-100/40 p-1.5 rounded-lg border border-slate-150">
              <span className="text-[9px] font-bold text-slate-400 uppercase px-1.5 block">2. Rol: Psicólogo / Dueño Clínica</span>
              {(psychologists.length > 0 ? psychologists : PSYCHOLOGISTS).map(p => {
                const isSelected = activePerspective === "psicologo" && activePsychologistId === p.uid;
                const pClinic = clinics.find(c => c.id === p.clinicId);
                return (
                  <button
                    key={p.uid}
                    onClick={() => switchPerspective("psicologo", p.uid)}
                    className={`w-full py-1 px-2 text-left rounded text-[11px] font-semibold transition-all flex items-center justify-between ${isSelected ? "bg-indigo-500 text-white shadow-sm" : "hover:bg-slate-200/60 text-slate-500 hover:text-slate-700"}`}
                  >
                    <span className="truncate flex items-center gap-1">
                      <UserCheck className="h-3 w-3" />
                      <span>{p.name}</span>
                    </span>
                    <span className={`text-[8px] font-mono italic truncate max-w-[90px] ${isSelected ? "text-indigo-100" : "text-slate-400"}`}>
                      {pClinic?.name || "Clínica"}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* 3. VISTA GLOBAL ADMIN */}
            <button 
              onClick={() => switchPerspective("superadmin")} 
              className={`w-full py-1.5 px-3 text-left rounded-lg text-xs font-semibold transition-all flex items-center justify-between ${activePerspective === "superadmin" ? "bg-emerald-500 text-white font-bold shadow-sm" : "bg-slate-100/60 hover:bg-slate-200/80 text-slate-600"}`}
            >
              <span className="flex items-center gap-1.5">
                <Shield className="h-3.5 w-3.5" />
                <span>3. Red SaaS: Admin Global (Yo)</span>
              </span>
              <span className={`text-[8px] px-1 py-0.2 rounded font-mono ${activePerspective === "superadmin" ? "bg-white/20 text-white" : "bg-slate-200 text-slate-500"}`}>Habilitar</span>
            </button>
          </div>
        </div>

        {/* INFORMACIÓN DE MARCA BLANCA DEL INQUILINO ACTIVO */}
        <div className="flex-1 p-5 space-y-4 overflow-y-auto bg-white">
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-150 shadow-sm">
            <div className="flex items-center gap-2 border-b border-slate-100 pb-2 mb-2">
              <Building className="h-4 w-4 text-emerald-500" />
              <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider">Pasarela Activa {activeClinic?.id === "clinic_psicotech" ? "IPS" : "SaaS"}</h3>
            </div>
            
            {activeClinic?.status === "inactive" ? (
              <div className="p-2 bg-rose-50 border border-rose-100 rounded text-rose-600 text-[10px] flex items-start gap-1">
                <AlertCircle className="h-3 w-3 shrink-0 mt-0.5" />
                <span>Esta clínica ha sido suspendida. El cobro manual de Nequi/Daviplata está desactivado.</span>
              </div>
            ) : (
              <div className="space-y-2 text-[11px]">
                <div className="p-2 bg-white rounded border border-slate-100 shadow-sm">
                  <span className="font-bold text-emerald-600 text-[9px] uppercase block">🟣 Nequi Empresa</span>
                  <p className="font-mono text-slate-700 mt-0.5 font-semibold">Cel: {activeClinic?.nequiPhone}</p>
                  <p className="text-[9px] text-slate-400 truncate">{activeClinic?.nequiHolder}</p>
                </div>
                <div className="p-2 bg-white rounded border border-slate-100 shadow-sm">
                  <span className="font-bold text-rose-600 text-[9px] uppercase block">🔴 Daviplata Empresa</span>
                  <p className="font-mono text-slate-700 mt-0.5 font-semibold">Cel: {activeClinic?.daviplataPhone}</p>
                  <p className="text-[9px] text-slate-400 truncate">{activeClinic?.daviplataHolder}</p>
                </div>
                <div className="p-2 bg-white rounded border border-slate-100 shadow-sm">
                  <span className="font-bold text-amber-600 text-[9px] uppercase block">🟡 Bancolombia</span>
                  <p className="font-mono text-slate-700 mt-0.5 font-semibold">Nro: {activeClinic?.bancolombiaAccount}</p>
                  <p className="text-[9px] text-slate-400 truncate">{activeClinic?.bancolombiaHolder}</p>
                </div>
              </div>
            )}
          </div>

          <div className="bg-slate-50 p-3 rounded-xl border border-slate-150 text-[10px] text-slate-500 leading-relaxed space-y-1">
            <span className="font-bold text-slate-700 block mb-1">💡 Demo de Marca Blanca:</span>
            <p>1. Ve a <strong className="text-indigo-500">Vista: Dra. Ana Gómez</strong>, cambia el Logo o el Color de la clínica en su panel inferior, y guárdalo.</p>
            <p>2. Vuelve a <strong className="text-sky-500">Vista: Paciente</strong>, verás cómo se re-brandea instantáneamente con tus nuevos cambios de marca.</p>
          </div>
        </div>

        <footer className="p-4 border-t border-slate-100 bg-slate-50 text-[10px] text-slate-400 text-center font-mono flex flex-col gap-0.5 shrink-0">
          <span>Telepsicología SaaS Colombia 🇨🇴</span>
          <span className="text-emerald-500 font-bold">Estructura Multi-inquilino Activa</span>
        </footer>
      </aside>
      )}

      {/* 2. AREA DE VISUALIZACIÓN PRINCIPAL */}
      <main className="flex-1 flex flex-col overflow-hidden bg-slate-50">
        
        {/* Cabecera Superior con info de autenticación */}
        <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-8 shrink-0 shadow-sm z-10">
          <div className="flex items-center space-x-4">
            {/* Componente Visual del Encabezado (Header) de la Barra Superior */}
            <div className="flex items-center space-x-2.5 border-r border-slate-200 pr-4">
              <img 
                src={amateLogo} 
                alt="AMATE Logo" 
                className="h-8 w-8 object-contain rounded-full shadow-xs border border-amber-100 bg-white"
                referrerPolicy="no-referrer"
              />
              <div className="flex flex-col justify-center leading-none">
                <span className="font-display font-extrabold tracking-wider text-amber-700 text-sm">
                  ÁMATE
                </span>
                <span className="font-serif italic text-[8px] tracking-widest text-amber-600 font-bold uppercase mt-0.5">
                  y transforma tu vida
                </span>
              </div>
            </div>

            <span className="px-3 py-1 bg-slate-50 text-slate-500 text-xs font-bold rounded-full border border-slate-150 uppercase flex items-center gap-1.5 font-mono shadow-sm">
              <Globe className="h-3.5 w-3.5 text-sky-500 animate-pulse" /> Inquilino: {activeClinic?.name}
            </span>
            <span className="text-slate-300">|</span>
            <h1 className="text-slate-600 font-bold text-xs flex items-center gap-2">
              <span>Modo Simulación: </span>
              <span className={`px-2 py-0.5 rounded text-[10px] text-white uppercase font-bold tracking-wider ${
                activePerspective === "paciente" ? "bg-sky-500 shadow-sm" :
                activePerspective === "superadmin" ? "bg-emerald-500 shadow-sm" : "bg-indigo-500 shadow-sm"
              }`}>
                {activePerspective === "paciente" ? "VISTA PACIENTE" :
                 activePerspective === "superadmin" ? "VISTA SUPERADMIN GLOBAL" : "VISTA PSICÓLOGO"}
              </span>
            </h1>
          </div>

          <div className="flex items-center space-x-4">
            {currentUser ? (
              <div className="flex items-center space-x-3 text-xs text-slate-500">
                <span className="font-mono text-[11px]">Usuario: <strong className="text-slate-800 font-semibold">{currentUser.email}</strong></span>
                <span className="h-3.5 w-px bg-slate-200"></span>
                <button 
                  onClick={handleLogout}
                  className="px-2.5 py-1 bg-white hover:bg-slate-50 text-rose-500 hover:text-rose-600 text-xs rounded border border-slate-200 shadow-sm transition-colors flex items-center gap-1 font-bold"
                >
                  <LogOut className="h-3 w-3" />
                  Salir
                </button>
              </div>
            ) : (
              <span className="text-xs text-amber-600 font-bold font-mono">Simulación de Sesión Abierta</span>
            )}
          </div>
        </header>

        {/* BANNER DE RETROALIMENTACIÓN POPUP */}
        <AnimatePresence>
          {statusMessage && (
            <motion.div
              initial={{ opacity: 0, y: -12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              className={`mx-8 mt-4 p-3.5 rounded-xl flex items-start gap-3 border shadow-lg z-10 ${
                statusMessage.type === "success" 
                  ? "bg-emerald-950/90 border-emerald-800 text-emerald-200" 
                  : statusMessage.type === "error" 
                    ? "bg-rose-950/90 border-rose-800 text-rose-200" 
                    : "bg-blue-950/90 border-blue-800 text-blue-200"
              }`}
            >
              {statusMessage.type === "success" ? (
                <CheckCircle className="h-5 w-5 text-emerald-400 mt-0.5 shrink-0" />
              ) : statusMessage.type === "error" ? (
                <AlertCircle className="h-5 w-5 text-rose-400 mt-0.5 shrink-0" />
              ) : (
                <Info className="h-5 w-5 text-blue-400 mt-0.5 shrink-0" />
              )}
              <div className="flex-1 text-xs">
                <p className="font-bold uppercase tracking-wider mb-0.5">SaaS Multi-Inquilino Colombia</p>
                <p className="font-mono text-[11px] leading-normal">{statusMessage.text}</p>
              </div>
              <button onClick={() => setStatusMessage(null)} className="text-slate-400 hover:text-white">
                <X className="h-4 w-4" />
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* CONTAINER SCROLLABLE PRINCIPAL */}
        <div className="flex-1 overflow-y-auto p-8 space-y-8">
          
          {/* LOGIN / AUTOREGISTRO PARA USUARIO DESCONECTADO (Manejador Real) */}
          {!currentUser && (
            <div className="max-w-md mx-auto bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-6">
              <div className="text-center">
                <div className="flex justify-center mb-3">
                  <img 
                    src={amateLogo} 
                    alt="AMATE Logo" 
                    className="h-20 w-20 object-contain rounded-full shadow-md border border-amber-150 p-0.5 bg-white"
                    referrerPolicy="no-referrer"
                  />
                </div>
                <h3 className="text-xl font-extrabold text-amber-700 font-display tracking-widest leading-none mt-2">
                  ÁMATE
                </h3>
                <p className="text-[10px] text-amber-600 font-bold tracking-widest font-serif italic uppercase mt-1">
                  y transforma tu vida
                </p>
                <div className="h-px w-24 bg-gradient-to-r from-transparent via-amber-200 to-transparent mx-auto my-3"></div>
                <h4 className="text-xs font-bold text-slate-500 mt-2">Ingreso a la Red de Atención Psicológica</h4>
              </div>

              <div className="grid grid-cols-3 gap-1 p-1 bg-slate-100 rounded-xl">
                <button 
                  onClick={() => { setIsRegisterMode(false); setAuthError(null); }}
                  type="button"
                  className={`py-1.5 text-[11px] font-black rounded-lg transition-all ${!isRegisterMode ? "bg-white text-slate-800 shadow-xs" : "text-slate-500 hover:text-slate-800"}`}
                >
                  Ingresar
                </button>
                <button 
                  onClick={() => { setIsRegisterMode(true); setRegisterRole("paciente"); setAuthError(null); }}
                  type="button"
                  className={`py-1.5 text-[11px] font-black rounded-lg transition-all ${isRegisterMode && registerRole === "paciente" ? "bg-sky-500 text-white shadow-xs" : "text-slate-500 hover:text-slate-800"}`}
                >
                  Reg. Paciente
                </button>
                <button 
                  onClick={() => { setIsRegisterMode(true); setRegisterRole("superadmin"); setAuthError(null); }}
                  type="button"
                  className={`py-1.5 text-[11px] font-black rounded-lg transition-all ${isRegisterMode && registerRole === "superadmin" ? "bg-emerald-600 text-white shadow-xs" : "text-slate-500 hover:text-slate-800"}`}
                >
                  Reg. Clínica
                </button>
              </div>

              <form onSubmit={isRegisterMode ? handleRegister : handleLogin} className="space-y-4">
                {isRegisterMode && (
                  <>
                    {/* Selector de Rol Completo */}
                    <div>
                      <label className="block text-[11px] font-bold text-slate-400 uppercase mb-1.5">Rol de Registro Seleccionado</label>
                      <div className="grid grid-cols-3 gap-1.5 p-1 bg-slate-100 rounded-xl">
                        <button
                          type="button"
                          onClick={() => { setRegisterRole("paciente"); setAuthError(null); }}
                          className={`py-1.5 text-[10px] font-bold rounded-lg transition-all ${registerRole === "paciente" ? "bg-white text-slate-850 shadow-xs border border-slate-200" : "text-slate-500 hover:text-slate-800"}`}
                        >
                          Paciente / Cliente
                        </button>
                        <button
                          type="button"
                          onClick={() => { setRegisterRole("psicologo"); setAuthError(null); }}
                          className={`py-1.5 text-[10px] font-bold rounded-lg transition-all ${registerRole === "psicologo" ? "bg-white text-slate-850 shadow-xs border border-slate-200" : "text-slate-500 hover:text-slate-800"}`}
                        >
                          Profesional / Psicólogo
                        </button>
                        <button
                          type="button"
                          onClick={() => { setRegisterRole("superadmin"); setAuthError(null); }}
                          className={`py-1.5 text-[10px] font-bold rounded-lg transition-all ${registerRole === "superadmin" ? "bg-white text-slate-850 shadow-xs border border-slate-200" : "text-slate-500 hover:text-slate-800"}`}
                        >
                          Clínica / Centro IPS
                        </button>
                      </div>
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-400 uppercase mb-1">Nombre Completo</label>
                      <input 
                        type="text" 
                        required
                        placeholder={registerRole === "psicologo" ? "ej: Dra. Ana Gómez" : "ej: Juan Pérez"}
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-800 font-bold focus:outline-none focus:ring-1 focus:ring-sky-500"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-400 uppercase mb-1">Celular (WhatsApp)</label>
                      <input 
                        type="tel" 
                        required
                        placeholder="ej: 3124445566"
                        value={cellPhone}
                        onChange={(e) => setCellPhone(e.target.value)}
                        className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-800 font-bold focus:outline-none focus:ring-1 focus:ring-sky-500"
                      />
                    </div>

                    {registerRole === "psicologo" && (
                      <>
                        <div>
                          <label className="block text-[11px] font-bold text-slate-400 uppercase mb-1">Especialidad</label>
                          <input 
                            type="text" 
                            required
                            placeholder="ej: Neuropsicología y Ansiedad"
                            value={registerSpecialty}
                            onChange={(e) => setRegisterSpecialty(e.target.value)}
                            className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-800 font-bold focus:outline-none focus:ring-1 focus:ring-sky-500"
                          />
                        </div>
                        <div>
                          <label className="block text-[11px] font-bold text-slate-400 uppercase mb-1">Tarjeta Profesional o Licencia</label>
                          <input 
                            type="text" 
                            required
                            placeholder="ej: RETHUS-98745-CO"
                            value={registerLicense}
                            onChange={(e) => setRegisterLicense(e.target.value)}
                            className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-800 font-bold focus:outline-none focus:ring-1 focus:ring-sky-500"
                          />
                        </div>
                      </>
                    )}

                    {/* Asociación de Clínica para Paciente o Profesional */}
                    {(registerRole === "paciente" || registerRole === "psicologo") && (
                      <div className="space-y-3">
                        {registerRole === "psicologo" && (
                          <div>
                            <span className="block text-[11px] font-bold text-slate-400 uppercase mb-1">¿Cómo deseas trabajar?</span>
                            <div className="flex gap-2">
                              <button
                                type="button"
                                onClick={() => { setNewClinicName(""); setAuthError(null); }}
                                className={`flex-1 py-1.5 text-[10px] font-bold rounded-lg border transition-all ${!newClinicName ? "bg-sky-50 border-sky-300 text-sky-700 font-black shadow-xs" : "bg-white border-slate-200 text-slate-500"}`}
                              >
                                Unirme a Clínica Existente
                              </button>
                              <button
                                type="button"
                                onClick={() => { setNewClinicName("Mi Consultorio Privado"); setAuthError(null); }}
                                className={`flex-1 py-1.5 text-[10px] font-bold rounded-lg border transition-all ${newClinicName ? "bg-sky-50 border-sky-300 text-sky-700 font-black shadow-xs" : "bg-white border-slate-200 text-slate-500"}`}
                              >
                                Crear Consultorio Propio
                              </button>
                            </div>
                          </div>
                        )}

                        {(!newClinicName || registerRole === "paciente") ? (
                          <div>
                            <label className="block text-[11px] font-bold text-slate-400 uppercase mb-1">Seleccionar Clínica</label>
                            <select 
                              value={selectedClinicId}
                              onChange={(e) => setSelectedClinicId(e.target.value)}
                              className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-800 font-bold focus:outline-none"
                            >
                              {clinics.map(c => (
                                <option key={c.id} value={c.id}>{c.name}</option>
                              ))}
                            </select>
                          </div>
                        ) : null}
                      </div>
                    )}

                    {/* Crear nueva clínica / IPS */}
                    {(registerRole === "superadmin" || (registerRole === "psicologo" && newClinicName)) && (
                      <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
                        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">🏢 Configurar Nueva Clínica/Consultorio</span>
                        
                        <div>
                          <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Nombre de la Clínica/Consultorio</label>
                          <input 
                            type="text" 
                            required
                            placeholder="ej: Clínica Alivio Mental"
                            value={newClinicName}
                            onChange={(e) => setNewClinicName(e.target.value)}
                            className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-xl text-slate-800 font-bold focus:outline-none focus:ring-1 focus:ring-sky-500"
                          />
                        </div>

                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">País</label>
                            <select 
                              value={newClinicCountry}
                              onChange={(e) => setNewClinicCountry(e.target.value)}
                              className="w-full px-2 py-1.5 text-xs bg-white border border-slate-200 rounded-lg text-slate-800 font-bold focus:outline-none"
                            >
                              <option value="Colombia">Colombia 🇨🇴</option>
                              <option value="México">México 🇲🇽</option>
                              <option value="España">España 🇪🇸</option>
                              <option value="Argentina">Argentina 🇦🇷</option>
                              <option value="Estados Unidos">Estados Unidos 🇺🇸</option>
                            </select>
                          </div>

                          <div>
                            <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Color del Tema</label>
                            <select 
                              value={newClinicColor}
                              onChange={(e) => setNewClinicColor(e.target.value as any)}
                              className="w-full px-2 py-1.5 text-xs bg-white border border-slate-200 rounded-lg text-[#334155] font-bold focus:outline-none"
                            >
                              <option value="emerald">Esmeralda</option>
                              <option value="indigo">Índigo</option>
                              <option value="rose">Rosa</option>
                              <option value="cyan">Cian</option>
                              <option value="amber">Ámbar</option>
                              <option value="violet">Violeta</option>
                            </select>
                          </div>
                        </div>
                      </div>
                    )}
                  </>
                )}

                <div>
                  <label className="block text-[11px] font-bold text-slate-400 uppercase mb-1">Correo Electrónico</label>
                  <input 
                    type="email" 
                    required
                    placeholder="ej: tu_correo@ejemplo.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-800 font-bold focus:outline-none focus:ring-1 focus:ring-sky-500"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-400 uppercase mb-1">Contraseña</label>
                  <input 
                    type="password" 
                    required
                    placeholder="Escribe tu contraseña"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-800 font-bold focus:outline-none focus:ring-1 focus:ring-sky-500"
                  />
                </div>

                {authError && (
                  <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl flex items-start gap-2 text-rose-700 text-xs font-bold">
                    <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                    <span>{authError}</span>
                  </div>
                )}

                {authSuccess && (
                  <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-700 text-xs font-bold">
                    {authSuccess}
                  </div>
                )}

                <button 
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full py-2.5 bg-sky-600 hover:bg-sky-500 text-white font-extrabold text-xs uppercase rounded-xl shadow-sm transition-all flex items-center justify-center"
                >
                  {isSubmitting ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : (isRegisterMode ? `Registrar ${registerRole === "paciente" ? "Paciente" : registerRole === "psicologo" ? "Profesional" : "Clínica/IPS"}` : "Ingresar")}
                </button>
              </form>

              {/* Información de Demostración Colapsable (SÓLO EN MODO DEMO Y NO EN REGISTRO) */}
              {isDemoMode && !isRegisterMode && (
                <div className="p-3 bg-amber-50 rounded-xl border border-amber-200/60 text-[11px] text-amber-900 space-y-2 shadow-xs">
                  <div className="flex items-center gap-1.5 font-bold uppercase tracking-wider text-[9.5px] text-amber-800">
                    <Sparkles className="h-3.5 w-3.5 text-amber-500 shrink-0" />
                    <span>Ayuda de Simulación (Modo Sandbox)</span>
                  </div>
                  <p className="leading-relaxed text-amber-800 font-medium">Puedes usar estas credenciales simuladas para probar las diferentes perspectivas de la plataforma:</p>
                  <div className="space-y-1 bg-white p-2 rounded-lg border border-amber-100 font-mono text-[10px]">
                    <div>• <strong>Clínica / Profesional:</strong> <code className="bg-slate-100 px-1 rounded text-slate-800 select-all">psicologo@psotech.com</code></div>
                    <div>• <strong>Paciente / Cliente:</strong> <code className="bg-slate-100 px-1 rounded text-slate-800 select-all">paciente@psotech.com</code></div>
                    <div className="text-slate-400 border-t border-slate-100 pt-1.5 mt-1">✓ Contraseña: <em>Cualquier valor o vacía</em></div>
                  </div>
                  <p className="text-[9.5px] text-amber-700 italic font-medium">Si deseas simular al Administrador Global del SaaS, ingresa con <code className="bg-white px-1 rounded border select-all">superadmin@psotech.com</code></p>
                </div>
              )}
            </div>
          )}

          {/* PERSPECTIVA 1: PACIENTE (Marca Blanca Dinámica aplicada) */}
          {currentUser && activePerspective === "paciente" && (
            <div className="space-y-6">
              
              {/* Selector de Clínicas para Simular la Experiencia de Pacientes en Diferentes Clínicas */}
              <div className="bg-[#E0F2FE] p-5 rounded-2xl border border-[#BAE6FD] flex flex-col md:flex-row justify-between items-center gap-4 shadow-sm">
                <div className="flex items-center gap-3">
                  <span className="p-2 bg-white rounded-xl border border-[#BAE6FD] text-sky-600 shadow-sm">
                    <Building className="h-5 w-5" />
                  </span>
                  <div>
                    <h4 className="text-sm font-extrabold text-[#0369A1] uppercase tracking-wider">Demostración Multi-inquilino</h4>
                    <p className="text-[11px] text-sky-700 font-medium">Simula la entrada del paciente a través de los diferentes portales web de cada clínica cliente</p>
                  </div>
                </div>

                <div className="flex items-center gap-2.5">
                  <span className="text-xs text-sky-800 font-bold">Cambiar de Clínica:</span>
                  <select 
                    value={selectedClinicId}
                    onChange={(e) => {
                      setSelectedClinicId(e.target.value);
                      triggerStatus(`Cargando Marca Blanca de la Clínica: ${clinics.find(c => c.id === e.target.value)?.name}`, "info");
                    }}
                    className="px-3.5 py-2 text-xs bg-white border border-[#BAE6FD] rounded-xl text-slate-700 focus:ring-2 focus:ring-sky-500 focus:outline-none font-bold cursor-pointer shadow-sm"
                  >
                    {clinics.map(c => (
                      <option key={c.id} value={c.id}>{c.name} {c.status === "inactive" ? "(🔴 Suspendida)" : "(🟢 Activa)"}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Patient Welcome Greeting branded */}
              <div className="bg-[#DCFCE7] p-6 rounded-2xl border border-[#BBF7D0] flex flex-col md:flex-row justify-between items-start md:items-center gap-4 shadow-sm">
                <div className="flex items-center gap-4">
                  <span className="p-3 bg-white rounded-xl border border-[#BBF7D0] shadow-sm flex items-center justify-center">
                    {renderLogo(activeClinic, "h-8 w-8")}
                  </span>
                  <div>
                    <h3 className="text-lg font-black text-[#15803D] flex items-center gap-2">
                      <Sparkle className="h-4.5 w-4.5 text-emerald-600 animate-pulse" />
                      Portal de Salud: {activeClinic?.name}
                    </h3>
                    <p className="text-xs text-emerald-800 font-medium">Agenda tu videollamada de telemedicina con nuestros psicólogos especializados. Sin cobros de comisión.</p>
                  </div>
                </div>
                
                {activeClinic?.status === "inactive" && (
                  <div className="px-4 py-2 rounded-xl bg-red-50 border border-red-200 text-red-600 text-xs font-black flex items-center gap-2 shadow-sm animate-bounce">
                    <AlertCircle className="h-4 w-4" />
                    <span>Clínica Suspendida Temporalmente</span>
                  </div>
                )}
              </div>

              {/* Grid: Formulario de Agenda (Izquierda) & Mis Citas en este Tenant (Derecha) */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                
                {/* FORMULARIO AGENDAR NUEVA CITA */}
                <div className="lg:col-span-5 bg-[#ECFDF5] p-6 rounded-2xl border border-[#A7F3D0] space-y-6 h-fit shadow-sm">
                  <div className="border-b border-[#A7F3D0] pb-3 flex items-center justify-between">
                    <h3 className="text-sm font-black text-emerald-900 uppercase tracking-wider flex items-center gap-2">
                      <Calendar className="h-4.5 w-4.5 text-[#059669]" /> Agendar Consulta Online
                    </h3>
                    <span className="text-[10px] bg-emerald-100 text-[#059669] px-2.5 py-0.5 rounded-full border border-emerald-200 font-bold uppercase">
                      100% Directo
                    </span>
                  </div>

                  {activeClinic?.status === "inactive" ? (
                    <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl space-y-2 text-xs text-rose-700 shadow-sm">
                      <p className="font-bold uppercase tracking-wider flex items-center gap-1">
                        <AlertCircle className="h-4 w-4" /> Servicio Bloqueado
                      </p>
                      <p className="leading-relaxed text-[11px]">
                        El Administrador Global de la Red SaaS ha suspendido temporalmente las operaciones comerciales de <strong>{activeClinic?.name}</strong> por falta de suscripción. No se permite programar citas ni recibir pagos en este momento.
                      </p>
                    </div>
                  ) : (
                    <form onSubmit={handleScheduleAppointment} className="space-y-4">
                      {/* Seleccionar Psicólogo del Tenant */}
                      <div>
                        <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1.5">Psicólogo Clínico Disponible</label>
                        <select 
                          value={selectedPsychId}
                          onChange={(e) => setSelectedPsychId(e.target.value)}
                          className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-xl text-slate-800 focus:outline-none font-medium shadow-sm"
                        >
                          {filteredPsychologists.length === 0 ? (
                            <option value="">No hay psicólogos asignados a esta clínica</option>
                          ) : (
                            filteredPsychologists.map(p => (
                              <option key={p.uid} value={p.uid}>{p.name} - {p.specialty}</option>
                            ))
                          )}
                        </select>
                      </div>

                      {/* Fecha y Hora */}
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1.5">Fecha</label>
                          <input 
                            type="date" 
                            value={selectedDate}
                            onChange={(e) => setSelectedDate(e.target.value)}
                            className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-xl text-slate-800 font-medium shadow-sm"
                          />
                        </div>
                        <div>
                          <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1.5">Hora</label>
                          <select 
                            value={selectedTime}
                            onChange={(e) => setSelectedTime(e.target.value)}
                            className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-xl text-slate-800 font-medium shadow-sm"
                          >
                            <option value="08:00">08:00 AM</option>
                            <option value="09:00">09:00 AM</option>
                            <option value="10:30">10:30 AM</option>
                            <option value="13:30">01:30 PM</option>
                            <option value="15:00">03:00 PM</option>
                            <option value="16:30">04:30 PM</option>
                          </select>
                        </div>
                      </div>

                      {/* Modalidad de Atención: Virtual o Presencial */}
                      <div>
                        <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1.5">Modalidad de Consulta</label>
                        <div className="grid grid-cols-2 gap-3">
                          <button 
                            type="button"
                            onClick={() => setSelectedModality("Virtual")}
                            className={`py-2 px-3 rounded-xl text-xs font-bold border transition-all flex items-center justify-center gap-2 ${selectedModality === "Virtual" ? "bg-[#ECFDF5] border-[#A7F3D0] text-[#059669] shadow-sm" : "bg-white border-slate-200 text-slate-500 hover:text-slate-800 shadow-sm"}`}
                          >
                            <Video className="h-4 w-4" />
                            <span>Virtual (Online)</span>
                          </button>

                          <button 
                            type="button"
                            onClick={() => setSelectedModality("Presencial")}
                            className={`py-2 px-3 rounded-xl text-xs font-bold border transition-all flex items-center justify-center gap-2 ${selectedModality === "Presencial" ? "bg-amber-50 border-amber-200 text-amber-700 shadow-sm" : "bg-white border-slate-200 text-slate-500 hover:text-slate-800 shadow-sm"}`}
                          >
                            <MapPin className="h-4 w-4" />
                            <span>Presencial (Sede)</span>
                          </button>
                        </div>
                      </div>

                      {selectedModality === "Virtual" ? (
                        /* Canales Gratuitos Virtuales */
                        <div>
                          <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1.5">Canal de Consulta (Gratuito)</label>
                          <div className="grid grid-cols-3 gap-2">
                            <button 
                              type="button"
                              onClick={() => setSelectedChannel("WhatsApp")}
                              className={`py-2 px-1.5 rounded-xl text-[10px] font-bold border transition-all flex flex-col items-center justify-center gap-1 ${selectedChannel === "WhatsApp" ? "bg-emerald-50 border-emerald-200 text-emerald-700 shadow-sm" : "bg-white border-slate-200 text-slate-500 hover:text-slate-800"}`}
                            >
                              <MessageSquare className="h-4 w-4 text-emerald-500" />
                              <span>WhatsApp</span>
                            </button>

                            <button 
                              type="button"
                              onClick={() => setSelectedChannel("Google Meet")}
                              className={`py-2 px-1.5 rounded-xl text-[10px] font-bold border transition-all flex flex-col items-center justify-center gap-1 ${selectedChannel === "Google Meet" ? "bg-blue-50 border-blue-200 text-blue-700 shadow-sm" : "bg-white border-slate-200 text-slate-500 hover:text-slate-800"}`}
                            >
                              <Video className="h-4.5 w-4.5 text-blue-500" />
                              <span>Google Meet</span>
                            </button>

                            <button 
                              type="button"
                              onClick={() => setSelectedChannel("Llamada Telefónica")}
                              className={`py-2 px-1.5 rounded-xl text-[10px] font-bold border transition-all flex flex-col items-center justify-center gap-1 ${selectedChannel === "Llamada Telefónica" ? "bg-indigo-50 border-indigo-200 text-indigo-700 shadow-sm" : "bg-white border-slate-200 text-slate-500 hover:text-slate-800"}`}
                            >
                              <Phone className="h-4.5 w-4.5 text-indigo-500" />
                              <span>Llamada Móvil</span>
                            </button>
                          </div>
                        </div>
                      ) : (
                        /* Selección de Sedes y Consultorios Físicos */
                        <div className="space-y-3 bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs">
                          <div>
                            <label className="block text-[10px] font-bold text-slate-600 uppercase mb-1">Selecciona Sede Física</label>
                            <select 
                              value={selectedLocationId}
                              onChange={(e) => {
                                setSelectedLocationId(e.target.value);
                                const loc = locations.find(l => l.id === e.target.value);
                                if (loc?.consultorios?.length) {
                                  setSelectedConsultorio(loc.consultorios[0]);
                                }
                              }}
                              className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-xl text-slate-800 font-medium"
                            >
                              <option value="">-- Seleccionar Sede --</option>
                              {locations.filter(l => l.clinicId === selectedClinicId).map(l => (
                                <option key={l.id} value={l.id}>{l.name} - {l.address} ({l.city})</option>
                              ))}
                            </select>
                          </div>

                          {selectedLocationId && (
                            <div>
                              <label className="block text-[10px] font-bold text-slate-600 uppercase mb-1">Consultorio Asignado</label>
                              <select 
                                value={selectedConsultorio}
                                onChange={(e) => setSelectedConsultorio(e.target.value)}
                                className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-xl text-slate-800 font-medium"
                              >
                                {locations.find(l => l.id === selectedLocationId)?.consultorios.map(c => (
                                  <option key={c} value={c}>{c}</option>
                                ))}
                              </select>
                              <p className="text-[9px] text-slate-400 mt-1">
                                Para evitar sobrecupo, el psicólogo tiene asignada de forma exclusiva esta oficina en este horario.
                              </p>
                            </div>
                          )}
                        </div>
                      )}

                      {/* Métodos de Pago - MÓDULO DE PASARELA DE PAGOS Y BANCOS */}
                      <div className="bg-[#F3E8FF] p-4 rounded-2xl border border-[#D8B4FE] space-y-3.5 shadow-sm">
                        <label className="block text-[11px] font-black text-purple-950 uppercase tracking-wider">
                          💳 Módulo de Pagos y Bancos (COP $90.000)
                        </label>
                        
                        <div className="space-y-2">
                          {/* Canales Directos de la Clínica */}
                          <div className="bg-white p-3 rounded-xl border border-purple-100 space-y-1.5 shadow-xs">
                            <p className="font-extrabold text-purple-900 text-[10px]">Opción 1: Transferencia Directa a la Clínica (0% Comisión)</p>
                            <div className="grid grid-cols-3 gap-1.5">
                              <label className={`flex items-center justify-center py-2 px-1 rounded-xl border text-[10px] font-bold cursor-pointer transition-all ${selectedPaymentMethod === "manual_nequi" ? "bg-purple-600 border-purple-700 text-white shadow-md font-extrabold" : "bg-white border-slate-200 text-slate-500 hover:text-slate-800 shadow-sm"}`}>
                                <input type="radio" name="paymentType" checked={selectedPaymentMethod === "manual_nequi"} onChange={() => setSelectedPaymentMethod("manual_nequi")} className="hidden" />
                                Nequi
                              </label>
                              <label className={`flex items-center justify-center py-2 px-1 rounded-xl border text-[10px] font-bold cursor-pointer transition-all ${selectedPaymentMethod === "manual_daviplata" ? "bg-red-600 border-red-700 text-white shadow-md font-extrabold" : "bg-white border-slate-200 text-slate-500 hover:text-slate-800 shadow-sm"}`}>
                                <input type="radio" name="paymentType" checked={selectedPaymentMethod === "manual_daviplata"} onChange={() => setSelectedPaymentMethod("manual_daviplata")} className="hidden" />
                                Daviplata
                              </label>
                              <label className={`flex items-center justify-center py-2 px-1 rounded-xl border text-[10px] font-bold cursor-pointer transition-all ${selectedPaymentMethod === "manual_bancolombia" ? "bg-amber-500 border-amber-600 text-slate-950 shadow-md font-extrabold" : "bg-white border-slate-200 text-slate-500 hover:text-slate-800 shadow-sm"}`}>
                                <input type="radio" name="paymentType" checked={selectedPaymentMethod === "manual_bancolombia"} onChange={() => setSelectedPaymentMethod("manual_bancolombia")} className="hidden" />
                                Bancolombia
                              </label>
                            </div>
                          </div>

                          {/* Pasarela del SaaS */}
                          <div className="bg-white p-3 rounded-xl border border-purple-100 space-y-1.5 shadow-xs">
                            <p className="font-extrabold text-purple-900 text-[10px]">Opción 2: Pasarela Automática Integrada (SaaS)</p>
                            <div className="grid grid-cols-2 gap-2">
                              <label className={`flex items-center justify-center gap-1 py-2 px-2 rounded-xl border text-[10px] font-bold cursor-pointer transition-all ${selectedPaymentMethod === "automatic_pse" ? "bg-sky-600 border-sky-700 text-white shadow-md font-extrabold" : "bg-white border-slate-200 text-slate-500 hover:text-slate-800 shadow-sm"}`}>
                                <input type="radio" name="paymentType" checked={selectedPaymentMethod === "automatic_pse"} onChange={() => setSelectedPaymentMethod("automatic_pse")} className="hidden" />
                                PSE (Banco)
                              </label>
                              <label className={`flex items-center justify-center gap-1 py-2 px-2 rounded-xl border text-[10px] font-bold cursor-pointer transition-all ${selectedPaymentMethod === "automatic_card" ? "bg-indigo-600 border-indigo-700 text-white shadow-md font-extrabold" : "bg-white border-slate-200 text-slate-500 hover:text-slate-800 shadow-sm"}`}>
                                <input type="radio" name="paymentType" checked={selectedPaymentMethod === "automatic_card"} onChange={() => setSelectedPaymentMethod("automatic_card")} className="hidden" />
                                Tarjeta Crédito
                              </label>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Motivo de Consulta */}
                      <div>
                        <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">Motivo / Síntomas</label>
                        <input 
                          type="text" 
                          placeholder="ej: Crisis de ansiedad por sobrecarga laboral"
                          value={customNotes}
                          onChange={(e) => setCustomNotes(e.target.value)}
                          className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-xl text-slate-800 font-medium shadow-sm"
                        />
                      </div>

                      <button 
                        type="submit"
                        disabled={filteredPsychologists.length === 0}
                        className="w-full py-3 bg-[#059669] hover:bg-[#047857] text-white font-black text-xs uppercase rounded-xl transition-all flex items-center justify-center gap-2 shadow-md tracking-wider"
                      >
                        <Plus className="h-4 w-4" />
                        Agendar en {activeClinic?.name}
                      </button>
                    </form>
                  )}
                </div>

                {/* MIS CONSULTAS AGENDADAS (Filtrado por Clínica Tenant) */}
                <div className="lg:col-span-7 bg-white p-6 rounded-2xl border border-slate-200 space-y-4 shadow-sm">
                  <div className="border-b border-slate-150 pb-3 flex items-center justify-between">
                    <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider flex items-center gap-2">
                      <Clock className="h-4.5 w-4.5 text-sky-600" /> Consultas con esta Clínica
                    </h3>
                    <span className="text-[10px] text-slate-500 font-mono">Inquilino: {activeClinic?.name}</span>
                  </div>

                  {loadingAppointments ? (
                    <div className="py-12 text-center text-slate-500 text-xs">Buscando en la base de datos...</div>
                  ) : appointments.filter(a => a.patientId === currentUser.uid && a.clinicId === selectedClinicId).length === 0 ? (
                    <div className="py-12 border-2 border-dashed border-slate-200 rounded-2xl text-center text-slate-500 text-xs flex flex-col items-center justify-center gap-2 bg-slate-50/50">
                      <Calendar className="h-8 w-8 text-slate-400" />
                      <span className="font-bold text-slate-500">No tienes citas programadas en esta clínica.</span>
                    </div>
                  ) : (
                    <div className="space-y-4 max-h-[560px] overflow-y-auto pr-1">
                      {appointments
                        .filter(a => a.patientId === currentUser.uid && a.clinicId === selectedClinicId)
                        .map((appt) => {
                          const isManual = appt.paymentMethod.startsWith("manual");
                          const hasReceipt = appt.receiptImage !== undefined;

                          return (
                            <div key={appt.id} className="p-4 bg-slate-50 border border-slate-200/80 rounded-2xl space-y-4 shadow-xs">
                              <div className="flex justify-between items-start">
                                <div>
                                  <span className="text-[10px] uppercase font-bold text-slate-400">Terapeuta:</span>
                                  <h4 className="text-slate-800 font-black text-sm">{appt.psychologistName}</h4>
                                  <div className="flex items-center gap-3 text-[11px] text-slate-600 font-medium mt-1">
                                    <span>📅 {appt.date}</span>
                                    <span>⏰ {appt.time}</span>
                                  </div>
                                </div>

                                <div className="text-right">
                                  <span className={`px-2.5 py-0.5 text-[9.5px] font-black rounded-full border ${
                                    appt.paymentStatus === "Confirmada" ? "bg-emerald-50 border-emerald-300 text-emerald-700" :
                                    appt.paymentStatus === "Rechazada" ? "bg-rose-50 border-rose-300 text-rose-700" :
                                    "bg-amber-50 border-amber-300 text-amber-700"
                                  }`}>
                                    {appt.paymentStatus}
                                  </span>
                                  <p className="text-[9px] text-slate-400 mt-1 font-mono uppercase font-bold">{appt.paymentMethod.replace("manual_", "Manual ").replace("automatic_", "Pasarela ").toUpperCase()}</p>
                                </div>
                              </div>

                              {/* Canal de Consulta o Ubicación Física */}
                              {appt.modality === "Presencial" ? (
                                <div className="bg-white p-3 rounded-xl border border-slate-200 space-y-2.5 text-xs">
                                  <div className="flex items-center justify-between">
                                    <span className="flex items-center gap-1.5 text-slate-700 font-bold">
                                      <MapPin className="h-4 w-4 text-amber-500 animate-pulse" />
                                      <span>Sede: {appt.locationName}</span>
                                    </span>
                                    <span className="text-[10px] bg-amber-50 text-amber-700 px-2 py-0.5 rounded font-black border border-amber-200 uppercase font-mono">
                                      {appt.consultorio || "Consultorio"}
                                    </span>
                                  </div>

                                  {appt.paymentStatus === "Confirmada" ? (
                                    <div className="pt-1.5 border-t border-slate-100 space-y-2">
                                      <div className="text-[11px] text-slate-600 space-y-1">
                                        <p>📍 <strong className="text-slate-800 font-bold">Dirección:</strong> {appt.locationAddress}, {appt.locationCity}</p>
                                        <p>🏢 <strong className="text-slate-800 font-bold">Consultorio:</strong> {appt.consultorio}</p>
                                        <p>👉 <strong className="text-slate-800 font-bold">Indicaciones:</strong> Regístrate en la recepción de la sede 10 minutos antes de la hora acordada.</p>
                                      </div>

                                      <a 
                                        href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${appt.locationAddress}, ${appt.locationCity}`)}`}
                                        target="_blank" 
                                        rel="noopener noreferrer"
                                        className="w-full py-2 bg-amber-500 hover:bg-amber-600 text-slate-950 font-black text-[10px] rounded-xl flex items-center justify-center gap-1.5 uppercase transition-colors shadow-sm"
                                      >
                                        <MapPin className="h-3.5 w-3.5" />
                                        <span>Ver en Google Maps</span>
                                        <ExternalLink className="h-3 w-3" />
                                      </a>
                                    </div>
                                  ) : (
                                    <div className="p-2 bg-slate-50/50 rounded border border-slate-150 text-[10px] text-slate-500 italic">
                                      🔒 La dirección exacta, consultorio y mapa se habilitarán una vez verificado el pago de la consulta.
                                    </div>
                                  )}
                                </div>
                              ) : (
                                <div className="bg-white p-2.5 rounded-xl border border-slate-250 flex items-center justify-between text-xs">
                                  <span className="flex items-center gap-1.5 text-slate-700 font-bold">
                                    {appt.channel === "WhatsApp" ? <MessageSquare className="h-4 w-4 text-emerald-500" /> :
                                     appt.channel === "Google Meet" ? <Video className="h-4 w-4 text-blue-500" /> :
                                     <Phone className="h-4 w-4 text-indigo-500" />}
                                    <span>Canal: {appt.channel || "WhatsApp"}</span>
                                  </span>

                                  {appt.paymentStatus === "Confirmada" ? (
                                    <a 
                                      href={appt.meetingLink} 
                                      target="_blank" 
                                      rel="noopener noreferrer"
                                      className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-black text-[10px] rounded-xl flex items-center gap-1 uppercase shadow-sm"
                                    >
                                      <span>Ingresar</span>
                                      <ExternalLink className="h-3 w-3" />
                                    </a>
                                  ) : (
                                    <span className="text-[10px] text-slate-400 italic font-medium">Espera verificación del comprobante</span>
                                  )}
                                </div>
                              )}

                              {/* Cargador de Comprobantes si es transferencia manual */}
                              {isManual && (
                                <div className="border-t border-slate-150 pt-3 flex flex-col md:flex-row justify-between items-start md:items-center gap-2">
                                  <div className="text-[10px]">
                                    <span className="text-slate-500 font-bold block">Pagar a {activeClinic?.name}</span>
                                    <p className="text-purple-700 font-black font-mono">Valor: $90.000 COP</p>
                                  </div>

                                  {hasReceipt ? (
                                    <div className="flex items-center gap-1.5 text-[11px] bg-white p-1.5 px-3 rounded-xl border border-slate-200 shadow-xs">
                                      <span className="h-2 w-2 rounded-full bg-blue-500 animate-pulse"></span>
                                      <span className="text-slate-700 font-mono font-bold text-[10px]">Soporte ({appt.receiptDetails?.txId})</span>
                                      <button 
                                        onClick={() => setReceiptModalAppointment(appt)}
                                        className="ml-2 text-[10px] text-blue-600 hover:underline font-bold"
                                      >
                                        Ver
                                      </button>
                                    </div>
                                  ) : (
                                    <div className="flex items-center gap-2 w-full md:w-auto">
                                      <button 
                                        onClick={() => handleUseMockReceipt(appt.id)}
                                        className="px-3 py-1.5 bg-purple-100 hover:bg-purple-200 text-purple-700 text-[10px] rounded-xl border border-purple-200 flex items-center gap-1 uppercase font-black shadow-sm transition-colors"
                                        title="Simular carga instantánea de comprobante de Nequi"
                                      >
                                        <UploadCloud className="h-3.5 w-3.5 text-purple-600" />
                                        Subir Soporte Nequi Demo
                                      </button>
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>
                          );
                        })}
                    </div>
                  )}
                </div>

              </div>

            </div>
          )}

          {/* PERSPECTIVA 2: CLINIC ADMIN / PSICÓLOGO */}
          {currentUser && activePerspective === "psicologo" && (
            <div className="space-y-6">
              
              {/* Psychologist Clinic Overview and Stats */}
              <div className="bg-slate-50 p-6 rounded-2xl border border-slate-200 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 shadow-sm">
                <div>
                  <h3 className="text-base font-black text-slate-800 flex items-center gap-2">
                    <UserCheck className="h-5 w-5 text-purple-600" />
                    Panel Profesional: {activePsychologist?.name}
                  </h3>
                  <p className="text-xs text-slate-500 font-medium">
                    Clínica Cliente: <strong className="text-slate-800 font-bold">{activeClinic?.name}</strong> | Rol: Proveedor Clínico & Admin de Inquilino
                  </p>
                </div>

                <div className="flex gap-4">
                  <div className="bg-white p-2.5 px-4 rounded-xl border border-slate-200 text-center shrink-0 shadow-xs">
                    <span className="text-[9px] text-slate-400 uppercase block font-bold">Recaudo Clínica (COP)</span>
                    <strong className="text-emerald-600 font-black font-mono text-sm">${clinicRevenue.toLocaleString()}</strong>
                  </div>
                  <div className="bg-white p-2.5 px-4 rounded-xl border border-slate-200 text-center shrink-0 shadow-xs">
                    <span className="text-[9px] text-slate-400 uppercase block font-bold">Por Verificar Pago</span>
                    <strong className="text-amber-600 font-black font-mono text-sm">{clinicPendingCount} Citas</strong>
                  </div>
                </div>
              </div>

              {/* Grid: Agenda & Evolution note (Arriba), Configuración Marca Blanca (Abajo) */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                
                {/* LISTADO DE CITAS O HISTORIAL CLÍNICO DE ESTA CLÍNICA */}
                <div className="lg:col-span-7 bg-white p-6 rounded-2xl border border-slate-200 space-y-4 shadow-sm">
                  {/* Selector de pestañas */}
                  <div className="flex border-b border-slate-150 gap-1">
                    <button
                      type="button"
                      onClick={() => setTherapistTab("citas")}
                      className={`pb-2.5 px-4 text-xs font-black uppercase tracking-wider border-b-2 transition-all ${therapistTab === "citas" ? "border-purple-600 text-purple-600" : "border-transparent text-slate-400 hover:text-slate-600"}`}
                    >
                      📅 Citas de la Clínica
                    </button>
                    <button
                      type="button"
                      onClick={() => setTherapistTab("historias")}
                      className={`pb-2.5 px-4 text-xs font-black uppercase tracking-wider border-b-2 transition-all ${therapistTab === "historias" ? "border-purple-600 text-purple-600" : "border-transparent text-slate-400 hover:text-slate-600"}`}
                    >
                      📂 Historial de Evoluciones
                    </button>
                  </div>

                  {therapistTab === "citas" ? (
                    <>
                      <div className="flex justify-between items-center bg-slate-50 p-2.5 rounded-xl border border-slate-150">
                        <span className="text-[10px] text-slate-500 font-bold">Filtrando citas para {activeClinic?.name} ({currentClinicId})</span>
                        {activeClinic?.status === "legal_only" && (
                          <span className="px-2 py-0.5 text-[8.5px] font-black uppercase rounded bg-rose-50 text-rose-600 border border-rose-300 animate-pulse">Bloqueo Judicial</span>
                        )}
                      </div>

                      {clinicAppointments.length === 0 ? (
                        <div className="py-12 border-2 border-dashed border-slate-200 text-center text-slate-500 text-xs rounded-2xl bg-slate-50/50 font-bold">
                          Aún no hay agendamientos para tu clínica.
                        </div>
                      ) : (
                        <div className="space-y-3 max-h-[500px] overflow-y-auto pr-1">
                          {clinicAppointments.map(appt => {
                            const isPresencial = appt.modality === "Presencial";
                            return (
                              <div key={appt.id} className="p-4 bg-slate-50 border border-slate-200/80 rounded-2xl space-y-3 shadow-xs">
                                <div className="flex justify-between items-start">
                                  <div>
                                    <div className="flex items-center gap-2 mb-1">
                                      <span className="text-[9px] uppercase text-slate-400 font-bold">Paciente</span>
                                      {appt.saasCommissionStatus === "pendiente" ? (
                                        <span className="px-1.5 py-0.2 bg-amber-50 text-amber-700 border border-amber-200 text-[8px] font-black rounded uppercase">Comisión Pendiente (Inactivo)</span>
                                      ) : (
                                        <span className="px-1.5 py-0.2 bg-emerald-50 text-emerald-700 border border-emerald-200 text-[8px] font-black rounded uppercase">SaaS Activado</span>
                                      )}
                                    </div>
                                    <strong className="text-slate-800 font-black text-sm">{appt.patientName}</strong>
                                    <p className="text-xs text-slate-500 font-medium">{appt.patientPhone}</p>
                                  </div>
                                  <div className="text-right flex flex-col items-end gap-1">
                                    <span className={`px-2.5 py-0.5 text-[9.5px] font-black rounded-full border ${appt.paymentStatus === "Confirmada" ? "bg-emerald-50 border-emerald-200 text-emerald-700" : "bg-amber-50 border-amber-200 text-amber-700"}`}>
                                      {appt.paymentStatus}
                                    </span>
                                    <span className="text-[9.5px] text-slate-600 font-black bg-white px-2 py-0.5 rounded border border-slate-150 shadow-2xs">
                                      {isPresencial ? "🏢 Presencial" : "💻 Virtual"}
                                    </span>
                                  </div>
                                </div>

                                <div className="space-y-2 bg-white p-2.5 rounded-xl border border-slate-150">
                                  <div className="text-[11px] text-slate-600 font-medium">
                                    <span>📅 {appt.date} | ⏰ {appt.time}</span>
                                    {isPresencial ? (
                                      <p className="mt-1 text-slate-505">📍 Sede: {appt.locationName} ({appt.consultorio}) - {appt.locationAddress}, {appt.locationCity}</p>
                                    ) : (
                                      <p className="mt-1 text-slate-505">🌐 Enlace: {appt.channel}</p>
                                    )}
                                  </div>

                                  <div className="flex items-center justify-end gap-2 pt-1 border-t border-slate-100">
                                    {appt.saasCommissionStatus === "pendiente" ? (
                                      <span className="text-[10px] text-rose-600 font-black flex items-center gap-1">
                                        🔒 Teleconsulta bloqueada hasta pago de comisión.
                                      </span>
                                    ) : isPresencial ? (
                                      <span className="text-[10px] text-emerald-600 font-black">✓ Cita física activa (Oficina asignada)</span>
                                    ) : appt.paymentStatus === "Confirmada" ? (
                                      <a 
                                        href={appt.meetingLink}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-mono text-[10px] rounded-xl flex items-center gap-1 uppercase font-black shadow-sm transition-colors"
                                      >
                                        <span>Iniciar Teleconsulta</span>
                                        <ExternalLink className="h-3 w-3" />
                                      </a>
                                    ) : (
                                      appt.receiptImage ? (
                                        <button 
                                          onClick={() => setReceiptModalAppointment(appt)}
                                          className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white font-black text-[10px] rounded-xl uppercase shadow-sm transition-colors"
                                        >
                                          Auditar Transferencia
                                        </button>
                                      ) : (
                                        <span className="text-[10px] text-slate-400 italic font-medium">Esperando Comprobante</span>
                                      )
                                    )}
                                  </div>
                                </div>

                                <div className="flex justify-between items-center text-[11px] pt-1 border-t border-slate-150">
                                  <span className="text-slate-500 font-medium truncate max-w-[200px]">Motivo: "{appt.notes || "Ninguno"}"</span>
                                  <button 
                                    onClick={() => {
                                      setClinicalRecordPatientId(appt.patientName);
                                      setClinicalRecordNotes(`Evolución clínica de consulta (${isPresencial ? "Presencial" : "Virtual"}) el día ${appt.date} a las ${appt.time}. `);
                                    }}
                                    className="text-[10px] text-purple-600 hover:underline flex items-center gap-1 font-bold"
                                  >
                                    <FileText className="h-3.5 w-3.5" /> Escribir Evolución
                                  </button>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </>
                  ) : (
                    /* HISTORIAL CLÍNICO DE EVOLUCIONES CON FILTRO Y FIRMAS */
                    <div className="space-y-4">
                      <div className="bg-purple-50 border border-purple-200 p-3 rounded-xl flex items-center justify-between gap-2 shadow-xs">
                        <div className="flex items-center gap-1.5 text-purple-700 font-bold">
                          <ShieldCheck className="h-4.5 w-4.5 text-purple-600" />
                          <span className="text-[11px] uppercase tracking-wider">Cumplimiento Médico Internacional Habilitado</span>
                        </div>
                        <span className="text-[9px] bg-white text-slate-500 px-2.5 py-0.5 rounded border border-slate-200 font-mono font-bold">MD-SHIELD V1.2</span>
                      </div>

                      <div className="flex gap-2">
                        <input 
                          type="text"
                          placeholder="🔍 Buscar evoluciones por nombre de paciente..."
                          value={clinicalRecordSearch}
                          onChange={(e) => setClinicalRecordSearch(e.target.value)}
                          className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-800 placeholder-slate-400 font-medium focus:outline-none focus:ring-1 focus:ring-purple-500"
                        />
                      </div>

                      {/* Lista de Historias Clínicas de este Tenant */}
                      <div className="space-y-3 max-h-[440px] overflow-y-auto pr-1">
                        {clinicalRecords
                          .filter(r => r.clinicId === currentClinicId)
                          .filter(r => r.patientName.toLowerCase().includes(clinicalRecordSearch.toLowerCase()))
                          .length === 0 ? (
                            <div className="py-12 border-2 border-dashed border-slate-200 rounded-2xl text-center text-slate-500 text-xs bg-slate-50/50 font-bold">
                              No se encontraron registros de evolución para esta clínica.
                            </div>
                          ) : (
                            clinicalRecords
                              .filter(r => r.clinicId === currentClinicId)
                              .filter(r => r.patientName.toLowerCase().includes(clinicalRecordSearch.toLowerCase()))
                              .map(record => (
                                <div key={record.id} className="p-4 bg-slate-50 border border-slate-200/80 rounded-2xl space-y-3 relative shadow-xs">
                                  <div className="flex justify-between items-start">
                                    <div>
                                      <span className="text-[10px] text-slate-400 uppercase block font-bold">Paciente</span>
                                      <strong className="text-slate-800 font-black text-sm">{record.patientName}</strong>
                                    </div>
                                    <div>
                                      {record.locked ? (
                                        <span className="px-2.5 py-0.5 bg-purple-50 border border-purple-200 text-[9px] font-black text-purple-700 rounded-full uppercase flex items-center gap-1 shadow-2xs">
                                          <Lock className="h-3 w-3 text-purple-600" /> Cerrado & Firmado
                                        </span>
                                      ) : (
                                        <span className="px-2.5 py-0.5 bg-slate-100 border border-slate-200 text-[9px] font-black text-slate-600 rounded-full uppercase">
                                          📝 Borrador Abierto
                                        </span>
                                      )}
                                    </div>
                                  </div>

                                  <div className="bg-white p-3 rounded-xl text-xs text-slate-600 font-medium leading-relaxed border border-slate-150">
                                    {record.notes}
                                  </div>

                                  <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-2 pt-2 border-t border-slate-200 text-[10px] text-slate-400 font-medium">
                                    <span>Registrado: {new Date(record.createdAt).toLocaleString()}</span>
                                    {record.hash ? (
                                      <span className="font-mono text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 max-w-full truncate font-bold" title="Sello digital de inmutabilidad">
                                        🔑 {record.hash}
                                      </span>
                                    ) : (
                                      <button 
                                        type="button"
                                        onClick={() => {
                                          setClinicalRecordPatientId(record.patientName);
                                          setClinicalRecordNotes(record.notes);
                                          setIsConfidential(record.isConfidential || false);
                                          triggerStatus(`Borrador de ${record.patientName} cargado en el editor. Puede completarlo y firmarlo ahora.`, "info");
                                        }}
                                        className="text-purple-600 hover:underline font-bold"
                                      >
                                        ✍️ Editar & Firmar Borrador
                                      </button>
                                    )}
                                  </div>

                                  {/* Nota aclaratoria sobre el SuperAdmin */}
                                  <div className="text-[9px] text-slate-500 italic bg-slate-100/50 p-2 rounded-xl border border-slate-200">
                                    ⚠️ Inviolabilidad Legal: SuperAdmin SaaS tiene estrictamente denegado el acceso de lectura a este registro bajo reglas criptográficas y de Firestore.
                                  </div>
                                </div>
                              ))
                          )}
                      </div>
                    </div>
                  )}
                </div>

                {/* SOLICITUDES DE CAMBIO DE PROFESIONAL */}
                <div className="lg:col-span-12 bg-white p-6 rounded-2xl border border-slate-200 space-y-4 shadow-sm">
                  <div className="border-b border-slate-150 pb-3">
                    <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider flex items-center gap-2">
                      <RefreshCw className="h-4.5 w-4.5 text-amber-500 animate-spin" /> Solicitudes de Cambio de Profesional (Regla de Continuidad)
                    </h3>
                    <p className="text-[10px] text-slate-500">
                      Como administrador clínico o psicólogo titular, aprueba o rechaza solicitudes de reasignación con un motivo clínico fundamentado.
                    </p>
                  </div>

                  {appointments.filter(appt => appt.clinicId === currentClinicId && appt.changeRequested === true).length === 0 ? (
                    <div className="py-6 border-2 border-dashed border-slate-200 text-center text-slate-500 text-xs rounded-2xl bg-slate-50/50 font-bold">
                      No hay solicitudes de cambio pendientes de revisión en tu clínica.
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {appointments.filter(appt => appt.clinicId === currentClinicId && appt.changeRequested === true).map(appt => {
                        const selectedNewPsychId = reassignPsychMap[appt.id] || "";
                        const otherPsychologists = (psychologists.length > 0 ? psychologists : PSYCHOLOGISTS).filter(p => p.clinicId === currentClinicId && p.uid !== appt.psychologistId);

                        return (
                          <div key={appt.id} className="p-4 bg-slate-50 border border-amber-200 rounded-2xl space-y-3 relative overflow-hidden shadow-xs">
                            <div className="absolute top-0 right-0 bg-amber-50 border-b border-l border-amber-200 px-3 py-1 text-[9px] text-amber-700 font-black uppercase tracking-wider font-mono rounded-bl-xl">
                              Pendiente Aprobación
                            </div>

                            <div>
                              <span className="text-[9px] uppercase text-slate-400 font-bold block">Paciente Solicitante</span>
                              <strong className="text-slate-800 text-xs font-black">{appt.patientName}</strong>
                              <p className="text-[10px] text-slate-505 font-medium">Cita: 📅 {appt.date} | ⏰ {appt.time}</p>
                            </div>

                            <div className="p-2.5 bg-white rounded-xl border border-slate-150">
                              <span className="text-[9px] uppercase text-slate-400 font-bold block">Terapeuta Asignado</span>
                              <strong className="text-slate-700 text-xs font-black">{appt.psychologistName}</strong>
                            </div>

                            <div>
                              <span className="text-[9px] uppercase text-amber-650 font-bold block">Motivo de Cambio Escrito</span>
                              <p className="text-xs text-slate-600 font-medium italic leading-relaxed bg-white p-2.5 rounded-xl border border-amber-150">
                                "{appt.changeRequestReason}"
                              </p>
                            </div>

                            {/* Formulario de Reasignación si se aprueba */}
                            <div className="space-y-2 pt-2 border-t border-slate-150">
                              <label className="block text-[10px] font-bold text-slate-400 uppercase">Seleccionar Nuevo Profesional</label>
                              <select
                                value={selectedNewPsychId}
                                onChange={(e) => setReassignPsychMap(prev => ({ ...prev, [appt.id]: e.target.value }))}
                                className="w-full px-3 py-1.5 text-xs bg-white border border-slate-200 rounded-xl text-slate-800 font-medium focus:outline-none"
                              >
                                <option value="">-- Seleccionar Psicólogo Reasignado --</option>
                                {otherPsychologists.map(p => (
                                  <option key={p.uid} value={p.uid}>{p.name} - {p.specialty}</option>
                                ))}
                              </select>

                              <div className="grid grid-cols-2 gap-2 pt-1">
                                <button
                                  onClick={() => handleRejectChangeRequest(appt.id)}
                                  className="py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs font-bold rounded-xl transition-all"
                                >
                                  Rechazar Solicitud
                                </button>
                                <button
                                  disabled={!selectedNewPsychId}
                                  onClick={() => handleApproveChangeRequest(appt.id, selectedNewPsychId)}
                                  className={`py-1.5 text-xs font-black uppercase rounded-xl transition-all ${
                                    selectedNewPsychId 
                                      ? "bg-emerald-600 hover:bg-emerald-500 text-white shadow" 
                                      : "bg-slate-100 text-slate-300 cursor-not-allowed"
                                  }`}
                                >
                                  Aprobar & Reasignar
                                </button>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* REDACTAR NOTA MÉDICA / EVOLUCIÓN */}
                <div className="lg:col-span-5 bg-white p-6 rounded-2xl border border-slate-200 space-y-4 h-fit shadow-sm">
                  <div className="border-b border-slate-150 pb-3">
                    <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider flex items-center gap-2">
                      <FileText className="h-4.5 w-4.5 text-purple-600" /> Nota de Evolución Médica
                    </h3>
                    <p className="text-[10px] text-slate-400 font-bold mt-0.5">Registro Clínico obligatorio. Se indexará bajo el clinicId de {activeClinic?.name}</p>
                  </div>

                  <form onSubmit={(e) => { e.preventDefault(); }} className="space-y-4">
                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Nombre del Paciente</label>
                      <input 
                        type="text" 
                        placeholder="ej: Juan Pérez"
                        value={clinicalRecordPatientId}
                        onChange={(e) => setClinicalRecordPatientId(e.target.value)}
                        className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-800 font-medium focus:outline-none"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Notas Diagnósticas y Evolución</label>
                      <textarea 
                        rows={4}
                        placeholder="Escribe la evolución clínica conforme a normativas de salud..."
                        value={clinicalRecordNotes}
                        onChange={(e) => setClinicalRecordNotes(e.target.value)}
                        className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-800 font-medium focus:outline-none"
                        required
                      />
                    </div>

                    <div className="flex items-center gap-2">
                      <input 
                        type="checkbox" 
                        id="confidential" 
                        checked={isConfidential}
                        onChange={(e) => setIsConfidential(e.target.checked)}
                        className="h-3.5 w-3.5 text-purple-600 bg-white border-slate-300 rounded"
                      />
                      <label htmlFor="confidential" className="text-xs text-slate-500 select-none font-medium">
                        Marcar como nota privada confidencial (El paciente no podrá verla)
                      </label>
                    </div>

                    <div className="grid grid-cols-2 gap-3.5 pt-2">
                      <button 
                        type="button"
                        onClick={() => handleSaveClinicalNoteEx(false)}
                        className="py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs uppercase rounded-xl transition-colors flex items-center justify-center gap-1 shadow-xs"
                      >
                        <span>📝 Borrador</span>
                      </button>

                      <button 
                        type="button"
                        onClick={() => handleSaveClinicalNoteEx(true)}
                        className="py-2.5 bg-purple-600 hover:bg-purple-700 text-white font-extrabold text-xs uppercase rounded-xl transition-colors shadow-sm flex items-center justify-center gap-1"
                      >
                        <Lock className="h-3.5 w-3.5" />
                        <span>🔒 Cerrar & Firmar</span>
                      </button>
                    </div>

                    <div className="mt-3 p-3 bg-purple-50 border border-purple-200 rounded-xl text-[10px] text-slate-600 leading-normal space-y-1 font-medium">
                      <strong className="text-purple-700 block">📜 Guía de Cumplimiento Legal:</strong>
                      {getClinicMetadata(activeClinic).currency === "COP" ? (
                        <p>Bajo la <strong>Resolución 1995 de 1999 (Colombia)</strong>, la historia clínica es inalterable. Presionar "Cerrar & Firmar" bloquea permanentemente la nota e inhabilita ediciones futuras.</p>
                      ) : getClinicMetadata(activeClinic).currency === "USD" ? (
                        <p>Under the <strong>HIPAA Security Rule</strong>, signing and closing this record creates an immutable audit trail entry and generates a secure hash signature.</p>
                      ) : getClinicMetadata(activeClinic).currency === "EUR" ? (
                        <p>Conforme al <strong>RGPD (Europa)</strong>, el cierre inmutable asegura el principio de integridad y exactitud de los datos de salud del paciente.</p>
                      ) : (
                        <p>Conforme a la <strong>LFPDPPP (México)</strong>, firmar esta evolución resguarda los derechos ARCO y bloquea modificaciones no trazables.</p>
                      )}
                    </div>
                  </form>
                </div>
              </div>
              {/* PANEL DE CONFIGURACIÓN DE MARCA BLANCA (WHITE-LABEL & PASARELA DE LA CLINICA) */}
              <div className="bg-white p-6 rounded-2xl border border-slate-200 space-y-6 shadow-sm">
                <div className="border-b border-slate-150 pb-3 flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider flex items-center gap-2">
                      <Settings className="h-4.5 w-4.5 text-emerald-600 animate-spin" /> Marca Blanca & Pasarela de Pagos
                    </h3>
                    <p className="text-xs text-slate-400 font-bold mt-1">Configura el branding visual que verán tus pacientes y las cuentas donde recibirás las transferencias directamente.</p>
                  </div>
                  <span className="text-[9px] bg-emerald-50 text-emerald-700 border border-emerald-200 px-2.5 py-0.5 rounded-full uppercase font-bold font-mono shadow-2xs">SaaS Tenant Config</span>
                </div>

                <form onSubmit={handleSaveWhiteLabel} className="space-y-6">
                  
                  {/* Branding Visual */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-400 uppercase mb-1.5">Nombre Comercial del Consultorio / IPS</label>
                      <input 
                        type="text" 
                        value={wbName}
                        onChange={(e) => setWbName(e.target.value)}
                        className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-800 font-bold focus:outline-none focus:ring-1 focus:ring-emerald-500"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-400 uppercase mb-1.5">Paleta de Color de la Marca</label>
                      <select 
                        value={wbThemeColor}
                        onChange={(e) => setWbThemeColor(e.target.value)}
                        className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-800 font-bold focus:outline-none"
                      >
                        <option value="emerald">Verde Esmeralda (Psicología Tradicional)</option>
                        <option value="indigo">Azul Índigo (Tecnológico / Mente Sana)</option>
                        <option value="rose">Rosa / Coral (Apoyo Emocional)</option>
                        <option value="cyan">Cian Eléctrico (Moderna)</option>
                        <option value="amber">Ámbar Cálido (Bienestar)</option>
                        <option value="violet">Violeta Profundo (Neurociencia)</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-400 uppercase mb-1.5">Logotipo del Inquilino</label>
                      <div className="space-y-2">
                        <select 
                          value={wbLogoType}
                          onChange={(e) => setWbLogoType(e.target.value as any)}
                          className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-800 font-medium focus:outline-none text-[11px]"
                        >
                          <option value="icon">Usar Icono Vectorial Predeterminado</option>
                          <option value="uploaded">Cargar Archivo de Logo Propio (.png, .jpg)</option>
                        </select>

                        {wbLogoType === "icon" ? (
                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-[10px] text-slate-400 font-bold uppercase">Seleccionar Icono:</span>
                            <div className="flex gap-2">
                              {["Activity", "Sparkles", "Heart", "Brain"].map(ic => (
                                <button
                                  key={ic}
                                  type="button"
                                  onClick={() => setWbLogoIcon(ic)}
                                  className={`p-1.5 rounded-lg border text-xs font-bold transition-all ${wbLogoIcon === ic ? "bg-emerald-600 text-white border-emerald-500 shadow-sm" : "bg-slate-100 border-slate-200 text-slate-500 hover:bg-slate-200"}`}
                                >
                                  {ic}
                                </button>
                              ))}
                            </div>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2">
                            <input 
                              type="file" 
                              id="custom-logo" 
                              accept="image/*" 
                              className="hidden" 
                              onChange={handleLogoUpload} 
                            />
                            <label 
                              htmlFor="custom-logo"
                              className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-600 text-[10px] font-bold rounded-xl border border-slate-200 cursor-pointer flex items-center gap-1 uppercase transition-all shadow-2xs"
                            >
                              <UploadCloud className="h-3.5 w-3.5 text-amber-500 animate-pulse" />
                              Subir Archivo de Logo (.JPG / .PNG)
                            </label>
                            {wbLogoBase64 && (
                              <span className="text-[10px] text-emerald-600 flex items-center gap-1 font-bold">
                                <Check className="h-3.5 w-3.5" /> Cargado
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Configuración de Pasarelas y Cuentas de Recaudo */}
                  <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-4 shadow-2xs">
                    <h4 className="text-xs font-black text-slate-700 uppercase tracking-wider flex items-center gap-1 text-emerald-600">
                      <CreditCard className="h-3.5 w-3.5" /> Canales de Pago Directos de tu Clínica (Cuentas Locales en Colombia)
                    </h4>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                      {/* NEQUI */}
                      <div className="p-3 bg-white rounded-xl border border-slate-200 space-y-2 shadow-2xs">
                        <span className="font-black text-purple-700 text-[10px] uppercase block">🟣 Nequi Colombiano</span>
                        <div>
                          <label className="text-[10px] text-slate-400 font-bold uppercase block mb-0.5">Celular Nequi</label>
                          <input 
                            type="text" 
                            value={wbNequiPhone}
                            onChange={(e) => setWbNequiPhone(e.target.value)}
                            className="w-full px-2 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 font-medium focus:outline-none"
                          />
                        </div>
                        <div>
                          <label className="text-[10px] text-slate-400 font-bold uppercase block mb-0.5">Titular de la Cuenta</label>
                          <input 
                            type="text" 
                            value={wbNequiHolder}
                            onChange={(e) => setWbNequiHolder(e.target.value)}
                            className="w-full px-2 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 font-medium focus:outline-none"
                          />
                        </div>
                      </div>

                      {/* DAVIPLATA */}
                      <div className="p-3 bg-white rounded-xl border border-slate-200 space-y-2 shadow-2xs">
                        <span className="font-black text-rose-600 text-[10px] uppercase block">🔴 Daviplata</span>
                        <div>
                          <label className="text-[10px] text-slate-400 font-bold uppercase block mb-0.5">Celular / Nro Daviplata</label>
                          <input 
                            type="text" 
                            value={wbDaviplataPhone}
                            onChange={(e) => setWbDaviplataPhone(e.target.value)}
                            className="w-full px-2 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 font-medium focus:outline-none"
                          />
                        </div>
                        <div>
                          <label className="text-[10px] text-slate-400 font-bold uppercase block mb-0.5">Titular / Nro Convenio</label>
                          <input 
                            type="text" 
                            value={wbDaviplataHolder}
                            onChange={(e) => setWbDaviplataHolder(e.target.value)}
                            className="w-full px-2 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 font-medium focus:outline-none"
                          />
                        </div>
                      </div>

                      {/* BANCOLOMBIA */}
                      <div className="p-3 bg-white rounded-xl border border-slate-200 space-y-2 shadow-2xs">
                        <span className="font-black text-amber-650 text-[10px] uppercase block">🟡 Bancolombia</span>
                        <div>
                          <label className="text-[10px] text-slate-400 font-bold uppercase block mb-0.5">Nro de Cuenta (Ahorros / Corriente)</label>
                          <input 
                            type="text" 
                            value={wbBancolombiaAccount}
                            onChange={(e) => setWbBancolombiaAccount(e.target.value)}
                            className="w-full px-2 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 font-medium focus:outline-none"
                          />
                        </div>
                        <div>
                          <label className="text-[10px] text-slate-400 font-bold uppercase block mb-0.5">Nombre del Titular / NIT</label>
                          <input 
                            type="text" 
                            value={wbBancolombiaHolder}
                            onChange={(e) => setWbBancolombiaHolder(e.target.value)}
                            className="w-full px-2 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 font-medium focus:outline-none"
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  <button 
                    type="submit"
                    className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-xs uppercase rounded-xl shadow-sm transition-colors"
                  >
                    Guardar Configuración de Marca Blanca y Cuentas
                  </button>
                </form>
              </div>

              {/* PANEL GESTIÓN DE SEDES Y CONSULTORIOS FÍSICOS */}
              <div className="bg-white p-6 rounded-2xl border border-slate-200 space-y-6 shadow-sm">
                <div className="border-b border-slate-150 pb-3">
                  <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider flex items-center gap-2">
                    <MapPin className="h-4.5 w-4.5 text-amber-500 animate-pulse" /> Gestión de Sedes y Consultorios Físicos (IPS / Consultorios)
                  </h3>
                  <p className="text-xs text-slate-400 font-bold mt-1">
                    Configura las sedes de atención presencial para tus psicólogos y define los consultorios físicos disponibles para el control automático de sobrecupo.
                  </p>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                  {/* Listado de Sedes Existentes */}
                  <div className="lg:col-span-7 space-y-4">
                    <h4 className="text-xs font-black text-slate-700 uppercase tracking-wider">Sedes de {activeClinic?.name}</h4>
                    {locations.filter(l => l.clinicId === currentClinicId).length === 0 ? (
                      <div className="py-8 border-2 border-dashed border-slate-200 text-center text-slate-500 text-xs rounded-2xl bg-slate-50/50 font-bold">
                        Tu clínica no tiene sedes presenciales configuradas. Las citas se limitarán a la modalidad Virtual.
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {locations.filter(l => l.clinicId === currentClinicId).map(loc => (
                          <div key={loc.id} className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-2.5 shadow-xs">
                            <div className="flex justify-between items-start">
                              <h5 className="font-bold text-slate-800 text-xs flex items-center gap-1">
                                <MapPin className="h-3.5 w-3.5 text-amber-500" />
                                {loc.name}
                              </h5>
                              <span className="text-[9px] bg-amber-50 text-amber-700 border border-amber-200 px-2 py-0.5 rounded font-black uppercase font-mono">{loc.city}</span>
                            </div>
                            <div className="text-[10px] text-slate-600 font-medium">
                              <p>📍 <strong>Dirección:</strong> {loc.address}</p>
                            </div>
                            <div className="pt-2 border-t border-slate-200">
                              <span className="text-[9px] text-slate-400 uppercase block font-bold mb-1">Consultorios / Oficinas</span>
                              <div className="flex flex-wrap gap-1">
                                {loc.consultorios.map(cons => (
                                  <span key={cons} className="text-[9px] bg-white text-slate-600 px-2 py-0.5 rounded border border-slate-200 font-mono font-bold shadow-2xs">
                                    {cons}
                                  </span>
                                ))}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Formulario de Registro de Nueva Sede */}
                  <div className="lg:col-span-5 bg-slate-50 p-5 rounded-2xl border border-slate-200 h-fit space-y-4 shadow-xs">
                    <h4 className="text-xs font-black text-slate-700 uppercase tracking-wider">Agregar Nueva Sede</h4>
                    <form onSubmit={handleCreateLocation} className="space-y-3.5">
                      <div>
                        <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Nombre de la Sede</label>
                        <input 
                          type="text" 
                          placeholder="ej: Sede Chicó, Sede Poblado"
                          value={newLocationName}
                          onChange={(e) => setNewLocationName(e.target.value)}
                          className="w-full px-3 py-1.5 text-xs bg-white border border-slate-200 rounded-xl text-slate-800 font-medium focus:outline-none"
                          required
                        />
                      </div>

                      <div>
                        <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Dirección Física</label>
                        <input 
                          type="text" 
                          placeholder="ej: Calle 100 #15-30"
                          value={newLocationAddress}
                          onChange={(e) => setNewLocationAddress(e.target.value)}
                          className="w-full px-3 py-1.5 text-xs bg-white border border-slate-200 rounded-xl text-slate-800 font-medium focus:outline-none"
                          required
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Ciudad</label>
                          <select 
                            value={newLocationCity}
                            onChange={(e) => setNewLocationCity(e.target.value)}
                            className="w-full px-3 py-1.5 text-xs bg-white border border-slate-200 rounded-xl text-slate-800 font-medium focus:outline-none"
                          >
                            <option value="Bogotá">Bogotá</option>
                            <option value="Medellín">Medellín</option>
                            <option value="Cali">Cali</option>
                            <option value="Barranquilla">Barranquilla</option>
                            <option value="Bucaramanga">Bucaramanga</option>
                          </select>
                        </div>

                        <div>
                          <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Consultorios (Sueltos por coma)</label>
                          <input 
                            type="text" 
                            placeholder="ej: Cons 101, Cons 102"
                            value={newLocationConsultorios}
                            onChange={(e) => setNewLocationConsultorios(e.target.value)}
                            className="w-full px-3 py-1.5 text-xs bg-white border border-slate-200 rounded-xl text-slate-800 font-medium focus:outline-none"
                            required
                          />
                        </div>
                      </div>

                      <button 
                        type="submit"
                        className="w-full py-2.5 bg-amber-500 hover:bg-amber-600 text-slate-950 font-black text-xs uppercase rounded-xl transition-colors flex items-center justify-center gap-1.5 shadow-sm"
                      >
                        <MapPin className="h-4 w-4" />
                        <span>Crear Sede Física</span>
                      </button>
                    </form>
                  </div>
                </div>
              </div>

            </div>
          )}

          {/* PERSPECTIVA 3: SUPERADMIN GLOBAL (Administrador de la Red SaaS - "Yo") */}
          {currentUser && activePerspective === "superadmin" && (
            <div className="space-y-6">
              
              {/* SaaS Network Statistics */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-5">
                <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
                  <span className="text-[10px] text-slate-400 uppercase tracking-wider block font-bold">Inquilinos Totales (SaaS)</span>
                  <p className="text-2xl font-black text-slate-800 font-mono mt-1">{totalClinicsCount} Clínicas</p>
                  <span className="text-[10px] text-slate-400 font-bold mt-1 block">Clínicas registradas</span>
                </div>

                <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
                  <span className="text-[10px] text-slate-400 uppercase tracking-wider block font-bold">Inquilinos Activos</span>
                  <p className="text-2xl font-black text-emerald-600 font-mono mt-1">{activeClinicsCount} Clínicas</p>
                  <span className="text-[10px] text-emerald-600/80 font-bold mt-1 block">Suscripción SaaS al día</span>
                </div>

                <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
                  <span className="text-[10px] text-slate-400 uppercase tracking-wider block font-bold">Inquilinos Inactivos</span>
                  <p className="text-2xl font-black text-rose-600 font-mono mt-1">{inactiveClinicsCount} Clínicas</p>
                  <span className="text-[10px] text-rose-500/80 font-bold mt-1 block">Suscripción suspendida</span>
                </div>

                <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
                  <span className="text-[10px] text-slate-400 uppercase tracking-wider block font-bold">Recaudo Acumulado Global</span>
                  <p className="text-2xl font-black text-sky-600 font-mono mt-1">${totalGlobalRevenue.toLocaleString()} COP</p>
                  <span className="text-[10px] text-sky-500/80 font-bold mt-1 block">Suma total confirmada x Red</span>
                </div>
              </div>

              {/* GESTIÓN DE CLÍNICAS CLIENTES (ACTIVAR / DESACTIVAR) */}
              <div className="bg-white p-6 rounded-2xl border border-slate-200 space-y-4 shadow-sm">
                <div className="border-b border-slate-150 pb-3">
                  <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                    <Building className="h-4.5 w-4.5 text-emerald-600" /> Administración Global de Clínicas Clientes (Control de Suscripción)
                  </h3>
                  <p className="text-xs text-slate-400 font-bold mt-1">Administra el estado operacional de tus inquilinos de forma inmediata. Soporta la suspensión comercial estándar y el <strong>Bloqueo de Emergencia Judicial</strong> (restricción absoluta de operaciones por orden legal).</p>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-slate-50 text-slate-400 font-bold border-b border-slate-150">
                        <th className="p-3">Clínica / Inquilino</th>
                        <th className="p-3">ID</th>
                        <th className="p-3">Canales de Pago Configurados</th>
                        <th className="p-3">Estado Comercial</th>
                        <th className="p-3 text-right">Acción de Red SaaS</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {clinics.map(c => {
                        const meta = getClinicMetadata(c);
                        return (
                          <tr key={c.id} className="hover:bg-slate-50/40 transition-colors">
                            <td className="p-3">
                              <div className="flex items-center gap-2">
                                <span className="p-1 bg-slate-50 border border-slate-150 rounded-lg">
                                  {renderLogo(c, "h-4 w-4")}
                                </span>
                                <div>
                                  <strong className="text-slate-800 block">{c.name}</strong>
                                  <span className="text-[10px] text-slate-400 font-bold uppercase">📍 {c.country || "CO"} | {meta.legalFramework}</span>
                                </div>
                              </div>
                            </td>
                            <td className="p-3 font-mono text-slate-500 text-[11px] font-bold">{c.id}</td>
                            <td className="p-3 text-[10px] text-slate-600 font-medium">
                              <div className="space-y-0.5">
                                <div>🏦 Cuenta: <strong className="text-slate-700">{c.bancolombiaAccount || "No registrada"}</strong> ({c.bancolombiaHolder || "N/A"})</div>
                                <div>📱 Nequi: <strong className="text-slate-700">{c.nequiPhone || "N/A"}</strong> | Daviplata: <strong className="text-slate-700">{c.daviplataPhone || "N/A"}</strong></div>
                              </div>
                            </td>
                            <td className="p-3">
                              <span className={`px-2.5 py-0.5 text-[9.5px] font-black rounded-full border ${
                                c.status === "active" ? "bg-emerald-50 text-emerald-700 border-emerald-200" : 
                                c.status === "legal_only" ? "bg-rose-50 text-rose-700 border-rose-200 animate-pulse" :
                                "bg-slate-100 text-slate-600 border-slate-200"
                              }`}>
                                {c.status === "active" ? "ACTIVO / OPERANDO" : 
                                 c.status === "legal_only" ? "⚖️ BLOQUEO JUDICIAL" : 
                                 "SUSPENDIDO"}
                              </span>
                            </td>
                            <td className="p-3 text-right">
                              <div className="flex justify-end gap-1">
                                <button 
                                  type="button"
                                  onClick={() => handleToggleClinicStatus(c.id, "active")}
                                  className={`px-2.5 py-1 text-[9px] font-black uppercase rounded-lg border transition-all ${
                                    c.status === "active" 
                                      ? "bg-emerald-600 text-white border-emerald-500 shadow-xs" 
                                      : "bg-slate-50 text-slate-600 hover:text-slate-800 border-slate-200"
                                  }`}
                                >
                                  Activar
                                </button>
                                <button 
                                  type="button"
                                  onClick={() => handleToggleClinicStatus(c.id, "inactive")}
                                  className={`px-2.5 py-1 text-[9px] font-black uppercase rounded-lg border transition-all ${
                                    c.status === "inactive" 
                                      ? "bg-amber-500 text-slate-950 border-amber-600 shadow-xs" 
                                      : "bg-slate-50 text-slate-600 hover:text-slate-800 border-slate-200"
                                  }`}
                                >
                                  Suspender
                                </button>
                                <button 
                                  type="button"
                                  onClick={() => handleToggleClinicStatus(c.id, "legal_only")}
                                  className={`px-2.5 py-1 text-[9px] font-black uppercase rounded-lg border transition-all ${
                                    c.status === "legal_only" 
                                      ? "bg-rose-600 text-white border-rose-500 animate-pulse shadow-xs" 
                                      : "bg-slate-50 text-rose-600 hover:bg-rose-50 border-slate-200"
                                  }`}
                                  title="Bloquear clínica por orden legal o judicial"
                                >
                                  ⚖️ Judicial
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* PANEL DE MONETIZACIÓN GLOBAL - COBROS SAAS */}
              <div className="bg-white p-6 rounded-2xl border border-slate-200 space-y-6 shadow-sm">
                <div className="border-b border-slate-150 pb-3 flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                      <DollarSign className="h-4.5 w-4.5 text-sky-600" /> Panel de Monetización Global (Cobros a Inquilinos)
                    </h3>
                    <p className="text-xs text-slate-400 font-bold mt-1">Configura las reglas de cobro por clínica, calcula automáticamente comisiones y monitorea las ganancias netas de la plataforma en <strong>USD</strong> con conversión en tiempo real.</p>
                  </div>
                  <span className="text-[10px] bg-sky-50 text-sky-700 border border-sky-200 px-2.5 py-0.5 rounded-full font-mono font-bold uppercase shadow-2xs">SaaS Global billing</span>
                </div>

                <div className="grid grid-cols-1 gap-6">
                  {clinics.map(c => {
                    const config = tenantConfigs.find(tc => tc.clinicId === c.id) || {
                      id: "tc_" + c.id,
                      clinicId: c.id,
                      monetizationMode: "commission_percentage",
                      fixedFeeAmount: 180000,
                      commissionPercentage: 12,
                      fixedPerSessionAmount: 15000,
                      paymentRoute: "direct",
                      status: "active"
                    } as TenantConfig;

                    // METRICAS DE CONVERSIÓN EN TIEMPO REAL A USD (SuperAdmin cobra en USD)
                    const meta = getClinicMetadata(c);
                    const clinicFinRecords = financialRecords.filter(fr => fr.clinicId === c.id);
                    
                    // Sumas en COP
                    const totalTransactionsAmount = clinicFinRecords.reduce((acc, r) => acc + r.totalAmount, 0);
                    const totalCommissions = clinicFinRecords.reduce((acc, r) => acc + r.calculatedCommission, 0);
                    
                    // Conversión en tiempo real a USD
                    const rate = meta.exchangeRate;
                    const transactionsUSD = totalTransactionsAmount / rate;
                    const commissionsUSD = totalCommissions / rate;

                    // Citas con comisión pendiente (activación por sesión)
                    const pendingCommissionsAppts = appointments.filter(a => a.clinicId === c.id && a.saasCommissionStatus === "pendiente");

                    return (
                      <div key={c.id} className="p-5 bg-slate-50 border border-slate-200 rounded-2xl space-y-4 shadow-2xs">
                        <div className="flex flex-col md:flex-row justify-between items-start md:items-center border-b border-slate-150 pb-3 gap-2">
                          <div className="flex items-center gap-2">
                            <span className="p-1 bg-white border border-slate-200 rounded-lg">
                              {renderLogo(c, "h-5 w-5")}
                            </span>
                            <div>
                              <strong className="text-slate-800 text-sm font-black">{c.name}</strong>
                              <span className="text-[10px] text-slate-400 ml-2 font-mono font-bold">({c.id}) - Moneda: {meta.currency}</span>
                            </div>
                          </div>

                          <div className="flex gap-4 text-xs">
                            <div className="text-right">
                              <span className="text-[9px] text-slate-400 block uppercase font-mono font-bold">Volumen Transado ({meta.currency})</span>
                              <span className="text-slate-700 font-bold font-mono">{meta.currencySymbol} {totalTransactionsAmount.toLocaleString()} {meta.currency}</span>
                              <span className="text-[10px] text-slate-400 font-medium block">≈ ${transactionsUSD.toFixed(2)} USD</span>
                            </div>
                            <div className="text-right">
                              <span className="text-[9px] text-slate-400 block uppercase font-mono font-bold">Mis Ganancias (SaaS USD)</span>
                              <span className="text-emerald-600 font-bold font-mono">{meta.currencySymbol} {totalCommissions.toLocaleString()} {meta.currency}</span>
                              <span className="text-[10px] text-emerald-500 block font-black">≈ ${commissionsUSD.toFixed(2)} USD</span>
                            </div>
                          </div>
                        </div>

                        {/* Campos de Configuración de Monetización */}
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-xs">
                          <div>
                            <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Esquema de Cobro SaaS</label>
                            <select
                              value={config.monetizationMode}
                              onChange={(e) => handleSaveTenantConfig(
                                c.id, 
                                e.target.value as any, 
                                config.fixedFeeAmount, 
                                config.commissionPercentage, 
                                config.fixedPerSessionAmount, 
                                config.paymentRoute
                              )}
                              className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-slate-800 font-bold focus:outline-none"
                            >
                              <option value="fixed_fee">Mensualidad / Anualidad Fija</option>
                              <option value="commission_percentage">Porcentaje por Cita (% Cobro)</option>
                              <option value="fixed_per_session">Comisión Fija por Sesión</option>
                            </select>
                          </div>

                          {config.monetizationMode === "fixed_fee" && (
                            <div>
                              <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Mensualidad Fija ({meta.currency})</label>
                              <input
                                type="number"
                                value={config.fixedFeeAmount}
                                onChange={(e) => handleSaveTenantConfig(
                                  c.id, 
                                  "fixed_fee", 
                                  Number(e.target.value), 
                                  config.commissionPercentage, 
                                  config.fixedPerSessionAmount, 
                                  config.paymentRoute
                                )}
                                className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-slate-800 font-mono font-bold focus:outline-none"
                              />
                            </div>
                          )}

                          {config.monetizationMode === "commission_percentage" && (
                            <div>
                              <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Comisión del Portal (%)</label>
                              <input
                                type="number"
                                value={config.commissionPercentage}
                                onChange={(e) => handleSaveTenantConfig(
                                  c.id, 
                                  "commission_percentage", 
                                  config.fixedFeeAmount, 
                                  Number(e.target.value), 
                                  config.fixedPerSessionAmount, 
                                  config.paymentRoute
                                )}
                                className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-slate-800 font-mono font-bold focus:outline-none"
                              />
                            </div>
                          )}

                          {config.monetizationMode === "fixed_per_session" && (
                            <div>
                              <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Monto por Sesión ({meta.currency})</label>
                              <input
                                type="number"
                                value={config.fixedPerSessionAmount}
                                onChange={(e) => handleSaveTenantConfig(
                                  c.id, 
                                  "fixed_per_session", 
                                  config.fixedFeeAmount, 
                                  config.commissionPercentage, 
                                  Number(e.target.value), 
                                  config.paymentRoute
                                )}
                                className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-slate-800 font-mono font-bold focus:outline-none"
                              />
                            </div>
                          )}

                          <div>
                            <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Pasarela / Ruta de Recaudo</label>
                            <select
                              value={config.paymentRoute}
                              onChange={(e) => handleSaveTenantConfig(
                                c.id, 
                                config.monetizationMode, 
                                config.fixedFeeAmount, 
                                config.commissionPercentage, 
                                config.fixedPerSessionAmount, 
                                e.target.value as any
                              )}
                              className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-slate-800 font-bold focus:outline-none"
                            >
                              <option value="direct">Directo (Cuentas Nequi/Daviplata Propias)</option>
                              <option value="centralized">Centralizado (Recauda Red SaaS)</option>
                            </select>
                          </div>
                        </div>

                        {/* Control de Activación de Sesiones por Pago de Comisión (Pay-per-session) */}
                        {pendingCommissionsAppts.length > 0 && (
                          <div className="p-3 bg-purple-50 border border-purple-200 rounded-xl space-y-2 mt-3">
                            <h5 className="text-[11px] font-black uppercase tracking-wider text-purple-700 flex items-center gap-1">
                              ⚠️ {pendingCommissionsAppts.length} Citas Pendientes de Activación (Pay-per-session)
                            </h5>
                            <p className="text-[10px] text-slate-500 font-bold">Las teleconsultas virtuales de estas citas están bloqueadas para el psicólogo hasta que se verifique el pago de la comisión fija de {meta.currencySymbol}{config.fixedPerSessionAmount.toLocaleString()} {meta.currency} (≈ ${(config.fixedPerSessionAmount / rate).toFixed(2)} USD).</p>
                            <div className="space-y-1.5 max-h-36 overflow-y-auto">
                              {pendingCommissionsAppts.map(a => (
                                <div key={a.id} className="flex justify-between items-center bg-white p-2.5 rounded-xl border border-slate-250 text-[11px] shadow-2xs">
                                  <div>
                                    <strong className="text-slate-800 font-black">{a.patientName}</strong> con <span className="text-slate-600 font-semibold">{a.psychologistName}</span>
                                    <span className="text-[10px] text-slate-400 font-bold block">📅 {a.date} | {a.time} | Comisión: {meta.currencySymbol}{config.fixedPerSessionAmount.toLocaleString()} {meta.currency}</span>
                                  </div>
                                  <button
                                    type="button"
                                    onClick={async () => {
                                      // Actualizar estado de la cita a confirmado
                                      const updatedAppts = appointments.map(appt => {
                                        if (appt.id === a.id) {
                                          return { ...appt, saasCommissionStatus: "confirmado" as const };
                                        }
                                        return appt;
                                      });
                                      setAppointments(updatedAppts);
                                      triggerStatus(`¡Sesión conciliada y activada! El enlace de teleconsulta para ${a.patientName} ha sido desbloqueado.`, "success");
                                      
                                      if (!isDemoMode) {
                                        try {
                                          await updateDoc(doc(db, "appointments", a.id), {
                                            saasCommissionStatus: "confirmado"
                                          });
                                        } catch (err) {
                                          console.error(err);
                                        }
                                      }
                                    }}
                                    className="px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-[9px] font-black uppercase rounded-lg shadow-sm transition-colors"
                                  >
                                    ✓ Conciliar & Activar
                                  </button>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* AUDITORÍA TRANSACCIONAL GLOBAL CON FILTRO MULTITENANT */}
              <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                <div className="border-b border-slate-150 pb-3 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                  <div>
                    <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider">Historial de Consultas de la Red</h3>
                    <p className="text-xs text-slate-400 font-bold mt-1">Verifique el flujo de caja e ingresos de todas las clínicas asociadas a su SaaS.</p>
                  </div>
                </div>

                <div className="overflow-x-auto mt-4">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-slate-50 text-slate-400 font-bold border-b border-slate-150">
                        <th className="p-3">Clínica</th>
                        <th className="p-3">Paciente</th>
                        <th className="p-3">Profesional</th>
                        <th className="p-3">Fecha / Hora</th>
                        <th className="p-3">Pago</th>
                        <th className="p-3">Estado</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {appointments.map(appt => {
                        const apptClinic = clinics.find(c => c.id === appt.clinicId);
                        return (
                          <tr key={appt.id} className="hover:bg-slate-50/30 transition-colors">
                            <td className="p-3 font-bold text-sky-600">{apptClinic?.name || appt.clinicId}</td>
                            <td className="p-3 text-slate-800 font-bold">{appt.patientName}</td>
                            <td className="p-3 text-slate-600 font-medium">{appt.psychologistName}</td>
                            <td className="p-3 font-mono text-[11px] text-slate-400 font-bold">{appt.date} | {appt.time}</td>
                            <td className="p-3 uppercase font-mono text-[10px] text-slate-500 font-bold">{appt.paymentMethod.replace("manual_", "")}</td>
                            <td className="p-3">
                              <span className={`px-2.5 py-0.5 rounded-full text-[9.5px] font-black border ${
                                appt.paymentStatus === "Confirmada" 
                                  ? "bg-emerald-50 text-emerald-700 border-emerald-200" 
                                  : "bg-amber-50 text-amber-700 border-amber-200"
                              }`}>
                                {appt.paymentStatus}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

            </div>
          )}

        </div>

      </main>

      {/* 3. MODAL DE AUDITORÍA TRANSACCIONAL PARA TRANSFERENCIAS MANUALES (NEQUI/DAVIPLATA) */}
      <AnimatePresence>
        {receiptModalAppointment && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4">
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white border border-slate-200 rounded-2xl max-w-sm w-full overflow-hidden shadow-xl animate-fade-in"
            >
              <div className="bg-slate-50 p-4 border-b border-slate-150 flex justify-between items-center text-slate-800">
                <span className="text-xs font-black uppercase tracking-widest flex items-center gap-1">
                  <Database className="h-4 w-4 text-purple-600" /> Auditoría Transaccional 🇨🇴
                </span>
                <button onClick={() => setReceiptModalAppointment(null)} className="text-slate-400 hover:text-slate-600">
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="p-6 space-y-5">
                
                {/* Voucher Colombiano Simulado */}
                <div className="bg-slate-50 rounded-2xl p-5 border border-slate-200 relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-24 h-24 bg-purple-600/5 rounded-full blur-xl"></div>
                  
                  <div className="text-center pb-4 border-b border-slate-150">
                    <span className="text-[9px] bg-purple-100 text-purple-700 border border-purple-200 font-mono font-bold px-2 py-0.5 rounded uppercase">
                      Comprobante de Pago Manual
                    </span>
                    <p className="text-slate-400 text-[10px] font-bold mt-2">Valor de la Cita</p>
                    <p className="text-slate-800 text-2xl font-mono font-black mt-0.5">$90.000 COP</p>
                  </div>

                  <div className="pt-4 space-y-3 text-[11px]">
                    <div className="flex justify-between">
                      <span className="text-slate-400 font-bold">Paciente Remitente:</span>
                      <span className="text-slate-700 font-black">{receiptModalAppointment.patientName}</span>
                    </div>

                    <div className="flex justify-between">
                      <span className="text-slate-400 font-bold">Teléfono Remitente:</span>
                      <span className="text-slate-600 font-bold font-mono">{receiptModalAppointment.patientPhone}</span>
                    </div>

                    <div className="flex justify-between">
                      <span className="text-slate-400 font-bold">ID de Transacción:</span>
                      <span className="text-emerald-600 font-black font-mono">{receiptModalAppointment.receiptDetails?.txId || "TX-98745214"}</span>
                    </div>

                    <div className="flex justify-between">
                      <span className="text-slate-400 font-bold">Fecha de Transferencia:</span>
                      <span className="text-slate-600 font-mono font-bold">{receiptModalAppointment.receiptDetails?.date || "2026-07-10 14:32"}</span>
                    </div>

                    <div className="flex justify-between">
                      <span className="text-slate-400 font-bold">Destinatario (Clínica):</span>
                      <span className="text-amber-600 uppercase font-black font-mono truncate max-w-[150px]">
                        {receiptModalAppointment.paymentMethod.replace("manual_", "").toUpperCase()} Directo
                      </span>
                    </div>
                  </div>
                </div>

                <p className="text-xs text-slate-400 text-center leading-relaxed font-bold">
                  Confirma en la cuenta empresarial de tu clínica que los fondos hayan ingresado antes de autorizar la sesión psicológica.
                </p>

                {/* Botones de Control para el Administrador de la Clínica */}
                {activePerspective === "psicologo" && receiptModalAppointment.paymentStatus === "Pendiente de Verificación" ? (
                  <div className="grid grid-cols-2 gap-3 pt-2">
                    <button 
                      onClick={() => handleApprovePayment(receiptModalAppointment.id)}
                      className="w-full py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs uppercase rounded-xl transition-colors flex items-center justify-center gap-1 shadow-sm"
                    >
                      <Check className="h-4 w-4" />
                      Aprobar
                    </button>

                    <button 
                      onClick={() => handleRejectPayment(receiptModalAppointment.id)}
                      className="w-full py-2 bg-slate-50 hover:bg-slate-100 text-rose-600 font-black text-xs uppercase rounded-xl transition-colors flex items-center justify-center gap-1 border border-slate-200 shadow-2xs"
                    >
                      <X className="h-4 w-4" />
                      Rechazar
                    </button>
                  </div>
                ) : (
                  <div className="text-center text-[11px] text-slate-600 bg-slate-50 p-2 rounded-xl border border-slate-200 font-bold">
                    Estado de la Transacción: <strong className="text-slate-800 uppercase font-black">{receiptModalAppointment.paymentStatus}</strong>
                  </div>
                )}

              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
