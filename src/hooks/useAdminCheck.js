/**
 * Hook custom: useAdminCheck
 * Verifica si el usuario autenticado es admin
 * Centraliza la lógica de permisos
 * 
 * @typedef {Object} User
 * @property {string} uid - Firebase UID
 * @property {string} email - Email del usuario
 * @property {string} displayName - Nombre mostrable
 * 
 * @typedef {Object} UseAdminCheckReturn
 * @property {boolean} isAdmin - Si el usuario es admin
 * @property {User|null} currentUser - Usuario autenticado o null
 * @property {boolean} isLoading - Estado de carga de autenticación
 * 
 * @returns {UseAdminCheckReturn} Estado de administrador y usuario
 */

import { useState, useEffect } from 'react';
import { auth } from '../firebase';
import { logError, ERROR_TYPES } from '../services/errorService';

/**
 * El acceso de administrador se determina por un custom claim de Firebase
 * (`admin: true`), verificado por el servidor e imposible de falsificar desde
 * el cliente. Para asignarlo (una sola vez, con el Admin SDK / CLI):
 *   admin.auth().setCustomUserClaims(uid, { admin: true })
 * El usuario debe refrescar su token (re-login) para recibir el claim.
 */
export const useAdminCheck = () => {
  const [isAdmin, setIsAdmin] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (user) => {
      // Vuelve a "cargando" en CADA cambio de sesión, no solo al arrancar.
      //
      // Sin esto, quien iniciaba sesión estando ya en /admin se iba a la
      // portada aunque fuera administrador: entre `setCurrentUser(user)` y el
      // `await` que lee el claim hay un render con usuario presente, `isAdmin`
      // todavía en false y `isLoading` ya en false (lo dejó así el primer
      // evento, el de "no hay sesión"), y el guardián del panel lo leía como
      // "autenticado y sin permiso". Solo entraba quien recargaba /admin con la
      // sesión ya establecida.
      setIsLoading(true);
      try {
        setCurrentUser(user);

        if (user) {
          // Leer el custom claim del token (forzar refresco para datos al día).
          const tokenResult = await user.getIdTokenResult(true);
          setIsAdmin(tokenResult.claims.admin === true);
        } else {
          setIsAdmin(false);
        }
      } catch (err) {
        setIsAdmin(false);
        logError(ERROR_TYPES.AUTH_ERROR, err, {
          context: 'useAdminCheck - onAuthStateChanged',
        });
      } finally {
        setIsLoading(false);
      }
    });

    return unsubscribe;
  }, []);

  return { isAdmin, currentUser, isLoading };
};
