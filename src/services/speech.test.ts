import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  isVoiceSupported,
  getVoiceEnabled,
  setVoiceEnabled,
  cancelVoice,
  speakInstruction
} from './speech';

describe('speech service', () => {
  const originalWindow = (globalThis as any).window;
  const originalSpeechSynthesis = (globalThis as any).speechSynthesis;
  const originalUtterance = (globalThis as any).SpeechSynthesisUtterance;
  const originalLocalStorage = (globalThis as any).localStorage;

  let mockSpeechSynthesis: {
    cancel: ReturnType<typeof vi.fn>;
    speak: ReturnType<typeof vi.fn>;
    getVoices: ReturnType<typeof vi.fn>;
  };

  let mockStorage: Record<string, string>;

  beforeEach(() => {
    (globalThis as any).window = globalThis;
    mockStorage = {};
    (globalThis as any).localStorage = {
      getItem: vi.fn((key: string) => mockStorage[key] ?? null),
      setItem: vi.fn((key: string, value: string) => {
        mockStorage[key] = String(value);
      }),
      removeItem: vi.fn((key: string) => {
        delete mockStorage[key];
      }),
      clear: vi.fn(() => {
        mockStorage = {};
      })
    };

    mockSpeechSynthesis = {
      cancel: vi.fn(),
      speak: vi.fn(),
      getVoices: vi.fn(() => [
        { name: 'English Voice', lang: 'en-US' },
        { name: 'Spanish Voice', lang: 'es-ES' }
      ])
    };
    (globalThis as any).speechSynthesis = mockSpeechSynthesis;

    class MockSpeechSynthesisUtterance {
      text: string;
      lang: string = '';
      voice: any = null;
      constructor(text: string) {
        this.text = text;
      }
    }
    (globalThis as any).SpeechSynthesisUtterance = MockSpeechSynthesisUtterance;
  });

  afterEach(() => {
    if (originalWindow !== undefined) {
      (globalThis as any).window = originalWindow;
    } else {
      delete (globalThis as any).window;
    }

    if (originalSpeechSynthesis !== undefined) {
      (globalThis as any).speechSynthesis = originalSpeechSynthesis;
    } else {
      delete (globalThis as any).speechSynthesis;
    }

    if (originalUtterance !== undefined) {
      (globalThis as any).SpeechSynthesisUtterance = originalUtterance;
    } else {
      delete (globalThis as any).SpeechSynthesisUtterance;
    }

    if (originalLocalStorage !== undefined) {
      (globalThis as any).localStorage = originalLocalStorage;
    } else {
      delete (globalThis as any).localStorage;
    }
  });

  it('detects when voice is supported in browser', () => {
    expect(isVoiceSupported()).toBe(true);

    delete (globalThis as any).SpeechSynthesisUtterance;
    expect(isVoiceSupported()).toBe(false);
  });

  it('defaults to disabled so it never surprises users', () => {
    expect(getVoiceEnabled()).toBe(false);
  });

  it('enables and disables voice preference in localStorage', () => {
    setVoiceEnabled(true);
    expect(getVoiceEnabled()).toBe(true);
    expect((globalThis as any).localStorage.setItem).toHaveBeenCalledWith('sidelinesentry_voice', 'true');

    setVoiceEnabled(false);
    expect(getVoiceEnabled()).toBe(false);
    expect((globalThis as any).localStorage.setItem).toHaveBeenCalledWith('sidelinesentry_voice', 'false');
    // Turning off voice must immediately cancel any speech
    expect(mockSpeechSynthesis.cancel).toHaveBeenCalled();
  });

  it('safely calls cancelVoice', () => {
    cancelVoice();
    expect(mockSpeechSynthesis.cancel).toHaveBeenCalledTimes(1);
  });

  it('does not speak when voice is disabled', () => {
    setVoiceEnabled(false);
    speakInstruction('Test instruction', 'en');
    expect(mockSpeechSynthesis.speak).not.toHaveBeenCalled();
  });

  it('speaks English instructions with en-US and cancels previous speech', () => {
    setVoiceEnabled(true);
    speakInstruction('Hold still for 15 seconds', 'en');

    expect(mockSpeechSynthesis.cancel).toHaveBeenCalled();
    expect(mockSpeechSynthesis.speak).toHaveBeenCalledTimes(1);

    const spokenUtterance = mockSpeechSynthesis.speak.mock.calls[0][0];
    expect(spokenUtterance.text).toBe('Hold still for 15 seconds');
    expect(spokenUtterance.lang).toBe('en-US');
    expect(spokenUtterance.voice?.lang).toBe('en-US');
  });

  it('speaks Spanish instructions with es-ES voice matching', () => {
    setVoiceEnabled(true);
    speakInstruction('Manténgase quieto por 15 segundos', 'es');

    expect(mockSpeechSynthesis.cancel).toHaveBeenCalled();
    expect(mockSpeechSynthesis.speak).toHaveBeenCalledTimes(1);

    const spokenUtterance = mockSpeechSynthesis.speak.mock.calls[0][0];
    expect(spokenUtterance.text).toBe('Manténgase quieto por 15 segundos');
    expect(spokenUtterance.lang).toBe('es-ES');
    expect(spokenUtterance.voice?.lang).toBe('es-ES');
  });

  it('is a safe no-op when speechSynthesis is missing or throws', () => {
    setVoiceEnabled(true);
    delete (globalThis as any).speechSynthesis;

    expect(() => {
      speakInstruction('Should not crash', 'en');
    }).not.toThrow();

    expect(() => {
      cancelVoice();
    }).not.toThrow();
  });
});
