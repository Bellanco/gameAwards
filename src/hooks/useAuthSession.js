/**
 * Hook custom: useAuthSession
 *
 * Sesión de Google y bloqueo de re-voto: quién está conectado, si ya tiene un
 * voto registrado y los errores de inicio de sesión, ya traducidos.
 *
 * Los mensajes de error de Firebase estaban embebidos en español dentro de
 * App.jsx —y alguno filtraba rutas internas del proyecto al usuario— así que
 * ahora se mapean a claves de i18n.
 */

import { useState, useEffect, useCallback } from 'react';
import { signInWithPopup, onAuthStateChanged, signOut } from 'firebase/auth';
import { auth, googleProvider } from '../firebase';
import { hasExistingBallot } from '../services/ballotService';
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

  // Bloqueo de re-voto: hasVoted = ya hay ballot en Firestore.
  // voteChecked = ya lo hemos comprobado para este usuario (evita parpadeo).
  const [hasVoted, setHasVoted] = useState(false);
  const [voteChecked, setVoteChecked] = useState(false);

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
      setHasVoted(false);
      setVoteChecked(false);
      return;
    }
    let cancelled = false;
    setVoteChecked(false);
    (async () => {
      const voted = await hasExistingBallot(currentUser.uid);
      if (cancelled) return;
      setHasVoted(voted);
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
    setHasVoted,
    voteChecked,
    signIn,
    signOut: signOutUser,
  };
};
