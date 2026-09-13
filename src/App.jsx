import React, { useState, useEffect, useMemo, useCallback, useRef, lazy, Suspense } from 'react';
import { auth } from './firebase';
import { useTranslation } from './data/literals';
import { loadAndSortCategories } from './services/categoriesService';
import { useTheme, useVotingConfig, useVotingFlow, useAuthSession, useSeasonResult } from './hooks';
import logger from './services/loggerService';
import { hasTitle, getCategoryTitle, selectionsToVotes } from './utils/localize';
import { resolveRoute, FALLBACK_ROUTE } from './utils/routes';
import {
  isVotingOpenNow,
  areResultsPublished,
  getVotingState,
  daysUntil,
  VOTING_STATE,
} from './utils/votingSchedule';
import { AppProvider } from './context/AppContext';
import { LoadingSpinner } from './components/ui';
import { LOGIN_STEP, SUCCESS_STEP } from './hooks/useVotingFlow';
import { sanitizeUserText } from './utils/sanitize';
import { submitBallot as submitVote } from './services/ballotService';
import { trackBallotSubmitted, trackLanguageChanged } from './services/analyticsService';
import { getRemainingEdits, canEditBallot } from './utils/ballotEdits';

// Componentes modulares
import VoteScreen from './components/VoteScreen';
import ReviewScreen from './components/ReviewScreen';
import LoginScreen from './components/LoginScreen';
import SuccessScreen from './components/SuccessScreen';
import DeadlineScreen from './components/DeadlineScreen';
import ResultsScreen from './components/ResultsScreen';
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
  // El calendario (apertura / cierre / resultados) lo fija el admin en la
  // pestaña Temporada; aquí solo se interpreta (ver utils/votingSchedule.js).
  const votingConfig = useVotingConfig();
  const { season, isLoading: configLoading } = votingConfig;

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

  // ============ Ruta actual ============
  // Se declara aquí arriba porque la leen los hooks del flujo. Solo hay dos
  // rutas declaradas ('/' y '/admin'); cualquier otra cosa rebota a la
  // principal, reescribiendo la URL sin dejar entrada en el historial.
  const route = resolveRoute(window.location.pathname);

  // ============ Datos del Usuario ============
  // `userDisplayName` es el ÚNICO nombre editable y la única fuente de verdad de
  // la UI. El nombre de la cuenta de Google se lee de `currentUser` al enviar,
  // nunca de estado: antes vivía en un `userNickname` que `handleReturnToHome`
  // vaciaba sin que ninguna pantalla ofreciera forma de rellenarlo, y eso dejaba
  // el envío bloqueado para siempre.
  const [userDisplayName, setUserDisplayName] = useState('');

  // ============ Sesión y flujo: cómo se rompe la dependencia circular ========
  //
  // `useAuthSession` necesita el callback de "sesión confirmada", que restaura
  // el progreso guardado (`restoreProgress`, de `useVotingFlow`); y
  // `useVotingFlow` necesita saber si hay sesión (`currentUser`, de
  // `useAuthSession`). Uno de los dos tiene que ir primero.
  //
  // Se resuelve con un ref: el callback es estable y llama a la última versión
  // de `restoreProgress` a través de él. Así `useAuthSession` puede declararse
  // antes. ANTES esto estaba al revés —`useVotingFlow` leía `currentUser` y
  // `route` varias líneas por encima de donde se declaran— y el primer render
  // reventaba con «Cannot access 'currentUser' before initialization».
  const restoreProgressRef = useRef(null);

  /** Al confirmarse la sesión: nombre inicial y progreso guardado. */
  const handleSignedIn = useCallback((user) => {
    setUserDisplayName(user.displayName || '');
    restoreProgressRef.current?.();
  }, []);

  // ============ Sesión, login y voto ya emitido ============
  const {
    currentUser,
    isLoadingAuth,
    isSigningIn,
    authError,
    setAuthError,
    hasVoted,
    existingBallot,
    setExistingBallot,
    voteChecked,
    signIn,
    signOut: signOutUser,
  } = useAuthSession(t, handleSignedIn);

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
    loadVotes,
    progressPercentage,
    reviewStep,
  } = useVotingFlow({
    validCategories,
    hasSession: Boolean(currentUser),
    historyEnabled: route === 'home',
  });


  // El callback de sesión usa esta función a través del ref (ver arriba).
  useEffect(() => {
    restoreProgressRef.current = restoreProgress;
  }, [restoreProgress]);

  // ============ Edición del propio voto ============
  // El voto se puede corregir hasta la fecha de cierre, con un tope de
  // MAX_BALLOT_EDITS cambios que cuenta el servidor (ver utils/ballotEdits.js).
  // `isEditingBallot` solo dice si el usuario está ahora mismo dentro del flujo
  // corrigiendo: es lo que le deja pasar de la pantalla de "ya has votado".
  const [isEditingBallot, setIsEditingBallot] = useState(false);
  const remainingEdits = getRemainingEdits(existingBallot);
  const canEditVote = canEditBallot(existingBallot, votingConfig);


  // ============ Control de Deadline ============
  // La votación está abierta si estamos dentro de la ventana de fechas y el
  // admin no ha forzado el cierre. Las fechas mandan: `isOpen: true` no abre
  // fuera de plazo (misma regla que firestore.rules).
  const isDeadlineReached = !configLoading && !isVotingOpenNow(votingConfig);
  const votingState = getVotingState(votingConfig);
  // Días restantes informativos, derivados del cierre si el admin lo configuró.
  const daysRemaining = daysUntil(votingConfig.closesAtMillis);

  // ============ Resultados de la última edición ============
  // Se muestran cuando el admin PUBLICA la edición (que es archivarla): ahí se
  // apunta su id en `config/voting.lastPublishedId`. El archivo vive en
  // `results/{id}` y se resuelve con una sola lectura por id, sin listar la
  // colección: las reglas solo dejan leer lo ya archivado y una consulta que
  // tope con un documento prohibido falla entera.
  //
  // HACE FALTA SESIÓN: la clasificación lleva el nombre de cada participante, y
  // esa lista no tiene por qué estar en internet abierto (misma regla en
  // firestore.rules). Sin sesión no se pide siquiera: las reglas la rechazarían.
  //
  // Una edición ABIERTA manda sobre esto: mientras se puede votar, se vota; los
  // resultados de la anterior vuelven a la vista cuando la nueva termina.
  const showResults =
    !configLoading && areResultsPublished(votingConfig) && !isVotingOpenNow(votingConfig);
  const { result: seasonResult, isLoading: seasonResultLoading } = useSeasonResult(
    votingConfig.lastPublishedId,
    showResults && Boolean(currentUser)
  );

  // ============ Estado de UI ============
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

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
    setIsEditingBallot(false);
    clearProgress();
  };

  /**
   * Volver al inicio sin cerrar sesión (limpia votos pero mantiene sesión)
   */
  const handleReturnToHome = () => {
    setCurrentStep(LOGIN_STEP); // Volver a login
    setIsEditingBallot(false);
    clearProgress(); // Olvidar votos y progreso recordado
    // El nombre vuelve al de la cuenta de Google, NO a vacío: la sesión sigue
    // abierta y ReviewScreen debe encontrar un nombre válido al volver a entrar.
    setUserDisplayName(auth.currentUser?.displayName || '');
    setErrorMessage('');
    setAuthError('');
  };

  /**
   * Corregir el voto ya emitido: carga las selecciones guardadas en el flujo y
   * entra por la pantalla de revisión, desde donde se puede saltar a cualquier
   * categoría. Los votos vienen de Firestore (por optionId) y se reconstruyen
   * con los nombres actuales de los nominados.
   */
  const handleEditBallot = () => {
    if (!canEditVote) return;
    loadVotes(selectionsToVotes(existingBallot.selections, validCategories, language));
    setUserDisplayName(existingBallot.userDisplayName || auth.currentUser?.displayName || '');
    setErrorMessage('');
    setIsEditingBallot(true);
    setCurrentStep(reviewStep);
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

      const { selectionCount, ballot } = await submitVote({
        currentUser,
        userVotes,
        displayName,
        season,
        // Al corregir, el servicio conserva la fecha del primer envío y avanza
        // el contador de ediciones; las reglas rechazan cualquier otra cosa.
        existingBallot: isEditingBallot ? existingBallot : null,
      });

      // El documento recién escrito pasa a ser el voto conocido: bloquea el
      // re-voto y deja al día cuántas correcciones quedan, sin releer Firestore.
      setExistingBallot(ballot);
      setIsEditingBallot(false);
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

    // Resultados de la última edición publicada: mandan sobre el resto del flujo
    // SALVO que haya otra edición abierta, en cuyo caso lo que toca es votar.
    //
    // Exigen sesión, así que quien llegue sin ella pasa antes por el login (con
    // el mensaje de «entra para ver los resultados», no el de votar). Si el
    // archivo no existe, se sigue a la cascada normal.
    if (showResults) {
      if (!currentUser) {
        return (
          <LoginScreen
            onLogin={handleLogin}
            isLoading={isSigningIn}
            errorMessage={authError}
            daysRemaining={null}
            purpose="results"
          />
        );
      }
      if (seasonResultLoading) return <LoadingSpinner fullScreen />;
      if (seasonResult) {
        return <ResultsScreen result={seasonResult} currentUserId={currentUser.uid} />;
      }
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

    // Fuera de plazo: o aún no ha abierto (programada) o ya cerró.
    if (isDeadlineReached) {
      return (
        <DeadlineScreen
          isScheduled={votingState === VOTING_STATE.SCHEDULED}
          opensAt={votingConfig.opensAt}
          resultsAt={votingConfig.resultsAt}
        />
      );
    }

    // Comprobando en Firestore si el usuario ya votó (evita parpadeo)
    if (currentUser && !voteChecked && currentStep !== SUCCESS_STEP) {
      return <LoadingSpinner fullScreen />;
    }

    // Bloqueo de re-voto: si ya votó, mostrar pantalla de "ya has votado"
    // (salvo en la pantalla de éxito recién enviada, o si está corrigiendo).
    if (currentUser && hasVoted && !isEditingBallot && currentStep !== SUCCESS_STEP) {
      return (
        <AlreadyVotedScreen
          userNickname={userDisplayName}
          onLogout={handleLogout}
          canEdit={canEditVote}
          remainingEdits={remainingEdits}
          onEdit={handleEditBallot}
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
          isEditing={isEditingBallot}
          remainingEdits={remainingEdits}
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
          canEdit={canEditVote}
          remainingEdits={remainingEdits}
          onEdit={handleEditBallot}
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
