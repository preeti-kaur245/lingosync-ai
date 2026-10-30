export interface Caption {
  id: number | string;
  start: number;
  end: number;
  text: string;
  lang: string;
}

export interface TranslationResult {
  translatedText: string;
  detectedLanguage: string;
  confidence: number;
}

export interface TranscriptionResult {
  captions: Omit<Caption, 'id'>[];
  duration: number;
}

export interface TranslateOptions {
  sourceLang: string;
  targetLang: string;
}
