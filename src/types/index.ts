export interface SubtitleWord {
  text: string;
  start: number; // in seconds
  end: number;   // in seconds
}

export interface Caption {
  id: string;
  start: number; // in seconds
  end: number;   // in seconds
  text: string;
  lang?: string;
  words?: SubtitleWord[];
}

export type TextTransform = 'none' | 'uppercase' | 'lowercase' | 'capitalize';
export type SubtitlePosition = 'bottom' | 'top' | 'center';
export type SubtitleAnimation = 'none' | 'pop' | 'glow';
export type AspectRatio = '16:9' | '9:16' | '1:1' | '4:5' | 'custom';
export type VideoOrientation = 'landscape' | 'portrait' | 'square';
export type SafeAreaPreset = 'standard' | 'tiktok_reels' | 'minimal';

export interface VideoMetadata {
  width: number;
  height: number;
  duration: number;
  aspectRatio: AspectRatio;
  aspectRatioValue: number; // width / height
  orientation: VideoOrientation;
  thumbnailUrl?: string;
  hasAudioTrack?: boolean;
}

export interface SubtitleStyle {
  id: string;
  name: string;
  fontFamily: string;
  fontSize: number; // reference font size or scale
  autoSize: boolean; // whether to automatically scale font size based on video dimensions
  maxLines: number;  // max lines per subtitle cue (default 2)
  maxWidthPercent: number; // max text width as % of video width (default 85%)
  fontWeight: string;
  color: string;
  textTransform: TextTransform;
  strokeColor: string;
  strokeWidth: number;
  shadowColor: string;
  shadowBlur: number;
  shadowOffsetY: number;
  backgroundColor: string; // e.g. 'transparent', 'rgba(0,0,0,0.7)', etc.
  backgroundPadding: number;
  backgroundRadius: number;
  position: SubtitlePosition;
  yOffset: number; // offset in percent from bottom/top
  letterSpacing: number;
  animation: SubtitleAnimation;
  safeAreaPreset: SafeAreaPreset;
}

export interface ComputedSubtitleLayout {
  lines: string[];
  fontSize: number; // actual font size in pixels for the current viewport/canvas
  lineHeight: number;
  totalTextHeight: number;
  maxLineWidth: number;
  x: number; // center x coordinate
  y: number; // top y coordinate of the text block
  boxWidth: number;
  boxHeight: number;
  boxX: number;
  boxY: number;
  safeMarginX: number;
  safeMarginY: number;
  scaleFactor: number;
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
  metadata?: VideoMetadata;
  captions: Caption[];
  originalCaptions?: Caption[]; // Base English timeline captions
  style: SubtitleStyle;
  sourceLang: string;
  targetLang: string;
  aspectRatio: AspectRatio;
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
