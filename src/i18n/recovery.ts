// Internationalization strings for SidelineSentry Concussion Recovery
// Plain English and natural Spanish for coaches, parents, and athletic trainers
// Free of emojis, em/en dashes, and semicolons in prose

import { SupportedLocale } from './translations';

export const RECOVERY_TEXT: Record<
  SupportedLocale,
  {
    // Tabs in history drawer
    tabCheckHistory: string;
    tabReturnToPlay: string;
    tabDailySymptoms: string;

    // Return to Play Tracker
    rtpTitle: string;
    rtpSubtitle: string;
    rtpCdcNotice: string;
    rtpWarning24h: string;
    rtpResetButton: string;
    rtpResetConfirm: string;
    rtpResetCancel: string;
    rtpResetProceed: string;
    rtpStepLocked: string;
    rtpCompletedOn: string;
    rtpDatePlaceholder: string;
    rtpClearanceTitle: string;
    rtpClearanceSubtitle: string;
    rtpClearanceCheckbox: string;
    rtpProviderNameLabel: string;
    rtpProviderNamePlaceholder: string;
    rtpClearanceDateLabel: string;
    rtpClearanceWarning: string;
    rtpStep1Title: string;
    rtpStep1Desc: string;
    rtpStep2Title: string;
    rtpStep2Desc: string;
    rtpStep3Title: string;
    rtpStep3Desc: string;
    rtpStep4Title: string;
    rtpStep4Desc: string;
    rtpStep5Title: string;
    rtpStep5Desc: string;
    rtpStep6Title: string;
    rtpStep6Desc: string;

    // Daily Symptom Log
    symptomLogTitle: string;
    symptomLogSubtitle: string;
    symptomDateLabel: string;
    symptomTotalScore: string;
    symptomMaxScore: string;
    symptomHeadache: string;
    symptomDizziness: string;
    symptomNausea: string;
    symptomLightNoise: string;
    symptomFogginess: string;
    symptomConcentration: string;
    symptomSleep: string;
    severityNone: string;
    severityMild: string;
    severityModerate: string;
    severitySevere: string;
    symptomNotesLabel: string;
    symptomNotesPlaceholder: string;
    symptomSaveButton: string;
    symptomSavedNotice: string;
    symptomHistoryTitle: string;
    symptomNoEntries: string;
    symptomDeleteButton: string;
    symptomDeleteConfirm: string;
    symptomTrendTitle: string;
    symptomTrendSubtitle: string;
  }
> = {
  en: {
    tabCheckHistory: 'Check History',
    tabReturnToPlay: 'Return to Play (CDC)',
    tabDailySymptoms: 'Daily Symptoms',

    rtpTitle: 'CDC 6-Step Return-to-Play Progression',
    rtpSubtitle: 'Athletes should spend at least 24 hours at each step without symptoms returning.',
    rtpCdcNotice: 'Guide based on CDC HEADS UP return-to-play steps. Not medical clearance.',
    rtpWarning24h: 'CDC guidelines recommend waiting at least 24 hours between steps. Two steps have been recorded within 24 hours.',
    rtpResetButton: 'Reset Plan',
    rtpResetConfirm: 'Are you sure you want to reset all return to play steps for this athlete?',
    rtpResetCancel: 'Cancel',
    rtpResetProceed: 'Yes, Reset Plan',
    rtpStepLocked: 'Complete the previous step first.',
    rtpCompletedOn: 'Completed on',
    rtpDatePlaceholder: 'YYYY-MM-DD',
    rtpClearanceTitle: 'Healthcare Provider Clearance',
    rtpClearanceSubtitle: 'Required before starting Step 5 (practice and full contact) or Step 6 (competition).',
    rtpClearanceCheckbox: 'Athlete is cleared by a healthcare provider for contact practice and games',
    rtpProviderNameLabel: 'Provider Name and Credentials',
    rtpProviderNamePlaceholder: 'Dr. Jane Smith, MD',
    rtpClearanceDateLabel: 'Date of Clearance',
    rtpClearanceWarning: 'Medical provider clearance is required before completing Step 5 and Step 6.',
    rtpStep1Title: 'Step 1: Back to regular activities (school)',
    rtpStep1Desc: 'Athlete is back to school and normal daily routines without symptoms getting worse.',
    rtpStep2Title: 'Step 2: Light aerobic activity (walking or stationary cycling)',
    rtpStep2Desc: 'Light exercise like walking or stationary bike, no resistance training.',
    rtpStep3Title: 'Step 3: Moderate activity (jogging, brief running, moderate intensity)',
    rtpStep3Desc: 'Moderate aerobic exercise like jogging or brief running drills to raise heart rate. No contact.',
    rtpStep4Title: 'Step 4: Heavy, non-contact activity (sprinting, non-contact sport drills)',
    rtpStep4Desc: 'Harder non-contact drills like sprinting and agility drills.',
    rtpStep5Title: 'Step 5: Practice and full contact (normal training practice after medical clearance)',
    rtpStep5Desc: 'Normal training practice and contact drills after written clearance from a medical provider.',
    rtpStep6Title: 'Step 6: Competition (return to full game play)',
    rtpStep6Desc: 'Return to full game play and normal competition.',

    symptomLogTitle: 'Daily Symptom Log',
    symptomLogSubtitle: 'Track recovery symptoms daily. Rate each symptom from 0 (none) to 6 (severe).',
    symptomDateLabel: 'Log Date',
    symptomTotalScore: 'Total Symptom Score',
    symptomMaxScore: 'out of 42',
    symptomHeadache: 'Headache',
    symptomDizziness: 'Dizziness',
    symptomNausea: 'Nausea',
    symptomLightNoise: 'Sensitivity to light or noise',
    symptomFogginess: 'Feeling foggy or groggy',
    symptomConcentration: 'Trouble concentrating',
    symptomSleep: 'Sleep issues or drowsiness',
    severityNone: 'None',
    severityMild: 'Mild',
    severityModerate: 'Moderate',
    severitySevere: 'Severe',
    symptomNotesLabel: 'Notes (optional)',
    symptomNotesPlaceholder: 'Add notes from parent, coach, or athletic trainer...',
    symptomSaveButton: 'Save Today Entry',
    symptomSavedNotice: 'Entry saved successfully',
    symptomHistoryTitle: 'Logged Daily Entries',
    symptomNoEntries: 'No symptom entries recorded yet.',
    symptomDeleteButton: 'Delete',
    symptomDeleteConfirm: 'Are you sure you want to delete this symptom log entry?',
    symptomTrendTitle: 'Symptom Score Trend',
    symptomTrendSubtitle: 'Lower score indicates fewer symptoms. Zero means symptom-free.'
  },
  es: {
    tabCheckHistory: 'Historial de revisiones',
    tabReturnToPlay: 'Retorno al juego (CDC)',
    tabDailySymptoms: 'Sintomas diarios',

    rtpTitle: 'Progresion de 6 pasos de los CDC para retorno al juego',
    rtpSubtitle: 'Los atletas deben pasar al menos 24 horas en cada paso sin que regresen los sintomas.',
    rtpCdcNotice: 'Guia basada en los pasos de regreso al juego de los CDC. No es alta medica.',
    rtpWarning24h: 'Las pautas de los CDC recomiendan esperar al menos 24 horas entre cada paso. Se registraron dos pasos en menos de 24 horas.',
    rtpResetButton: 'Reiniciar plan',
    rtpResetConfirm: '¿Esta seguro de que desea reiniciar todos los pasos de retorno al juego para este atleta?',
    rtpResetCancel: 'Cancelar',
    rtpResetProceed: 'Si, reiniciar plan',
    rtpStepLocked: 'Complete el paso anterior primero.',
    rtpCompletedOn: 'Completado el',
    rtpDatePlaceholder: 'AAAA-MM-DD',
    rtpClearanceTitle: 'Autorizacion del profesional de salud',
    rtpClearanceSubtitle: 'Requerido antes de iniciar el Paso 5 (practica y contacto) o el Paso 6 (competencia).',
    rtpClearanceCheckbox: 'El atleta tiene autorizacion medica para practicas con contacto y partidos',
    rtpProviderNameLabel: 'Nombre y credenciales del profesional',
    rtpProviderNamePlaceholder: 'Dra. Maria Lopez, Medico',
    rtpClearanceDateLabel: 'Fecha de autorizacion',
    rtpClearanceWarning: 'Se requiere autorizacion medica antes de completar el Paso 5 y el Paso 6.',
    rtpStep1Title: 'Paso 1: Regreso a actividades regulares (escuela)',
    rtpStep1Desc: 'El atleta regreso a la escuela y rutinas diarias sin que empeoren los sintomas.',
    rtpStep2Title: 'Paso 2: Actividad aerobica ligera (caminar o bicicleta estatica)',
    rtpStep2Desc: 'Ejercicio ligero como caminar o bicicleta fija, sin entrenamiento con pesas.',
    rtpStep3Title: 'Paso 3: Actividad moderada (trotar, carreras breves, intensidad moderada)',
    rtpStep3Desc: 'Ejercicio aerobico moderado como trotar para elevar el ritmo cardiaco. Sin contacto.',
    rtpStep4Title: 'Paso 4: Actividad intensa sin contacto (carreras de velocidad, ejercicios del deporte)',
    rtpStep4Desc: 'Ejercicios mas intensos como carreras rapidas y agilidad sin contacto.',
    rtpStep5Title: 'Paso 5: Practica con contacto completo (entrenamiento normal tras autorizacion medica)',
    rtpStep5Desc: 'Entrenamiento habitual y jugadas de contacto tras autorizacion por escrito de un medico.',
    rtpStep6Title: 'Paso 6: Competencia (regreso al juego completo)',
    rtpStep6Desc: 'Regreso al juego completo en competiciones normales.',

    symptomLogTitle: 'Registro diario de sintomas',
    symptomLogSubtitle: 'Siga los sintomas a diario. Califique cada sintoma de 0 (ninguno) a 6 (grave).',
    symptomDateLabel: 'Fecha del registro',
    symptomTotalScore: 'Puntuacion total de sintomas',
    symptomMaxScore: 'de 42',
    symptomHeadache: 'Dolor de cabeza',
    symptomDizziness: 'Mareo',
    symptomNausea: 'Nauseas',
    symptomLightNoise: 'Sensibilidad a la luz o al ruido',
    symptomFogginess: 'Sensacion de aturdimiento',
    symptomConcentration: 'Dificultad para concentrarse',
    symptomSleep: 'Problemas de sueno o somnolencia',
    severityNone: 'Ninguno',
    severityMild: 'Leve',
    severityModerate: 'Moderado',
    severitySevere: 'Grave',
    symptomNotesLabel: 'Notas (opcional)',
    symptomNotesPlaceholder: 'Agregue notas del padre, entrenador o preparador fisico...',
    symptomSaveButton: 'Guardar registro de hoy',
    symptomSavedNotice: 'Registro guardado correctamente',
    symptomHistoryTitle: 'Registros diarios guardados',
    symptomNoEntries: 'No hay registros de sintomas todavia.',
    symptomDeleteButton: 'Eliminar',
    symptomDeleteConfirm: '¿Esta seguro de que desea eliminar este registro de sintomas?',
    symptomTrendTitle: 'Tendencia de puntuacion de sintomas',
    symptomTrendSubtitle: 'Una menor puntuacion indica menos sintomas. Cero significa sin sintomas.'
  }
};
