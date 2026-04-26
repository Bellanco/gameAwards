/**
 * Internacionalización (i18n) - Español e Inglés
 * Sistema centralizado para manejar múltiples idiomas
 */

const translations = {
  es: {
    // Header
    appTitle: "THE GAME AWARDS",
    votingOpen: "La votación está abierta",
    
    // Login
    loginSubtitle: "Participa en la porra oficial de The Game Awards",
    loginBtn: "Inicia sesión con Google",
    daysRemaining: "días restantes",
    votingNowOpen: "La votación está abierta ahora",
    oneVote: "Un voto por persona",
    secureVoting: "Votación segura",
    
    // Votación
    categoryLabel: "Categoría",
    of: "de",
    yourSelection: "Tu selección:",
    chooseYourFavorite: "Elige tu favorito",
    voted: "Votado",
    pending: "Pendiente",
    previous: "Anterior",
    skip: "Saltar",
    next: "Siguiente",
    review: "Revisar",
    
    // Revisión
    reviewYourVotes: "Revisa tus votos",
    votesSelected: "votos seleccionados",
    yourSelections: "Tus selecciones",
    notSelected: "No seleccionado",
    completion: "Finalización",
    confirmBallot: "Confirma tu papeleta",
    yourName: "Tu nombre o apodo",
    enterYourName: "Ingresa tu nombre",
    fromYourGoogleProfile: "De tu perfil de Google",
    error: "Error",
    incompleteBallot: "Papeleta incompleta",
    categoriesPending: "categorías aún necesitan votos",
    categoryPending: "categoría aún necesita votos",
    submitting: "Enviando...",
    submitBallot: "Enviar papeleta",
    editVotes: "Editar votos",
    
    // Éxito
    ballotSubmitted: "Papeleta enviada",
    thankYou: "Gracias",
    voteSecurelyRecorded: "Tu voto ha sido registrado de forma segura",
    yourVoteSecure: "Tu voto es seguro",
    oneVotePerPerson: "Un voto por persona",
    resultsComingSoon: "Los resultados próximamente",
    confirmation: "Confirmación",
    yourVoteConfirmed: "Tu voto está confirmado.",
    willNotBeAbleToChange: "No podrás modificarlo.",
    checkBackDecember: "Regresa el 1 de diciembre para ver los ganadores de The Game Awards.",
    signOut: "Cerrar sesión",
    thankYouForVoting: "Gracias por votar en The Game Awards",
    officialsVotingPlatform: "La plataforma oficial de votación de The Game Awards",
    
    // Deadline
    votingClosed: "La votación ha cerrado",
    votingDeadlineMessage: "El plazo de votación para The Game Awards ha terminado",
    status: "Estado",
    closed: "Cerrado",
    noNewVotesAccepted: "No se aceptan nuevos votos en este momento. Las votaciones volverán a abrir en la próxima edición de The Game Awards.",
    results: "Resultados",
    resultsWillBeShown: "Se conocerán durante la ceremonia",
    nextEdition: "Próxima edición",
    decemberNextYear: "Diciembre del próximo año",
    stayTuned: "Mantente atento",
    weWillNotifyYou: "Te notificaremos cuando abra nuevamente",
    thankYouForInterest: "Gracias por tu interés en The Game Awards. ¡Acompáñanos el día de la ceremonia para conocer los resultados!",
    backToStart: "Volver al inicio",
    
    // Admin Panel
    adminPanel: "Panel de administración",
    ballotResults: "Resultados de la papeleta",
    overview: "Resumen",
    winners: "Ganadores",
    allBallots: "Todas las papeletas",
    totalBallots: "Papeletas totales",
    categories: "Categorías",
    participation: "Participación",
    resultsByCategory: "Resultados por categoría",
    downloadJSON: "Descargar JSON",
    downloadCSV: "Descargar CSV",
    theWinners: "Los ganadores",
    winner: "Ganador",
    votes: "votos",
    top3: "Top 3",
    selectACategory: "Selecciona una categoría",
    summary: "Resumen",
    totalVotes: "Votos totales",
    selected: "Seleccionado",
    userId: "ID de usuario",
    email: "Correo",
    nickname: "Apodo",
    submitted: "Enviado",
    accessDenied: "Acceso denegado",
    mustBeLoggedIn: "Debes haber iniciado sesión para acceder al panel de administración",
    unauthorized: "No autorizado",
    onlyForAdministrators: "Este panel es solo para administradores",
    loadingData: "Cargando datos...",
  },
  en: {
    // Header
    appTitle: "THE GAME AWARDS",
    votingOpen: "Voting is now open",
    
    // Login
    loginSubtitle: "Join the official The Game Awards voting",
    loginBtn: "Sign in with Google",
    daysRemaining: "days remaining",
    votingNowOpen: "Voting is open now",
    oneVote: "One vote per person",
    secureVoting: "Secure voting",
    
    // Votación
    categoryLabel: "Category",
    of: "of",
    yourSelection: "You selected:",
    chooseYourFavorite: "Choose your favorite",
    voted: "Voted",
    pending: "Pending",
    previous: "Previous",
    skip: "Skip",
    next: "Next",
    review: "Review",
    
    // Revisión
    reviewYourVotes: "Review Your Votes",
    votesSelected: "votes selected",
    yourSelections: "Your Selections",
    notSelected: "Not selected",
    completion: "Completion",
    confirmBallot: "Confirm Your Ballot",
    yourName: "Your Name/Nickname",
    enterYourName: "Enter your name",
    fromYourGoogleProfile: "From your Google profile",
    error: "Error",
    incompleteBallot: "Incomplete Ballot",
    categoriesPending: "categories still need votes",
    categoryPending: "category still needs votes",
    submitting: "Submitting...",
    submitBallot: "Submit Ballot",
    editVotes: "Edit Votes",
    
    // Éxito
    ballotSubmitted: "Ballot Submitted",
    thankYou: "Thank you",
    voteSecurelyRecorded: "Your vote has been securely recorded",
    yourVoteSecure: "Your vote is secure",
    oneVotePerPerson: "One vote per person",
    resultsComingSoon: "Results coming soon",
    confirmation: "Confirmation",
    yourVoteConfirmed: "Your vote is confirmed.",
    willNotBeAbleToChange: "You will not be able to change it.",
    checkBackDecember: "Check back on December 1st to see who wins The Game Awards.",
    signOut: "Sign Out",
    thankYouForVoting: "Thank you for voting in The Game Awards",
    officialsVotingPlatform: "The official voting platform for The Game Awards",
    
    // Deadline
    votingClosed: "Voting is closed",
    votingDeadlineMessage: "The voting deadline for The Game Awards has ended",
    status: "Status",
    closed: "Closed",
    noNewVotesAccepted: "No new votes are accepted at this time. Voting will reopen for the next edition of The Game Awards.",
    results: "Results",
    resultsWillBeShown: "Will be announced during the ceremony",
    nextEdition: "Next edition",
    decemberNextYear: "December next year",
    stayTuned: "Stay tuned",
    weWillNotifyYou: "We will notify you when it opens again",
    thankYouForInterest: "Thank you for your interest in The Game Awards. Join us on the day of the ceremony to find out the results!",
    backToStart: "Back to start",
    
    // Admin Panel
    adminPanel: "Admin Panel",
    ballotResults: "Ballot Results",
    overview: "Overview",
    winners: "Winners",
    allBallots: "All Ballots",
    totalBallots: "Total Ballots",
    categories: "Categories",
    participation: "Participation",
    resultsByCategory: "Results by Category",
    downloadJSON: "Download JSON",
    downloadCSV: "Download CSV",
    theWinners: "The Winners",
    winner: "Winner",
    votes: "votes",
    top3: "Top 3",
    selectACategory: "Select a category",
    summary: "Summary",
    totalVotes: "Total Votes",
    selected: "Selected",
    userId: "User ID",
    email: "Email",
    nickname: "Nickname",
    submitted: "Submitted",
    accessDenied: "Access Denied",
    mustBeLoggedIn: "You must be logged in to access the admin panel",
    unauthorized: "Unauthorized",
    onlyForAdministrators: "This panel is only for administrators",
    loadingData: "Loading data...",
  }
};

/**
 * Hook para obtener textos en el idioma actual
 * Uso: const t = useTranslation(language)
 *      t('loginBtn')
 */
export const useTranslation = (language = 'es') => {
  return (key) => translations[language]?.[key] || key;
};

/**
 * Obtener todos los textos en un idioma
 */
export const getTranslations = (language = 'es') => {
  return translations[language] || translations.es;
};

/**
 * Retrocompatibilidad - appText por defecto
 */
export const appText = translations.es;
