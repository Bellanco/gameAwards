import React, { useState, useEffect } from 'react';
import { auth, googleProvider, db } from './firebase';
import { signInWithPopup, onAuthStateChanged, signOut } from 'firebase/auth';
import { doc, setDoc, collection, getDocs } from 'firebase/firestore';
import { useTranslation } from './data/literals';
import { loadAndSortCategories } from './services/categoriesService';
import { cleanPlaceholderCaches } from './services/gameImageService';
import { useTheme } from './hooks';

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

  // ============ Estado de Tema (Centralizado en Hook) ============
  const { theme, toggleTheme } = useTheme();

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
  const [isDeadlineReached, setIsDeadlineReached] = useState(false);
  const [daysRemaining, setDaysRemaining] = useState(null);
  
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
        console.log('📂 Iniciando carga de categorías desde App.jsx...');
        setCategoriesLoading(true);
        const loadedCategories = await loadAndSortCategories(false); // false = no incluir inválidas
        setCategories(loadedCategories);
      } catch (error) {
        console.error('❌ Error cargando categorias:', error);
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
        setUserDisplayName(user.displayName || ''); // Inicializar con displayName del usuario
        setCanEditNickname(false); // No editable después del login
        
        // Limpiar placeholders del cache (para regenerar con URLs reales de RAWG)
        const cleaned = cleanPlaceholderCaches();
        if (cleaned > 0) {
          console.log(`🧹 Placeholders limpios: ${cleaned}`);
        }
        
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
   * Volver al inicio sin cerrar sesión (limpia votos pero mantiene sesión)
   */
  const handleReturnToHome = () => {
    setCurrentStep(-1); // Volver a login
    setUserVotes({}); // Limpiar votos
    setUserNickname(''); // Limpiar apodo
    setUserDisplayName(''); // Limpiar displayName
    setErrorMessage(''); // Limpiar errores
    setSuccessMessage(''); // Limpiar mensajes de éxito
    localStorage.removeItem('votingProgress'); // Limpiar localStorage
    console.log('↩️ Volviendo al inicio, sesión mantenida');
  };

  /**
   * Selecciona una opción de voto y avanza automáticamente
   */
  const selectOption = (categoryId, option) => {
    // option = { id: optionId, name: optionName }
    const updatedVotes = { ...userVotes, [categoryId]: option };
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
   * Finaliza la votación: selecciona el último elemento y va a ReviewScreen (sin auto-avances)
   */
  const finishVoting = () => {
    // Validar que estamos en una categoría válida
    if (currentStep >= 0 && currentStep < validCategories.length) {
      const category = validCategories[currentStep];
      const lastIndex = category.options.length - 1;
      const lastOption = category.options[lastIndex];
      const lastOptionId = category.optionIds ? category.optionIds[lastIndex] : `${category.id}_option_${lastIndex}`;
      
      // Actualizar votos directamente (sin auto-avances)
      const updatedVotes = { ...userVotes, [category.id]: { id: lastOptionId, name: lastOption } };
      setUserVotes(updatedVotes);
      
      // Guardar en localStorage
      const progress = { votes: updatedVotes, step: currentStep };
      localStorage.setItem('votingProgress', JSON.stringify(progress));
    }
    
    // Ir directamente a ReviewScreen (sin pasar por categorías intermedias)
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
      const categoryNames = missingVotes.map(cat => cat.title).join(', ');
      const message = language === 'es' 
        ? `⚠️ Te faltan ${missingVotes.length} categoría(s) por votar: ${categoryNames}`
        : `⚠️ You are missing votes in ${missingVotes.length} category(ies): ${categoryNames}`;
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

      // Convertir votos de {id, name} a solo nombres para guardar en Firestore
      const selections = {};
      Object.entries(userVotes).forEach(([categoryId, vote]) => {
        selections[categoryId] = vote.name || vote; // Por si viene en formato antiguo
      });

      // Preparar datos (estructura lista para Firebase)
      const ballotData = {
        userId: currentUser?.uid || 'demo-user',
        userEmail: currentUser?.email || 'demo@example.com',
        userNickname: userNickname,
        userDisplayName: userDisplayName, // Nuevo campo editable
        selections: selections, // Solo nombres
        submittedAt: new Date().toISOString(),
        isActive: true
      };

      console.log('📊 Ballot data prepared:', ballotData);

      // Guardado en Firebase
      await setDoc(doc(db, "ballots", currentUser.uid), ballotData);

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
    if (currentStep >= validCategories.length) return 100;
    return Math.round(((currentStep + 1) / validCategories.length) * 100);
  };

  // ============ RENDERING ============

  // Loading inicial (autenticación)
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

  // Loading de categorías
  if (categoriesLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 flex items-center justify-center">
        <div className="text-center">
          <div className="text-5xl mb-4 animate-spin">⏳</div>
          <p className="text-slate-400">Cargando categorías...</p>
        </div>
      </div>
    );
  }

  // Filtrar solo categorías válidas (no placeholders vacíos)
  // - Si tiene isPlaceholder, es solo para mantener la tabla en Firestore
  // - Si tiene title vacío, también es un placeholder
  const validCategories = categories.filter(cat => 
    !cat.isPlaceholder && cat.title && cat.title.trim()
  );
  
  console.log(`🔍 Análisis de categorías: 
    - Total cargadas: ${categories.length}
    - Con isPlaceholder: ${categories.filter(c => c.isPlaceholder).length}
    - Válidas para votar: ${validCategories.length}
  `, { categories, validCategories });
  
  // Panel de Admin - Ruta secreta /admin (SIEMPRE accesible, incluso sin categorías)
  if (window.location.pathname === '/admin') {
    return <AdminPanel language={language} onToggleLanguage={toggleLanguage} theme={theme} onToggleTheme={toggleTheme} />;
  }

  // Sin categorías válidas - mostrar mensaje solo para público
  if (validCategories.length === 0 && !isLoadingAuth && !categoriesLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 flex items-center justify-center p-4">
        <div className="text-center">
          <div className="text-5xl mb-4">📋</div>
          <h1 className="text-2xl font-bold text-white mb-2">No hay categorías disponibles</h1>
          <p className="text-slate-400">Por favor, intenta de nuevo más tarde.</p>
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
    console.log('🔓 Renderizando LoginScreen:', { currentStep, currentUser: !!currentUser });
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
    console.log('📋 Renderizando ReviewScreen:', { currentStep, validCategories: validCategories.length });
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
    console.log('✅ Renderizando SuccessScreen');
    return (
      <SuccessScreen
        userNickname={userNickname}
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
