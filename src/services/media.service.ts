import { Caption } from '../types';

export interface VideoMetadata {
  duration: number;
  width: number;
  height: number;
  thumbnailUrl: string;
}

export class MediaService {
  /**
   * Generates metadata and a video thumbnail from a File or Blob.
   */
  static async extractVideoMetadata(file: File | Blob): Promise<VideoMetadata> {
    return new Promise((resolve, reject) => {
      const url = URL.createObjectURL(file);
      const video = document.createElement('video');
      video.preload = 'metadata';
      video.muted = true;
      video.playsInline = true;
      video.src = url;

      video.onloadedmetadata = () => {
        // Seek slightly in to capture a non-black frame for thumbnail
        video.currentTime = Math.min(1.0, video.duration / 2 || 0.5);
      };

      video.onseeked = () => {
        try {
          const canvas = document.createElement('canvas');
          const maxDim = 320;
          let w = video.videoWidth || 640;
          let h = video.videoHeight || 360;

          if (w > maxDim) {
            h = Math.round((h * maxDim) / w);
            w = maxDim;
          }

          canvas.width = w;
          canvas.height = h;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.drawImage(video, 0, 0, w, h);
          }
          const thumbnailUrl = canvas.toDataURL('image/jpeg', 0.7);

          const meta: VideoMetadata = {
            duration: video.duration || 0,
            width: video.videoWidth || 1280,
            height: video.videoHeight || 720,
            thumbnailUrl,
          };

          URL.revokeObjectURL(url);
          resolve(meta);
        } catch {
          URL.revokeObjectURL(url);
          resolve({
            duration: video.duration || 0,
            width: 1280,
            height: 720,
            thumbnailUrl: '',
          });
        }
      };

      video.onerror = () => {
        URL.revokeObjectURL(url);
        reject(new Error('Failed to load video file. Please check the file format.'));
      };
    });
  }

  /**
   * Extracts audio from a video/audio file into a compact 16kHz mono WAV Blob.
   * This compresses 100MB+ videos down to ~1-2MB audio for lightning-fast, reliable Whisper transcription.
   */
  static async extractAudioWav(file: File | Blob): Promise<Blob> {
    try {
      if (typeof window === 'undefined') return file;
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return file;

      const arrayBuffer = await file.arrayBuffer();
      const audioCtx = new AudioCtx({ sampleRate: 16000 });
      const audioBuffer = await audioCtx.decodeAudioData(arrayBuffer);
      await audioCtx.close();

      return this.audioBufferToWav(audioBuffer);
    } catch (e) {
      console.warn('AudioContext extraction fallback to original file:', e);
      return file;
    }
  }

  /**
   * Encodes an AudioBuffer into a valid standard WAV audio blob
   */
  private static audioBufferToWav(buffer: AudioBuffer): Blob {
    const numChannels = 1; // mono
    const sampleRate = buffer.sampleRate || 16000;
    const format = 1; // PCM
    const bitDepth = 16;

    const channelData = buffer.getChannelData(0);
    const numSamples = channelData.length;
    const bytesPerSample = bitDepth / 8;
    const blockAlign = numChannels * bytesPerSample;
    const byteRate = sampleRate * blockAlign;
    const dataSize = numSamples * bytesPerSample;
    const bufferSize = 44 + dataSize;

    const arrayBuffer = new ArrayBuffer(bufferSize);
    const view = new DataView(arrayBuffer);

    const writeString = (offset: number, str: string) => {
      for (let i = 0; i < str.length; i++) {
        view.setUint8(offset + i, str.charCodeAt(i));
      }
    };

    writeString(0, 'RIFF');
    view.setUint32(4, 36 + dataSize, true);
    writeString(8, 'WAVE');
    writeString(12, 'fmt ');
    view.setUint32(16, 16, true);
    view.setUint16(20, format, true);
    view.setUint16(22, numChannels, true);
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, byteRate, true);
    view.setUint16(32, blockAlign, true);
    view.setUint16(34, bitDepth, true);
    writeString(36, 'data');
    view.setUint32(40, dataSize, true);

    let offset = 44;
    for (let i = 0; i < numSamples; i++) {
      const s = Math.max(-1, Math.min(1, channelData[i]));
      const sample = s < 0 ? s * 0x8000 : s * 0x7FFF;
      view.setInt16(offset, sample, true);
      offset += 2;
    }

    return new Blob([view], { type: 'audio/wav' });
  }

  /**
   * Parse SRT file content into Caption array.
   */
  static parseSRT(srtContent: string): Caption[] {
    const normalize = srtContent.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
    const blocks = normalize.split(/\n\s*\n/).filter((b) => b.trim().length > 0);
    const captions: Caption[] = [];

    const timeToSeconds = (timeStr: string) => {
      const [hms, ms] = timeStr.trim().split(/[,.]/);
      const parts = hms.split(':').map(Number);
      if (parts.length === 3) {
        return parts[0] * 3600 + parts[1] * 60 + parts[2] + (parseInt(ms || '0', 10) / 1000);
      }
      return 0;
    };

    blocks.forEach((block, idx) => {
      const lines = block.trim().split('\n');
      if (lines.length >= 2) {
        // Line 1 might be index number or time
        let timeLine = lines[0];
        let textLines = lines.slice(1);
        if (/^\d+$/.test(lines[0]) && lines[1]?.includes('-->')) {
          timeLine = lines[1];
          textLines = lines.slice(2);
        }

        if (timeLine.includes('-->')) {
          const [startStr, endStr] = timeLine.split('-->');
          const start = timeToSeconds(startStr);
          const end = timeToSeconds(endStr);
          const text = textLines.join(' ').replace(/<[^>]+>/g, '').trim();

          if (text) {
            captions.push({
              id: `srt_${idx + 1}_${Date.now()}`,
              start,
              end,
              text,
            });
          }
        }
      }
    });

    return captions;
  }

  /**
   * Sample video for demo testing
   */
  static readonly SAMPLE_VIDEO_URL = 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4';
  static readonly SAMPLE_CAPTIONS: Caption[] = [
    { id: 'c1', start: 0.5, end: 3.0, text: 'Welcome to the future of AI video translation!' },
    { id: 'c2', start: 3.2, end: 6.5, text: 'Translate and style your subtitles in 50+ languages.' },
    { id: 'c3', start: 7.0, end: 11.0, text: 'Customize fonts, colors, and export directly in your browser.' },
    { id: 'c4', start: 11.5, end: 14.5, text: 'Your video never leaves your device.' },
  ];
}

