import React, { useState, useEffect, lazy, Suspense } from 'react';
import { auth, googleProvider, db } from './firebase';
import { signInWithPopup, onAuthStateChanged, signOut } from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';
import { useTranslation } from './data/literals';
import { loadAndSortCategories } from './services/categoriesService';
import { cleanPlaceholderCaches } from './services/gameImageService';
import { useTheme, useVotingConfig } from './hooks';
import { hasTitle, getCategoryTitle } from './utils/localize';

// Componentes modulares
import VoteScreen from './components/VoteScreen';
import ReviewScreen from './components/ReviewScreen';
import LoginScreen from './components/LoginScreen';
import SuccessScreen from './components/SuccessScreen';
import DeadlineScreen from './components/DeadlineScreen';

// AdminPanel solo se usa en la ruta /admin -> carga diferida (code-splitting)
const AdminPanel = lazy(() => import('./components/AdminPanel'));

function App() {
  // ============ Estado de Idioma ============
  const [language, setLanguage] = useState(() => {
    return localStorage.getItem('appLanguage') || 'es';
  });
  const t = useTranslation(language);

  // ============ Estado de Tema (Centralizado en Hook) ============
  const { theme, toggleTheme } = useTheme();

  // ============ Estado de Votación (controlado por admin en config/voting) ============
  const { isOpen: isVotingOpen, season, closesAt, isLoading: configLoading } = useVotingConfig();

  // ============ Estado de Categorías (desde Firestore) ============
  const [categories, setCategories] = useState([]);
  const [categoriesLoading, setCategoriesLoading] = useState(true);

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
  const [userDisplayName, setUserDisplayName] = useState('');
  const [userVotes, setUserVotes] = useState({});
  const [canEditNickname, setCanEditNickname] = useState(true);
  
  // ============ Control de Deadline ============
  // La votación está cerrada cuando el admin pone isOpen=false en config/voting.
  const isDeadlineReached = !configLoading && !isVotingOpen;
  // Días restantes informativos, derivados de closesAt si el admin lo configuró.
  const daysRemaining = closesAt
    ? Math.max(0, Math.ceil((new Date(closesAt).getTime() - Date.now()) / (1000 * 3600 * 24)))
    : null;

  // ============ Estado de UI ============
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  /**
   * useEffect: Cargar categorías desde Firestore
   */
  useEffect(() => {
    const loadCategories = async () => {
      try {
        setCategoriesLoading(true);
        const loadedCategories = await loadAndSortCategories(false); // false = no incluir inválidas
        setCategories(loadedCategories);
      } catch (error) {
        console.error('Error cargando categorias:', error);
        setCategories([]);
      } finally {
        setCategoriesLoading(false);
      }
    };

    loadCategories();
  }, []);

  /**
   * useEffect: Verifica deadline, configura autenticación, e inicializa progreso
   */
  useEffect(() => {
    // Listener de autenticación de Firebase
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        setCurrentUser(user);
        setUserNickname(user.displayName || '');
        setUserDisplayName(user.displayName || ''); // Inicializar con displayName del usuario
        setCanEditNickname(false); // No editable después del login
        
        // Limpiar placeholders del cache (para regenerar con URLs reales de RAWG)
        const cleaned = cleanPlaceholderCaches();
        // Silently clean cache
        
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
   * useEffect: Sincroniza localStorage cuando userVotes o currentStep cambian
   * Esto evita carreras de condición en selectOption
   */
  useEffect(() => {
    // Calcular validCategories localmente para evitar referencia antes de declaración
    const validCats = categories.filter(cat => !cat.isPlaceholder && hasTitle(cat));
    
    // Si estamos en pantalla de éxito, limpiar localStorage
    if (currentStep === 99) {
      localStorage.removeItem('votingProgress');
    }
    // Solo guardar cuando hay usuario autenticado y estamos en votación activa
    else if (currentUser && currentStep >= -1 && currentStep < validCats.length + 1) {
      const progress = { votes: userVotes, step: currentStep };
      localStorage.setItem('votingProgress', JSON.stringify(progress));
    }
  }, [userVotes, currentStep, currentUser, categories]);

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
      // localStorage se limpiará automáticamente vía useEffect
    } catch (error) {
      console.error('Logout Error:', error);
    }
  };

  /**
   * Volver al inicio sin cerrar sesión (limpia votos pero mantiene sesión)
   */
  const handleReturnToHome = () => {
    setCurrentStep(-1); // Volver a login
    setUserVotes({}); // Limpiar votos
    setUserNickname(''); // Limpiar apodo
    setUserDisplayName(''); // Limpiar displayName
    setErrorMessage(''); // Limpiar errores
    setSuccessMessage(''); // Limpiar mensajes de éxito
    // localStorage se limpiará automáticamente vía useEffect
    console.log('↩️ Volviendo al inicio, sesión mantenida');
  };

  /**
   * Selecciona una opción de voto
   * La sincronización con localStorage se maneja en useEffect (ver más abajo)
   */
  const selectOption = (categoryId, option) => {
    // option = { id: optionId, name: optionName }
    const updatedVotes = { ...userVotes, [categoryId]: option };
    setUserVotes(updatedVotes);
    
    // No avanzar automáticamente desde aquí - dejar que VoteScreen maneje la navegación
    // El useEffect sincronizará automáticamente con localStorage
  };

  /**
   * Navega a la categoría anterior, o a una específica si se proporciona el índice
   */
  const goToPreviousStep = (stepIndex = null) => {
    if (stepIndex !== null && stepIndex >= 0) {
      // Ir a un paso específico (desde allVotes)
      setCurrentStep(stepIndex);
    } else if (currentStep > 0) {
      // Ir al paso anterior
      setCurrentStep(currentStep - 1);
    }
  };

  /**
   * Navega a la siguiente categoría o revisión
   */
  const goToNextStep = () => {
    if (currentStep < validCategories.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      setCurrentStep(validCategories.length); // Ir a revisión
    }
  };

  /**
   * Finaliza la votación: guarda el voto actual y va a ReviewScreen
   */
  const finishVoting = () => {
    // Guardar el progreso actual (incluyendo el voto de la categoría en la que estamos)
    const progress = { votes: userVotes, step: currentStep };
    localStorage.setItem('votingProgress', JSON.stringify(progress));
    
    // Ir directamente a ReviewScreen
    setCurrentStep(validCategories.length);
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

    // Verificar que todas las categorías válidas tengan voto
    const missingVotes = validCategories.filter(cat => !userVotes[cat.id]);
    if (missingVotes.length > 0) {
      const categoryNames = missingVotes.map(cat => getCategoryTitle(cat, language)).join(', ');
      const message = language === 'es' 
        ? `Te faltan ${missingVotes.length} categoría(s) por votar: ${categoryNames}`
        : `You are missing votes in ${missingVotes.length} category(ies): ${categoryNames}`;
      setErrorMessage(message);
      return;
    }

    if (isDeadlineReached) {
      setErrorMessage('El plazo de votación ha terminado.');
      return;
    }

    try {
      setIsLoading(true);
      setErrorMessage('');

      // Guardar el optionId estable (NO el nombre): independiente del idioma y
      // robusto frente a cambios de texto. El nombre se resuelve al mostrar.
      const selections = {};
      Object.entries(userVotes).forEach(([categoryId, vote]) => {
        selections[categoryId] = vote.id;
      });

      // Sanitizado básico de texto introducido por el usuario.
      const sanitize = (value) => (value || '').trim().replace(/[<>]/g, '').slice(0, 50);

      // Preparar datos (estructura validada por firestore.rules)
      const ballotData = {
        userId: currentUser?.uid || 'demo-user',
        userEmail: currentUser?.email || 'demo@example.com',
        userNickname: sanitize(userNickname),
        userDisplayName: sanitize(userDisplayName),
        selections: selections, // { categoryId: optionId }
        season: season,
        submittedAt: new Date().toISOString(),
        isActive: true
      };

      console.log('Ballot data prepared:', ballotData);

      // Guardado en Firebase
      await setDoc(doc(db, "ballots", currentUser.uid), ballotData);

      // Simulación de éxito
      setSuccessMessage(`¡Voto registrado exitosamente, ${userNickname}!`);
      setCurrentStep(99); // Pantalla de éxito - useEffect limpiará localStorage automáticamente
    } catch (error) {
      console.error('Ballot Submit Error:', error);
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
    if (currentStep >= validCategories.length) return 100;
    return Math.round(((currentStep + 1) / validCategories.length) * 100);
  };

  // ============ RENDERING ============

  // Loading inicial (autenticación)
  if (isLoadingAuth) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 flex items-center justify-center">
        <div className="text-center">
          <div className="mb-4 flex justify-center">
            <div className="w-12 h-12 border-4 border-slate-700 border-t-blue-500 rounded-full animate-spin"></div>
          </div>
          <p className="text-slate-400">{t('loadingApp')}</p>
        </div>
      </div>
    );
  }

  // Loading de categorías
  if (categoriesLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 flex items-center justify-center p-4">
        <div className="text-center">
          <div className="mb-4 flex justify-center">
            <div className="w-12 h-12 border-4 border-slate-700 border-t-emerald-500 rounded-full animate-spin"></div>
          </div>
          <p className="text-slate-400">{t('loadingCategories')}</p>
        </div>
      </div>
    );
  }

  // Filtrar solo categorías válidas (no placeholders vacíos)
  // - Si tiene isPlaceholder, es solo para mantener la tabla en Firestore
  // - Si tiene title vacío, también es un placeholder
  const validCategories = categories.filter(cat => !cat.isPlaceholder && hasTitle(cat));

  // Panel de Admin - Ruta secreta /admin (SIEMPRE accesible, incluso sin categorías)
  if (window.location.pathname === '/admin') {
    return (
      <Suspense fallback={
        <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 flex items-center justify-center">
          <div className="w-12 h-12 border-4 border-slate-700 border-t-blue-500 rounded-full animate-spin" />
        </div>
      }>
        <AdminPanel language={language} onToggleLanguage={toggleLanguage} theme={theme} onToggleTheme={toggleTheme} />
      </Suspense>
    );
  }

  // Sin categorías válidas - mostrar mensaje solo para público
  if (validCategories.length === 0 && !isLoadingAuth && !categoriesLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 flex items-center justify-center p-4">
        <div className="text-center">
          <div className="text-5xl mb-4">📋</div>
          <h1 className="text-2xl font-bold text-white mb-2">No hay categorías disponibles</h1>
          <p className="text-slate-400">{t('errorTryAgain')}</p>
          {categories.length > 0 && (
            <p className="text-xs text-slate-500 mt-4">
              (Admin: {categories.length} categoría(s) en base de datos, pero vacías)
            </p>
          )}
        </div>
      </div>
    );
  }

  // Deadline alcanzado
  if (isDeadlineReached) {
    return <DeadlineScreen language={language} onToggleLanguage={toggleLanguage} theme={theme} onToggleTheme={toggleTheme} />;
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
        theme={theme}
        onToggleTheme={toggleTheme}
      />
    );
  }

  // Pantalla de votación
  if (currentStep >= 0 && currentStep < validCategories.length) {
    return (
      <VoteScreen
        category={validCategories[currentStep]}
        currentStep={currentStep}
        totalSteps={validCategories.length}
        userVotes={userVotes}
        onSelectOption={selectOption}
        onPrevious={goToPreviousStep}
        onNext={goToNextStep}
        onSkip={skipCategory}
        onFinish={finishVoting}
        progressPercentage={getProgressPercentage()}
        language={language}
        onToggleLanguage={toggleLanguage}
        theme={theme}
        onToggleTheme={toggleTheme}
      />
    );
  }

  // Pantalla de revisión - Solo si hay categorías válidas cargadas
  if (currentStep === validCategories.length && validCategories.length > 0) {
    return (
      <ReviewScreen
        categories={validCategories}
        userVotes={userVotes}
        userNickname={userNickname}
        onNicknameChange={setUserNickname}
        userDisplayName={userDisplayName}
        onDisplayNameChange={setUserDisplayName}
        onSubmit={submitBallot}
        onPrevious={goToPreviousStep}
        onReturnHome={handleReturnToHome}
        isLoading={isLoading}
        errorMessage={errorMessage}
        canEditNickname={canEditNickname}
        language={language}
        onToggleLanguage={toggleLanguage}
        theme={theme}
        onToggleTheme={toggleTheme}
      />
    );
  }

  // Pantalla de éxito
  if (currentStep === 99) {
    return (
      <SuccessScreen
        userNickname={userDisplayName || userNickname}
        onLogout={handleLogout}
        onReturnHome={handleReturnToHome}
        successMessage={successMessage}
        language={language}
        onToggleLanguage={toggleLanguage}
        theme={theme}
        onToggleTheme={toggleTheme}
      />
    );
  }

  // Fallback - Si ninguna condición anterior se cumple, mostrar LoginScreen como último recurso
  return (
    <LoginScreen
      onLogin={handleLogin}
      isLoading={isLoading}
      errorMessage={errorMessage}
      daysRemaining={daysRemaining}
      language={language}
      onToggleLanguage={toggleLanguage}
      theme={theme}
      onToggleTheme={toggleTheme}
    />
  );
}

export default App;
