// Text strings for parent share summaries and high-contrast sunlight mode.
// Kept in plain, helpful language for coaches, athletic trainers, and parents.

import { SupportedLocale } from './translations';

export interface ShareThemeStrings {
  shareWithParentBtn: string;
  shareSuccessToast: string;
  shareTitle: string;
  shareModalTitle: string;
  manualShareTitle: string;
  manualShareHelp: string;
  closeManualShare: string;
  copyAll: string;
  copied: string;
  demoBaselineDisabled: string;
  parentSummaryHeader: string;
  athleteLabel: string;
  sportLabel: string;
  dateLabel: string;
  recommendationLabel: string;
  recSitOut: string;
  recCheckup: string;
  recNormal: string;
  warningSignsLabel: string;
  noWarningSigns: string;
  scoresVsBaselineLabel: string;
  balanceLabel: string;
  reactionLabel: string;
  readingLabel: string;
  baselineLabel: string;
  skipped: string;
  cdcReminder: string;
  medicalDisclaimer: string;
  sunlightToggle: string;
  sunlightAria: string;
  sunlightTitle: string;
}

export const SHARE_THEME_TEXT: Record<SupportedLocale, ShareThemeStrings> = {
  en: {
    shareWithParentBtn: 'Share with Parent',
    shareSuccessToast: 'Summary copied. Paste it into a text message or email.',
    shareTitle: 'Sideline Safety Summary',
    shareModalTitle: 'Share with Parent',
    manualShareTitle: 'Copy Parent Summary',
    manualShareHelp: 'Your device cannot open the share menu directly. Select and copy the text below to paste it into a text message or email.',
    closeManualShare: 'Close',
    copyAll: 'Copy Summary',
    copied: 'Copied',

    demoBaselineDisabled: 'Demo checks cannot overwrite preseason baselines.',

    parentSummaryHeader: 'SIDELINESENTRY SIDELINE CHECK SUMMARY',
    athleteLabel: 'Athlete',
    sportLabel: 'Sport',
    dateLabel: 'Date and Time',
    recommendationLabel: 'Recommendation',
    recSitOut: 'SIT THEM OUT',
    recCheckup: 'NEEDS FURTHER CHECKUP',
    recNormal: 'SCORES LOOK NORMAL',
    warningSignsLabel: 'Observed Warning Signs',
    noWarningSigns: 'None observed',
    scoresVsBaselineLabel: 'Scores vs Preseason Baseline',
    balanceLabel: 'Balance Test',
    reactionLabel: 'Reaction Test',
    readingLabel: 'Reading Test',
    baselineLabel: 'Baseline',
    skipped: 'Skipped',
    cdcReminder: 'CDC Reminder: "When in doubt, sit them out."',
    medicalDisclaimer: 'Medical Disclaimer: SidelineSentry is an observational screening tool based on CDC HEADS UP guidelines, not a medical diagnosis. Any athlete with a suspected head injury should be evaluated by a qualified doctor or healthcare professional.',

    sunlightToggle: 'Sunlight',
    sunlightAria: 'Toggle high-contrast sunlight mode for outdoor field glare',
    sunlightTitle: 'Sunlight mode (high contrast for outdoor field glare)'
  },
  es: {
    shareWithParentBtn: 'Compartir con los padres',
    shareSuccessToast: 'Resumen copiado. Péguelo en un mensaje de texto o correo electrónico.',
    shareTitle: 'Resumen de seguridad de campo',
    shareModalTitle: 'Compartir con los padres',
    manualShareTitle: 'Copiar resumen para los padres',
    manualShareHelp: 'Su dispositivo no puede abrir el menú para compartir directamente. Seleccione y copie el texto a continuación para pegarlo en un mensaje o correo.',
    closeManualShare: 'Cerrar',
    copyAll: 'Copiar resumen',
    copied: 'Copiado',

    demoBaselineDisabled: 'Las revisiones de prueba no pueden sobrescribir las líneas base de pretemporada.',

    parentSummaryHeader: 'RESUMEN DE REVISIÓN DE CAMPO SIDELINESENTRY',
    athleteLabel: 'Atleta',
    sportLabel: 'Deporte',
    dateLabel: 'Fecha y hora',
    recommendationLabel: 'Recomendación',
    recSitOut: 'RETIRAR DEL JUEGO',
    recCheckup: 'REQUIERE REVISIÓN MÉDICA',
    recNormal: 'PUNTAJES DENTRO DE LO NORMAL',
    warningSignsLabel: 'Señales de advertencia observadas',
    noWarningSigns: 'Ninguna observada',
    scoresVsBaselineLabel: 'Puntajes frente a la línea base de pretemporada',
    balanceLabel: 'Prueba de equilibrio',
    reactionLabel: 'Prueba de reacción',
    readingLabel: 'Prueba de lectura',
    baselineLabel: 'Línea base',
    skipped: 'Omitida',
    cdcReminder: 'Recordatorio de los CDC: "When in doubt, sit them out" (Ante la duda, déjelos fuera).',
    medicalDisclaimer: 'Aviso médico: SidelineSentry es una herramienta de detección basada en las pautas de CDC HEADS UP, no un diagnóstico médico. Cualquier atleta con sospecha de golpe en la cabeza debe ser evaluado por un médico calificado.',

    sunlightToggle: 'Sol',
    sunlightAria: 'Alternar modo de luz solar de alto contraste para el reflejo al aire libre',
    sunlightTitle: 'Modo de luz solar (alto contraste para el campo al aire libre)'
  }
};
