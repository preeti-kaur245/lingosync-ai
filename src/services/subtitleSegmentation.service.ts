import { Caption, SubtitleWord } from '../types';

export interface SegmentationOptions {
  maxWordsPerCue?: number;
  maxCharsPerCue?: number;
  maxDurationPerCue?: number; // seconds
  minDurationPerCue?: number; // seconds
  pauseThreshold?: number;    // seconds between words to force a cue break
}

export class SubtitleSegmentationService {
  private static defaultOptions: Required<SegmentationOptions> = {
    maxWordsPerCue: 7,
    maxCharsPerCue: 42,
    maxDurationPerCue: 4.0,
    minDurationPerCue: 0.8,
    pauseThreshold: 0.45,
  };

  /**
   * Groups precision word-level timestamps into readable, naturally phrased subtitle cues.
   */
  static segmentWordsIntoCues(
    words: SubtitleWord[],
    userOptions?: SegmentationOptions
  ): Caption[] {
    if (!words || words.length === 0) return [];

    const opts = { ...this.defaultOptions, ...userOptions };
    const captions: Caption[] = [];

    let currentWords: SubtitleWord[] = [];
    let currentCueStart = words[0].start;

    for (let i = 0; i < words.length; i++) {
      const word = words[i];
      const nextWord = words[i + 1];
      currentWords.push(word);

      const cueText = currentWords.map((w) => w.text).join(' ').trim();
      const cueDuration = word.end - currentCueStart;

      // Check break conditions
      const hasTerminalPunctuation = /[.?!]$/.test(word.text);
      const hasPausePunctuation = /[,;:-]$/.test(word.text);
      const hasLongPause = nextWord ? nextWord.start - word.end >= opts.pauseThreshold : true;
      const exceedsMaxWords = currentWords.length >= opts.maxWordsPerCue;
      const exceedsMaxChars = cueText.length >= opts.maxCharsPerCue;
      const exceedsMaxDuration = cueDuration >= opts.maxDurationPerCue;
      const meetsMinDuration = cueDuration >= opts.minDurationPerCue;

      const shouldBreak =
        !nextWord || // Last word
        (hasTerminalPunctuation && meetsMinDuration) ||
        (hasLongPause && meetsMinDuration) ||
        (hasPausePunctuation && currentWords.length >= 4) ||
        exceedsMaxWords ||
        exceedsMaxChars ||
        exceedsMaxDuration;

      if (shouldBreak) {
        const cueEnd = Math.max(word.end, currentCueStart + opts.minDurationPerCue);
        captions.push({
          id: `cue_${captions.length + 1}_${Date.now()}`,
          start: parseFloat(currentCueStart.toFixed(2)),
          end: parseFloat(cueEnd.toFixed(2)),
          text: cueText,
          words: [...currentWords],
        });

        currentWords = [];
        if (nextWord) {
          currentCueStart = nextWord.start;
        }
      }
    }

    return this.validateAndSanitizeCaptions(captions);
  }

  /**
   * Parse OpenAI Whisper verbose JSON output (supports word-level and segment-level timestamps)
   */
  static parseWhisperVerbose(data: any, videoDuration: number): Caption[] {
    // 1. If word-level timestamps are available, use intelligent word segmentation
    if (data.words && Array.isArray(data.words) && data.words.length > 0) {
      const words: SubtitleWord[] = data.words.map((w: any) => ({
        text: (w.word || w.text || '').trim(),
        start: parseFloat(w.start || 0),
        end: parseFloat(w.end || w.start + 0.3),
      }));

      return this.segmentWordsIntoCues(words);
    }

    // 2. If segment-level timestamps are returned
    if (data.segments && Array.isArray(data.segments) && data.segments.length > 0) {
      const captions: Caption[] = data.segments.map((s: any, idx: number) => ({
        id: `whisper_seg_${idx + 1}_${Date.now()}`,
        start: parseFloat((s.start || 0).toFixed(2)),
        end: parseFloat((s.end || s.start + 2.0).toFixed(2)),
        text: (s.text || '').trim(),
      }));

      return this.validateAndSanitizeCaptions(captions, videoDuration);
    }

    // 3. Fallback if single text block
    if (data.text) {
      return this.segmentPlainText(data.text, videoDuration);
    }

    return [];
  }

  /**
   * Split plain-text transcript across audio duration cleanly at punctuation/sentence boundaries.
   */
  static segmentPlainText(fullText: string, totalDuration: number): Caption[] {
    if (!fullText.trim()) return [];

    // Split sentences using regex matching punctuation
    const rawSentences = fullText.match(/[^.!?]+[.!?]+|\S+/g) || [fullText];
    const sentences = rawSentences.map((s) => s.trim()).filter((s) => s.length > 0);

    const captions: Caption[] = [];
    const validDuration = Math.max(2.0, totalDuration || 15);
    const avgCharsPerSec = Math.max(12, fullText.length / validDuration);

    let currentTime = 0.5;

    for (let i = 0; i < sentences.length && currentTime < validDuration; i++) {
      const sentence = sentences[i];
      const estimatedDuration = Math.max(1.5, Math.min(4.5, sentence.length / avgCharsPerSec));
      const end = Math.min(validDuration, currentTime + estimatedDuration);

      captions.push({
        id: `cue_plain_${i + 1}_${Date.now()}`,
        start: parseFloat(currentTime.toFixed(2)),
        end: parseFloat(end.toFixed(2)),
        text: sentence,
      });

      currentTime = end + 0.2;
    }

    return captions;
  }

  /**
   * Timing validation and overlap resolution.
   * Ensures start < end, non-overlapping cues, and strictly valid ranges.
   */
  static validateAndSanitizeCaptions(captions: Caption[], maxDuration?: number): Caption[] {
    if (!captions || captions.length === 0) return [];

    // Sort by start time
    const sorted = [...captions].sort((a, b) => a.start - b.start);
    const sanitized: Caption[] = [];

    for (let i = 0; i < sorted.length; i++) {
      const current = sorted[i];
      let start = Math.max(0, current.start);
      let end = Math.max(start + 0.4, current.end);

      // Clamp to max duration if provided
      if (maxDuration && maxDuration > 0) {
        start = Math.min(start, maxDuration);
        end = Math.min(end, maxDuration);
      }

      // Avoid overlap with preceding cue
      if (sanitized.length > 0) {
        const prev = sanitized[sanitized.length - 1];
        if (prev.end > start) {
          // Adjust previous end or current start
          if (start - prev.start >= 0.5) {
            prev.end = start - 0.05;
          } else {
            start = prev.end + 0.05;
            end = Math.max(start + 0.5, end);
          }
        }
      }

      if (start < end && current.text.trim()) {
        sanitized.push({
          ...current,
          start: parseFloat(start.toFixed(2)),
          end: parseFloat(end.toFixed(2)),
          text: current.text.trim(),
        });
      }
    }

    return sanitized;
  }
}
