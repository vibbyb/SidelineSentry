// English and Spanish translations for SidelineSentry

import { REPORT_AND_FLOW_TRANSLATIONS } from './reportTranslations';

export type SupportedLocale = 'en' | 'es';

export const TRANSLATIONS = {
  en: {
    ...REPORT_AND_FLOW_TRANSLATIONS.en,
    // Header & Navigation
    appTitle: 'SidelineSentry',
    appSubtitle: 'High School Sideline Concussion Safety Check',
    offlineBadge: 'Works offline',
    simProfileHealthy: 'Healthy',
    simProfileConcussed: 'Concussed',
    simulateDemo: 'Simulate Demo',
    languageToggle: 'Español',
    tabAthletes: 'Athletes',
    tabQuickTest: 'Checkup',
    tabReports: 'Reports',

    // Roster
    rosterTitle: 'Athletic Roster & Sideline Safety Check',
    rosterSubtitle: 'Select an athlete to start an immediate 4-step sideline safety check.',
    searchPlaceholder: 'Search athlete, jersey #...',
    addAthlete: 'Add Athlete Baseline',
    initiateTriage: 'Start Sideline Check',
    historyCount: 'History',
    noHistory: 'No Prior Incidents',
    swayRms: 'Balance Sway',
    reaction: 'Reaction',
    kdClock: 'Reading Test',

    // Stepper
    stepRedFlags: 'Test 1: Emergency Check',
    stepBalance: 'Test 2: Balance Test',
    stepReaction: 'Test 3: Reaction Test',
    stepKingDevick: 'Test 4: Reading Test',
    cancelScreening: 'Cancel Check',

    // Red Flags Checklist (Test 1)
    redFlagsTitle: 'Test 1: Emergency Warning Signs',
    redFlagsDesc: 'If the athlete has any of these serious signs, do not do any physical tests. Keep them still and get medical help or call 911 right away.',
    emergencyTriggered: 'Emergency Warning',
    emergencyLockdownWarning: 'Emergency stop: The athlete showed a serious warning sign. Keep them still, do not let them play, and call for medical help immediately.',
    call911: 'Call 911 / Get Help',
    lockdownProceed: 'Open Emergency Report',
    proceedToBalance: 'Continue to Test 2 (Balance)',

    // Quick Memory Questions (SCAT6 Maddock's)
    maddocksTitle: 'Quick Memory Questions',
    maddocksDesc: 'Ask the athlete these 3 simple questions to check if they are disoriented.',
    maddocksVenue: 'Where are we playing today?',
    maddocksVenueDesc: 'Do they know the field or gym location?',
    maddocksPeriod: 'What quarter, half, or period is it right now?',
    maddocksPeriodDesc: 'Do they know the game clock or period?',
    maddocksScore: 'Who scored last or who did we play last week?',
    maddocksScoreDesc: 'Can they recall recent game events?',
    maddocksPass: 'Got it right',
    maddocksFail: 'Got it wrong',

    // Red Flag Items (Plain everyday words)
    flag_lossOfConsciousness: 'Passed out or blacked out',
    flag_lossOfConsciousness_desc: 'Even if it was just for a second',
    flag_neckPain: 'Bad neck pain or tenderness',
    flag_neckPain_desc: 'Neck hurts or feels sore to touch',
    flag_deterioratingConsciousState: 'Getting drowsier or hard to wake up',
    flag_deterioratingConsciousState_desc: 'Trouble staying awake or answering questions',
    flag_vomitingRepeated: 'Threw up more than once',
    flag_vomitingRepeated_desc: 'Vomiting multiple times',
    flag_severeOrIncreasingHeadache: 'Headache that is quickly getting worse',
    flag_severeOrIncreasingHeadache_desc: 'Head pain is rapidly building up',
    flag_seizureOrConvulsion: 'Seizure or shaking uncontrollably',
    flag_seizureOrConvulsion_desc: 'Twitching or arms/legs shaking',
    flag_doubleVision: 'Double vision or everything looks very blurry',
    flag_doubleVision_desc: 'Seeing two of things or severe blur',
    flag_weaknessOrTingling: 'Numbness or tingling in arms or legs',
    flag_weaknessOrTingling_desc: 'Pins-and-needles or unable to move limbs',
    flag_increasingConfusion: 'Very confused, restless, or acting strange',
    flag_increasingConfusion_desc: 'Does not know what is going on',

    // Balance Test (Test 2)
    balanceTitle: 'Test 2: Balance Test',
    balanceSubtitle: '15-Second Balance Stance',
    balanceInstruction: 'Have the athlete stand straight with feet together, hands on hips, and eyes closed. Hold the phone flat against their chest. Listen for the sound cues.',
    startBalanceTest: 'Start 15-Second Test',
    timeRemaining: 'Time Remaining',
    liveStability: 'Live Stability',
    simulatePerturbation: 'Simulate Loss of Balance (Movement Spike)',
    motionSpikeDetected: 'Sudden Movement Detected - Stance Restarted',
    motionSpikeDesc: 'The phone slipped or moved too quickly. Let us restart this 15-second balance test.',
    retestStance: 'Restart Balance Test',

    // Reaction Test (Test 3)
    reactionTitle: 'Test 3: Reaction Test',
    reactionSubtitle: 'Tap the screen as soon as it turns green',
    waitForGreen: 'Wait for green...',
    tapNow: 'Tap now',
    startTrial: 'Start Trial',
    nextTrial: 'Start Next Trial',

    // Reading Test (Test 4)
    kdTitle: 'Test 4: Reading Test',
    kdSubtitle: 'Read the numbers out loud as fast as you can',
    startKdClock: 'Start Reading Test',
    nextPlate: 'Next Card',
    finishTest: 'Finish Test',
    errorsLabel: 'Mistakes:',

    // Verdict HUD (Actionable, Non-Diagnostic Recommendations)
    verdictRemoval: 'SIT THEM OUT (DO NOT RETURN TODAY)',
    verdictCaution: 'NEEDS FURTHER CHECKUP',
    verdictClear: 'SCORES LOOK NORMAL',
    verdictInvalid: 'Test was interrupted (try again)',
    verdictRemovalDesc: 'The athlete showed serious warning signs or noticeable score drops. Keep them out of sports today and have a doctor or athletic trainer evaluate them.',
    verdictCautionDesc: 'Scores were slightly off from their baseline. Wait 15 minutes, re-test, and have an athletic trainer check them before making any return decision.',
    verdictClearDesc: 'Post-impact scores matched their preseason baseline. Continue watching the athlete for any delayed headaches, dizziness, or confusion.',
    verdictInvalidDesc: 'The test was tapped too early or the phone slipped. Please re-run the test to get clean scores.',
    normativePriorApplied: 'No Preseason Baseline On File',
    returnRoster: 'Back to Team Roster',
    retestBtn: 'Re-Run Safety Check',
    generatePacket: 'Open Doctor & Parent Report',

    // Clinician & Parent Report
    packetTitle: 'Sideline Summary & Doctor Report',
    copyText: 'Copy Summary',
    copied: 'Copied',
    printPdf: 'Print / Save PDF',
    exportJson: 'Export JSON',
    evaluatorNotes: 'Notes & What Happened on the Field',
    certBlockTitle: 'Trainer / Coach Sign-Off',
    evaluatorName: 'Trainer / Coach Full Name',
    evaluatorRole: 'Role (Athletic Trainer, Coach, Nurse)',
    licenseNumber: 'School / Certification ID #',
    signatureLabel: 'Sign on Screen',
    clearSig: 'Clear Signature',
    sessionHash: 'Report check code',
    parentInstructionsTitle: 'Important Instructions for Parents & Caregivers',
    parentInstructionsText: 'If your child has a worsening headache, throws up, or acts confused, take them to the Emergency Room right away. Do not let them return to sports or hard workouts until cleared by a doctor.'
  },
  es: {
    ...REPORT_AND_FLOW_TRANSLATIONS.es,
    // Header & Navigation
    appTitle: 'SidelineSentry',
    appSubtitle: 'Chequeo de Campo para Conmoción Cerebral',
    offlineBadge: 'Funciona sin conexión',
    simProfileHealthy: 'Saludable',
    simProfileConcussed: 'Conmocionado',
    simulateDemo: 'Simular Demostración',
    languageToggle: 'English',
    tabAthletes: 'Atletas',
    tabQuickTest: 'Chequeo',
    tabReports: 'Reportes',

    // Roster
    rosterTitle: 'Lista de Atletas y Chequeo de Campo',
    rosterSubtitle: 'Seleccione un atleta para iniciar una evaluación de seguridad de 4 pasos.',
    searchPlaceholder: 'Buscar atleta, número de camiseta...',
    addAthlete: 'Agregar Línea Base de Atleta',
    initiateTriage: 'Iniciar Chequeo de Campo',
    historyCount: 'Historial',
    noHistory: 'Sin Incidentes Previos',
    swayRms: 'Puntaje de Balance',
    reaction: 'Reacción',
    kdClock: 'Prueba de Lectura',

    // Stepper
    stepRedFlags: 'Prueba 1: Señales de Alarma',
    stepBalance: 'Prueba 2: Equilibrio',
    stepReaction: 'Prueba 3: Reacción',
    stepKingDevick: 'Prueba 4: Lectura',
    cancelScreening: 'Cancelar Chequeo',

    // Red Flags Checklist (Test 1)
    redFlagsTitle: 'Prueba 1: Señales de Alarma de Emergencia',
    redFlagsDesc: 'Si el atleta presenta alguna de estas señales graves, no haga pruebas físicas. Manténgalo quieto y llame al 911 o busque ayuda médica de inmediato.',
    emergencyTriggered: 'Alerta de emergencia',
    emergencyLockdownWarning: 'Parada de emergencia: El atleta mostró una señal de alarma grave. Manténgalo quieto, no lo deje jugar y busque atención médica de inmediato.',
    call911: 'Llamar al 911 / Pedir Ayuda',
    lockdownProceed: 'Abrir Informe de Emergencia',
    proceedToBalance: 'Continuar a Prueba 2 (Equilibrio)',

    // Quick Memory Questions (SCAT6 Maddock's)
    maddocksTitle: 'Preguntas Rápidas de Memoria',
    maddocksDesc: 'Haga estas 3 preguntas sencillas al atleta para comprobar si está desorientado.',
    maddocksVenue: '¿En qué campo o cancha estamos jugando hoy?',
    maddocksVenueDesc: '¿Sabe en qué lugar o escuela se encuentra?',
    maddocksPeriod: '¿En qué tiempo, cuarto o período estamos ahora?',
    maddocksPeriodDesc: '¿Conoce el tiempo o período del juego?',
    maddocksScore: '¿Quién anotó el último punto o contra quién jugamos la semana pasada?',
    maddocksScoreDesc: '¿Recuerda jugadas o partidos recientes?',
    maddocksPass: 'Respondió bien',
    maddocksFail: 'Respondió mal',

    // Red Flag Items (Plain everyday words)
    flag_lossOfConsciousness: 'Se desmayó o perdió el conocimiento',
    flag_lossOfConsciousness_desc: 'Incluso si fue por un solo segundo',
    flag_neckPain: 'Dolor fuerte en el cuello o sensibilidad',
    flag_neckPain_desc: 'El cuello duele o molesta al tacto',
    flag_deterioratingConsciousState: 'Cada vez más somnoliento o difícil de despertar',
    flag_deterioratingConsciousState_desc: 'Cuesta mantenerlo despierto o que responda',
    flag_vomitingRepeated: 'Vomitó más de una vez',
    flag_vomitingRepeated_desc: 'Vómitos continuos o repetidos',
    flag_severeOrIncreasingHeadache: 'Dolor de cabeza que empeora rápidamente',
    flag_severeOrIncreasingHeadache_desc: 'El dolor aumenta con rapidez',
    flag_seizureOrConvulsion: 'Convulsión o temblores incontrolables',
    flag_seizureOrConvulsion_desc: 'Espasmos o sacudidas en brazos o piernas',
    flag_doubleVision: 'Visión doble o todo se ve muy borroso',
    flag_doubleVision_desc: 'Ve doble o no puede enfocar bien',
    flag_weaknessOrTingling: 'Entumecimiento o cosquilleo en brazos o piernas',
    flag_weaknessOrTingling_desc: 'Sensación de hormigueo o debilidad al moverse',
    flag_increasingConfusion: 'Muy confundido, agitado o actuando extraño',
    flag_increasingConfusion_desc: 'No comprende lo que está sucediendo',

    // Balance Test (Test 2)
    balanceTitle: 'Prueba 2: Prueba de Equilibrio',
    balanceSubtitle: 'Prueba de 15 Segundos',
    balanceInstruction: 'Coloque al atleta de pie con pies juntos, manos en caderas y ojos cerrados. Mantenga el teléfono plano sobre el pecho. Escuche las señales de sonido.',
    startBalanceTest: 'Iniciar prueba de 15 segundos',
    timeRemaining: 'Tiempo Restante',
    liveStability: 'Estabilidad en Vivo',
    simulatePerturbation: 'Simular Pérdida de Equilibrio (Pico de Movimiento)',
    motionSpikeDetected: 'Movimiento Brusco Detectado - Prueba Reiniciada',
    motionSpikeDesc: 'El teléfono resbaló o se movió demasiado rápido. Reiniciemos esta prueba de 15 segundos.',
    retestStance: 'Reiniciar Prueba de Equilibrio',

    // Reaction Test (Test 3)
    reactionTitle: 'Prueba 3: Prueba de Reacción',
    reactionSubtitle: 'Toque la pantalla en cuanto cambie a color verde',
    waitForGreen: 'Espere la luz verde...',
    tapNow: 'Toque ahora',
    startTrial: 'Iniciar Intento',
    nextTrial: 'Iniciar Siguiente Intento',

    // Reading Test (Test 4)
    kdTitle: 'Prueba 4: Prueba de Lectura',
    kdSubtitle: 'Lea los números en voz alta tan rápido como pueda',
    startKdClock: 'Iniciar Prueba de Lectura',
    nextPlate: 'Siguiente Tarjeta',
    finishTest: 'Finalizar Prueba',
    errorsLabel: 'Errores:',

    // Verdict HUD (Actionable, Non-Diagnostic Recommendations)
    verdictRemoval: 'DEBE SALIR DEL JUEGO (NO JUGAR HOY)',
    verdictCaution: 'NECESITA REVISIÓN ADICIONAL',
    verdictClear: 'LOS RESULTADOS SE VEN NORMALES',
    verdictInvalid: 'Prueba interrumpida (repetir)',
    verdictRemovalDesc: 'El atleta mostró señales de alarma o cambios notorios en sus puntajes. No debe regresar a jugar hoy y debe ser evaluado por un médico o entrenador deportivo.',
    verdictCautionDesc: 'Los puntajes variaron ligeramente de su línea base. Espere 15 minutos, repita la prueba y consulte a un entrenador antes de cualquier decisión.',
    verdictClearDesc: 'Los puntajes coincidieron con su línea base de pretemporada. Continúe observando si aparecen dolores de cabeza o mareos más tarde.',
    verdictInvalidDesc: 'El teléfono resbaló o se tocó la pantalla antes de tiempo. Por favor repita la prueba para obtener resultados limpios.',
    normativePriorApplied: 'Sin Línea Base Previa',
    returnRoster: 'Volver a Lista de Atletas',
    retestBtn: 'Repetir Chequeo',
    generatePacket: 'Abrir Informe para Médicos y Padres',

    // Clinician & Parent Report
    packetTitle: 'Resumen de Campo e Informe Médico',
    copyText: 'Copiar Resumen',
    copied: 'Copiado',
    printPdf: 'Imprimir / Guardar PDF',
    exportJson: 'Exportar JSON',
    evaluatorNotes: 'Notas y lo que ocurrió en el campo',
    certBlockTitle: 'Firma del Entrenador / Evaluador',
    evaluatorName: 'Nombre Completo del Entrenador / Evaluador',
    evaluatorRole: 'Rol (Entrenador Deportivo, Coach, Enfermera)',
    licenseNumber: 'ID de Escuela / Certificación #',
    signatureLabel: 'Firme en Pantalla',
    clearSig: 'Borrar Firma',
    sessionHash: 'Código de verificación del reporte',
    parentInstructionsTitle: 'Instrucciones Importantes para Padres y Cuidadores',
    parentInstructionsText: 'Si su hijo presenta dolor de cabeza que empeora, vómitos repetidos o confusión, llévelo de inmediato a Urgencias. No permita que regrese a entrenar hasta que un médico lo autorice.'
  }
} as const;

export type TranslationKey = keyof typeof TRANSLATIONS.en;
