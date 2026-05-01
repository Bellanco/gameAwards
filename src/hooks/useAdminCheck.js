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

// Configurar email de admin en variable de entorno o constante
const ADMIN_EMAILS = (import.meta.env.VITE_ADMIN_EMAILS || 'bellanco3@gmail.com').split(',');

export const useAdminCheck = () => {
  const [isAdmin, setIsAdmin] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((user) => {
      try {
        setCurrentUser(user);
        
        if (user && user.email) {
          const adminStatus = ADMIN_EMAILS.some(
            adminEmail => adminEmail.trim().toLowerCase() === user.email.toLowerCase()
          );
          setIsAdmin(adminStatus);
        } else {
          setIsAdmin(false);
        }
      } catch (err) {
        logError(ERROR_TYPES.AUTH_ERROR, err, { 
          context: 'useAdminCheck - onAuthStateChanged' 
        });
      } finally {
        setIsLoading(false);
      }
    });

    return unsubscribe;
  }, []);

  return { isAdmin, currentUser, isLoading };
};
