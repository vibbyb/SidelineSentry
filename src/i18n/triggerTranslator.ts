import { SupportedLocale } from './translations';

// Translates checkup warnings and results for coaches and parents.
export function translateTrigger(trig: string, locale: SupportedLocale = 'en'): string {
  if (locale !== 'es') {
    return trig
      .replace('EMERGENCY PROTOCOL:', 'Emergency:')
      .replace('Eye Tracking Skipped:', 'Reading Test Skipped:')
      .replace('Eye Tracking Incomplete', 'Reading Test Incomplete')
      .replace('Eye Tracking Delay', 'Reading Test Delay')
      .replace('Mild Eye Tracking Delay', 'Mild Reading Test Delay')
      .replace('Eye Tracking Validity Warning:', 'Reading Test Validity Warning:')
      .replace('Corrupted Sensor / Timing Telemetry', 'Corrupted sensor or timing data')
      .replace('Motion artifact / grip slip detected', 'Sudden movement or grip slip detected')
      .replace('Motion artifact or grip slip detected', 'Sudden movement or grip slip detected');
  }

  // Emergency triggers
  if (trig.startsWith('EMERGENCY PROTOCOL:')) {
    let replaced = trig.replace('EMERGENCY PROTOCOL:', 'Emergencia:');
    replaced = replaced
      .replace('Neck pain or tenderness', 'Dolor o sensibilidad en el cuello')
      .replace('Double vision', 'Visión doble')
      .replace('Weakness or tingling in arms/legs', 'Debilidad o cosquilleo en brazos/piernas')
      .replace('Severe or escalating headache', 'Dolor de cabeza intenso o que empeora')
      .replace('Seizure or convulsion', 'Convulsión o temblores')
      .replace('Loss of consciousness', 'Pérdida del conocimiento')
      .replace('Deteriorating conscious state', 'Estado de conciencia en deterioro')
      .replace('Repeated vomiting', 'Vómitos repetidos')
      .replace('Increasing confusion or agitation', 'Confusión o agitación creciente')
      .replace('Sideline Memory Failure: Disoriented to venue/field', 'Falla de memoria: Desorientado sobre el lugar/campo')
      .replace('Sideline Memory Failure: Disoriented to current period/quarter', 'Falla de memoria: Desorientado sobre el cuarto/período')
      .replace('Sideline Memory Failure: Disoriented to last score/opponent', 'Falla de memoria: Desorientado sobre el último marcador o rival');
    return replaced;
  }

  // Sensor data and integrity checks
  if (trig.includes('Corrupted Sensor / Timing Telemetry') || trig.includes('Corrupted or non-finite')) {
    return 'Datos de sensor o tiempo dañados: Métrica no válida detectada. Repetir prueba requerido.';
  }

  // Skipped test triggers
  if (trig.startsWith('Balance Test Skipped:')) {
    return trig.replace('Balance Test Skipped:', 'Prueba de equilibrio omitida:');
  }
  if (trig.startsWith('Reaction Test Skipped:')) {
    return trig.replace('Reaction Test Skipped:', 'Prueba de reacción omitida:');
  }
  if (trig.startsWith('Reading Test Skipped:') || trig.startsWith('Eye Tracking Skipped:')) {
    return trig.replace(/^(Reading Test|Eye Tracking) Skipped:/, 'Prueba de lectura omitida:');
  }

  // Validity and movement checks
  if (trig.includes('Zero physiological tremor detected')) {
    return 'El teléfono no se movía. Pudo haber sido colocado en una mesa en vez del pecho. Repita la prueba.';
  }
  if (trig.includes('Motion artifact / grip slip detected') || trig.includes('Motion artifact or grip slip detected')) {
    return 'Movimiento brusco o deslizamiento del teléfono. Repita la prueba.';
  }
  if (trig.includes('Excessive false starts')) {
    return 'Demasiadas salidas en falso (tocó antes de la luz verde). Repita la prueba.';
  }
  if (trig.includes('Anticipatory reaction detected')) {
    return 'Reacción anticipada (tocó antes de ver la luz verde). Repita la prueba.';
  }
  if (trig.includes('Excessive trial variance')) {
    return 'Los tiempos de reacción fueron muy inconsistentes. Repita la prueba.';
  }
  if (trig.includes('No reaction trials recorded')) {
    return 'No se registraron intentos de reacción. Repetir prueba requerido.';
  }
  if (trig.includes('Eye Tracking Incomplete') || trig.includes('Reading Incomplete')) {
    return 'Prueba de lectura incompleta: La prueba se cerró antes de completar las 3 tarjetas. Repetir prueba requerido.';
  }
  if (trig.includes('Abnormally high baseline sway')) {
    return 'Oscilación base anormalmente alta (>1.2 m/s²). El atleta se movió en exceso durante la línea base. Repita la prueba.';
  }

  // Test metrics deviations
  if (trig.includes('Noticeable Balance Loss')) {
    return trig.replace('Noticeable Balance Loss', 'Pérdida notable de equilibrio').replace('above baseline', 'sobre línea base');
  }
  if (trig.includes('Mild Balance Decrease')) {
    return trig.replace('Mild Balance Decrease', 'Disminución leve de equilibrio').replace('above baseline', 'sobre línea base');
  }
  if (trig.includes('Severe Balance Loss')) {
    return trig.replace('Severe Balance Loss (Sway', 'Pérdida grave de equilibrio (Oscilación');
  }
  if (trig.includes('Significant Reaction Delay')) {
    return trig.replace('Significant Reaction Delay', 'Retraso significativo de reacción').replace('slower than baseline', 'más lento que la base');
  }
  if (trig.includes('Mild Reaction Slowing')) {
    return trig.replace('Mild Reaction Slowing', 'Demora leve de reacción');
  }
  if (trig.includes('Eye Tracking Delay') || trig.includes('Reading Delay')) {
    return trig
      .replace(/Eye Tracking Delay|Reading Delay/, 'Retraso en la prueba de lectura')
      .replace('delay', 'retraso')
      .replace('mistakes', 'errores')
      .replace('mistake', 'error');
  }
  if (trig.includes('Mild Eye Tracking Delay') || trig.includes('Mild Reading Delay')) {
    return trig.replace(/Mild Eye Tracking Delay|Mild Reading Delay/, 'Retraso leve en la prueba de lectura').replace('delay', 'retraso');
  }

  // Validity warnings
  if (trig.includes('Balance Validity Warning:')) {
    return trig.replace('Balance Validity Warning:', 'Aviso de validez de equilibrio:');
  }
  if (trig.includes('Reaction Validity Warning:')) {
    return trig.replace('Reaction Validity Warning:', 'Aviso de validez de reacción:');
  }
  if (trig.includes('Reading completed unnaturally fast')) {
    return 'Aviso de validez de lectura: Lectura completada de forma anormalmente rápida (<12.0s). Repetir prueba requerido.';
  }
  if (trig.includes('Eye Tracking Validity Warning:') || trig.includes('Reading Validity Warning:')) {
    return trig.replace(/Eye Tracking Validity Warning:|Reading Validity Warning:/, 'Aviso de validez de lectura:');
  }

  return trig;
}

/**
 * Translates skipped test reason strings into Spanish.
 */
export function translateSkippedReason(reason: string | undefined, locale: SupportedLocale = 'en'): string {
  if (!reason) return '';
  if (locale !== 'es') {
    if (reason.toLowerCase().includes('emergency lockdown active')) {
      return 'Skipped for safety: Emergency warning sign observed';
    }
    return reason;
  }
  if (reason.toLowerCase().includes('emergency lockdown active') || reason.toLowerCase().includes('emergency warning sign')) {
    return 'Omitido por seguridad: El atleta mostró una señal de alarma de emergencia.';
  }
  if (reason.toLowerCase().includes('pre-test red flag')) {
    return 'Señal de alarma previa al chequeo';
  }
  return reason;
}
