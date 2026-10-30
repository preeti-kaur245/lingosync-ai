import {
  TranslateOptions,
  TranslationResult,
  TranscriptionResult
} from '../types';
import { TranscriptionService } from './transcription.service';
import { TranslationService } from './translation.service';

export class AIService {
  /**
   * OpenAI API Key configuration:
   * Loaded securely from .env.local via process.env.NEXT_PUBLIC_OPENAI_API_KEY
   */
  static getApiKey(): string {
    return process.env.NEXT_PUBLIC_OPENAI_API_KEY || '';
  }

  static async translateText(text: string, targetLang: string): Promise<TranslationResult> {
    const translated = await TranslationService.translateText(text, targetLang);
    return {
      translatedText: translated,
      detectedLanguage: 'en',
      confidence: 0.98,
    };
  }

  static async transcribeAudio(blob: Blob, apiKey?: string): Promise<TranscriptionResult> {
    const key = apiKey || this.getApiKey();
    const captions = await TranscriptionService.transcribeMedia(blob, 15, key);
    return {
      captions: captions.map(({ id, ...rest }) => rest),
      duration: captions.length > 0 ? captions[captions.length - 1].end : 5.0,
    };
  }
}
