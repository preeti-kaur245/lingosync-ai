export interface Caption {
  id: string;
  start: number; // in seconds
  end: number;   // in seconds
  text: string;
  lang?: string;
}

export type TextTransform = 'none' | 'uppercase' | 'lowercase' | 'capitalize';
export type SubtitlePosition = 'bottom' | 'top' | 'center';
export type SubtitleAnimation = 'none' | 'pop' | 'glow';

export interface SubtitleStyle {
  id: string;
  name: string;
  fontFamily: string;
  fontSize: number; // font size in px (relative to 1080p canvas, responsive on display)
  fontWeight: string;
  color: string;
  textTransform: TextTransform;
  strokeColor: string;
  strokeWidth: number;
  shadowColor: string;
  shadowBlur: number;
  shadowOffsetY: number;
  backgroundColor: string; // e.g. 'transparent', 'rgba(0,0,0,0.6)', etc.
  backgroundPadding: number;
  backgroundRadius: number;
  position: SubtitlePosition;
  yOffset: number; // offset in percent from bottom/top
  letterSpacing: number;
  animation: SubtitleAnimation;
}

export interface Project {
  id: string;
  title: string;
  createdAt: number;
  updatedAt: number;
  duration: number;
  videoUrl?: string; // transient ObjectURL
  videoBlobKey?: string; // IndexedDB key
  thumbnailUrl?: string;
  captions: Caption[];
  style: SubtitleStyle;
  sourceLang: string;
  targetLang: string;
  fileName?: string;
}

export interface FontOption {
  name: string;
  family: string;
  weights: number[];
  category: 'sans-serif' | 'serif' | 'display' | 'monospace' | 'handwriting';
}

export interface LanguageOption {
  code: string;
  name: string;
  nativeName: string;
}

export interface TranslationResult {
  translatedText: string;
  detectedLanguage?: string;
  confidence?: number;
}

export interface TranslateOptions {
  sourceLang: string;
  targetLang: string;
}

export interface TranscriptionResult {
  captions: Omit<Caption, 'id'>[];
  duration: number;
}

export interface TranscriptionProgress {
  status: 'idle' | 'recording' | 'processing' | 'done' | 'error';
  transcript: string;
  error?: string;
}

export interface ExportProgress {
  isExporting: boolean;
  progress: number; // 0 to 100
  stage: string;
}
