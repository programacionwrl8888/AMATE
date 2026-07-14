import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

// Configuración de Firebase obtenida de la provisión automática de la plataforma
const firebaseConfig = {
  apiKey: "AIzaSyB7LSGjiG1UYv9Xl9xPg_SWf5tiG40A9Z0",
  authDomain: "ai-studio-applet-webapp-80018.firebaseapp.com",
  projectId: "ai-studio-applet-webapp-80018",
  storageBucket: "ai-studio-applet-webapp-80018.firebasestorage.app",
  messagingSenderId: "705637126711",
  appId: "1:705637126711:web:21bbdd7442ffc4860b25b2"
};

// Inicializar la aplicación de Firebase
const app = initializeApp(firebaseConfig);

// Inicializar y exportar los servicios requeridos
export const auth = getAuth(app);

// Inicializar Firestore apuntando a la base de datos específica de la applet
export const db = getFirestore(app, "ai-studio-8f39d879-33f1-43a9-a1f3-8bbaa633f695");

export default app;
