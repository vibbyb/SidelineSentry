// Test assistance translations for voice instructions and simulation controls
// Plain, coach-friendly wording without buzzwords, emojis, dashes, or semicolons

import { SupportedLocale } from './translations';

export interface TestAssistStrings {
  voiceGuidanceEnable: string;
  voiceGuidanceDisable: string;
  voiceGuidanceAria: string;
  simulationModeLabel: string;
  healthyAthlete: string;
  concussedAthlete: string;
  balanceInstructionVoice: string;
  balanceHoldStill: string;
  balanceTestComplete: string;
  reactionInstructionVoice: string;
  kingDevickInstructionVoice: string;
}

export const TEST_ASSIST_TEXT: Record<SupportedLocale, TestAssistStrings> = {
  en: {
    voiceGuidanceEnable: 'Turn on voice instructions',
    voiceGuidanceDisable: 'Turn off voice instructions',
    voiceGuidanceAria: 'Voice instructions',
    simulationModeLabel: 'Simulation mode (no phone sensor):',
    healthyAthlete: 'Healthy Athlete',
    concussedAthlete: 'Concussed Athlete',
    balanceInstructionVoice: 'Hold the phone firmly against the athlete chest with both hands. Tap start when ready.',
    balanceHoldStill: 'Hold still for 15 seconds',
    balanceTestComplete: 'Balance test complete',
    reactionInstructionVoice: 'Hold the phone ready. When the screen turns green, tap it as fast as you can. Do three trials.',
    kingDevickInstructionVoice: 'Read the numbers aloud from left to right as fast as you can without making mistakes. Tap start when ready.'
  },
  es: {
    voiceGuidanceEnable: 'Activar instrucciones de voz',
    voiceGuidanceDisable: 'Desactivar instrucciones de voz',
    voiceGuidanceAria: 'Instrucciones de voz',
    simulationModeLabel: 'Modo de simulación (sin sensor):',
    healthyAthlete: 'Atleta sano',
    concussedAthlete: 'Atleta con conmoción',
    balanceInstructionVoice: 'Sostenga el teléfono firme contra el pecho del atleta con ambas manos. Toque iniciar cuando esté listo.',
    balanceHoldStill: 'Manténgase quieto por 15 segundos',
    balanceTestComplete: 'Prueba de equilibrio completada',
    reactionInstructionVoice: 'Tenga el teléfono listo. Cuando la pantalla cambie a verde, tóquela lo más rápido posible. Son tres intentos.',
    kingDevickInstructionVoice: 'Lea los números en voz alta de izquierda a derecha lo más rápido posible sin errores. Toque iniciar cuando esté listo.'
  }
};
