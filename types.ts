import { 
  signInWithEmailAndPassword, 
  signOut, 
  onAuthStateChanged 
} from "firebase/auth";
import { 
  doc, 
  getDoc,
  setDoc,
  serverTimestamp
} from "firebase/firestore";
import { auth, db } from "../../config/firebase";

/**
 * Inicia sesión con email y contraseña, recupera el rol de Firestore
 * y determina la redirección correspondiente.
 * 
 * @param {string} email - Correo del usuario
 * @param {string} password - Contraseña del usuario
 * @returns {Promise<{user: any, profile: any, redirectPath: string}>}
 */
export async function loginWithEmailAndPassword(email, password) {
  try {
    // 1. Autenticar con Firebase Auth
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;

    // 2. Buscar el perfil del usuario en Firestore para verificar el rol
    const userDocRef = doc(db, "users", user.uid);
    const userDocSnap = await getDoc(userDocRef);

    if (!userDocSnap.exists()) {
      // Cerramos sesión por seguridad para no dejar un estado inconsistente
      await signOut(auth);
      throw new Error("El perfil del usuario no existe en la base de datos de la IPS.");
    }

    const userData = userDocSnap.data();

    if (userData.status === "inactive") {
      await signOut(auth);
      throw new Error("El usuario se encuentra inactivo. Contacte al administrador.");
    }

    // 3. Determinar la ruta de redirección según el rol
    let redirectPath = "/login";
    if (userData.role === "superadmin") {
      redirectPath = "/dashboard/superadmin";
    } else if (userData.role === "psicologo") {
      redirectPath = "/dashboard/psicologo";
    } else if (userData.role === "paciente") {
      redirectPath = "/dashboard/paciente";
    }

    // 4. Retornar el resultado completo con el perfil y la ruta
    return {
      user,
      profile: {
        ...userData,
        uid: user.uid,
      },
      redirectPath
    };
  } catch (error) {
    console.error("Error en loginWithEmailAndPassword:", error);
    let friendlyMessage = error.message;
    if (error.code === "auth/invalid-credential" || error.code === "auth/wrong-password" || error.code === "auth/user-not-found") {
      friendlyMessage = "Credenciales incorrectas. Verifique su correo y contraseña.";
    } else if (error.code === "auth/too-many-requests") {
      friendlyMessage = "Demasiados intentos fallidos. Su cuenta ha sido bloqueada temporalmente.";
    }
    throw new Error(friendlyMessage);
  }
}

/**
 * Cierra la sesión del usuario actual
 */
export async function logout() {
  try {
    await signOut(auth);
  } catch (error) {
    console.error("Error al cerrar sesión:", error);
    throw error;
  }
}

/**
 * Escucha cambios en el estado de autenticación de Firebase
 */
export function subscribeToAuthChanges(callback) {
  return onAuthStateChanged(auth, async (user) => {
    if (user) {
      try {
        const userDocSnap = await getDoc(doc(db, "users", user.uid));
        if (userDocSnap.exists()) {
          const profile = userDocSnap.data();
          callback(user, profile.role);
        } else {
          callback(user, null);
        }
      } catch (error) {
        console.error("Error al obtener rol en cambio de estado:", error);
        callback(user, null);
      }
    } else {
      callback(null, null);
    }
  });
}

/**
 * Registra o actualiza un perfil de usuario en Firestore
 */
export async function createUserProfile(uid, profileData) {
  try {
    const userDocRef = doc(db, "users", uid);
    await setDoc(userDocRef, {
      ...profileData,
      uid,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    console.error("Error al crear el perfil de usuario:", error);
    throw error;
  }
}
