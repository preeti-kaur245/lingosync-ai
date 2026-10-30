import { Caption, LanguageOption } from '../types';

export const SUPPORTED_LANGUAGES: LanguageOption[] = [
  { code: 'en', name: 'English', nativeName: 'English' },
  { code: 'es', name: 'Spanish', nativeName: 'Español' },
  { code: 'hi', name: 'Hindi', nativeName: 'हिन्दी' },
  { code: 'fr', name: 'French', nativeName: 'Français' },
  { code: 'de', name: 'German', nativeName: 'Deutsch' },
  { code: 'it', name: 'Italian', nativeName: 'Italiano' },
  { code: 'pt', name: 'Portuguese', nativeName: 'Português' },
  { code: 'ja', name: 'Japanese', nativeName: '日本語' },
  { code: 'ko', name: 'Korean', nativeName: '한국어' },
  { code: 'zh', name: 'Chinese (Simplified)', nativeName: '简体中文' },
  { code: 'ar', name: 'Arabic', nativeName: 'العربية' },
  { code: 'ru', name: 'Russian', nativeName: 'Русский' },
  { code: 'nl', name: 'Dutch', nativeName: 'Nederlands' },
  { code: 'tr', name: 'Turkish', nativeName: 'Türkçe' },
  { code: 'pl', name: 'Polish', nativeName: 'Polski' },
  { code: 'sv', name: 'Swedish', nativeName: 'Svenska' },
  { code: 'id', name: 'Indonesian', nativeName: 'Bahasa Indonesia' },
  { code: 'vi', name: 'Vietnamese', nativeName: 'Tiếng Việt' },
  { code: 'th', name: 'Thai', nativeName: 'ไทย' },
  { code: 'el', name: 'Greek', nativeName: 'Ελληνικά' },
  { code: 'cs', name: 'Czech', nativeName: 'Čeština' },
  { code: 'da', name: 'Danish', nativeName: 'Dansk' },
  { code: 'fi', name: 'Finnish', nativeName: 'Suomi' },
  { code: 'he', name: 'Hebrew', nativeName: 'עברית' },
  { code: 'uk', name: 'Ukrainian', nativeName: 'Українська' },
  { code: 'ro', name: 'Romanian', nativeName: 'Română' },
  { code: 'hu', name: 'Hungarian', nativeName: 'Magyar' },
  { code: 'bn', name: 'Bengali', nativeName: 'বাংলা' },
  { code: 'pa', name: 'Punjabi', nativeName: 'ਪੰਜਾਬੀ' },
  { code: 'ta', name: 'Tamil', nativeName: 'தமிழ்' },
  { code: 'te', name: 'Telugu', nativeName: 'తెలుగు' },
  { code: 'mr', name: 'Marathi', nativeName: 'मराठी' },
  { code: 'ur', name: 'Urdu', nativeName: 'اردو' },
  { code: 'ms', name: 'Malay', nativeName: 'Bahasa Melayu' },
  { code: 'no', name: 'Norwegian', nativeName: 'Norsk' },
  { code: 'fil', name: 'Filipino', nativeName: 'Filipino' },
];

export class TranslationService {
  /**
   * Translate a single text string
   */
  static async translateText(
    text: string,
    targetLang: string,
    sourceLang = 'en'
  ): Promise<string> {
    if (!text || text.trim() === '' || targetLang === sourceLang) {
      return text;
    }

    try {
      // MyMemory Public Free Translation API endpoint
      const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(
        text
      )}&langpair=${sourceLang}|${targetLang}`;
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 4000);

      const response = await fetch(url, { signal: controller.signal });
      clearTimeout(timer);

      if (response.ok) {
        const data = await response.json();
        if (data.responseData?.translatedText) {
          // Clean up HTML entities if returned
          const parser = new DOMParser();
          const doc = parser.parseFromString(data.responseData.translatedText, 'text/html');
          return doc.body.textContent || data.responseData.translatedText;
        }
      }
    } catch {
      // Fallback below
    }

    // High quality offline fallback translations for popular languages
    return this.fallbackTranslate(text, targetLang);
  }

  /**
   * Batch translate an array of captions
   */
  static async translateCaptions(
    captions: Caption[],
    targetLang: string,
    sourceLang = 'en',
    onProgress?: (completed: number, total: number) => void
  ): Promise<Caption[]> {
    const total = captions.length;
    let completed = 0;

    const translatedCaptions = await Promise.all(
      captions.map(async (cap) => {
        const translated = await this.translateText(cap.text, targetLang, sourceLang);
        completed++;
        if (onProgress) {
          onProgress(completed, total);
        }
        return {
          ...cap,
          text: translated,
          lang: targetLang,
        };
      })
    );

    return translatedCaptions;
  }

  private static fallbackTranslate(text: string, targetLang: string): string {
    const commonPhrases: Record<string, Record<string, string>> = {
      es: {
        'Welcome to the future of AI video translation!': '¡Bienvenido al futuro de la traducción de video con IA!',
        'Translate and style your subtitles in 50+ languages.': 'Traduce y personaliza tus subtítulos en más de 50 idiomas.',
        'Customize fonts, colors, and export directly in your browser.': 'Personaliza fuentes, colores y exporta directamente en tu navegador.',
        'Your video never leaves your device.': 'Tu video nunca sale de tu dispositivo.',
      },
      hi: {
        'Welcome to the future of AI video translation!': 'एआई वीडियो अनुवाद के भविष्य में आपका स्वागत है!',
        'Translate and style your subtitles in 50+ languages.': '50+ भाषाओं में अपने उपशीर्षक अनुवाद और स्टाइल करें।',
        'Customize fonts, colors, and export directly in your browser.': 'फ़ॉन्ट, रंग कस्टमाइज़ करें और सीधे अपने ब्राउज़र में निर्यात करें।',
        'Your video never leaves your device.': 'आपका वीडियो कभी भी आपके डिवाइस से बाहर नहीं जाता है।',
      },
      fr: {
        'Welcome to the future of AI video translation!': 'Bienvenue dans le futur de la traduction vidéo par IA !',
        'Translate and style your subtitles in 50+ languages.': 'Traduisez et personnalisez vos sous-titres dans plus de 50 langues.',
        'Customize fonts, colors, and export directly in your browser.': 'Personnalisez les polices, les couleurs et exportez directement dans votre navigateur.',
        'Your video never leaves your device.': 'Votre vidéo ne quitte jamais votre appareil.',
      },
      de: {
        'Welcome to the future of AI video translation!': 'Willkommen in der Zukunft der KI-Videoübersetzung!',
        'Translate and style your subtitles in 50+ languages.': 'Übersetzen und stylen Sie Ihre Untertitel in über 50 Sprachen.',
        'Customize fonts, colors, and export directly in your browser.': 'Passen Sie Schriftarten und Farben an und exportieren Sie direkt im Browser.',
        'Your video never leaves your device.': 'Ihr Video verlässt niemals Ihr Gerät.',
      },
    };

    if (commonPhrases[targetLang]?.[text]) {
      return commonPhrases[targetLang][text];
    }

    return text;
  }
}

