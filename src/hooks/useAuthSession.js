/**
 * Hook custom: useAuthSession
 *
 * Sesión de Google y estado del voto: quién está conectado, qué voto tiene ya
 * registrado (para bloquear el re-voto y para poder corregirlo) y los errores de
 * inicio de sesión, ya traducidos.
 *
 * Los mensajes de error de Firebase estaban embebidos en español dentro de
 * App.jsx —y alguno filtraba rutas internas del proyecto al usuario— así que
 * ahora se mapean a claves de i18n.
 */

import { useState, useEffect, useCallback } from 'react';
import { signInWithPopup, onAuthStateChanged, signOut } from 'firebase/auth';
import { auth, googleProvider } from '../firebase';
import { fetchUserBallot } from '../services/ballotService';
import { trackLogin } from '../services/analyticsService';
import { logError, ERROR_TYPES } from '../services/errorService';

/**
 * Código de error de Firebase Auth -> clave de i18n.
 * Lo que no esté aquí cae en `errorSignInGeneric`: nunca se enseña el mensaje
 * crudo de Firebase, que puede incluir detalles internos.
 */
const AUTH_ERROR_KEYS = {
  'auth/popup-blocked': 'errorPopupBlocked',
  'auth/popup-closed-by-user': 'errorPopupClosed',
  'auth/network-request-failed': 'errorNetwork',
  'auth/unauthorized-domain': 'errorUnauthorizedDomain',
  'auth/operation-not-supported-in-this-environment': 'errorPopupUnsupported',
};

/**
 * @param {Function} t - Traductor (useTranslation)
 * @param {Function} onSignedIn - Se llama tras un login correcto
 */
export const useAuthSession = (t, onSignedIn) => {
  const [currentUser, setCurrentUser] = useState(null);
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);
  const [isSigningIn, setIsSigningIn] = useState(false);
  const [authError, setAuthError] = useState('');

  // Voto ya emitido por este usuario, o null. De esta ÚNICA lectura salen las
  // tres cosas que necesita la app: si ya votó, qué votó (para editarlo) y
  // cuántas ediciones le quedan (`editCount`).
  // voteChecked = ya lo hemos comprobado para este usuario (evita parpadeo).
  const [existingBallot, setExistingBallot] = useState(null);
  const [voteChecked, setVoteChecked] = useState(false);
  const hasVoted = existingBallot !== null;

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      try {
        if (user) {
          setCurrentUser(user);
          onSignedIn?.(user);
        }
      } finally {
        // Pase lo que pase, la app debe salir de la pantalla de carga.
        setIsLoadingAuth(false);
      }
    });
    return () => unsubscribe();
  }, [onSignedIn]);

  useEffect(() => {
    if (!currentUser) {
      setExistingBallot(null);
      setVoteChecked(false);
      return;
    }
    let cancelled = false;
    setVoteChecked(false);
    (async () => {
      const ballot = await fetchUserBallot(currentUser.uid);
      if (cancelled) return;
      setExistingBallot(ballot);
      setVoteChecked(true);
    })();
    return () => {
      cancelled = true;
    };
  }, [currentUser]);

  /**
   * Inicia sesión con Google. Si la sesión de Firebase sigue viva, no relanza el
   * popup: devuelve el usuario actual.
   * @returns {Promise<Object|null>} El usuario, o null si falló
   */
  const signIn = useCallback(async () => {
    try {
      setIsSigningIn(true);
      setAuthError('');

      if (auth.currentUser) {
        setCurrentUser(auth.currentUser);
        return auth.currentUser;
      }

      const result = await signInWithPopup(auth, googleProvider);
      setCurrentUser(result.user);
      trackLogin();
      return result.user;
    } catch (error) {
      logError(ERROR_TYPES.AUTH_ERROR, error, { context: 'useAuthSession - signIn' });
      setAuthError(t(AUTH_ERROR_KEYS[error.code] || 'errorSignInGeneric'));
      return null;
    } finally {
      setIsSigningIn(false);
    }
  }, [t]);

  const signOutUser = useCallback(async () => {
    try {
      await signOut(auth);
      setCurrentUser(null);
    } catch (error) {
      logError(ERROR_TYPES.AUTH_ERROR, error, { context: 'useAuthSession - signOut' });
    }
  }, []);

  return {
    currentUser,
    isLoadingAuth,
    isSigningIn,
    authError,
    setAuthError,
    hasVoted,
    existingBallot,
    // Tras enviar o corregir el voto, App actualiza el estado con el documento
    // que se acaba de escribir en vez de releerlo: una lectura menos y la
    // cuenta de ediciones restantes queda al día en el acto.
    setExistingBallot,
    voteChecked,
    signIn,
    signOut: signOutUser,
  };
};
