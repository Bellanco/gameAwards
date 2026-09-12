import React, { useState, useEffect, useMemo, useCallback, lazy, Suspense } from 'react';
import { auth } from './firebase';
import { useTranslation } from './data/literals';
import { loadAndSortCategories } from './services/categoriesService';
import { useTheme, useVotingConfig, useVotingFlow, useAuthSession } from './hooks';
import logger from './services/loggerService';
import { hasTitle, getCategoryTitle } from './utils/localize';
import { resolveRoute, FALLBACK_ROUTE } from './utils/routes';
import { AppProvider } from './context/AppContext';
import { LoadingSpinner } from './components/ui';
import { LOGIN_STEP, SUCCESS_STEP } from './hooks/useVotingFlow';
import { sanitizeUserText } from './utils/sanitize';
import { submitBallot as submitVote } from './services/ballotService';
import { trackBallotSubmitted, trackLanguageChanged } from './services/analyticsService';

// Componentes modulares
import VoteScreen from './components/VoteScreen';
import ReviewScreen from './components/ReviewScreen';
import LoginScreen from './components/LoginScreen';
import SuccessScreen from './components/SuccessScreen';
import DeadlineScreen from './components/DeadlineScreen';
import AlreadyVotedScreen from './components/AlreadyVotedScreen';

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

  // Categorías que de verdad se votan: ni placeholders ni títulos vacíos.
  // Se declara AQUÍ, por encima de los manejadores que la leen. Antes vivía en
  // mitad del render, después de varios returns tempranos: funcionaba de
  // milagro (los manejadores son closures que solo se invocan tras el render
  // completo), pero cualquier refactor que la llamara antes habría lanzado un
  // ReferenceError por TDZ.
  const validCategories = useMemo(
    () => categories.filter(cat => !cat.isPlaceholder && hasTitle(cat)),
    [categories]
  );

  // ============ Flujo de Pantallas ============
  // Pasos, votos, persistencia del progreso y botón "atrás" (ver useVotingFlow).
  const {
    currentStep,
    setCurrentStep,
    resumeStep,
    userVotes,
    selectOption,
    goToPreviousStep,
    goToNextStep,
    finishVoting,
    restoreProgress,
    clearProgress,
    progressPercentage,
    reviewStep,
  } = useVotingFlow({
    validCategories,
    hasSession: Boolean(currentUser),
    historyEnabled: route === 'home',
  });

  // ============ Sesión, login y bloqueo de re-voto ============
  const {
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
  } = useAuthSession(t, handleSignedIn);


  // ============ Datos del Usuario ============
  // `userDisplayName` es el ÚNICO nombre editable y la única fuente de verdad de
  // la UI. El nombre de la cuenta de Google se lee de `currentUser` al enviar,
  // nunca de estado: antes vivía en un `userNickname` que `handleReturnToHome`
  // vaciaba sin que ninguna pantalla ofreciera forma de rellenarlo, y eso dejaba
  // el envío bloqueado para siempre.
  const [userDisplayName, setUserDisplayName] = useState('');

  // ============ Control de Deadline ============
  // La votación está cerrada si el admin la cierra (isOpen=false) O si ya pasó
  // la fecha de cierre elegida (closesAt, ese día a las 23:59).
  const closingPassed = closesAt ? Date.now() > new Date(closesAt).getTime() : false;
  const isDeadlineReached = !configLoading && (!isVotingOpen || closingPassed);
  // Días restantes informativos, derivados de closesAt si el admin lo configuró.
  const daysRemaining = closesAt
    ? Math.max(0, Math.ceil((new Date(closesAt).getTime() - Date.now()) / (1000 * 3600 * 24)))
    : null;

  /**
   * Al confirmarse la sesión: nombre inicial y progreso guardado.
   * useCallback porque useAuthSession lo tiene como dependencia de su efecto.
   */
  const handleSignedIn = useCallback((user) => {
    setUserDisplayName(user.displayName || '');
    restoreProgress();
  }, [restoreProgress]);

  // ============ Estado de UI ============
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // ============ Ruta actual ============
  // Solo hay dos rutas declaradas ('/' y '/admin'). Cualquier otra cosa rebota a
  // la principal, reescribiendo la URL sin dejar entrada en el historial.
  const route = resolveRoute(window.location.pathname);

  useEffect(() => {
    if (route === null) {
      window.history.replaceState(null, '', FALLBACK_ROUTE);
    }
  }, [route]);

  // ============ Idioma del documento ============
  // Sin esto, <html lang="es"> se quedaba fijo aunque la interfaz estuviera en
  // inglés, y los lectores de pantalla leían el inglés con fonética española
  // (incumple WCAG 3.1.1).
  useEffect(() => {
    document.documentElement.lang = language;
  }, [language]);

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
        logger.error('Error cargando categorías:', error);
        setCategories([]);
      } finally {
        setCategoriesLoading(false);
      }
    };

    loadCategories();
  }, []);

  /**
   * Cambia el idioma de la aplicación
   */
  const toggleLanguage = () => {
    const newLanguage = language === 'es' ? 'en' : 'es';
    setLanguage(newLanguage);
    localStorage.setItem('appLanguage', newLanguage);
    trackLanguageChanged(newLanguage);
  };

  /**
   * Login con Google. Al volver, continúa donde lo dejó (resumeStep).
   */
  const handleLogin = async () => {
    const user = await signIn();
    if (user) setCurrentStep(resumeStep);
  };

  /**
   * Cierra sesión y devuelve la app a su estado inicial.
   */
  const handleLogout = async () => {
    await signOutUser();
    setCurrentStep(LOGIN_STEP);
    setUserDisplayName('');
    clearProgress();
  };

  /**
   * Volver al inicio sin cerrar sesión (limpia votos pero mantiene sesión)
   */
  const handleReturnToHome = () => {
    setCurrentStep(LOGIN_STEP); // Volver a login
    clearProgress(); // Olvidar votos y progreso recordado
    // El nombre vuelve al de la cuenta de Google, NO a vacío: la sesión sigue
    // abierta y ReviewScreen debe encontrar un nombre válido al volver a entrar.
    setUserDisplayName(auth.currentUser?.displayName || '');
    setErrorMessage('');
    setAuthError('');
  };

  /**
   * Envía la porra (simulada en DEMO_MODE, real con Firebase después)
   */
  const submitBallot = async () => {
    // Se valida el nombre EDITABLE, que es el que ReviewScreen muestra y el
    // usuario puede corregir si el mensaje de error aparece. Se valida ya
    // SANEADO, que es lo que se envía: las reglas exigen que no llegue vacío, y
    // un nombre que el saneado deja en blanco daría un rechazo opaco.
    const displayName = sanitizeUserText(userDisplayName);
    if (!displayName) {
      setErrorMessage(t('errorEnterNickname'));
      return;
    }

    // Verificar que todas las categorías válidas tengan voto
    const missingVotes = validCategories.filter(cat => !userVotes[cat.id]);
    if (missingVotes.length > 0) {
      const categoryNames = missingVotes.map(cat => getCategoryTitle(cat, language)).join(', ');
      setErrorMessage(
        t('errorMissingVotes')
          .replace('{count}', missingVotes.length)
          .replace('{names}', categoryNames)
      );
      return;
    }

    if (isDeadlineReached) {
      setErrorMessage(t('errorVotingEnded'));
      return;
    }

    if (!currentUser) {
      setErrorMessage(t('errorSavingVote'));
      return;
    }

    try {
      setIsLoading(true);
      setErrorMessage('');

      const { selectionCount } = await submitVote({
        currentUser,
        userVotes,
        displayName,
        season,
      });

      // Marcar como votado (bloquea el re-voto si vuelve a entrar)
      setHasVoted(true);
      trackBallotSubmitted(selectionCount);

      setCurrentStep(SUCCESS_STEP); // el hook limpia el progreso guardado
    } catch (error) {
      logger.error('Ballot Submit Error:', error);
      setErrorMessage(t('errorSavingVote'));
    } finally {
      setIsLoading(false);
    }
  };

  // ============ RENDERING ============
  // Toda la cascada de pantallas va dentro de renderScreen para poder
  // envolverla en un único AppProvider: idioma y tema dejan de viajar por
  // props (eran 4 props x 9 pantallas para dos valores globales).
  const renderScreen = () => {

    // Pantallas de carga: el mismo primitivo en los tres casos (antes eran tres
    // spinners escritos a mano, con colores distintos entre sí sin motivo).
    if (isLoadingAuth) return <LoadingSpinner text={t('loadingApp')} fullScreen />;
    if (categoriesLoading) return <LoadingSpinner text={t('loadingCategories')} fullScreen />;

    // Panel de Admin - Ruta oculta /admin (SIEMPRE accesible, incluso sin categorías).
    // Quién puede entrar lo decide AdminPanel (custom claim admin) y, en última
    // instancia, las reglas de Firestore.
    if (route === 'admin') {
      return (
        <Suspense fallback={
          <div className="min-h-screen theme-gradient-primary flex items-center justify-center">
            <div className="w-12 h-12 border-4 theme-border-primary border-t-blue-500 rounded-full animate-spin" />
          </div>
        }>
          <AdminPanel />
        </Suspense>
      );
    }

    // Sin categorías válidas todavía (el admin aún no las ha cargado).
    if (validCategories.length === 0) {
      return (
        <div className="min-h-screen theme-gradient-primary flex items-center justify-center p-4">
          <div className="text-center">
            <h1 className="text-2xl font-bold theme-text-primary mb-2">
              {t('noCategoriesAvailable')}
            </h1>
            <p className="theme-text-tertiary">{t('errorTryAgain')}</p>
          </div>
        </div>
      );
    }

    // Deadline alcanzado
    if (isDeadlineReached) {
      return <DeadlineScreen />;
    }

    // Comprobando en Firestore si el usuario ya votó (evita parpadeo)
    if (currentUser && !voteChecked && currentStep !== SUCCESS_STEP) {
      return <LoadingSpinner fullScreen />;
    }

    // Bloqueo de re-voto: si ya votó, mostrar pantalla de "ya has votado"
    // (salvo en la pantalla de éxito recién enviada, currentStep === 99)
    if (currentUser && hasVoted && currentStep !== SUCCESS_STEP) {
      return (
        <AlreadyVotedScreen
          userNickname={userDisplayName}
          onLogout={handleLogout}
        />
      );
    }

    // Pantalla de login
    if (currentStep === LOGIN_STEP || !currentUser) {
      return (
        <LoginScreen
          onLogin={handleLogin}
          isLoading={isSigningIn}
          errorMessage={authError}
          daysRemaining={daysRemaining}
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
                    onFinish={finishVoting}
          progressPercentage={progressPercentage}
        />
      );
    }

    // Pantalla de revisión - Solo si hay categorías válidas cargadas
    if (currentStep === reviewStep && validCategories.length > 0) {
      return (
        <ReviewScreen
          categories={validCategories}
          userVotes={userVotes}
          userDisplayName={userDisplayName}
          onDisplayNameChange={setUserDisplayName}
          onSubmit={submitBallot}
          onPrevious={goToPreviousStep}
          onReturnHome={handleReturnToHome}
          isLoading={isLoading}
          errorMessage={errorMessage}
        />
      );
    }

    // Pantalla de éxito
    if (currentStep === SUCCESS_STEP) {
      return (
        <SuccessScreen
          userNickname={userDisplayName}
          onLogout={handleLogout}
          onReturnHome={handleReturnToHome}
        />
      );
    }

    // Fallback - Si ninguna condición anterior se cumple, mostrar LoginScreen como último recurso
    return (
      <LoginScreen
        onLogin={handleLogin}
        isLoading={isSigningIn}
        errorMessage={authError}
        daysRemaining={daysRemaining}
      />
    );
  };

  return (
    <AppProvider
      language={language}
      onToggleLanguage={toggleLanguage}
      theme={theme}
      onToggleTheme={toggleTheme}
    >
      {renderScreen()}
    </AppProvider>
  );
}

export default App;
