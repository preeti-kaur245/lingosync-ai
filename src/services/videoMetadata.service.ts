import { VideoMetadata, AspectRatio, VideoOrientation } from '../types';

export class VideoMetadataService {
  /**
   * Determine the closest standard Aspect Ratio name from width and height
   */
  static detectAspectRatio(width: number, height: number): { ratio: AspectRatio; value: number } {
    if (!width || !height || height === 0) {
      return { ratio: '16:9', value: 16 / 9 };
    }

    const value = width / height;

    // Tolerance check (± 0.08)
    if (Math.abs(value - 16 / 9) < 0.08) return { ratio: '16:9', value };
    if (Math.abs(value - 9 / 16) < 0.08) return { ratio: '9:16', value };
    if (Math.abs(value - 1.0) < 0.08) return { ratio: '1:1', value };
    if (Math.abs(value - 4 / 5) < 0.08) return { ratio: '4:5', value };

    // Standard aspect ratio fallbacks
    if (value > 1.2) return { ratio: '16:9', value };
    if (value < 0.7) return { ratio: '9:16', value };
    if (value >= 0.7 && value < 0.9) return { ratio: '4:5', value };
    if (value >= 0.9 && value <= 1.1) return { ratio: '1:1', value };

    return { ratio: 'custom', value };
  }

  /**
   * Determine video orientation
   */
  static detectOrientation(width: number, height: number): VideoOrientation {
    if (width > height * 1.05) return 'landscape';
    if (height > width * 1.05) return 'portrait';
    return 'square';
  }

  /**
   * Extract video metadata from a File or Blob
   */
  static async extractMetadata(file: File | Blob): Promise<VideoMetadata> {
    return new Promise((resolve) => {
      const url = URL.createObjectURL(file);
      const video = document.createElement('video');
      video.preload = 'metadata';
      video.muted = true;
      video.playsInline = true;
      video.src = url;

      const fallbackMetadata: VideoMetadata = {
        width: 1280,
        height: 720,
        duration: 15,
        aspectRatio: '16:9',
        aspectRatioValue: 16 / 9,
        orientation: 'landscape',
        thumbnailUrl: '',
      };

      const cleanUp = () => {
        try {
          URL.revokeObjectURL(url);
        } catch {}
      };

      video.onloadedmetadata = () => {
        const width = video.videoWidth || 1280;
        const height = video.videoHeight || 720;
        const duration = video.duration && !isNaN(video.duration) ? video.duration : 15;
        const { ratio, value } = this.detectAspectRatio(width, height);
        const orientation = this.detectOrientation(width, height);

        // Seek a tiny bit to capture a non-black frame for thumbnail
        video.currentTime = Math.min(1.0, duration / 2 || 0.5);

        video.onseeked = () => {
          let thumbnailUrl = '';
          try {
            const canvas = document.createElement('canvas');
            const maxDim = 320;
            let thumbW = width;
            let thumbH = height;

            if (thumbW > maxDim) {
              thumbH = Math.round((thumbH * maxDim) / thumbW);
              thumbW = maxDim;
            }

            canvas.width = Math.max(1, thumbW);
            canvas.height = Math.max(1, thumbH);
            const ctx = canvas.getContext('2d');
            if (ctx) {
              ctx.drawImage(video, 0, 0, thumbW, thumbH);
              thumbnailUrl = canvas.toDataURL('image/jpeg', 0.7);
            }
          } catch {}

          cleanUp();
          resolve({
            width,
            height,
            duration,
            aspectRatio: ratio,
            aspectRatioValue: value,
            orientation,
            thumbnailUrl,
          });
        };
      };

      video.onerror = () => {
        cleanUp();
        resolve(fallbackMetadata);
      };

      // Safety timeout after 4 seconds
      setTimeout(() => {
        cleanUp();
        resolve(fallbackMetadata);
      }, 4000);
    });
  }

  /**
   * Extract metadata from an active HTMLVideoElement
   */
  static extractFromVideoElement(video: HTMLVideoElement): VideoMetadata {
    const width = video.videoWidth || 1280;
    const height = video.videoHeight || 720;
    const duration = video.duration && !isNaN(video.duration) ? video.duration : 15;
    const { ratio, value } = this.detectAspectRatio(width, height);
    const orientation = this.detectOrientation(width, height);

    return {
      width,
      height,
      duration,
      aspectRatio: ratio,
      aspectRatioValue: value,
      orientation,
    };
  }
}

