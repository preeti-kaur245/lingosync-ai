import {
  TranslateOptions,
  TranslationResult,
  TranscriptionResult
} from '../types';

export class AIService {
  // Mocking AI Translation for the UI demo
  // In production, this would call OpenAI GPT-4 or DeepL API
  static async translateText(text: string, targetLang: string): Promise<TranslationResult> {
    const mockTranslations: Record<string, Record<string, string>> = {
      'es': { 'Welcome to the future of video!': '¡Bienvenido al futuro del video!', 'Break the sound barrier today.': 'Rompe la barrera del sonido hoy.' },
      'hi': { 'Welcome to the future of video!': 'वीडियो के भविष्य में आपका स्वागत है!', 'Break the sound barrier today.': 'आज ही ध्वनि की बाधा को तोड़ें।' },
      'fr': { 'Welcome to the future of video!': 'Bienvenue dans le futur de la vidéo!', 'Break the sound barrier today.': 'Brisez la barrière du son aujourd\'hui.' },
      'de': { 'Welcome to the future of video!': 'Willkommen in der Zukunft des Videos!', 'Break the sound barrier today.': 'Durchbrechen Sie heute die Schallmauer.' },
    };

    await new Promise(resolve => setTimeout(resolve, 800)); // Simulate network latency

    const translation = mockTranslations[targetLang]?.[text] || `[${targetLang}] ${text}`;
    return {
      translatedText: translation,
      detectedLanguage: 'en',
      confidence: 0.98
    };
  }

  static async transcribeAudio(blob: Blob): Promise<TranscriptionResult> {
    // In production, this would use OpenAI Whisper via API
    await new Promise(resolve => setTimeout(resolve, 2000));
    return {
      captions: [
        { start: 0, end: 2, text: "Welcome to the future of video!", lang: "en" },
        { start: 2, end: 5, text: "Break the sound barrier today.", lang: "en" },
      ],
      duration: 5.0
    };
  }
}
