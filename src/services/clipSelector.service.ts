import { Caption, ClipConfig, CandidateClip, ShortClip } from '../types';

export class ClipSelectorService {
  static readonly OLLAMA_URL = 'http://127.0.0.1:11434';

  /**
   * Determine min and max duration from config
   */
  static getDurationRange(config: ClipConfig): { min: number; max: number } {
    switch (config.durationOption) {
      case '15-30':
        return { min: 15, max: 30 };
      case '30-45':
        return { min: 30, max: 45 };
      case '45-60':
        return { min: 45, max: 60 };
      case '60-90':
        return { min: 60, max: 90 };
      case 'custom':
        return {
          min: Math.max(10, config.customDurationMin || 15),
          max: Math.max(15, config.customDurationMax || 30),
        };
      default:
        return { min: 20, max: 35 };
    }
  }

  /**
   * Check if local Ollama server is reachable and get available models
   */
  static async checkOllama(): Promise<{ available: boolean; models: string[] }> {
    if (typeof window === 'undefined') return { available: false, models: [] };
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 1200);
      const res = await fetch(`${this.OLLAMA_URL}/api/tags`, { signal: controller.signal });
      clearTimeout(timer);
      if (res.ok) {
        const data = await res.json().catch(() => ({}));
        const models = (data.models || []).map((m: any) => m.name);
        return { available: true, models };
      }
      return { available: false, models: [] };
    } catch {
      return { available: false, models: [] };
    }
  }

  /**
   * Select top clips based on transcript, criteria, and target duration
   */
  static async selectCandidates(
    captions: Caption[],
    videoDuration: number,
    config: ClipConfig
  ): Promise<CandidateClip[]> {
    if (!captions || captions.length === 0) return [];

    const durationRange = this.getDurationRange(config);

    // 1. If manual selection was requested
    if (config.criteria === 'manual' && config.manualRange) {
      return [this.createManualCandidate(captions, videoDuration, config.manualRange)];
    }

    // 2. Try Ollama local AI model if available and has models
    const ollamaStatus = await this.checkOllama();
    if (ollamaStatus.available && ollamaStatus.models.length > 0) {
      try {
        const aiCandidates = await this.selectWithOllama(
          captions,
          videoDuration,
          config,
          durationRange,
          ollamaStatus.models[0]
        );
        if (aiCandidates.length > 0) {
          return aiCandidates;
        }
      } catch (err) {
        console.warn('Ollama candidate selection failed, using rule-based engine:', err);
      }
    }

    // 3. Deterministic rule-based fallback (sentence boundaries, speech density, diversity filter)
    return this.selectRuleBasedCandidates(captions, videoDuration, config, durationRange);
  }

  /**
   * Query local Ollama for structured highlight suggestions
   */
  private static async selectWithOllama(
    captions: Caption[],
    videoDuration: number,
    config: ClipConfig,
    range: { min: number; max: number },
    modelName: string
  ): Promise<CandidateClip[]> {
    const formattedTranscript = captions
      .map((c) => `[${c.start.toFixed(1)}s - ${c.end.toFixed(1)}s] ${c.text.trim()}`)
      .join('\n');

    const prompt = `You are a professional video editor identifying compelling short clips for YouTube Shorts, Reels, and TikTok.
Source video duration: ${videoDuration.toFixed(1)}s.
Clip criteria: ${config.criteria}
Target clip duration: between ${range.min} and ${range.max} seconds.
Requested number of clips: ${config.numClips}.

Transcript:
${formattedTranscript}

Identify up to ${config.numClips} distinct, non-overlapping candidate segments that:
1. Start with a strong hook or question.
2. Are narrative or informational complete standalone units.
3. Have duration between ${range.min}s and ${range.max}s.
4. Align with actual transcript start and end timestamps.

Output ONLY a JSON array with no extra explanation:
[
  {
    "title": "Short punchy title",
    "start": 12.5,
    "end": 38.0,
    "reason": "Strong opening hook answering common question",
    "hook_score": 88,
    "clarity_score": 92
  }
]`;

    const res = await fetch(`${this.OLLAMA_URL}/api/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: modelName,
        prompt,
        stream: false,
        format: 'json',
      }),
    });

    if (!res.ok) throw new Error('Ollama generation failed');

    const data = await res.json();
    const parsed = JSON.parse(data.response);

    if (!Array.isArray(parsed)) return [];

    // Programmatically validate and snap each candidate to actual transcript word boundaries
    const validated: CandidateClip[] = [];

    for (const item of parsed) {
      if (typeof item.start !== 'number' || typeof item.end !== 'number') continue;
      const snapped = this.snapToSentenceBoundaries(captions, item.start, item.end, videoDuration);
      const dur = snapped.end - snapped.start;

      if (dur >= range.min * 0.8 && dur <= range.max * 1.25) {
        // Ensure no overlap with previously selected
        const overlaps = validated.some(
          (v) => Math.max(v.start, snapped.start) < Math.min(v.end, snapped.end)
        );

        if (!overlaps) {
          const snippet = this.getTranscriptSnippet(captions, snapped.start, snapped.end);
          validated.push({
            id: `clip_ai_${validated.length + 1}_${Date.now()}`,
            title: item.title || `Highlight #${validated.length + 1}`,
            start: snapped.start,
            end: snapped.end,
            duration: parseFloat(dur.toFixed(1)),
            reason: item.reason || 'AI-identified standalone highlight',
            source: 'ai',
            scores: {
              hook: item.hook_score || 85,
              clarity: item.clarity_score || 90,
              value: 88,
              completeness: 90,
              overall: Math.round(((item.hook_score || 85) + (item.clarity_score || 90) + 88 + 90) / 4),
            },
            transcriptSnippet: snippet,
          });
        }
      }

      if (validated.length >= config.numClips) break;
    }

    return validated;
  }

  /**
   * Deterministic rule-based candidate selection algorithm
   * Evaluates question openings, pause thresholds, sentence completeness, and temporal diversity
   */
  static selectRuleBasedCandidates(
    captions: Caption[],
    videoDuration: number,
    config: ClipConfig,
    range: { min: number; max: number }
  ): CandidateClip[] {
    const targetCount = Math.max(1, config.numClips || 3);
    const candidates: CandidateClip[] = [];

    // 1. Group captions into complete sentences or clauses
    const sentences = this.groupIntoSentences(captions);
    if (sentences.length === 0) return [];

    // 2. Partition the video timeline to guarantee temporal diversity (don't bunch all clips at start)
    const partitionDuration = videoDuration / targetCount;

    for (let part = 0; part < targetCount; part++) {
      const partStart = part * partitionDuration;
      const partEnd = Math.min(videoDuration, (part + 1) * partitionDuration);

      // Find best sentence sequence inside or starting in this partition
      let bestSequence: { start: number; end: number; score: number; reason: string; text: string } | null = null;

      for (let i = 0; i < sentences.length; i++) {
        const startSentence = sentences[i];
        if (startSentence.start < partStart - 5 && part > 0) continue;
        if (startSentence.start > partEnd) break;

        let accumEnd = startSentence.end;
        let accumText = startSentence.text;
        let sentenceCount = 1;

        for (let j = i + 1; j < sentences.length; j++) {
          const nextSentence = sentences[j];
          const newDur = nextSentence.end - startSentence.start;

          if (newDur > range.max) break;

          accumEnd = nextSentence.end;
          accumText += ' ' + nextSentence.text;
          sentenceCount++;

          if (newDur >= range.min) {
            // Score this candidate window
            const { score, reason } = this.scoreWindow(startSentence.text, accumText, newDur, config.criteria);

            // Avoid overlapping with existing selected candidates
            const overlaps = candidates.some(
              (c) => Math.max(c.start, startSentence.start) < Math.min(c.end, accumEnd)
            );

            if (!overlaps) {
              if (!bestSequence || score > bestSequence.score) {
                bestSequence = {
                  start: startSentence.start,
                  end: accumEnd,
                  score,
                  reason,
                  text: accumText,
                };
              }
            }
          }
        }
      }

      if (bestSequence) {
        candidates.push({
          id: `clip_rule_${candidates.length + 1}_${Date.now()}`,
          title: this.generateClipTitle(bestSequence.text, candidates.length + 1),
          start: parseFloat(bestSequence.start.toFixed(1)),
          end: parseFloat(bestSequence.end.toFixed(1)),
          duration: parseFloat((bestSequence.end - bestSequence.start).toFixed(1)),
          reason: bestSequence.reason,
          source: 'rule_based',
          scores: {
            hook: Math.round(bestSequence.score * 0.95),
            clarity: 92,
            value: 90,
            completeness: 94,
            overall: bestSequence.score,
          },
          transcriptSnippet: bestSequence.text.slice(0, 160) + (bestSequence.text.length > 160 ? '...' : ''),
        });
      }
    }

    // 3. Fallback: if partitions didn't yield enough clips, fill up greedily
    if (candidates.length < targetCount) {
      for (let i = 0; i < sentences.length && candidates.length < targetCount; i++) {
        const s = sentences[i];
        for (let j = i + 1; j < sentences.length; j++) {
          const dur = sentences[j].end - s.start;
          if (dur >= range.min && dur <= range.max) {
            const overlaps = candidates.some(
              (c) => Math.max(c.start, s.start) < Math.min(c.end, sentences[j].end)
            );
            if (!overlaps) {
              const text = sentences.slice(i, j + 1).map((x) => x.text).join(' ');
              candidates.push({
                id: `clip_rule_${candidates.length + 1}_${Date.now()}`,
                title: this.generateClipTitle(text, candidates.length + 1),
                start: parseFloat(s.start.toFixed(1)),
                end: parseFloat(sentences[j].end.toFixed(1)),
                duration: parseFloat(dur.toFixed(1)),
                reason: 'Rule-based sentence sequence matching duration constraints',
                source: 'rule_based',
                scores: {
                  hook: 82,
                  clarity: 88,
                  value: 85,
                  completeness: 90,
                  overall: 86,
                },
                transcriptSnippet: text.slice(0, 160) + (text.length > 160 ? '...' : ''),
              });
              break;
            }
          }
        }
      }
    }

    return candidates.sort((a, b) => a.start - b.start);
  }

  /**
   * Rule-based scoring function for candidate speech windows
   */
  private static scoreWindow(
    openingText: string,
    fullText: string,
    duration: number,
    criteria: string
  ): { score: number; reason: string } {
    let score = 75;
    let reason = 'Sentence boundary narrative';

    // Hook indicators
    const isQuestion = /^(why|how|what|did|can|is|are|do|have|where|when|who)\b/i.test(openingText.trim()) || openingText.includes('?');
    if (isQuestion) {
      score += 15;
      reason = 'Opens with an engaging question';
    }

    const hookPhrases = ['notice that', 'the biggest', 'here is why', 'secret', 'important', 'let me show', 'look at', 'the truth', 'remember', 'always'];
    for (const hp of hookPhrases) {
      if (openingText.toLowerCase().includes(hp)) {
        score += 12;
        reason = `Strong hook cue ("${hp}")`;
        break;
      }
    }

    // Criteria alignments
    if (criteria === 'educational' && /(learn|how to|because|step|method|technique|example|understand)/i.test(fullText)) {
      score += 10;
      reason = 'Informative explanation passage';
    } else if (criteria === 'stories' && /(i remember|one day|when i|story|happened|first time|then we)/i.test(fullText)) {
      score += 10;
      reason = 'Personal story or narrative arc';
    } else if (criteria === 'qa' && (fullText.includes('?') || isQuestion)) {
      score += 12;
      reason = 'Question and answer moment';
    } else if (criteria === 'entertaining' && /(funny|crazy|unbelievable|wow|amazing|hilarious|shocking)/i.test(fullText)) {
      score += 10;
      reason = 'High-energy engaging moment';
    }

    // Terminal punctuation check (ends with period/exclamation rather than mid-sentence)
    if (/[.!?]$/.test(fullText.trim())) {
      score += 5;
    }

    return { score: Math.min(98, score), reason };
  }

  /**
   * Group sequential captions into sentence-level blocks
   */
  private static groupIntoSentences(captions: Caption[]): { start: number; end: number; text: string }[] {
    const result: { start: number; end: number; text: string }[] = [];
    let currentStart = captions[0].start;
    let currentEnd = captions[0].end;
    let currentText = '';

    for (let i = 0; i < captions.length; i++) {
      const cap = captions[i];
      if (!currentText) {
        currentStart = cap.start;
      }
      currentText += (currentText ? ' ' : '') + cap.text.trim();
      currentEnd = cap.end;

      const isTerminal = /[.!?]$/.test(cap.text.trim());
      const nextCap = captions[i + 1];
      const hasLongPause = nextCap ? nextCap.start - cap.end >= 0.7 : true;

      if (isTerminal || hasLongPause || i === captions.length - 1) {
        result.push({
          start: currentStart,
          end: currentEnd,
          text: currentText,
        });
        currentText = '';
      }
    }

    return result;
  }

  /**
   * Snap time range to exact sentence start and end boundaries
   */
  private static snapToSentenceBoundaries(
    captions: Caption[],
    requestedStart: number,
    requestedEnd: number,
    videoDuration: number
  ): { start: number; end: number } {
    let start = Math.max(0, requestedStart);
    let end = Math.min(videoDuration, requestedEnd);

    // Find caption closest to requestedStart
    for (const c of captions) {
      if (Math.abs(c.start - requestedStart) < 2.0) {
        start = c.start;
        break;
      }
    }

    // Find caption closest to requestedEnd
    for (let i = captions.length - 1; i >= 0; i--) {
      const c = captions[i];
      if (Math.abs(c.end - requestedEnd) < 2.0) {
        end = c.end;
        break;
      }
    }

    return {
      start: parseFloat(start.toFixed(1)),
      end: parseFloat(end.toFixed(1)),
    };
  }

  /**
   * Extract snippet text between start and end
   */
  private static getTranscriptSnippet(captions: Caption[], start: number, end: number): string {
    const text = captions
      .filter((c) => c.end > start && c.start < end)
      .map((c) => c.text.trim())
      .join(' ');
    return text.slice(0, 160) + (text.length > 160 ? '...' : '');
  }

  /**
   * Generate a readable punchy title from transcript snippet
   */
  private static generateClipTitle(text: string, index: number): string {
    const clean = text.replace(/[^a-zA-Z0-9\s]/g, '').trim();
    const words = clean.split(/\s+/).slice(0, 6);
    if (words.length >= 3) {
      return words.join(' ');
    }
    return `Short Clip #${index}`;
  }

  /**
   * Create candidate for manually selected range
   */
  private static createManualCandidate(
    captions: Caption[],
    videoDuration: number,
    range: { start: number; end: number }
  ): CandidateClip {
    const start = Math.max(0, Math.min(videoDuration, range.start));
    const end = Math.max(start + 5, Math.min(videoDuration, range.end));
    const snippet = this.getTranscriptSnippet(captions, start, end);

    return {
      id: `clip_manual_${Date.now()}`,
      title: 'Custom Selected Range',
      start: parseFloat(start.toFixed(1)),
      end: parseFloat(end.toFixed(1)),
      duration: parseFloat((end - start).toFixed(1)),
      reason: 'User manual range selection',
      source: 'manual',
      scores: {
        hook: 90,
        clarity: 95,
        value: 90,
        completeness: 95,
        overall: 93,
      },
      transcriptSnippet: snippet,
    };
  }
}

