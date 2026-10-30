import { Caption, ClipConfig, CandidateClip, ShortClip, AspectRatio, SubtitleStyle } from '../types';
import { SubtitleLayoutService } from './subtitleLayout.service';
import { ExportService } from './export.service';

export class ClipGeneratorService {
  static readonly SERVER_URL = 'http://127.0.0.1:8000';

  /**
   * Retime subtitle captions to a new clip timeline origin: t_new = t - s
   * Only retains subtitles that overlap the clip boundary [clipStart, clipEnd]
   */
  static retimeCaptions(captions: Caption[], clipStart: number, clipEnd: number): Caption[] {
    const retimed: Caption[] = [];
    const clipDuration = clipEnd - clipStart;

    for (const cap of captions) {
      // Overlap check
      if (cap.end > clipStart && cap.start < clipEnd) {
        const newStart = Math.max(0, cap.start - clipStart);
        const newEnd = Math.min(clipDuration, cap.end - clipStart);

        if (newEnd - newStart >= 0.2) {
          const retimedWords = cap.words
            ? cap.words
                .filter((w) => w.end > clipStart && w.start < clipEnd)
                .map((w) => ({
                  text: w.text,
                  start: parseFloat(Math.max(0, w.start - clipStart).toFixed(2)),
                  end: parseFloat(Math.min(clipDuration, w.end - clipStart).toFixed(2)),
                }))
            : undefined;

          retimed.push({
            id: `retimed_${cap.id}_${retimed.length + 1}`,
            start: parseFloat(newStart.toFixed(2)),
            end: parseFloat(newEnd.toFixed(2)),
            text: cap.text.trim(),
            words: retimedWords,
          });
        }
      }
    }

    return retimed;
  }

  /**
   * Check if local Python FFmpeg backend server is running
   */
  static async checkBackendHealth(): Promise<boolean> {
    if (typeof window === 'undefined') return false;
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 1000);
      const res = await fetch(`${this.SERVER_URL}/health`, { signal: controller.signal });
      clearTimeout(timer);
      return res.ok;
    } catch {
      return false;
    }
  }

  /**
   * Render a single short clip using either the local Python FFmpeg backend or in-browser Canvas 2D
   */
  static async renderClip(
    candidate: CandidateClip,
    config: ClipConfig,
    sourceCaptions: Caption[],
    videoElement: HTMLVideoElement,
    onProgress: (pct: number, stageText: string) => void
  ): Promise<ShortClip> {
    const targetAspect: AspectRatio =
      config.aspectRatio === '9:16'
        ? '9:16'
        : config.aspectRatio === '1:1'
        ? '1:1'
        : '16:9';

    // 1. Calculate retimed subtitles
    onProgress(15, 'Retiming subtitles for clip...');
    const retimedCaptions = this.retimeCaptions(sourceCaptions, candidate.start, candidate.end);

    const clipResult: ShortClip = {
      ...candidate,
      captions: retimedCaptions,
      status: 'processing',
      progress: 20,
      aspectRatio: targetAspect,
    };

    // 2. Render video with burned-in subtitles & aspect reframing
    onProgress(30, 'Rendering video segment & reframing...');
    try {
      const blobUrl = await this.renderInBrowserCanvas(
        videoElement,
        candidate.start,
        candidate.end,
        retimedCaptions,
        config.subtitleStyle,
        targetAspect,
        config.reframingMode || 'center_crop',
        config.burnSubtitles,
        (progressPercent) => {
          onProgress(
            30 + Math.round(progressPercent * 0.65),
            `Rendering frames (${progressPercent}%)...`
          );
        }
      );

      clipResult.status = 'ready';
      clipResult.progress = 100;
      clipResult.videoBlobUrl = blobUrl;
      clipResult.downloadUrl = blobUrl;
      onProgress(100, 'Clip ready!');
      return clipResult;
    } catch (err: any) {
      console.error(`Clip rendering failed for ${candidate.title}:`, err);
      clipResult.status = 'failed';
      clipResult.error = err.message || 'Rendering failed';
      throw err;
    }
  }

  /**
   * In-Browser High-Performance Canvas 2D Video Cutter & Reframer
   * Works on any platform with zero backend dependency.
   */
  private static renderInBrowserCanvas(
    sourceVideo: HTMLVideoElement,
    clipStart: number,
    clipEnd: number,
    retimedCaptions: Caption[],
    style: SubtitleStyle,
    targetAspect: AspectRatio,
    reframingMode: 'center_crop' | 'blurred_background',
    burnSubtitles: boolean,
    onProgress: (pct: number) => void
  ): Promise<string> {
    return new Promise(async (resolve, reject) => {
      try {
        const clipDuration = clipEnd - clipStart;
        if (clipDuration <= 0) {
          throw new Error('Invalid clip duration');
        }

        // Target canvas resolution
        let canvasW = 1080;
        let canvasH = 1920; // 9:16 default
        if (targetAspect === '1:1') {
          canvasW = 1080;
          canvasH = 1080;
        } else if (targetAspect === '16:9') {
          canvasW = 1920;
          canvasH = 1080;
        }

        const canvas = document.createElement('canvas');
        canvas.width = canvasW;
        canvas.height = canvasH;
        const ctx = canvas.getContext('2d', { alpha: false });
        if (!ctx) throw new Error('Could not get 2D canvas context');

        // Capture canvas stream at 30fps
        const stream = canvas.captureStream(30);

        // Include audio from source video if available
        try {
          // @ts-ignore
          const videoStream = sourceVideo.captureStream ? sourceVideo.captureStream() : (sourceVideo as any).mozCaptureStream ? (sourceVideo as any).mozCaptureStream() : null;
          if (videoStream) {
            const tracks = videoStream.getAudioTracks();
            if (tracks && tracks.length > 0 && tracks[0]) {
              stream.addTrack(tracks[0] as MediaStreamTrack);
            }
          }
        } catch (e) {
          console.warn('Could not extract direct audio track, video will render with canvas audio track:', e);
        }

        // Initialize MediaRecorder
        const mimeTypes = [
          'video/webm;codecs=vp9,opus',
          'video/webm;codecs=vp8,opus',
          'video/webm',
          'video/mp4',
        ];
        let supportedMime = mimeTypes.find((m) => MediaRecorder.isTypeSupported(m)) || 'video/webm';
        const recorder = new MediaRecorder(stream, {
          mimeType: supportedMime,
          videoBitsPerSecond: 6000000,
        });

        const chunks: Blob[] = [];
        recorder.ondataavailable = (e) => {
          if (e.data && e.data.size > 0) chunks.push(e.data);
        };

        recorder.onstop = () => {
          const finalBlob = new Blob(chunks, { type: supportedMime });
          const url = URL.createObjectURL(finalBlob);
          resolve(url);
        };

        recorder.onerror = (e) => reject(e);

        // Step through video frames precisely
        const originalTime = sourceVideo.currentTime;
        const originalMuted = sourceVideo.muted;

        sourceVideo.muted = true;
        sourceVideo.currentTime = clipStart;

        await new Promise((res) => {
          const onSeeked = () => {
            sourceVideo.removeEventListener('seeked', onSeeked);
            res(true);
          };
          sourceVideo.addEventListener('seeked', onSeeked);
        });

        recorder.start();

        const srcW = sourceVideo.videoWidth || 1920;
        const srcH = sourceVideo.videoHeight || 1080;
        const srcRatio = srcW / srcH;
        const targetRatio = canvasW / canvasH;

        const fps = 30;
        const totalFrames = Math.round(clipDuration * fps);
        let frameCount = 0;

        const renderFrame = () => {
          if (frameCount >= totalFrames) {
            recorder.stop();
            sourceVideo.currentTime = originalTime;
            sourceVideo.muted = originalMuted;
            return;
          }

          const relativeTime = frameCount / fps;
          sourceVideo.currentTime = clipStart + relativeTime;

          // Clear frame
          ctx.fillStyle = '#000000';
          ctx.fillRect(0, 0, canvasW, canvasH);

          // 1. Draw video background / reframing
          if (reframingMode === 'blurred_background' && Math.abs(srcRatio - targetRatio) > 0.05) {
            // Draw blurred background filling entire canvas
            ctx.save();
            ctx.filter = 'blur(25px) brightness(0.6)';
            ctx.drawImage(sourceVideo, -50, -50, canvasW + 100, canvasH + 100);
            ctx.restore();

            // Draw crisp centered video fitted inside target frame
            let drawW = canvasW;
            let drawH = canvasW / srcRatio;
            if (drawH > canvasH) {
              drawH = canvasH;
              drawW = canvasH * srcRatio;
            }
            const drawX = (canvasW - drawW) / 2;
            const drawY = (canvasH - drawH) / 2;
            ctx.drawImage(sourceVideo, drawX, drawY, drawW, drawH);
          } else {
            // Center Crop reframing
            let scale = Math.max(canvasW / srcW, canvasH / srcH);
            let drawW = srcW * scale;
            let drawH = srcH * scale;
            let drawX = (canvasW - drawW) / 2;
            let drawY = (canvasH - drawH) / 2;
            ctx.drawImage(sourceVideo, drawX, drawY, drawW, drawH);
          }

          // 2. Draw Burned-in Subtitles with SubtitleLayoutService
          if (burnSubtitles) {
            const activeCap = retimedCaptions.find(
              (c) => relativeTime >= c.start && relativeTime <= c.end
            );

            if (activeCap) {
              const layout = SubtitleLayoutService.computeLayout({
                text: activeCap.text,
                viewportWidth: canvasW,
                viewportHeight: canvasH,
                style,
                aspectRatio: targetAspect,
              });

              // Background box
              if (style.backgroundColor && style.backgroundColor !== 'transparent') {
                ctx.save();
                ctx.fillStyle = style.backgroundColor;
                const r = Math.round(style.backgroundRadius * layout.scaleFactor);
                ctx.beginPath();
                ctx.roundRect(layout.boxX, layout.boxY, layout.boxWidth, layout.boxHeight, r);
                ctx.fill();
                ctx.restore();
              }

              // Text lines
              ctx.save();
              ctx.font = `${style.fontWeight || '700'} ${layout.fontSize}px "${style.fontFamily}", sans-serif`;
              ctx.textAlign = 'center';
              ctx.textBaseline = 'middle';

              layout.lines.forEach((line, idx) => {
                const lineY = layout.y + idx * layout.lineHeight;

                // Shadow
                if (style.shadowBlur > 0) {
                  ctx.shadowColor = style.shadowColor || 'rgba(0,0,0,0.8)';
                  ctx.shadowBlur = style.shadowBlur * layout.scaleFactor;
                  ctx.shadowOffsetY = style.shadowOffsetY * layout.scaleFactor;
                }

                // Stroke
                if (style.strokeWidth > 0 && style.strokeColor !== 'transparent') {
                  ctx.strokeStyle = style.strokeColor;
                  ctx.lineWidth = style.strokeWidth * layout.scaleFactor * 2;
                  ctx.lineJoin = 'round';
                  ctx.strokeText(line, layout.x, lineY);
                }

                // Fill Text
                ctx.fillStyle = style.color;
                ctx.fillText(line, layout.x, lineY);
              });
              ctx.restore();
            }
          }

          frameCount++;
          if (frameCount % 6 === 0) {
            onProgress(Math.round((frameCount / totalFrames) * 100));
          }

          setTimeout(renderFrame, 1000 / fps);
        };

        renderFrame();
      } catch (err) {
        reject(err);
      }
    });
  }
}
