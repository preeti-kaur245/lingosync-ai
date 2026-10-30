"use client";

import React, { useRef, useState } from 'react';
import { Upload, Sparkles, FileText, Play, ShieldCheck, Film } from 'lucide-react';
import { MediaService } from '@/services/media.service';

interface DropZoneProps {
  onMediaSelected: (file: File | Blob, isSample?: boolean, initialCaptions?: any[]) => void;
  className?: string;
}

export const DropZone: React.FC<DropZoneProps> = ({ onMediaSelected, className = '' }) => {
  const [isDragging, setIsDragging] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const srtInputRef = useRef<HTMLInputElement>(null);

  const handleFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const file = files[0];

    // Check if user dropped an SRT or VTT file
    if (file.name.endsWith('.srt') || file.name.endsWith('.vtt')) {
      const text = await file.text();
      const parsedCaptions = MediaService.parseSRT(text);
      // Load sample video with these captions
      onMediaSelected(new Blob([]), true, parsedCaptions);
      return;
    }

    setIsLoading(true);
    try {
      onMediaSelected(file, false);
    } catch (err) {
      console.error('Failed to load selected media:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    handleFiles(e.dataTransfer.files);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleLoadSample = () => {
    setIsLoading(true);
    onMediaSelected(new Blob([]), true, MediaService.SAMPLE_CAPTIONS);
    setIsLoading(false);
  };

  const handleSrtUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files[0]) {
      const text = await files[0].text();
      const parsed = MediaService.parseSRT(text);
      onMediaSelected(new Blob([]), true, parsed);
    }
  };

  return (
    <div
      onDrop={handleDrop}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      className={`relative rounded-3xl border-2 border-dashed transition-all duration-300 p-8 sm:p-14 text-center flex flex-col items-center justify-center gap-6 ${
        isDragging
          ? 'border-brand-primary bg-brand-primary/10 scale-[1.01]'
          : 'border-white/15 bg-white/[0.02] hover:border-white/30 hover:bg-white/[0.04]'
      } ${className}`}
    >
      <input
        ref={fileInputRef}
        type="file"
        accept="video/*,audio/*,.mkv,.mp4,.mov,.webm"
        className="hidden"
        onChange={(e) => handleFiles(e.target.files)}
      />
      <input
        ref={srtInputRef}
        type="file"
        accept=".srt,.vtt"
        className="hidden"
        onChange={handleSrtUpload}
      />

      {/* Upload Icon with Glowing Backdrop */}
      <div className="relative group cursor-pointer" onClick={() => fileInputRef.current?.click()}>
        <div className="absolute inset-0 bg-brand-primary/20 rounded-full blur-xl group-hover:bg-brand-primary/40 transition-all" />
        <div className="relative w-20 h-20 rounded-2xl bg-gradient-to-br from-brand-primary/20 to-brand-secondary/20 border border-white/20 flex items-center justify-center text-white shadow-2xl group-hover:scale-105 transition-transform">
          <Upload size={36} className="text-brand-primary animate-bounce" />
        </div>
      </div>

      <div className="max-w-md">
        <h3 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
          Drop your video or audio file here
        </h3>
        <p className="mt-2 text-sm text-gray-400">
          Supports <span className="text-gray-200 font-medium">MP4, MOV, WebM, MKV, MP3, WAV</span>.
          No file size limits.
        </p>
      </div>

      {/* Primary Actions */}
      <div className="flex flex-wrap items-center justify-center gap-4">
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={isLoading}
          className="glow-button px-8 py-3.5 rounded-full bg-brand-primary hover:brightness-110 text-white font-bold text-sm sm:text-base flex items-center gap-2 transition-all"
        >
          <Film size={18} />
          Choose Video File
        </button>

        <button
          type="button"
          onClick={handleLoadSample}
          disabled={isLoading}
          className="px-6 py-3.5 rounded-full bg-white/10 hover:bg-white/15 border border-white/15 text-white font-semibold text-sm sm:text-base flex items-center gap-2 transition-all backdrop-blur-md"
        >
          <Play size={16} fill="currentColor" />
          Try with Sample Video
        </button>
      </div>

      {/* Sub-actions */}
      <div className="pt-2 flex flex-wrap items-center justify-center gap-6 text-xs text-gray-400">
        <button
          type="button"
          onClick={() => srtInputRef.current?.click()}
          className="hover:text-white transition-colors flex items-center gap-1.5 underline underline-offset-4"
        >
          <FileText size={14} /> Import Existing Subtitles (.SRT / .VTT)
        </button>

        <div className="flex items-center gap-1.5 text-emerald-400 font-medium">
          <ShieldCheck size={16} />
          <span>Private: Videos stay 100% on your device</span>
        </div>
      </div>
    </div>
  );
};

