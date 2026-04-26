import React, { useState, useEffect } from 'react';
import { auth, googleProvider, db } from './firebase';
import { signInWithPopup, onAuthStateChanged, signOut } from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';
import { categories } from './data/categories';
import { useTranslation } from './data/literals';

// Componentes modulares
import VoteScreen from './components/VoteScreen';
import ReviewScreen from './components/ReviewScreen';
import LoginScreen from './components/LoginScreen';
import SuccessScreen from './components/SuccessScreen';
import DeadlineScreen from './components/DeadlineScreen';
import AdminPanel from './components/AdminPanel';

function App() {
  // ============ Estado de Idioma ============
  const [language, setLanguage] = useState(() => {
    return localStorage.getItem('appLanguage') || 'es';
  });
  const t = useTranslation(language);

  // ============ Estado de Autenticación ============
  const [currentUser, setCurrentUser] = useState(null);
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);
  
  // ============ Flujo de Pantallas ============
  // -1: Login
  // 0-n: Votación (categoría n)
  // categories.length: Revisión
  // 99: Éxito
  const [currentStep, setCurrentStep] = useState(-1);
  
  // ============ Datos del Usuario ============
  const [userNickname, setUserNickname] = useState('');
  const [userVotes, setUserVotes] = useState({});
  const [canEditNickname, setCanEditNickname] = useState(true);
  
  // ============ Control de Deadline ============
  const [isDeadlineReached, setIsDeadlineReached] = useState(false);
  const [daysRemaining, setDaysRemaining] = useState(null);
  
  // ============ Estado de UI ============
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  /**
   * useEffect: Verifica deadline, configura autenticación, e inicializa progreso
   */
  useEffect(() => {
    // Calcular deadline y días restantes
    const now = new Date();
    const currentYear = now.getFullYear();
    const deadline = new Date(currentYear, 11, 1); // 1 de diciembre
    
    // Si ya pasó el 1 de diciembre este año, el deadline del próximo año es target
    if (now > deadline) {
      deadline.setFullYear(currentYear + 1);
    }
    
    const timeDiff = deadline.getTime() - now.getTime();
    const daysLeft = Math.ceil(timeDiff / (1000 * 3600 * 24));
    
    if (daysLeft <= 0 && now.getMonth() === 11 && now.getDate() >= 1) {
      setIsDeadlineReached(true);
    } else {
      setDaysRemaining(daysLeft);
    }
    
    // Listener de autenticación de Firebase
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        setCurrentUser(user);
        setUserNickname(user.displayName || '');
        setCanEditNickname(false); // No editable después del login
        
        // Recuperar progreso previo de localStorage
        const savedProgress = localStorage.getItem('votingProgress');
        if (savedProgress) {
          const progress = JSON.parse(savedProgress);
          setUserVotes(progress.votes || {});
          setCurrentStep(progress.step || 0);
        }
      }
      setIsLoadingAuth(false);
    });

    // Cleanup
    return () => unsubscribe();
  }, []);

  /**
   * Cambia el idioma de la aplicación
   */
  const toggleLanguage = () => {
    const newLanguage = language === 'es' ? 'en' : 'es';
    setLanguage(newLanguage);
    localStorage.setItem('appLanguage', newLanguage);
  };

  /**
   * Maneja el login con Google (o simula en DEMO_MODE)
   */
  const handleLogin = async () => {
    try {
      setIsLoading(true);
      setErrorMessage('');
      
      // Usa Firebase Google Auth
      // Validar que Firebase está configurado
      if (!auth || auth.currentUser === undefined) {
        setErrorMessage('Firebase no está configurado. Verifica src/firebase.js');
        console.error('Firebase Auth not initialized');
        setIsLoading(false);
        return;
      }

      const result = await signInWithPopup(auth, googleProvider);
      setCurrentUser(result.user);
      setCurrentStep(0); // Pasar a la primera categoría
    } catch (error) {
      console.error('Auth Error:', error.code, error.message);
      
      // Mapear códigos de error a mensajes claros
      const errorMessages = {
        'auth/popup-blocked': 'El popup fue bloqueado. Habilita popups en tu navegador.',
        'auth/popup-closed-by-user': 'Cerraste la ventana de inicio de sesión.',
        'auth/internal-error': 'Error interno de Firebase. Verifica las credenciales en src/firebase.js',
        'auth/invalid-api-key': 'API Key de Firebase inválida. Actualiza src/firebase.js',
        'auth/network-request-failed': 'Error de conexión. Verifica tu internet.',
        'auth/operation-not-supported-in-this-environment': 'Popup auth no soportado. Intenta en https.',
        'auth/unauthorized-domain': 'Dominio no autorizado en Firebase Console. Agrega localhost:5173 a "Authorized domains"',
      };

      const errorMsg = errorMessages[error.code] || `Error: ${error.message}`;
      setErrorMessage(errorMsg);
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Maneja el logout
   */
  const handleLogout = async () => {
    try {
      await signOut(auth);
      setCurrentUser(null);
      setCurrentStep(-1);
      setUserVotes({});
      setUserNickname('');
      localStorage.removeItem('votingProgress');
    } catch (error) {
      console.error('Logout Error:', error);
    }
  };

  /**
   * Selecciona una opción de voto y avanza automáticamente
   */
  const selectOption = (categoryId, optionValue) => {
    const updatedVotes = { ...userVotes, [categoryId]: optionValue };
    setUserVotes(updatedVotes);
    
    // Guardar en localStorage
    const progress = { votes: updatedVotes, step: currentStep };
    localStorage.setItem('votingProgress', JSON.stringify(progress));
    
    // Auto-avanzar a siguiente categoría (con delay para feedback visual)
    setTimeout(() => {
      if (currentStep < categories.length - 1) {
        setCurrentStep(currentStep + 1);
      }
    }, 300);
  };

  /**
   * Navega a la categoría anterior
   */
  const goToPreviousStep = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  /**
   * Navega a la siguiente categoría o revisión
   */
  const goToNextStep = () => {
    if (currentStep < categories.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      setCurrentStep(categories.length); // Ir a revisión
    }
  };

  /**
   * Salta categoría sin votar
   */
  const skipCategory = () => {
    goToNextStep();
  };

  /**
   * Envía la porra (simulada en DEMO_MODE, real con Firebase después)
   */
  const submitBallot = async () => {
    if (!userNickname.trim()) {
      setErrorMessage('Por favor, ingresa un apodo.');
      return;
    }

    if (Object.keys(userVotes).length < categories.length) {
      setErrorMessage('Por favor, vota en todas las categorías.');
      return;
    }

    if (isDeadlineReached) {
      setErrorMessage('El plazo de votación ha terminado.');
      return;
    }

    try {
      setIsLoading(true);
      setErrorMessage('');

      // Preparar datos (estructura lista para Firebase)
      const ballotData = {
        userId: currentUser?.uid || 'demo-user',
        userEmail: currentUser?.email || 'demo@example.com',
        userNickname: userNickname,
        selections: userVotes,
        submittedAt: new Date().toISOString(),
        isActive: true
      };

      console.log('📊 Ballot data prepared:', ballotData);

      // Guardado en Firebase
      // await setDoc(doc(db, "ballots", currentUser.uid), ballotData);

      // Simulación de éxito
      setSuccessMessage(`¡Voto registrado exitosamente, ${userNickname}!`);
      setCurrentStep(99); // Pantalla de éxito
      localStorage.removeItem('votingProgress');
    } catch (error) {
      console.error('💾 Ballot Submit Error:', error);
      setErrorMessage('Error al guardar tu voto. Intenta de nuevo.');
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Calcula el progreso del voting
   */
  const getProgressPercentage = () => {
    if (currentStep < 0) return 0;
    if (currentStep >= categories.length) return 100;
    return Math.round(((currentStep + 1) / categories.length) * 100);
  };

  // ============ RENDERING ============

  // Loading inicial
  if (isLoadingAuth) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 flex items-center justify-center">
        <div className="text-center">
          <div className="text-5xl mb-4 animate-bounce">🎮</div>
          <p className="text-slate-400">Cargando aplicación...</p>
        </div>
      </div>
    );
  }

  // Panel de Admin - Ruta secreta /admin
  if (window.location.pathname === '/admin') {
    return <AdminPanel language={language} onToggleLanguage={toggleLanguage} />;
  }

  // Deadline alcanzado
  if (isDeadlineReached) {
    return <DeadlineScreen language={language} onToggleLanguage={toggleLanguage} />;
  }

  // Pantalla de login
  if (currentStep === -1 || !currentUser) {
    return (
      <LoginScreen
        onLogin={handleLogin}
        isLoading={isLoading}
        errorMessage={errorMessage}
        daysRemaining={daysRemaining}
        language={language}
        onToggleLanguage={toggleLanguage}
      />
    );
  }

  // Pantalla de votación
  if (currentStep >= 0 && currentStep < categories.length) {
    return (
      <VoteScreen
        category={categories[currentStep]}
        currentStep={currentStep}
        totalSteps={categories.length}
        userVotes={userVotes}
        onSelectOption={selectOption}
        onPrevious={goToPreviousStep}
        onNext={goToNextStep}
        onSkip={skipCategory}
        progressPercentage={getProgressPercentage()}
        language={language}
        onToggleLanguage={toggleLanguage}
      />
    );
  }

  // Pantalla de revisión
  if (currentStep === categories.length) {
    return (
      <ReviewScreen
        categories={categories}
        userVotes={userVotes}
        userNickname={userNickname}
        onNicknameChange={setUserNickname}
        onSubmit={submitBallot}
        onPrevious={goToPreviousStep}
        isLoading={isLoading}
        errorMessage={errorMessage}
        canEditNickname={canEditNickname}
        language={language}
        onToggleLanguage={toggleLanguage}
      />
    );
  }

  // Pantalla de éxito
  if (currentStep === 99) {
    return (
      <SuccessScreen
        userNickname={userNickname}
        onLogout={handleLogout}
        successMessage={successMessage}
        language={language}
        onToggleLanguage={toggleLanguage}
      />
    );
  }

  return null;
}

export default App;
