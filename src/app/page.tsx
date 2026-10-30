"use client";

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  Globe, Zap, Sparkles, ChevronRight, Play,
  MousePointer2, Layers, Cpu, ShieldCheck,
  Trash2, FileText, Clock, Film
} from 'lucide-react';
import VideoEditor from '@/components/editor/VideoEditor';
import { DropZone } from '@/components/upload/DropZone';
import { Project, Caption } from '@/types';
import { storageService } from '@/services/storage.service';
import { MediaService } from '@/services/media.service';
import { STYLE_PRESETS } from '@/services/font.service';

const Navbar = ({ onOpenEditor }: { onOpenEditor: () => void }) => (
  <nav className="fixed top-0 w-full z-50 px-6 py-4 flex justify-between items-center glass-nav">
    <div className="flex items-center gap-2 group cursor-pointer" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
      <div className="w-10 h-10 bg-gradient-to-br from-brand-primary to-brand-secondary rounded-xl flex items-center justify-center font-black text-white shadow-lg shadow-brand-primary/30 group-hover:rotate-12 transition-transform">
        L
      </div>
      <span className="text-2xl font-bold tracking-tighter text-white">
        LingoSync <span className="text-brand-primary">AI</span>
      </span>
    </div>
    <div className="hidden md:flex items-center gap-8 text-sm font-medium text-gray-400">
      <a href="#features" className="hover:text-white transition-colors relative group">
        Features
        <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-brand-primary transition-all group-hover:w-full" />
      </a>
      <a href="#languages" className="hover:text-white transition-colors relative group">
        Languages
        <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-brand-primary transition-all group-hover:w-full" />
      </a>
      <a href="#projects" className="hover:text-white transition-colors relative group">
        Your Projects
        <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-brand-primary transition-all group-hover:w-full" />
      </a>
      <button
        onClick={onOpenEditor}
        className="px-6 py-2 rounded-full bg-white text-black font-bold hover:bg-gray-200 transition-all shadow-xl shadow-white/10"
      >
        Open Studio
      </button>
    </div>
  </nav>
);

const FeatureCard = ({
  icon: Icon,
  title,
  description,
  index,
}: {
  icon: React.ElementType;
  title: string;
  description: string;
  index: number;
}) => (
  <motion.div
    initial={{ opacity: 0, y: 30 }}
    whileInView={{ opacity: 1, y: 0 }}
    viewport={{ once: true }}
    transition={{ delay: index * 0.1 }}
    whileHover={{ y: -6 }}
    className="glass-card p-8 rounded-3xl flex flex-col gap-5 transition-all duration-300 group cursor-default"
  >
    <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-brand-primary to-brand-secondary flex items-center justify-center text-white shadow-lg group-hover:scale-110 transition-transform">
      <Icon size={28} />
    </div>
    <h3 className="text-xl font-bold text-white">{title}</h3>
    <p className="text-gray-400 leading-relaxed text-sm sm:text-base">{description}</p>
    <div className="mt-2 h-0.5 w-0 bg-brand-primary group-hover:w-full transition-all duration-500" />
  </motion.div>
);

export default function LandingPage() {
  const [editorMode, setEditorMode] = useState(false);
  const [activeProject, setActiveProject] = useState<Project | undefined>(undefined);
  const [savedProjects, setSavedProjects] = useState<Project[]>([]);

  useEffect(() => {
    setSavedProjects(storageService.getProjects());
  }, [editorMode]);

  const handleMediaSelected = async (file: File | Blob, isSample = false, initialCaptions?: Caption[]) => {
    let videoUrl = '';
    let duration = 15;
    let thumbnailUrl = '';

    if (isSample || file.size === 0) {
      videoUrl = MediaService.SAMPLE_VIDEO_URL;
      duration = 15;
    } else {
      videoUrl = URL.createObjectURL(file);
      try {
        const meta = await MediaService.extractVideoMetadata(file);
        duration = meta.duration || 15;
        thumbnailUrl = meta.thumbnailUrl || '';
      } catch (e) {
        console.warn('Could not extract metadata:', e);
      }
    }

    const newProject: Project = {
      id: `proj_${Date.now()}`,
      title: isSample ? 'Sample Video Project' : (file as File).name?.replace(/\.[^/.]+$/, '') || 'My Video Project',
      createdAt: Date.now(),
      updatedAt: Date.now(),
      duration,
      videoUrl,
      thumbnailUrl,
      captions: initialCaptions || MediaService.SAMPLE_CAPTIONS,
      originalCaptions: initialCaptions || MediaService.SAMPLE_CAPTIONS,
      style: STYLE_PRESETS[0],
      sourceLang: 'en',
      targetLang: 'en',
      aspectRatio: '16:9',
    };

    storageService.saveProject(newProject);
    setActiveProject(newProject);
    setEditorMode(true);
  };

  const handleOpenExistingProject = (proj: Project) => {
    setActiveProject(proj);
    setEditorMode(true);
  };

  const handleDeleteProject = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    storageService.deleteProject(id);
    setSavedProjects(storageService.getProjects());
  };

  if (editorMode) {
    return (
      <VideoEditor
        initialProject={activeProject}
        onBack={() => {
          setEditorMode(false);
          setActiveProject(undefined);
        }}
      />
    );
  }

  return (
    <div className="min-h-screen bg-[#060608] text-white bg-mesh selection:bg-brand-primary selection:text-white">
      <Navbar onOpenEditor={() => setEditorMode(true)} />

      {/* HERO SECTION WITH REAL DROPZONE */}
      <section className="relative pt-32 sm:pt-40 pb-16 px-6 flex flex-col items-center text-center max-w-5xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-brand-primary/10 border border-brand-primary/30 text-brand-primary text-xs font-bold uppercase tracking-widest mb-6 backdrop-blur-sm"
        >
          <Sparkles size={14} className="animate-pulse" />
          <span>Local-First AI Video Subtitle Studio</span>
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="text-5xl sm:text-7xl md:text-8xl font-black tracking-tighter leading-[1.08] mb-6"
        >
          Break the Sound Barrier. <br />
          <span className="text-gradient">Reach the World.</span>
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="text-gray-400 text-lg sm:text-xl max-w-2xl mb-10 leading-relaxed font-light"
        >
          Generate accurate, viral AI subtitles in seconds. Translate to <span className="text-white font-medium">50+ languages</span>, customize typography, and export directly in your browser.
        </motion.p>

        {/* Real Interactive DropZone Upload Component */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="w-full max-w-3xl"
        >
          <DropZone onMediaSelected={handleMediaSelected} />
        </motion.div>

        {/* Background Ambient Glows */}
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[700px] bg-brand-primary/15 rounded-full blur-[140px] -z-10 pointer-events-none" />
        <div className="absolute top-1/2 -right-20 w-[400px] h-[400px] bg-brand-secondary/15 rounded-full blur-[120px] -z-10 pointer-events-none" />
      </section>

      {/* RECENT PROJECTS SECTION */}
      {savedProjects.length > 0 && (
        <section id="projects" className="py-12 px-6 max-w-6xl mx-auto">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                <Clock size={20} className="text-brand-primary" />
                <span>Your Projects</span>
              </h2>
              <p className="text-xs text-gray-400 mt-1">Saved locally in your browser storage</p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {savedProjects.map((p) => (
              <div
                key={p.id}
                onClick={() => handleOpenExistingProject(p)}
                className="glass-card p-4 rounded-2xl flex items-center gap-4 hover:border-brand-primary/40 transition-all cursor-pointer group"
              >
                <div className="w-20 h-14 rounded-xl bg-neutral-800 flex items-center justify-center shrink-0 overflow-hidden relative">
                  {p.thumbnailUrl ? (
                    <img src={p.thumbnailUrl} alt={p.title} className="w-full h-full object-cover" />
                  ) : (
                    <Film size={24} className="text-gray-500" />
                  )}
                  <span className="absolute bottom-1 right-1 rounded bg-black/80 px-1 font-mono text-[9px] text-gray-300">
                    {Math.round(p.duration || 15)}s
                  </span>
                </div>

                <div className="flex-1 min-w-0">
                  <h4 className="text-sm font-bold text-white truncate group-hover:text-brand-primary transition-colors">
                    {p.title}
                  </h4>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {p.captions?.length || 0} subtitles • {p.targetLang?.toUpperCase() || 'ES'}
                  </p>
                </div>

                <button
                  onClick={(e) => handleDeleteProject(e, p.id)}
                  title="Delete project"
                  className="p-2 text-gray-500 hover:text-red-400 hover:bg-white/5 rounded-lg transition-colors"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* CORE FEATURES SECTION */}
      <section id="features" className="py-24 px-6 max-w-7xl mx-auto">
        <div className="text-center mb-16">
          <h2 className="text-3xl sm:text-5xl font-black text-white mb-3">
            Built for Viral Content Creators
          </h2>
          <p className="text-gray-400 text-base sm:text-lg">
            Everything you need to go global with your videos.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <FeatureCard
            index={0}
            icon={Globe}
            title="50+ Language AI Translation"
            description="Convert your captions into Spanish, Hindi, French, Japanese, and 50+ languages while keeping millisecond-perfect timing."
          />
          <FeatureCard
            index={1}
            icon={Zap}
            title="Instant Timestamp Sync"
            description="Millisecond-perfect timestamps. Adjust, trim, and edit any subtitle cue with live video preview sync."
          />
          <FeatureCard
            index={2}
            icon={ShieldCheck}
            title="100% In-Browser Privacy"
            description="Your video never leaves your computer. All audio processing and canvas rendering happen right inside your browser."
          />
        </div>
      </section>

      {/* BENTO CAPABILITIES SECTION */}
      <section id="languages" className="py-20 px-6 max-w-7xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="md:col-span-2 glass-card p-8 rounded-3xl flex flex-col justify-center relative overflow-hidden group">
            <div className="absolute -right-20 -top-20 w-64 h-64 bg-brand-primary/20 blur-3xl rounded-full" />
            <Cpu size={40} className="text-brand-primary mb-4" />
            <h3 className="text-2xl font-bold text-white mb-2">Browser-Native Speech AI</h3>
            <p className="text-gray-400 text-sm sm:text-base leading-relaxed">
              Powered by the Web Speech API and intelligent pacing engines, transcribing speech without expensive cloud server fees.
            </p>
          </div>

          <div className="glass-card p-8 rounded-3xl flex flex-col justify-center text-center group hover:bg-white/[0.06] transition-all">
            <Layers size={40} className="text-brand-secondary mx-auto mb-4" />
            <h3 className="text-lg font-bold text-white mb-1">Viral Styles</h3>
            <p className="text-gray-400 text-xs sm:text-sm">
              The Beast, TikTok Pill, Cyberpunk, and Cinema presets.
            </p>
          </div>

          <div className="glass-card p-8 rounded-3xl flex flex-col justify-center text-center group hover:bg-white/[0.06] transition-all">
            <MousePointer2 size={40} className="text-rose-400 mx-auto mb-4" />
            <h3 className="text-lg font-bold text-white mb-1">SRT, VTT & MP4</h3>
            <p className="text-gray-400 text-xs sm:text-sm">
              Download clean subtitle files or export burned-in captioned video directly.
            </p>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="py-16 text-center border-t border-white/5 text-gray-500 text-xs sm:text-sm">
        <p>© 2026 LingoSync AI. Engineered for global reach.</p>
      </footer>
    </div>
  );
}
