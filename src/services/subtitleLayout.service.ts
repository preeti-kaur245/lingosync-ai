import { SubtitleStyle, ComputedSubtitleLayout, AspectRatio } from '../types';

export class SubtitleLayoutService {
  // Shared offscreen canvas for accurate text measurement
  private static measurementCanvas: HTMLCanvasElement | null = null;
  private static measurementCtx: CanvasRenderingContext2D | null = null;

  private static getContext(): CanvasRenderingContext2D | null {
    if (typeof window === 'undefined') return null;
    if (!this.measurementCtx) {
      this.measurementCanvas = document.createElement('canvas');
      this.measurementCtx = this.measurementCanvas.getContext('2d');
    }
    return this.measurementCtx;
  }

  /**
   * Main Layout Calculator
   * Computes exact lines, font size, coordinates, and bounding box dimensions.
   * Can be consumed by BOTH HTML/CSS Preview and Canvas 2D Video Exporter.
   */
  static computeLayout(params: {
    text: string;
    viewportWidth: number;
    viewportHeight: number;
    style: SubtitleStyle;
    aspectRatio?: AspectRatio;
  }): ComputedSubtitleLayout {
    const { text, viewportWidth, viewportHeight, style, aspectRatio = '16:9' } = params;

    // 1. Determine safe dimensions and reference coordinate space
    const isVertical = aspectRatio === '9:16' || viewportHeight > viewportWidth * 1.1;
    const isSquare = aspectRatio === '1:1' || Math.abs(viewportWidth - viewportHeight) < 20;

    // Reference dimension: in 9:16 vertical, width is the constrained dimension; in 16:9, height is constrained.
    // Normalizing against a 720p base (height 720 in landscape, width 720 in portrait).
    const baseDimension = isVertical ? viewportWidth : viewportHeight;
    const scaleFactor = Math.max(0.2, baseDimension / 720);

    // 2. Base font size calculation
    let calculatedFontSize: number;
    if (style.autoSize) {
      // Relative adaptive scaling: ~4.5% of height for landscape, ~5.2% of width for vertical
      const basePercent = isVertical ? 0.052 : 0.046;
      calculatedFontSize = Math.round(baseDimension * basePercent);
    } else {
      calculatedFontSize = Math.round(style.fontSize * scaleFactor);
    }

    // Apply sensible clamping limits based on viewport
    const minFontSize = Math.max(12, Math.round(14 * scaleFactor));
    const maxFontSize = Math.max(minFontSize, Math.round(isVertical ? 48 * scaleFactor : 58 * scaleFactor));
    calculatedFontSize = Math.max(minFontSize, Math.min(maxFontSize, calculatedFontSize));

    // 3. Calculate safe margins and max text width
    const maxWidthPercent = (style.maxWidthPercent || 86) / 100;
    const marginX = Math.round(viewportWidth * ((1 - maxWidthPercent) / 2));
    const maxAvailableWidth = viewportWidth - marginX * 2;

    // Safe area margins for platforms
    let safeMarginBottomPercent = style.yOffset || 10;
    if (style.safeAreaPreset === 'tiktok_reels' && isVertical) {
      // TikTok, Reels, Shorts UI takes up the bottom ~20%
      safeMarginBottomPercent = Math.max(22, style.yOffset || 22);
    }

    // 4. Transform text if needed
    let processedText = text || '';
    if (style.textTransform === 'uppercase') processedText = processedText.toUpperCase();
    if (style.textTransform === 'lowercase') processedText = processedText.toLowerCase();

    // 5. Intelligent line wrapping with font size adjustment
    const maxLines = style.maxLines || 2;
    let lines: string[] = [];
    let currentFontSize = calculatedFontSize;
    let measurementCtx = this.getContext();

    // Loop with font size reduction fallback if text exceeds maxLines and max width
    for (let attempt = 0; attempt < 4; attempt++) {
      if (measurementCtx) {
        measurementCtx.font = `${style.fontWeight || '700'} ${currentFontSize}px "${style.fontFamily}", sans-serif`;
      }

      lines = this.breakLinesIntelligently(processedText, maxAvailableWidth, measurementCtx);

      // If text fits in maxLines, break
      if (lines.length <= maxLines || currentFontSize <= minFontSize) {
        break;
      }

      // Otherwise reduce font size by 12% and retry
      currentFontSize = Math.max(minFontSize, Math.round(currentFontSize * 0.88));
    }

    // 6. Measure total text block dimensions
    const lineHeight = Math.round(currentFontSize * 1.32);
    let maxLineWidth = 0;

    if (measurementCtx) {
      measurementCtx.font = `${style.fontWeight || '700'} ${currentFontSize}px "${style.fontFamily}", sans-serif`;
      for (const line of lines) {
        const metrics = measurementCtx.measureText(line);
        if (metrics.width > maxLineWidth) {
          maxLineWidth = metrics.width;
        }
      }
    } else {
      // Heuristic fallback if canvas measurement is unavailable
      maxLineWidth = Math.min(maxAvailableWidth, processedText.length * (currentFontSize * 0.55));
    }

    const totalTextHeight = lines.length * lineHeight;

    // 7. Calculate vertical placement (Center X, Y)
    const x = Math.round(viewportWidth / 2);
    let y = 0;

    const safeMarginY = Math.round(viewportHeight * (safeMarginBottomPercent / 100));

    if (style.position === 'top') {
      y = safeMarginY + lineHeight / 2;
    } else if (style.position === 'center') {
      y = Math.round((viewportHeight - totalTextHeight) / 2) + lineHeight / 2;
    } else {
      // Bottom position (default)
      y = viewportHeight - safeMarginY - totalTextHeight + lineHeight / 2;
    }

    // 8. Calculate background box dimensions (if box enabled)
    const paddingX = Math.round(style.backgroundPadding * scaleFactor * 1.6);
    const paddingY = Math.round(style.backgroundPadding * scaleFactor * 0.8);
    const boxWidth = Math.round(maxLineWidth + paddingX * 2);
    const boxHeight = Math.round(totalTextHeight + paddingY * 2);
    const boxX = Math.round(x - boxWidth / 2);
    const boxY = Math.round(y - lineHeight / 2 - paddingY);

    return {
      lines,
      fontSize: currentFontSize,
      lineHeight,
      totalTextHeight,
      maxLineWidth,
      x,
      y,
      boxWidth,
      boxHeight,
      boxX,
      boxY,
      safeMarginX: marginX,
      safeMarginY,
      scaleFactor,
    };
  }

  /**
   * Natural line breaking algorithm that prefers punctuation boundaries,
   * avoids orphan words, and balances line lengths.
   */
  private static breakLinesIntelligently(
    text: string,
    maxWidth: number,
    ctx: CanvasRenderingContext2D | null
  ): string[] {
    const words = text.split(/\s+/).filter(Boolean);
    if (words.length === 0) return [''];
    if (words.length === 1) return [words[0]];

    const measure = (t: string): number => {
      if (ctx) return ctx.measureText(t).width;
      return t.length * 10;
    };

    // If single line fits comfortably within maxWidth, return single line
    const fullTextWidth = measure(text);
    if (fullTextWidth <= maxWidth) {
      return [text];
    }

    // Try splitting into 2 or more balanced lines
    const lines: string[] = [];
    let currentLine = words[0];

    for (let i = 1; i < words.length; i++) {
      const word = words[i];
      const testLine = `${currentLine} ${word}`;
      const testWidth = measure(testLine);

      if (testWidth <= maxWidth) {
        currentLine = testLine;
      } else {
        lines.push(currentLine);
        currentLine = word;
      }
    }
    if (currentLine) {
      lines.push(currentLine);
    }

    // Balance lines if the last line is an orphan (e.g., 1 short word)
    if (lines.length === 2 && lines[1].split(' ').length === 1) {
      const line0Words = lines[0].split(' ');
      if (line0Words.length > 2) {
        const movedWord = line0Words.pop();
        const balancedLine0 = line0Words.join(' ');
        const balancedLine1 = `${movedWord} ${lines[1]}`;
        if (measure(balancedLine0) <= maxWidth && measure(balancedLine1) <= maxWidth) {
          return [balancedLine0, balancedLine1];
        }
      }
    }

    return lines;
  }
}

