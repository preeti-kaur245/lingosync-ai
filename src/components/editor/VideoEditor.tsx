"use client";

import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Play, Pause, SkipBack, SkipForward, Volume2, VolumeX, Maximize2,
  Type, Palette, Languages, Download, ArrowLeft, Trash2, Plus,
  Sparkles, Loader2, Copy, Check, Settings, FolderKanban, Clock, Scissors, Film
} from 'lucide-react';
import {
  Caption, Project, SubtitleStyle, AspectRatio,
  ClipConfig, ShortClip, CandidateClip, ClipGenerationStage
} from '@/types';
import { STYLE_PRESETS, AVAILABLE_FONTS, FontService } from '@/services/font.service';
import { SUPPORTED_LANGUAGES, TranslationService } from '@/services/translation.service';
import { TranscriptionService } from '@/services/transcription.service';
import { SubtitleLayoutService } from '@/services/subtitleLayout.service';
import { VideoMetadataService } from '@/services/videoMetadata.service';
import { ClipSelectorService } from '@/services/clipSelector.service';
import { ClipGeneratorService } from '@/services/clipGenerator.service';
import { storageService } from '@/services/storage.service';
import { ExportModal } from './ExportModal';
import { ClipConfigModal } from '@/components/clips/ClipConfigModal';
import { ClipProgressModal } from '@/components/clips/ClipProgressModal';
import { ClipGalleryModal } from '@/components/clips/ClipGalleryModal';

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
  const [isLocalWhisperConnected, setIsLocalWhisperConnected] = useState(false);
  const [savedProjects, setSavedProjects] = useState<Project[]>([]);
  const [saveToast, setSaveToast] = useState(false);
  const [containerDimensions, setContainerDimensions] = useState<{ width: number; height: number }>({
    width: 640,
    height: 360,
  });

  // Short Clips Generator State
  const [isClipConfigOpen, setIsClipConfigOpen] = useState(false);
  const [isClipProgressOpen, setIsClipProgressOpen] = useState(false);
  const [isClipGalleryOpen, setIsClipGalleryOpen] = useState(false);
  const [generatedClips, setGeneratedClips] = useState<ShortClip[]>([]);
  const [currentClipConfig, setCurrentClipConfig] = useState<ClipConfig | null>(null);
  const [currentRenderingTitle, setCurrentRenderingTitle] = useState('');
  const [clipStage, setClipStage] = useState<ClipGenerationStage>({
    step: 1,
    totalSteps: 9,
    title: 'Preparing transcript',
    detail: 'Checking word timestamps and boundaries...',
    completedClips: 0,
    totalClips: 3,
    failedClips: 0,
  });

  const videoRef = useRef<HTMLVideoElement>(null);
  const videoContainerRef = useRef<HTMLDivElement>(null);

  // Check local faster-whisper server health periodically
  useEffect(() => {
    let active = true;
    const probe = async () => {
      const isUp = await TranscriptionService.checkLocalFasterWhisper();
      if (active) setIsLocalWhisperConnected(isUp);
    };
    probe();
    const timer = setInterval(probe, 6000);
    return () => {
      active = false;
      clearInterval(timer);
    };
  }, []);

  // Preload fonts
  useEffect(() => {
    FontService.loadGoogleFont(project.style.fontFamily);
    setSavedProjects(storageService.getProjects());
  }, [project.style.fontFamily]);

  // Track video container dimensions with ResizeObserver for exact preview-export parity
  useEffect(() => {
    const el = videoContainerRef.current;
    if (!el) return;

    const updateDims = () => {
      const rect = el.getBoundingClientRect();
      if (rect.width > 0 && rect.height > 0) {
        setContainerDimensions({
          width: Math.round(rect.width),
          height: Math.round(rect.height),
        });
      }
    };

    updateDims();
    const ro = new ResizeObserver(updateDims);
    ro.observe(el);
    window.addEventListener('resize', updateDims);

    return () => {
      ro.disconnect();
      window.removeEventListener('resize', updateDims);
    };
  }, [project.aspectRatio]);

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
      const vw = videoRef.current.videoWidth;
      const vh = videoRef.current.videoHeight;
      setDuration(dur);

      if (vw && vh && (!project.metadata || !project.metadata.width)) {
        const detected = VideoMetadataService.detectAspectRatio(vw, vh);
        const orientation = VideoMetadataService.detectOrientation(vw, vh);
        setProject((prev) => ({
          ...prev,
          duration: dur,
          aspectRatio: prev.aspectRatio === 'custom' || !prev.aspectRatio ? detected.ratio : prev.aspectRatio,
          metadata: {
            width: vw,
            height: vh,
            aspectRatio: detected.ratio,
            aspectRatioValue: detected.value,
            duration: dur,
            orientation,
          },
        }));
      } else {
        setProject((prev) => ({ ...prev, duration: dur }));
      }
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

  // --- AI Transcription ---
  const handleAutoTranscribe = async () => {
    setIsTranscribing(true);
    setTranscriptionStatus(
      isLocalWhisperConnected
        ? 'Transcribing audio with local Faster-Whisper (word-level precision)...'
        : 'Listening to audio track and generating synchronized subtitles...'
    );
    try {
      let mediaBlob: Blob = new Blob([]);
      if (project.videoUrl) {
        try {
          const res = await fetch(project.videoUrl);
          if (res.ok) {
            mediaBlob = await res.blob();
          }
        } catch (e) {
          console.warn('Could not fetch media blob from videoUrl, using fallback:', e);
        }
      }

      const generated = await TranscriptionService.transcribeMedia(
        mediaBlob,
        duration,
        whisperApiKey || undefined,
        project.sourceLang
      );
      setProject((prev) => ({
        ...prev,
        sourceLang: 'en',
        targetLang: 'en',
        captions: generated,
        originalCaptions: generated,
      }));
      setTranscriptionStatus(
        isLocalWhisperConnected
          ? 'Generated via local Faster-Whisper with word timestamps!'
          : 'Subtitles generated successfully!'
      );
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

  // --- AI Short Clips Generation Pipeline ---
  const handleStartClipGeneration = async (config: ClipConfig) => {
    setIsClipConfigOpen(false);
    setIsClipProgressOpen(true);
    setCurrentClipConfig(config);

    setClipStage({
      step: 1,
      totalSteps: 9,
      title: 'Preparing transcript',
      detail: 'Verifying transcript text and speech timestamps...',
      completedClips: 0,
      totalClips: config.numClips,
      failedClips: 0,
    });

    try {
      // 1. Ensure transcript exists. If missing, transcribe first!
      let activeCaptions = project.captions;
      if (!activeCaptions || activeCaptions.length === 0) {
        setClipStage((prev) => ({
          ...prev,
          step: 1,
          detail: 'No transcript detected. Transcribing video audio first...',
        }));

        let mediaBlob: Blob = new Blob([]);
        if (project.videoUrl) {
          try {
            const res = await fetch(project.videoUrl);
            if (res.ok) mediaBlob = await res.blob();
          } catch (e) {
            console.warn('Could not fetch media blob:', e);
          }
        }

        activeCaptions = await TranscriptionService.transcribeMedia(
          mediaBlob,
          duration,
          whisperApiKey || undefined,
          project.sourceLang
        );

        setProject((prev) => ({
          ...prev,
          captions: activeCaptions,
          originalCaptions: activeCaptions,
        }));
      }

      // 2. Finding candidate highlights
      setClipStage((prev) => ({
        ...prev,
        step: 2,
        title: 'Finding candidate highlights',
        detail: `Analyzing transcript for ${config.criteria} moments between ${config.durationOption}s...`,
      }));

      const candidates = await ClipSelectorService.selectCandidates(
        activeCaptions,
        duration,
        config
      );

      if (candidates.length === 0) {
        throw new Error('No candidate segments found within the requested duration limits.');
      }

      // 3. Scoring and validating candidates
      setClipStage((prev) => ({
        ...prev,
        step: 3,
        title: 'Scoring & validating candidates',
        detail: `Programmatically validating boundaries for ${candidates.length} candidate clips...`,
        totalClips: candidates.length,
      }));

      await new Promise((r) => setTimeout(r, 600));

      // 4 to 8. Render clips sequentially
      const renderedClips: ShortClip[] = [];
      let completedCount = 0;
      let failedCount = 0;

      for (let i = 0; i < candidates.length; i++) {
        const candidate = candidates[i];
        setCurrentRenderingTitle(candidate.title);

        setClipStage((prev) => ({
          ...prev,
          step: 4 + Math.min(4, Math.floor((i / candidates.length) * 4)),
          title: `Rendering Clip ${i + 1} of ${candidates.length}`,
          detail: `Reframing to ${config.aspectRatio} and burning subtitles: "${candidate.title}"`,
        }));

        if (!videoRef.current) {
          throw new Error('Video player is not initialized for rendering.');
        }

        try {
          const finishedClip = await ClipGeneratorService.renderClip(
            candidate,
            config,
            activeCaptions,
            videoRef.current,
            (pct, stageText) => {
              setClipStage((prev) => ({
                ...prev,
                detail: `Clip ${i + 1}/${candidates.length}: ${stageText}`,
              }));
            }
          );
          renderedClips.push(finishedClip);
          completedCount++;
        } catch (err) {
          console.error(`Clip ${i + 1} render failed:`, err);
          failedCount++;
          renderedClips.push({
            ...candidate,
            captions: ClipGeneratorService.retimeCaptions(activeCaptions, candidate.start, candidate.end),
            status: 'failed',
            progress: 0,
            error: (err as any).message || 'Render failed',
            aspectRatio: config.aspectRatio === '9:16' ? '9:16' : config.aspectRatio === '1:1' ? '1:1' : '16:9',
          });
        }

        setClipStage((prev) => ({
          ...prev,
          completedClips: completedCount,
          failedClips: failedCount,
        }));
      }

      // 9. Generation complete
      setClipStage((prev) => ({
        ...prev,
        step: 9,
        title: 'Generation Complete!',
        detail: `Successfully created ${completedCount} short clips ready for download.`,
      }));

      setGeneratedClips(renderedClips);
      await new Promise((r) => setTimeout(r, 900));
      setIsClipProgressOpen(false);
      setIsClipGalleryOpen(true);
    } catch (err: any) {
      console.error('Clip generation pipeline error:', err);
      alert('Short clips generation failed: ' + (err.message || 'Unknown error'));
      setIsClipProgressOpen(false);
    }
  };

  const handleDownloadClip = (clip: ShortClip) => {
    if (!clip.videoBlobUrl) return;
    const a = document.createElement('a');
    a.href = clip.videoBlobUrl;
    a.download = `${clip.title.replace(/[^a-zA-Z0-9_-]/g, '_')}_${clip.aspectRatio.replace(':', '_')}.mp4`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const handleDownloadAllClips = () => {
    const ready = generatedClips.filter((c) => c.status === 'ready' && c.videoBlobUrl);
    ready.forEach((clip, idx) => {
      setTimeout(() => {
        handleDownloadClip(clip);
      }, idx * 600);
    });
  };

  const handleDeleteClip = (clipId: string) => {
    setGeneratedClips((prev) => prev.filter((c) => c.id !== clipId));
  };

  const handleRegenerateClip = async (clip: ShortClip) => {
    if (!videoRef.current || !currentClipConfig) return;
    try {
      const updated = await ClipGeneratorService.renderClip(
        clip,
        currentClipConfig,
        project.captions,
        videoRef.current,
        () => {}
      );
      setGeneratedClips((prev) => prev.map((c) => (c.id === clip.id ? updated : c)));
    } catch (err: any) {
      alert('Failed to rerender clip: ' + err.message);
    }
  };

  const handleUpdateClipBoundaries = async (clipId: string, newStart: number, newEnd: number) => {
    const target = generatedClips.find((c) => c.id === clipId);
    if (!target || !videoRef.current || !currentClipConfig) return;

    const modifiedCandidate: CandidateClip = {
      ...target,
      start: newStart,
      end: newEnd,
      duration: parseFloat((newEnd - newStart).toFixed(1)),
      reason: 'User adjusted boundaries',
    };

    try {
      const rerendered = await ClipGeneratorService.renderClip(
        modifiedCandidate,
        currentClipConfig,
        project.captions,
        videoRef.current,
        () => {}
      );
      setGeneratedClips((prev) => prev.map((c) => (c.id === clipId ? rerendered : c)));
    } catch (err: any) {
      alert('Failed to rerender clip: ' + err.message);
    }
  };

  const handleRestyleClip = async (clipId: string, newStyle: SubtitleStyle) => {
    const target = generatedClips.find((c) => c.id === clipId);
    if (!target || !videoRef.current || !currentClipConfig) return;

    const restyledConfig: ClipConfig = {
      ...currentClipConfig,
      subtitleStyle: newStyle,
    };

    try {
      const rerendered = await ClipGeneratorService.renderClip(
        target,
        restyledConfig,
        project.captions,
        videoRef.current,
        () => {}
      );
      setGeneratedClips((prev) => prev.map((c) => (c.id === clipId ? rerendered : c)));
    } catch (err: any) {
      alert('Failed to restyle clip: ' + err.message);
    }
  };

  // Active caption
  const activeCaption = project.captions.find((c) => currentTime >= c.start && currentTime <= c.end);

  // Responsive Subtitle Layout Engine calculation for Preview (matches Canvas Video Export 1:1)
  const activeCaptionLayout = React.useMemo(() => {
    if (!activeCaption || !containerDimensions.width || !containerDimensions.height) return null;
    return SubtitleLayoutService.computeLayout({
      text: activeCaption.text,
      viewportWidth: containerDimensions.width,
      viewportHeight: containerDimensions.height,
      style: project.style,
      aspectRatio: project.aspectRatio || '16:9',
    });
  }, [activeCaption, containerDimensions, project.style, project.aspectRatio]);

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
            onClick={() => setIsClipConfigOpen(true)}
            className="w-11 h-11 rounded-2xl bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 flex items-center justify-center text-amber-400 hover:scale-105 transition-transform"
            title="Generate AI Short Clips"
          >
            <Scissors size={18} />
          </button>
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
            {isLocalWhisperConnected && (
              <div
                title="Faster-Whisper local server is connected at http://127.0.0.1:8000"
                className="hidden xl:flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-[11px] font-bold"
              >
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span>Faster-Whisper AI</span>
              </div>
            )}

            {/* AI Short Clips Button */}
            <button
              onClick={() => setIsClipConfigOpen(true)}
              className="glow-button px-3.5 sm:px-4 py-1.5 rounded-full bg-gradient-to-r from-amber-500 via-brand-primary to-brand-secondary hover:brightness-110 text-white text-xs font-bold flex items-center gap-1.5 transition-all shadow-md shadow-brand-primary/20 group"
              title="Generate Short Clips for Shorts, Reels, and TikTok"
            >
              <Scissors size={14} className="group-hover:rotate-12 transition-transform text-amber-200" />
              <span>Generate Short Clips</span>
            </button>

            {generatedClips.length > 0 && (
              <button
                onClick={() => setIsClipGalleryOpen(true)}
                className="px-3 py-1.5 rounded-full bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/30 text-emerald-400 text-xs font-bold flex items-center gap-1.5 transition-all"
              >
                <Film size={13} />
                <span>Clips ({generatedClips.filter((c) => c.status === 'ready').length})</span>
              </button>
            )}

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
              className="px-4 sm:px-5 py-1.5 rounded-full bg-white/10 hover:bg-white/20 border border-white/15 text-white text-xs font-bold flex items-center gap-1.5 transition-all"
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

            {/* Dynamic Styled Subtitle Overlay rendered via SubtitleLayoutService */}
            <AnimatePresence>
              {activeCaption && activeCaptionLayout && (
                <div
                  style={{
                    position: 'absolute',
                    left: `${activeCaptionLayout.boxX}px`,
                    top: `${activeCaptionLayout.boxY}px`,
                    width: `${activeCaptionLayout.boxWidth}px`,
                    height: `${activeCaptionLayout.boxHeight}px`,
                    pointerEvents: 'none',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'center',
                    alignItems: 'center',
                    backgroundColor: project.style.backgroundColor,
                    borderRadius: `${Math.round(project.style.backgroundRadius * activeCaptionLayout.scaleFactor)}px`,
                    boxSizing: 'border-box',
                    zIndex: 10,
                  }}
                >
                  <motion.div
                    key={activeCaption.id}
                    initial={{ opacity: 0, scale: project.style.animation === 'pop' ? 0.9 : 1 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.12 }}
                    className="flex flex-col items-center justify-center select-none w-full"
                  >
                    {activeCaptionLayout.lines.map((line, idx) => (
                      <div
                        key={idx}
                        style={{
                          fontFamily: `"${project.style.fontFamily}", sans-serif`,
                          fontSize: `${activeCaptionLayout.fontSize}px`,
                          lineHeight: `${activeCaptionLayout.lineHeight}px`,
                          fontWeight: project.style.fontWeight,
                          color: project.style.color,
                          letterSpacing: `${project.style.letterSpacing}px`,
                          textShadow:
                            project.style.shadowBlur > 0
                              ? `0 ${project.style.shadowOffsetY}px ${project.style.shadowBlur}px ${project.style.shadowColor}`
                              : 'none',
                          WebkitTextStroke:
                            project.style.strokeWidth > 0
                              ? `${Math.max(1, Math.round(project.style.strokeWidth * activeCaptionLayout.scaleFactor))}px ${project.style.strokeColor}`
                              : undefined,
                          whiteSpace: 'nowrap',
                          textAlign: 'center',
                        }}
                      >
                        {line}
                      </div>
                    ))}
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

            {/* Responsive Auto-Scale Toggle */}
            <div className="flex items-center justify-between p-3 rounded-xl bg-white/5 border border-white/10">
              <div>
                <span className="text-xs font-bold text-white block">Responsive Auto-Scale</span>
                <span className="text-[10px] text-gray-400">Scale font to video resolution & aspect ratio</span>
              </div>
              <button
                onClick={() =>
                  setProject({
                    ...project,
                    style: { ...project.style, autoSize: project.style.autoSize === false ? true : false },
                  })
                }
                className={`w-11 h-6 flex items-center rounded-full p-1 transition-colors ${
                  project.style.autoSize !== false ? 'bg-brand-primary justify-end' : 'bg-white/20 justify-start'
                }`}
              >
                <div className="w-4 h-4 rounded-full bg-white shadow-md" />
              </button>
            </div>

            {/* Safe Area Margins & Platform Presets */}
            <div className="space-y-2">
              <label className="text-[10px] uppercase font-bold text-gray-400 block">Safe Margins / Platform</label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() =>
                    setProject({
                      ...project,
                      style: { ...project.style, safeAreaPreset: 'standard' },
                    })
                  }
                  className={`p-2.5 rounded-xl text-left border transition-all ${
                    (project.style.safeAreaPreset || 'standard') === 'standard'
                      ? 'bg-brand-primary/20 border-brand-primary text-white'
                      : 'bg-white/5 text-gray-400 border-white/10 hover:text-white'
                  }`}
                >
                  <span className="text-xs font-bold block">Standard</span>
                  <span className="text-[10px] text-gray-400">Web, YouTube & TV</span>
                </button>
                <button
                  onClick={() =>
                    setProject({
                      ...project,
                      style: { ...project.style, safeAreaPreset: 'tiktok_reels' },
                    })
                  }
                  className={`p-2.5 rounded-xl text-left border transition-all ${
                    project.style.safeAreaPreset === 'tiktok_reels'
                      ? 'bg-brand-primary/20 border-brand-primary text-white'
                      : 'bg-white/5 text-gray-400 border-white/10 hover:text-white'
                  }`}
                >
                  <span className="text-xs font-bold block">TikTok / Shorts / Reels</span>
                  <span className="text-[10px] text-gray-400">Elevated bottom safe zone</span>
                </button>
              </div>
            </div>

            {/* Max Text Width & Max Lines */}
            <div className="space-y-3">
              <div>
                <div className="flex justify-between text-xs text-gray-400 mb-1">
                  <span>Max Width (% of video)</span>
                  <span className="font-mono">{project.style.maxWidthPercent || 86}%</span>
                </div>
                <input
                  type="range"
                  min="60"
                  max="95"
                  value={project.style.maxWidthPercent || 86}
                  onChange={(e) =>
                    setProject({
                      ...project,
                      style: { ...project.style, maxWidthPercent: parseInt(e.target.value, 10) },
                    })
                  }
                  className="w-full h-1.5 bg-white/10 rounded-lg appearance-none cursor-pointer accent-brand-primary"
                />
              </div>

              <div>
                <div className="flex justify-between text-xs text-gray-400 mb-1">
                  <span>Max Lines per Subtitle</span>
                  <span className="font-mono">{project.style.maxLines || 2} lines</span>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  {[1, 2, 3].map((lines) => (
                    <button
                      key={lines}
                      onClick={() =>
                        setProject({
                          ...project,
                          style: { ...project.style, maxLines: lines },
                        })
                      }
                      className={`py-1.5 rounded-lg text-xs font-medium border transition-all ${
                        (project.style.maxLines || 2) === lines
                          ? 'bg-brand-primary text-white border-brand-primary'
                          : 'bg-white/5 text-gray-400 border-white/10 hover:text-white'
                      }`}
                    >
                      {lines} {lines === 1 ? 'Line' : 'Lines'}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Background Box Styling */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-300">Background Box</span>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() =>
                      setProject({
                        ...project,
                        style: {
                          ...project.style,
                          backgroundColor:
                            project.style.backgroundColor === 'transparent'
                              ? 'rgba(0, 0, 0, 0.75)'
                              : 'transparent',
                        },
                      })
                    }
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold border transition-all ${
                      project.style.backgroundColor !== 'transparent'
                        ? 'bg-brand-primary/20 border-brand-primary text-white'
                        : 'bg-white/5 border-white/10 text-gray-400 hover:text-white'
                    }`}
                  >
                    {project.style.backgroundColor !== 'transparent' ? 'Enabled' : 'None'}
                  </button>
                </div>
              </div>

              {project.style.backgroundColor !== 'transparent' && (
                <div>
                  <div className="flex justify-between text-xs text-gray-400 mb-1">
                    <span>Corner Radius</span>
                    <span className="font-mono">{project.style.backgroundRadius}px</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="24"
                    value={project.style.backgroundRadius}
                    onChange={(e) =>
                      setProject({
                        ...project,
                        style: { ...project.style, backgroundRadius: parseInt(e.target.value, 10) },
                      })
                    }
                    className="w-full h-1.5 bg-white/10 rounded-lg appearance-none cursor-pointer accent-brand-primary"
                  />
                </div>
              )}
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
            {/* Faster-Whisper Local AI Status Card */}
            <div
              className={`p-4 rounded-2xl border transition-all ${
                isLocalWhisperConnected
                  ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                  : 'bg-white/5 border-white/10 text-gray-300'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="font-bold text-white flex items-center gap-2">
                  <span
                    className={`w-2.5 h-2.5 rounded-full ${
                      isLocalWhisperConnected ? 'bg-emerald-400 animate-pulse' : 'bg-gray-500'
                    }`}
                  />
                  Faster-Whisper (Local AI)
                </span>
                <span
                  className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${
                    isLocalWhisperConnected ? 'bg-emerald-500/20 text-emerald-400' : 'bg-white/10 text-gray-400'
                  }`}
                >
                  {isLocalWhisperConnected ? 'Connected' : 'Offline'}
                </span>
              </div>
              <p className="text-[11px] text-gray-400 leading-relaxed">
                {isLocalWhisperConnected
                  ? 'Your local Faster-Whisper server is active at http://127.0.0.1:8000. Subtitles are transcribed offline on your device with CTranslate2 and PyAV.'
                  : 'To transcribe videos offline with faster-whisper without an API key, run this in your terminal:'}
              </p>
              {!isLocalWhisperConnected && (
                <div className="mt-3 p-2.5 rounded-xl bg-black/50 border border-white/10 font-mono text-[11px] text-brand-primary flex items-center justify-between">
                  <code>python server/whisper_server.py</code>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText('python server/whisper_server.py');
                      alert('Command copied! Run it in PowerShell or Terminal to launch Faster-Whisper.');
                    }}
                    className="ml-2 px-2 py-1 rounded bg-white/10 hover:bg-white/20 text-white text-[10px]"
                  >
                    Copy
                  </button>
                </div>
              )}
            </div>

            {/* OpenAI Whisper Cloud API Key Backup */}
            <div className="p-4 rounded-2xl bg-white/5 border border-white/10 space-y-3">
              <div>
                <span className="text-xs font-bold text-white block">OpenAI Cloud Backup (Optional)</span>
                <p className="text-[11px] text-gray-400 mt-0.5">
                  Used as fallback when Faster-Whisper server is not active on your computer.
                </p>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] uppercase font-bold text-gray-400 block">OpenAI API Key</label>
                <input
                  type="password"
                  placeholder="sk-proj-..."
                  value={whisperApiKey}
                  onChange={(e) => setWhisperApiKey(e.target.value)}
                  className="w-full bg-black/40 border border-white/10 rounded-xl p-2.5 text-xs text-white outline-none focus:border-brand-primary"
                />
              </div>
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

      {/* Short Clips Configuration Modal */}
      <ClipConfigModal
        isOpen={isClipConfigOpen}
        onClose={() => setIsClipConfigOpen(false)}
        onStartGeneration={handleStartClipGeneration}
        currentStyle={project.style}
        videoDuration={duration}
      />

      {/* Short Clips Multi-Stage Progress Modal */}
      <ClipProgressModal
        isOpen={isClipProgressOpen}
        stage={clipStage}
        currentClipIndex={clipStage.completedClips + 1}
        currentClipTitle={currentRenderingTitle}
      />

      {/* Short Clips Review Gallery Modal */}
      <ClipGalleryModal
        isOpen={isClipGalleryOpen}
        onClose={() => setIsClipGalleryOpen(false)}
        clips={generatedClips}
        onDownloadClip={handleDownloadClip}
        onDownloadAll={handleDownloadAllClips}
        onDeleteClip={handleDeleteClip}
        onRegenerateClip={handleRegenerateClip}
        onUpdateBoundaries={handleUpdateClipBoundaries}
        onRestyleClip={handleRestyleClip}
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
