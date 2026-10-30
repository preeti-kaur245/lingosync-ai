"use client";

import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Play, Pause, SkipBack, SkipForward, Volume2, VolumeX, Maximize2,
  Type, Palette, Languages, Download, ArrowLeft, Trash2, Plus,
  Sparkles, Loader2, Copy, Check, Settings, FolderKanban, Clock
} from 'lucide-react';
import { Caption, Project, SubtitleStyle, AspectRatio } from '@/types';
import { STYLE_PRESETS, AVAILABLE_FONTS, FontService } from '@/services/font.service';
import { SUPPORTED_LANGUAGES, TranslationService } from '@/services/translation.service';
import { TranscriptionService } from '@/services/transcription.service';
import { storageService } from '@/services/storage.service';
import { ExportModal } from './ExportModal';

interface VideoEditorProps {
  initialProject?: Project;
  onBack: () => void;
}

export const VideoEditor: React.FC<VideoEditorProps> = ({ initialProject, onBack }) => {
  // --- Project State ---
  const [project, setProject] = useState<Project>(() => {
    if (initialProject) {
      return {
        ...initialProject,
        aspectRatio: initialProject.aspectRatio || '16:9',
        originalCaptions: initialProject.originalCaptions || initialProject.captions,
      };
    }
    const defaultCaptions = [
      { id: 'c1', start: 0.5, end: 3.5, text: 'Welcome to the future of AI video translation!' },
      { id: 'c2', start: 3.8, end: 7.0, text: 'Translate and style your subtitles in 50+ languages.' },
      { id: 'c3', start: 7.5, end: 11.0, text: 'Customize fonts, colors, and export directly in your browser.' },
      { id: 'c4', start: 11.5, end: 14.5, text: 'Your video never leaves your device.' },
    ];
    return {
      id: `proj_${Date.now()}`,
      title: 'Global Video Project',
      createdAt: Date.now(),
      updatedAt: Date.now(),
      duration: 15,
      captions: defaultCaptions,
      originalCaptions: defaultCaptions,
      style: STYLE_PRESETS[0],
      sourceLang: 'en',
      targetLang: 'en',
      aspectRatio: '16:9',
    };
  });

  const [activeTab, setActiveTab] = useState<'captions' | 'style' | 'translate' | 'projects' | 'settings'>('captions');
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(15);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [selectedCaptionId, setSelectedCaptionId] = useState<string | null>(null);

  // AI & Export State
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [isTranslating, setIsTranslating] = useState(false);
  const [transcriptionStatus, setTranscriptionStatus] = useState('');
  const [whisperApiKey, setWhisperApiKey] = useState(() => process.env.NEXT_PUBLIC_OPENAI_API_KEY || '');
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [savedProjects, setSavedProjects] = useState<Project[]>([]);
  const [saveToast, setSaveToast] = useState(false);

  const videoRef = useRef<HTMLVideoElement>(null);
  const videoContainerRef = useRef<HTMLDivElement>(null);

  // Preload fonts
  useEffect(() => {
    FontService.loadGoogleFont(project.style.fontFamily);
    setSavedProjects(storageService.getProjects());
  }, [project.style.fontFamily]);

  // Auto-save project changes
  useEffect(() => {
    storageService.saveProject(project);
  }, [project]);

  // Video playback controls
  const togglePlay = () => {
    if (!videoRef.current) return;
    if (isPlaying) {
      videoRef.current.pause();
    } else {
      videoRef.current.play();
    }
    setIsPlaying(!isPlaying);
  };

  const handleTimeUpdate = () => {
    if (videoRef.current) {
      setCurrentTime(videoRef.current.currentTime);
    }
  };

  const handleLoadedMetadata = () => {
    if (videoRef.current) {
      const dur = videoRef.current.duration;
      setDuration(dur);
      setProject((prev) => ({ ...prev, duration: dur }));
    }
  };

  const handleSeek = (newTime: number) => {
    if (videoRef.current) {
      videoRef.current.currentTime = newTime;
      setCurrentTime(newTime);
    }
  };

  const handleSkip = (seconds: number) => {
    if (videoRef.current) {
      const target = Math.max(0, Math.min(duration, videoRef.current.currentTime + seconds));
      handleSeek(target);
    }
  };

  const toggleMute = () => {
    if (videoRef.current) {
      videoRef.current.muted = !isMuted;
      setIsMuted(!isMuted);
    }
  };

  const handleVolumeChange = (v: number) => {
    setVolume(v);
    if (videoRef.current) {
      videoRef.current.volume = v;
      setIsMuted(v === 0);
    }
  };

  const handleRateChange = (r: number) => {
    setPlaybackRate(r);
    if (videoRef.current) {
      videoRef.current.playbackRate = r;
    }
  };

  const toggleFullscreen = () => {
    if (!videoContainerRef.current) return;
    if (!document.fullscreenElement) {
      videoContainerRef.current.requestFullscreen().catch(() => {});
    } else {
      document.exitFullscreen().catch(() => {});
    }
  };

  // --- Caption Management ---
  const handleAddCaption = () => {
    const start = parseFloat(currentTime.toFixed(1));
    const end = parseFloat((start + 2.5).toFixed(1));
    const newCap: Caption = {
      id: `cap_${Date.now()}`,
      start,
      end,
      text: 'New subtitle cue',
    };
    const updated = [...project.captions, newCap].sort((a, b) => a.start - b.start);
    setProject((prev) => ({ ...prev, captions: updated }));
    setSelectedCaptionId(newCap.id);
  };

  const handleUpdateCaptionText = (id: string, text: string) => {
    setProject((prev) => ({
      ...prev,
      captions: prev.captions.map((c) => (c.id === id ? { ...c, text } : c)),
    }));
  };

  const handleAdjustTiming = (id: string, field: 'start' | 'end', delta: number) => {
    setProject((prev) => ({
      ...prev,
      captions: prev.captions.map((c) => {
        if (c.id !== id) return c;
        const val = Math.max(0, parseFloat((c[field] + delta).toFixed(1)));
        return { ...c, [field]: val };
      }),
    }));
  };

  const handleDeleteCaption = (id: string) => {
    setProject((prev) => ({
      ...prev,
      captions: prev.captions.filter((c) => c.id !== id),
    }));
  };

  const handleDuplicateCaption = (id: string) => {
    const target = project.captions.find((c) => c.id === id);
    if (!target) return;
    const duplicated: Caption = {
      ...target,
      id: `cap_${Date.now()}`,
      start: parseFloat((target.end + 0.2).toFixed(1)),
      end: parseFloat((target.end + 3.0).toFixed(1)),
    };
    const updated = [...project.captions, duplicated].sort((a, b) => a.start - b.start);
    setProject((prev) => ({ ...prev, captions: updated }));
  };

  // --- AI Transcription in English ---
  const handleAutoTranscribe = async () => {
    setIsTranscribing(true);
    setTranscriptionStatus('Listening to audio track and generating English subtitles...');
    try {
      const generated = await TranscriptionService.transcribeMedia(
        new Blob([]),
        duration,
        whisperApiKey || undefined
      );
      setProject((prev) => ({
        ...prev,
        sourceLang: 'en',
        targetLang: 'en',
        captions: generated,
        originalCaptions: generated,
      }));
      setTranscriptionStatus('English subtitles generated!');
      setTimeout(() => setTranscriptionStatus(''), 3000);
    } catch (err: any) {
      console.error('Transcription error:', err);
      setTranscriptionStatus('Transcription failed: ' + err.message);
    } finally {
      setIsTranscribing(false);
    }
  };

  // --- Automatic Translation on Language Change with Timeline Preservation ---
  const handleLanguageChange = async (newLang: string) => {
    if (newLang === project.targetLang) return;

    // If switching to English, immediately restore the base English timeline
    if (newLang === 'en') {
      const restored = project.originalCaptions || project.captions;
      setProject((prev) => ({
        ...prev,
        targetLang: 'en',
        captions: restored,
      }));
      return;
    }

    // Otherwise translate from the base English captions preserving the exact same timeline
    setIsTranslating(true);
    try {
      const baseCaps = (project.originalCaptions && project.originalCaptions.length > 0)
        ? project.originalCaptions
        : project.captions;

      const translated = await TranslationService.translateCaptions(
        baseCaps,
        newLang,
        'en'
      );

      setProject((prev) => ({
        ...prev,
        targetLang: newLang,
        originalCaptions: prev.originalCaptions || baseCaps,
        captions: translated,
      }));
    } catch (err) {
      console.error('Translation error on language change:', err);
    } finally {
      setIsTranslating(false);
    }
  };

  const handleTranslateAll = async () => {
    await handleLanguageChange(project.targetLang);
  };

  // Active caption
  const activeCaption = project.captions.find((c) => currentTime >= c.start && currentTime <= c.end);

  const formatTime = (time: number) => {
    const mins = Math.floor(time / 60);
    const secs = Math.floor(time % 60);
    const ms = Math.floor((time % 1) * 10);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}.${ms}`;
  };

  return (
    <div className="flex h-screen w-screen bg-[#070709] text-white overflow-hidden font-sans select-none">
      {/* 1. LEFT ICON NAVIGATION */}
      <aside className="w-16 sm:w-20 bg-black/60 border-r border-white/10 flex flex-col items-center py-6 gap-6 z-20">
        <button
          onClick={onBack}
          title="Back to Home"
          className="w-11 h-11 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/10 flex items-center justify-center text-gray-400 hover:text-white transition-all"
        >
          <ArrowLeft size={18} />
        </button>

        <div className="h-px w-8 bg-white/10" />

        <div className="flex flex-col gap-3">
          <ToolTabButton
            icon={Type}
            label="Captions"
            active={activeTab === 'captions'}
            onClick={() => setActiveTab('captions')}
          />
          <ToolTabButton
            icon={Palette}
            label="Styling"
            active={activeTab === 'style'}
            onClick={() => setActiveTab('style')}
          />
          <ToolTabButton
            icon={Languages}
            label="Translate"
            active={activeTab === 'translate'}
            onClick={() => setActiveTab('translate')}
          />
          <ToolTabButton
            icon={FolderKanban}
            label="Projects"
            active={activeTab === 'projects'}
            onClick={() => setActiveTab('projects')}
          />
          <ToolTabButton
            icon={Settings}
            label="Settings"
            active={activeTab === 'settings'}
            onClick={() => setActiveTab('settings')}
          />
        </div>

        <div className="mt-auto flex flex-col gap-3">
          <button
            onClick={() => setIsExportModalOpen(true)}
            className="w-11 h-11 rounded-2xl bg-gradient-to-br from-brand-primary to-brand-secondary flex items-center justify-center text-white shadow-lg shadow-brand-primary/30 hover:scale-105 transition-transform"
            title="Export Video / Subtitles"
          >
            <Download size={20} />
          </button>
        </div>
      </aside>

      {/* 2. MAIN CENTER AREA: Top Bar + Video Player */}
      <main className="flex-1 flex flex-col min-w-0 bg-neutral-950">
        {/* Top Header */}
        <header className="h-14 border-b border-white/10 px-4 sm:px-6 flex items-center justify-between bg-black/40 backdrop-blur-md">
          <div className="flex items-center gap-3">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
            <input
              type="text"
              value={project.title}
              onChange={(e) => setProject({ ...project, title: e.target.value })}
              className="bg-transparent font-bold text-xs sm:text-sm md:text-base text-white outline-none border-b border-transparent focus:border-brand-primary px-1 transition-all max-w-[130px] sm:max-w-xs truncate"
            />
          </div>

          {/* Aspect Ratio Format Switcher */}
          <div className="flex items-center bg-white/5 border border-white/10 rounded-full p-1 gap-1">
            {(['16:9', '9:16', '1:1', '4:5'] as AspectRatio[]).map((ratio) => (
              <button
                key={ratio}
                onClick={() => setProject({ ...project, aspectRatio: ratio })}
                title={`Aspect Ratio: ${ratio}`}
                className={`px-2.5 py-1 rounded-full text-[11px] font-bold transition-all ${
                  (project.aspectRatio || '16:9') === ratio
                    ? 'bg-brand-primary text-white shadow-md'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                {ratio}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            <button
              onClick={handleAutoTranscribe}
              disabled={isTranscribing}
              className="px-3 sm:px-4 py-1.5 rounded-full bg-brand-primary/15 hover:bg-brand-primary/25 border border-brand-primary/30 text-brand-primary text-xs font-bold flex items-center gap-1.5 transition-all disabled:opacity-50"
            >
              {isTranscribing ? <Loader2 size={13} className="animate-spin" /> : <Sparkles size={13} />}
              <span className="hidden sm:inline">{isTranscribing ? 'Transcribing...' : 'English Auto-Subtitles'}</span>
            </button>

            <button
              onClick={() => setIsExportModalOpen(true)}
              className="glow-button px-4 sm:px-5 py-1.5 rounded-full bg-brand-primary text-white text-xs font-bold flex items-center gap-1.5 transition-all"
            >
              <Download size={14} />
              <span>Export</span>
            </button>
          </div>
        </header>

        {/* Video Canvas & Live Overlay */}
        <div className="flex-1 relative bg-black flex items-center justify-center p-4 sm:p-8 overflow-hidden group">
          <div
            ref={videoContainerRef}
            className={`relative overflow-hidden bg-neutral-900 rounded-2xl sm:rounded-3xl shadow-2xl ring-1 ring-white/15 transition-all duration-300 flex items-center justify-center ${
              project.aspectRatio === '9:16'
                ? 'aspect-[9/16] h-[75vh] max-w-sm'
                : project.aspectRatio === '1:1'
                ? 'aspect-square h-[70vh] max-w-lg'
                : project.aspectRatio === '4:5'
                ? 'aspect-[4/5] h-[75vh] max-w-md'
                : 'aspect-video w-full max-w-4xl'
            }`}
          >
            <video
              ref={videoRef}
              src={project.videoUrl || 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4'}
              onTimeUpdate={handleTimeUpdate}
              onLoadedMetadata={handleLoadedMetadata}
              onClick={togglePlay}
              className="w-full h-full object-contain cursor-pointer"
              playsInline
            />

            {/* Dynamic Styled Subtitle Overlay */}
            <AnimatePresence>
              {activeCaption && (
                <div
                  className={`absolute left-4 right-4 pointer-events-none flex justify-center z-10 transition-all ${
                    project.style.position === 'top'
                      ? 'top-8'
                      : project.style.position === 'center'
                      ? 'top-1/2 -translate-y-1/2'
                      : 'bottom-10'
                  }`}
                  style={{
                    marginBottom: project.style.position === 'bottom' ? `${project.style.yOffset}%` : undefined,
                    marginTop: project.style.position === 'top' ? `${project.style.yOffset}%` : undefined,
                  }}
                >
                  <motion.div
                    key={activeCaption.id}
                    initial={{ opacity: 0, scale: project.style.animation === 'pop' ? 0.8 : 1 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.15 }}
                    style={{
                      fontFamily: `"${project.style.fontFamily}", sans-serif`,
                      fontSize: `${project.style.fontSize}px`,
                      fontWeight: project.style.fontWeight,
                      color: project.style.color,
                      textTransform: project.style.textTransform,
                      letterSpacing: `${project.style.letterSpacing}px`,
                      textShadow:
                        project.style.shadowBlur > 0
                          ? `0 ${project.style.shadowOffsetY}px ${project.style.shadowBlur}px ${project.style.shadowColor}`
                          : 'none',
                      WebkitTextStroke:
                        project.style.strokeWidth > 0
                          ? `${project.style.strokeWidth}px ${project.style.strokeColor}`
                          : undefined,
                      backgroundColor: project.style.backgroundColor,
                      padding: `${project.style.backgroundPadding}px ${project.style.backgroundPadding * 1.5}px`,
                      borderRadius: `${project.style.backgroundRadius}px`,
                    }}
                    className="text-center max-w-[90%] leading-tight select-none"
                  >
                    {activeCaption.text}
                  </motion.div>
                </div>
              )}
            </AnimatePresence>

            {/* Play Overlay Button on hover */}
            {!isPlaying && (
              <div
                onClick={togglePlay}
                className="absolute inset-0 bg-black/30 flex items-center justify-center cursor-pointer transition-opacity"
              >
                <div className="w-16 h-16 rounded-full bg-brand-primary/90 text-white flex items-center justify-center shadow-2xl hover:scale-110 transition-transform">
                  <Play size={30} fill="currentColor" />
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Video Scrubber & Timeline Bar */}
        <div className="h-16 border-t border-white/10 bg-black/60 px-6 flex items-center justify-between gap-4 z-10">
          <div className="flex items-center gap-3">
            <button
              onClick={() => handleSkip(-5)}
              className="p-2 text-gray-400 hover:text-white transition-colors"
              title="Skip back 5s"
            >
              <SkipBack size={18} />
            </button>
            <button
              onClick={togglePlay}
              className="w-10 h-10 rounded-full bg-white text-black flex items-center justify-center hover:scale-105 transition-transform"
            >
              {isPlaying ? <Pause size={18} fill="currentColor" /> : <Play size={18} fill="currentColor" />}
            </button>
            <button
              onClick={() => handleSkip(5)}
              className="p-2 text-gray-400 hover:text-white transition-colors"
              title="Skip forward 5s"
            >
              <SkipForward size={18} />
            </button>
          </div>

          {/* Time Scrubber Slider */}
          <div className="flex-1 flex items-center gap-3 max-w-2xl">
            <span className="text-xs font-mono text-gray-400 min-w-[50px]">{formatTime(currentTime)}</span>
            <input
              type="range"
              min="0"
              max={duration || 100}
              step="0.05"
              value={currentTime}
              onChange={(e) => handleSeek(parseFloat(e.target.value))}
              className="flex-1 h-1.5 bg-white/20 rounded-lg appearance-none cursor-pointer accent-brand-primary"
            />
            <span className="text-xs font-mono text-gray-400 min-w-[50px]">{formatTime(duration)}</span>
          </div>

          {/* Extra Controls */}
          <div className="flex items-center gap-3">
            {/* Speed Selector */}
            <select
              value={playbackRate}
              onChange={(e) => handleRateChange(parseFloat(e.target.value))}
              className="bg-white/5 border border-white/10 rounded-lg px-2 py-1 text-xs text-gray-300 outline-none cursor-pointer hover:bg-white/10"
            >
              <option value="0.5">0.5x</option>
              <option value="1">1.0x</option>
              <option value="1.5">1.5x</option>
              <option value="2">2.0x</option>
            </select>

            <button
              onClick={toggleMute}
              className="p-2 text-gray-400 hover:text-white transition-colors"
              title={isMuted ? 'Unmute' : 'Mute'}
            >
              {isMuted ? <VolumeX size={18} /> : <Volume2 size={18} />}
            </button>

            <button
              onClick={toggleFullscreen}
              className="p-2 text-gray-400 hover:text-white transition-colors"
              title="Fullscreen"
            >
              <Maximize2 size={18} />
            </button>
          </div>
        </div>
      </main>

      {/* 3. RIGHT SIDEBAR: Context-Aware Panel */}
      <aside className="w-80 sm:w-96 border-l border-white/10 bg-[#0d0d10] flex flex-col z-20">
        {/* Panel Header */}
        <div className="p-4 border-b border-white/10 flex items-center justify-between">
          <span className="text-xs font-bold uppercase tracking-wider text-gray-400">
            {activeTab === 'captions' && 'Timeline Captions'}
            {activeTab === 'style' && 'Typography & Style'}
            {activeTab === 'translate' && 'AI Language Translation'}
            {activeTab === 'projects' && 'Saved Projects'}
            {activeTab === 'settings' && 'Studio Configuration'}
          </span>

          {activeTab === 'captions' && (
            <button
              onClick={handleAddCaption}
              className="px-3 py-1 rounded-lg bg-brand-primary hover:brightness-110 text-white text-xs font-bold flex items-center gap-1 transition-all"
            >
              <Plus size={14} /> Add Cue
            </button>
          )}
        </div>

        {/* Tab 1: Captions List */}
        {activeTab === 'captions' && (
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {transcriptionStatus && (
              <div className="p-3 rounded-xl bg-brand-primary/10 border border-brand-primary/30 text-xs text-brand-primary flex items-center gap-2">
                <Sparkles size={14} />
                <span>{transcriptionStatus}</span>
              </div>
            )}

            {project.captions.length === 0 ? (
              <div className="text-center py-12 text-gray-500 text-xs">
                No captions yet. Click "+ Add Cue" or "AI Auto-Transcribe".
              </div>
            ) : (
              project.captions.map((cap) => {
                const isSelected = selectedCaptionId === cap.id;
                const isCurrent = currentTime >= cap.start && currentTime <= cap.end;

                return (
                  <div
                    key={cap.id}
                    onClick={() => {
                      setSelectedCaptionId(cap.id);
                      handleSeek(cap.start);
                    }}
                    className={`p-3.5 rounded-2xl border transition-all cursor-pointer ${
                      isCurrent
                        ? 'bg-brand-primary/15 border-brand-primary shadow-lg shadow-brand-primary/10'
                        : isSelected
                        ? 'bg-white/10 border-white/30'
                        : 'bg-white/[0.03] border-white/10 hover:bg-white/[0.06]'
                    }`}
                  >
                    <div className="flex items-center justify-between text-[11px] font-mono text-gray-400 mb-2">
                      <div className="flex items-center gap-2">
                        <span>{formatTime(cap.start)}</span>
                        <span>→</span>
                        <span>{formatTime(cap.end)}</span>
                      </div>
                      <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                        <button
                          onClick={() => handleAdjustTiming(cap.id, 'start', -0.5)}
                          title="Start earlier (-0.5s)"
                          className="px-1 rounded hover:bg-white/10 text-gray-400 hover:text-white"
                        >
                          -
                        </button>
                        <button
                          onClick={() => handleAdjustTiming(cap.id, 'end', 0.5)}
                          title="End later (+0.5s)"
                          className="px-1 rounded hover:bg-white/10 text-gray-400 hover:text-white"
                        >
                          +
                        </button>
                        <button
                          onClick={() => handleDuplicateCaption(cap.id)}
                          title="Duplicate"
                          className="p-1 rounded hover:bg-white/10 text-gray-400 hover:text-white"
                        >
                          <Copy size={12} />
                        </button>
                        <button
                          onClick={() => handleDeleteCaption(cap.id)}
                          title="Delete"
                          className="p-1 rounded hover:bg-red-500/20 text-gray-400 hover:text-red-400"
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                    </div>
                    <textarea
                      rows={2}
                      value={cap.text}
                      onClick={(e) => e.stopPropagation()}
                      onChange={(e) => handleUpdateCaptionText(cap.id, e.target.value)}
                      className="w-full bg-black/30 border border-white/10 rounded-xl p-2 text-xs sm:text-sm text-white outline-none focus:border-brand-primary transition-all resize-none"
                    />
                  </div>
                );
              })
            )}
          </div>
        )}

        {/* Tab 2: Typography & Styling */}
        {activeTab === 'style' && (
          <div className="flex-1 overflow-y-auto p-4 space-y-6">
            {/* Presets */}
            <div>
              <span className="text-[10px] uppercase font-bold text-gray-400 block mb-3">
                Style Presets
              </span>
              <div className="grid grid-cols-2 gap-2">
                {STYLE_PRESETS.map((preset) => (
                  <button
                    key={preset.id}
                    onClick={() => setProject({ ...project, style: { ...preset } })}
                    className={`p-3 rounded-xl text-left border transition-all ${
                      project.style.id === preset.id
                        ? 'bg-brand-primary/20 border-brand-primary text-white'
                        : 'bg-white/5 border-white/10 text-gray-300 hover:bg-white/10'
                    }`}
                  >
                    <span className="text-xs font-bold block">{preset.name}</span>
                    <span className="text-[10px] text-gray-500 font-mono mt-0.5 block">{preset.fontFamily}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Font Family Selection */}
            <div className="space-y-2">
              <label className="text-[10px] uppercase font-bold text-gray-400 block">Font Family</label>
              <select
                value={project.style.fontFamily}
                onChange={(e) => {
                  FontService.loadGoogleFont(e.target.value);
                  setProject({
                    ...project,
                    style: { ...project.style, fontFamily: e.target.value },
                  });
                }}
                className="w-full bg-white/5 border border-white/10 rounded-xl p-2.5 text-xs text-white outline-none focus:border-brand-primary"
              >
                {AVAILABLE_FONTS.map((font) => (
                  <option key={font.name} value={font.family} className="bg-neutral-900">
                    {font.name} ({font.category})
                  </option>
                ))}
              </select>
            </div>

            {/* Font Size & Text Transform */}
            <div className="space-y-4">
              <div>
                <div className="flex justify-between text-xs text-gray-400 mb-1">
                  <span>Font Size</span>
                  <span className="font-mono">{project.style.fontSize}px</span>
                </div>
                <input
                  type="range"
                  min="18"
                  max="52"
                  value={project.style.fontSize}
                  onChange={(e) =>
                    setProject({
                      ...project,
                      style: { ...project.style, fontSize: parseInt(e.target.value, 10) },
                    })
                  }
                  className="w-full h-1.5 bg-white/10 rounded-lg appearance-none cursor-pointer accent-brand-primary"
                />
              </div>

              {/* Text Transform Buttons */}
              <div className="grid grid-cols-3 gap-2">
                {(['none', 'uppercase', 'capitalize'] as const).map((t) => (
                  <button
                    key={t}
                    onClick={() =>
                      setProject({
                        ...project,
                        style: { ...project.style, textTransform: t },
                      })
                    }
                    className={`py-1.5 rounded-lg text-xs font-medium border transition-all ${
                      project.style.textTransform === t
                        ? 'bg-brand-primary text-white border-brand-primary'
                        : 'bg-white/5 text-gray-400 border-white/10 hover:text-white'
                    }`}
                  >
                    {t === 'none' ? 'Normal' : t === 'uppercase' ? 'UPPER' : 'Capital'}
                  </button>
                ))}
              </div>
            </div>

            {/* Colors: Text & Outline */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-300">Text Color</span>
                <input
                  type="color"
                  value={project.style.color}
                  onChange={(e) =>
                    setProject({
                      ...project,
                      style: { ...project.style, color: e.target.value },
                    })
                  }
                  className="w-8 h-8 rounded-lg cursor-pointer bg-transparent border-0"
                />
              </div>

              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-300">Stroke Outline Color</span>
                <input
                  type="color"
                  value={project.style.strokeColor === 'transparent' ? '#000000' : project.style.strokeColor}
                  onChange={(e) =>
                    setProject({
                      ...project,
                      style: { ...project.style, strokeColor: e.target.value },
                    })
                  }
                  className="w-8 h-8 rounded-lg cursor-pointer bg-transparent border-0"
                />
              </div>

              <div>
                <div className="flex justify-between text-xs text-gray-400 mb-1">
                  <span>Stroke Width</span>
                  <span className="font-mono">{project.style.strokeWidth}px</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="8"
                  value={project.style.strokeWidth}
                  onChange={(e) =>
                    setProject({
                      ...project,
                      style: { ...project.style, strokeWidth: parseInt(e.target.value, 10) },
                    })
                  }
                  className="w-full h-1.5 bg-white/10 rounded-lg appearance-none cursor-pointer accent-brand-primary"
                />
              </div>
            </div>

            {/* Position */}
            <div className="space-y-2">
              <label className="text-[10px] uppercase font-bold text-gray-400 block">Position on Screen</label>
              <div className="grid grid-cols-3 gap-2">
                {(['bottom', 'center', 'top'] as const).map((pos) => (
                  <button
                    key={pos}
                    onClick={() =>
                      setProject({
                        ...project,
                        style: { ...project.style, position: pos },
                      })
                    }
                    className={`py-1.5 rounded-lg text-xs font-medium border capitalize transition-all ${
                      project.style.position === pos
                        ? 'bg-brand-primary text-white border-brand-primary'
                        : 'bg-white/5 text-gray-400 border-white/10 hover:text-white'
                    }`}
                  >
                    {pos}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Tab 3: Language Translation */}
        {activeTab === 'translate' && (
          <div className="flex-1 overflow-y-auto p-4 space-y-6">
            <div className="p-4 rounded-2xl bg-brand-primary/10 border border-brand-primary/20">
              <span className="text-xs font-bold text-white block mb-1">AI Language Engine</span>
              <p className="text-[11px] text-gray-400 leading-relaxed">
                Timeline timestamps remain identical. Select any language below to translate instantly.
              </p>
            </div>

            {/* Quick Switch Pills */}
            <div className="space-y-2">
              <label className="text-[10px] uppercase font-bold text-gray-400 block">Popular Languages</label>
              <div className="flex flex-wrap gap-1.5">
                {[
                  { code: 'en', label: 'English (Original)' },
                  { code: 'es', label: 'Spanish' },
                  { code: 'hi', label: 'Hindi' },
                  { code: 'fr', label: 'French' },
                  { code: 'de', label: 'German' },
                  { code: 'ja', label: 'Japanese' },
                  { code: 'zh', label: 'Chinese' },
                  { code: 'ar', label: 'Arabic' },
                  { code: 'pt', label: 'Portuguese' },
                ].map((item) => (
                  <button
                    key={item.code}
                    onClick={() => handleLanguageChange(item.code)}
                    disabled={isTranslating}
                    className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all ${
                      project.targetLang === item.code
                        ? 'bg-brand-primary text-white border-brand-primary shadow-sm'
                        : 'bg-white/5 border-white/10 text-gray-300 hover:bg-white/10'
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>

            {/* All Languages Dropdown */}
            <div className="space-y-2">
              <label className="text-[10px] uppercase font-bold text-gray-400 block">All 50+ Languages</label>
              <select
                value={project.targetLang}
                onChange={(e) => handleLanguageChange(e.target.value)}
                disabled={isTranslating}
                className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-xs sm:text-sm text-white outline-none focus:border-brand-primary cursor-pointer"
              >
                {SUPPORTED_LANGUAGES.map((lang) => (
                  <option key={lang.code} value={lang.code} className="bg-neutral-900">
                    {lang.name} — {lang.nativeName}
                  </option>
                ))}
              </select>
            </div>

            <button
              onClick={handleTranslateAll}
              disabled={isTranslating}
              className="glow-button w-full py-3.5 rounded-xl bg-brand-primary hover:brightness-110 text-white font-bold text-xs sm:text-sm flex items-center justify-center gap-2 transition-all disabled:opacity-50"
            >
              {isTranslating ? <Loader2 size={16} className="animate-spin" /> : <Languages size={16} />}
              <span>{isTranslating ? 'Translating Captions...' : `Re-Translate (${project.targetLang.toUpperCase()})`}</span>
            </button>
          </div>
        )}

        {/* Tab 4: Saved Projects */}
        {activeTab === 'projects' && (
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            <span className="text-[10px] uppercase font-bold text-gray-400 block mb-2">Browser Storage</span>
            {savedProjects.length === 0 ? (
              <p className="text-xs text-gray-500 py-6 text-center">No other projects saved yet.</p>
            ) : (
              savedProjects.map((p) => (
                <div
                  key={p.id}
                  onClick={() => setProject(p)}
                  className={`p-3 rounded-xl border flex items-center justify-between cursor-pointer transition-all ${
                    p.id === project.id ? 'bg-brand-primary/20 border-brand-primary' : 'bg-white/5 border-white/10 hover:bg-white/10'
                  }`}
                >
                  <div className="min-w-0 flex-1">
                    <h5 className="text-xs font-bold text-white truncate">{p.title}</h5>
                    <p className="text-[10px] text-gray-400 mt-0.5">{p.captions.length} captions</p>
                  </div>
                  {p.id !== project.id && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        storageService.deleteProject(p.id);
                        setSavedProjects(storageService.getProjects());
                      }}
                      className="p-1 text-gray-500 hover:text-red-400 transition-colors"
                    >
                      <Trash2 size={13} />
                    </button>
                  )}
                </div>
              ))
            )}
          </div>
        )}

        {/* Tab 5: Settings */}
        {activeTab === 'settings' && (
          <div className="flex-1 overflow-y-auto p-4 space-y-6 text-xs">
            <div className="space-y-2">
              <label className="text-[10px] uppercase font-bold text-gray-400 block"></label>
              <input
                type="password"
                placeholder="sk-..."
                value={whisperApiKey}
                onChange={(e) => setWhisperApiKey(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-xl p-2.5 text-xs text-white outline-none focus:border-brand-primary"
              />
            </div>
          </div>
        )}
      </aside>

      {/* Export Modal */}
      <ExportModal
        isOpen={isExportModalOpen}
        onClose={() => setIsExportModalOpen(false)}
        videoElement={videoRef.current}
        captions={project.captions}
        style={project.style}
        projectTitle={project.title}
        aspectRatio={project.aspectRatio}
      />
    </div>
  );
};

const ToolTabButton: React.FC<{
  icon: React.ElementType;
  label: string;
  active: boolean;
  onClick: () => void;
}> = ({ icon: Icon, label, active, onClick }) => (
  <div className="group relative flex items-center justify-center">
    <button
      onClick={onClick}
      className={`w-11 h-11 rounded-2xl flex items-center justify-center transition-all ${
        active
          ? 'bg-brand-primary text-white shadow-lg shadow-brand-primary/30'
          : 'text-gray-400 hover:bg-white/10 hover:text-white'
      }`}
    >
      <Icon size={18} />
    </button>
    <span className="absolute left-16 px-2.5 py-1 rounded-md bg-white text-black text-[11px] font-bold opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-50 shadow-md">
      {label}
    </span>
  </div>
);

export default VideoEditor;
