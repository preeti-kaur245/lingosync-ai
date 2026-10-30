import { FontOption, SubtitleStyle } from '../types';

export const AVAILABLE_FONTS: FontOption[] = [
  { name: 'Montserrat', family: 'Montserrat', weights: [400, 700, 900], category: 'sans-serif' },
  { name: 'Bebas Neue', family: 'Bebas Neue', weights: [400], category: 'display' },
  { name: 'Inter', family: 'Inter', weights: [400, 600, 800], category: 'sans-serif' },
  { name: 'Poppins', family: 'Poppins', weights: [400, 700, 900], category: 'sans-serif' },
  { name: 'Orbitron', family: 'Orbitron', weights: [700, 900], category: 'display' },
  { name: 'Playfair Display', family: 'Playfair Display', weights: [400, 700, 900], category: 'serif' },
  { name: 'Oswald', family: 'Oswald', weights: [500, 700], category: 'sans-serif' },
  { name: 'Anton', family: 'Anton', weights: [400], category: 'display' },
  { name: 'Caveat', family: 'Caveat', weights: [700], category: 'handwriting' },
];

export const STYLE_PRESETS: SubtitleStyle[] = [
  {
    id: 'bold_social',
    name: 'Bold Social Media (Viral)',
    fontFamily: 'Montserrat',
    fontSize: 34,
    autoSize: true,
    maxLines: 2,
    maxWidthPercent: 86,
    fontWeight: '900',
    color: '#FFE14D',
    textTransform: 'uppercase',
    strokeColor: '#000000',
    strokeWidth: 4,
    shadowColor: 'rgba(0, 0, 0, 0.9)',
    shadowBlur: 8,
    shadowOffsetY: 4,
    backgroundColor: 'transparent',
    backgroundPadding: 0,
    backgroundRadius: 0,
    position: 'bottom',
    yOffset: 14,
    letterSpacing: 1,
    animation: 'pop',
    safeAreaPreset: 'tiktok_reels',
  },
  {
    id: 'clean_minimal',
    name: 'Clean Minimal',
    fontFamily: 'Inter',
    fontSize: 26,
    autoSize: true,
    maxLines: 2,
    maxWidthPercent: 84,
    fontWeight: '600',
    color: '#FFFFFF',
    textTransform: 'none',
    strokeColor: 'transparent',
    strokeWidth: 0,
    shadowColor: 'rgba(0, 0, 0, 0.7)',
    shadowBlur: 6,
    shadowOffsetY: 2,
    backgroundColor: 'rgba(10, 10, 15, 0.65)',
    backgroundPadding: 8,
    backgroundRadius: 8,
    position: 'bottom',
    yOffset: 10,
    letterSpacing: 0,
    animation: 'none',
    safeAreaPreset: 'standard',
  },
  {
    id: 'professional_interview',
    name: 'Professional Interview',
    fontFamily: 'Poppins',
    fontSize: 24,
    autoSize: true,
    maxLines: 2,
    maxWidthPercent: 80,
    fontWeight: '600',
    color: '#FFFFFF',
    textTransform: 'none',
    strokeColor: 'transparent',
    strokeWidth: 0,
    shadowColor: 'rgba(0, 0, 0, 0.85)',
    shadowBlur: 4,
    shadowOffsetY: 2,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    backgroundPadding: 10,
    backgroundRadius: 6,
    position: 'bottom',
    yOffset: 8,
    letterSpacing: 0,
    animation: 'none',
    safeAreaPreset: 'standard',
  },
  {
    id: 'podcast',
    name: 'Podcast Highlight',
    fontFamily: 'Bebas Neue',
    fontSize: 36,
    autoSize: true,
    maxLines: 2,
    maxWidthPercent: 88,
    fontWeight: '700',
    color: '#FFFFFF',
    textTransform: 'uppercase',
    strokeColor: '#000000',
    strokeWidth: 2,
    shadowColor: 'rgba(0, 0, 0, 0.8)',
    shadowBlur: 6,
    shadowOffsetY: 3,
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
    backgroundPadding: 12,
    backgroundRadius: 10,
    position: 'bottom',
    yOffset: 16,
    letterSpacing: 2,
    animation: 'none',
    safeAreaPreset: 'tiktok_reels',
  },
  {
    id: 'cinematic',
    name: 'Cinematic',
    fontFamily: 'Playfair Display',
    fontSize: 26,
    autoSize: true,
    maxLines: 2,
    maxWidthPercent: 80,
    fontWeight: '700',
    color: '#F9FAFB',
    textTransform: 'none',
    strokeColor: 'transparent',
    strokeWidth: 0,
    shadowColor: 'rgba(0, 0, 0, 0.9)',
    shadowBlur: 8,
    shadowOffsetY: 2,
    backgroundColor: 'transparent',
    backgroundPadding: 0,
    backgroundRadius: 0,
    position: 'bottom',
    yOffset: 8,
    letterSpacing: 1,
    animation: 'none',
    safeAreaPreset: 'standard',
  },
  {
    id: 'high_contrast',
    name: 'High-Contrast Accessibility',
    fontFamily: 'Inter',
    fontSize: 28,
    autoSize: true,
    maxLines: 2,
    maxWidthPercent: 85,
    fontWeight: '800',
    color: '#FFFF00', // Yellow on pure black box
    textTransform: 'none',
    strokeColor: '#000000',
    strokeWidth: 2,
    shadowColor: '#000000',
    shadowBlur: 0,
    shadowOffsetY: 0,
    backgroundColor: '#000000',
    backgroundPadding: 12,
    backgroundRadius: 4,
    position: 'bottom',
    yOffset: 10,
    letterSpacing: 0,
    animation: 'none',
    safeAreaPreset: 'standard',
  },
  {
    id: 'cyberpunk',
    name: 'Cyberpunk Neon',
    fontFamily: 'Orbitron',
    fontSize: 28,
    autoSize: true,
    maxLines: 2,
    maxWidthPercent: 88,
    fontWeight: '900',
    color: '#00FFCC',
    textTransform: 'uppercase',
    strokeColor: '#003322',
    strokeWidth: 2,
    shadowColor: '#00FFCC',
    shadowBlur: 16,
    shadowOffsetY: 0,
    backgroundColor: 'rgba(5, 5, 12, 0.85)',
    backgroundPadding: 10,
    backgroundRadius: 12,
    position: 'bottom',
    yOffset: 12,
    letterSpacing: 3,
    animation: 'glow',
    safeAreaPreset: 'standard',
  },
];

export class FontService {
  private static loadedFonts = new Set<string>();

  /**
   * Dynamically loads a Google Font into the page
   */
  static loadGoogleFont(fontFamily: string): void {
    if (typeof window === 'undefined' || this.loadedFonts.has(fontFamily)) {
      return;
    }

    const cleanName = fontFamily.replace(/['"]/g, '').trim();
    const encoded = cleanName.replace(/ /g, '+');
    const linkId = `google-font-${encoded}`;

    if (document.getElementById(linkId)) {
      this.loadedFonts.add(cleanName);
      return;
    }

    const link = document.createElement('link');
    link.id = linkId;
    link.rel = 'stylesheet';
    link.href = `https://fonts.googleapis.com/css2?family=${encoded}:wght@400;600;700;900&display=swap`;
    document.head.appendChild(link);

    this.loadedFonts.add(cleanName);
  }

  /**
   * Preloads common subtitle fonts
   */
  static preloadCommonFonts(): void {
    AVAILABLE_FONTS.forEach((f) => this.loadGoogleFont(f.family));
  }
}
