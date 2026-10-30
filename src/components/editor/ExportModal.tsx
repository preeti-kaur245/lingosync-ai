"use client";

import React, { useState } from 'react';
import { X, Download, FileText, Film, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';
import { Caption, SubtitleStyle, AspectRatio } from '@/types';
import { ExportService } from '@/services/export.service';

interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  videoElement: HTMLVideoElement | null;
  captions: Caption[];
  style: SubtitleStyle;
  projectTitle: string;
  aspectRatio?: AspectRatio;
}

export const ExportModal: React.FC<ExportModalProps> = ({
  isOpen,
  onClose,
  videoElement,
  captions,
  style,
  projectTitle,
  aspectRatio = '16:9',
}) => {
  const [isExportingVideo, setIsExportingVideo] = useState(false);
  const [progress, setProgress] = useState(0);
  const [statusMessage, setStatusMessage] = useState('');
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const sanitizedTitle = projectTitle.replace(/[^a-zA-Z0-9_-]/g, '_') || 'lingosync_project';

  const handleDownloadSRT = () => {
    ExportService.downloadSRT(captions, `${sanitizedTitle}.srt`);
  };

  const handleDownloadVTT = () => {
    ExportService.downloadVTT(captions, `${sanitizedTitle}.vtt`);
  };

  const handleDownloadASS = () => {
    ExportService.downloadASS(captions, style, `${sanitizedTitle}.ass`, aspectRatio);
  };

  const handleDownloadTXT = () => {
    ExportService.downloadTXT(captions, `${sanitizedTitle}_transcript.txt`);
  };

  const handleExportVideo = async () => {
    if (!videoElement) {
      setError('Video is not ready yet for recording.');
      return;
    }

    setIsExportingVideo(true);
    setProgress(0);
    setError(null);
    setStatusMessage('Preparing frames...');

    try {
      await ExportService.exportBurnedInVideo(
        videoElement,
        captions,
        style,
        (pct, status) => {
          setProgress(pct);
          setStatusMessage(status);
        },
        `${sanitizedTitle}-captioned.webm`,
        aspectRatio
      );
    } catch (err: any) {
      console.error('Video export error:', err);
      setError(err.message || 'Video export failed. Make sure your browser supports MediaRecorder.');
    } finally {
      setIsExportingVideo(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn">
      <div className="relative w-full max-w-xl bg-neutral-900 border border-white/15 rounded-3xl p-6 sm:p-8 shadow-2xl overflow-hidden">
        {/* Glow Element */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-brand-primary/10 rounded-full blur-3xl -z-10" />

        {/* Header */}
        <div className="flex items-center justify-between pb-6 border-b border-white/10">
          <div>
            <h3 className="text-xl font-black text-white">Export & Download</h3>
            <p className="text-xs text-gray-400 mt-1">
              Choose your preferred format for subtitles or burned-in video.
            </p>
          </div>
          <button
            onClick={onClose}
            disabled={isExportingVideo}
            className="p-2 rounded-xl text-gray-400 hover:text-white hover:bg-white/10 transition-colors disabled:opacity-50"
          >
            <X size={20} />
          </button>
        </div>

        {error && (
          <div className="mt-4 p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs flex items-center gap-2">
            <AlertCircle size={16} />
            <span>{error}</span>
          </div>
        )}

        {/* Video Rendering Progress Bar */}
        {isExportingVideo ? (
          <div className="py-8 text-center space-y-4">
            <div className="w-16 h-16 rounded-2xl bg-brand-primary/20 border border-brand-primary/30 flex items-center justify-center mx-auto text-brand-primary">
              <Loader2 size={32} className="animate-spin" />
            </div>
            <div>
              <h4 className="text-lg font-bold text-white">Rendering Captioned Video</h4>
              <p className="text-xs text-gray-400 mt-1">{statusMessage}</p>
            </div>
            {/* Progress Track */}
            <div className="w-full bg-white/10 rounded-full h-3 overflow-hidden p-0.5 border border-white/10">
              <div
                className="bg-gradient-to-r from-brand-primary to-brand-secondary h-full rounded-full transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
            <p className="text-xs font-mono text-gray-400">{progress}% completed</p>
            <p className="text-[11px] text-gray-500 italic">
              Please keep this tab open while the canvas renders your video.
            </p>
          </div>
        ) : (
          <div className="py-6 space-y-6">
            {/* Subtitle File Downloads */}
            <div>
              <span className="text-xs uppercase font-bold tracking-wider text-gray-400 block mb-3">
                Subtitle Files (Free & Fast)
              </span>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <button
                  onClick={handleDownloadSRT}
                  className="flex flex-col items-center justify-center gap-2 p-4 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/10 hover:border-brand-primary/50 transition-all text-center group"
                >
                  <FileText size={24} className="text-brand-primary group-hover:scale-110 transition-transform" />
                  <span className="text-sm font-bold text-white">SRT</span>
                  <span className="text-[10px] text-gray-400">Universal subtitles</span>
                </button>

                <button
                  onClick={handleDownloadVTT}
                  className="flex flex-col items-center justify-center gap-2 p-4 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/10 hover:border-brand-secondary/50 transition-all text-center group"
                >
                  <FileText size={24} className="text-brand-secondary group-hover:scale-110 transition-transform" />
                  <span className="text-sm font-bold text-white">WebVTT</span>
                  <span className="text-[10px] text-gray-400">HTML5 web players</span>
                </button>

                <button
                  onClick={handleDownloadASS}
                  className="flex flex-col items-center justify-center gap-2 p-4 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/10 hover:border-amber-400/50 transition-all text-center group"
                >
                  <FileText size={24} className="text-amber-400 group-hover:scale-110 transition-transform" />
                  <span className="text-sm font-bold text-white">ASS / SSA</span>
                  <span className="text-[10px] text-gray-400">Preserves styles & colors</span>
                </button>

                <button
                  onClick={handleDownloadTXT}
                  className="flex flex-col items-center justify-center gap-2 p-4 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/10 hover:border-rose-400/50 transition-all text-center group"
                >
                  <FileText size={24} className="text-rose-400 group-hover:scale-110 transition-transform" />
                  <span className="text-sm font-bold text-white">TXT</span>
                  <span className="text-[10px] text-gray-400">Plain text transcript</span>
                </button>
              </div>
            </div>

            {/* Burned-in Captioned Video */}
            <div className="p-5 rounded-2xl bg-gradient-to-br from-brand-primary/10 via-brand-secondary/5 to-transparent border border-brand-primary/20">
              <div className="flex items-start gap-4">
                <div className="p-3 rounded-xl bg-brand-primary text-white shadow-lg shadow-brand-primary/30">
                  <Film size={24} />
                </div>
                <div className="flex-1">
                  <h4 className="text-base font-bold text-white">Burned-In Video Export</h4>
                  <p className="text-xs text-gray-400 mt-1 leading-relaxed">
                    Render your styled subtitles directly onto your video using in-browser Canvas hardware acceleration.
                  </p>
                  <button
                    onClick={handleExportVideo}
                    className="glow-button mt-4 px-6 py-2.5 rounded-full bg-brand-primary hover:brightness-110 text-white font-bold text-xs sm:text-sm flex items-center gap-2 transition-all"
                  >
                    <Download size={16} /> Render & Download Video
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="pt-4 border-t border-white/10 flex items-center justify-between text-xs text-gray-500">
          <span className="flex items-center gap-1.5">
            <CheckCircle2 size={14} className="text-emerald-400" /> 100% In-Browser Privacy
          </span>
          <button
            onClick={onClose}
            disabled={isExportingVideo}
            className="text-gray-400 hover:text-white transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

