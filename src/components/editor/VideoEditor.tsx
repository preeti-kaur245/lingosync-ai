"use client";

import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Play, Pause, SkipBack, SkipForward,
  Type, Palette, Languages, Download,
  Save, Trash2, Plus, Minus, Settings, Loader2
} from 'lucide-react';
import { AIService } from '@/services/ai.service';
import { Caption } from '@/types';

const STYLE_TEMPLATES = [
  { id: 'mrbeast', name: 'The Beast', color: '#ffe14d', font: 'Montserrat', shadow: '0 4px 0 #000', scale: 'scale-110' },
  { id: 'corporate', name: 'Clean Pro', color: '#ffffff', font: 'Inter', shadow: 'none', scale: 'scale-100' },
  { id: 'cinematic', name: 'Cinema', color: '#e5e7eb', font: 'Playfair Display', shadow: '0 2px 10px rgba(0,0,0,0.5)', scale: 'scale-100' },
  { id: 'neon', name: 'Cyberpunk', color: '#00ffcc', font: 'Orbitron', shadow: '0 0 10px #00ffcc', scale: 'scale-105' },
];

const VideoEditor = () => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [activeStyle, setActiveStyle] = useState(STYLE_TEMPLATES[0]);
  const [captions, setCaptions] = useState<Caption[]>([
    { id: 1, start: 0, end: 2, text: "Welcome to the future of video!", lang: "en" },
    { id: 2, start: 2, end: 5, text: "Break the sound barrier today.", lang: "en" },
  ]);
  const [selectedCaption, setSelectedCaption] = useState(null);
  const [isTranslating, setIsTranslating] = useState(false);
  const [targetLang, setTargetLang] = useState('es');

  const videoRef = useRef<HTMLVideoElement>(null);

  const togglePlay = () => {
    if (isPlaying) videoRef.current?.pause();
    else videoRef.current?.play();
    setIsPlaying(!isPlaying);
  };

  const handleTimeUpdate = () => {
    setCurrentTime(videoRef.current ? videoRef.current.currentTime : 0);
  };

  const handleLoadedMetadata = () => {
    setDuration(videoRef.current ? videoRef.current.duration : 0);
  };

  const handleTranslateAll = async () => {
    setIsTranslating(true);
    try {
      const updatedCaptions = await Promise.all(
        captions.map(async (cap) => {
          const result = await AIService.translateText(cap.text, targetLang);
          return { ...cap, text: result.translatedText, lang: targetLang };
        })
      );
      setCaptions(updatedCaptions);
    } catch (error) {
      console.error("Translation failed", error);
    } finally {
      setIsTranslating(false);
    }
  };

  return (
    <div className="flex h-screen bg-dark overflow-hidden font-sans">
      {/* LEFT SIDEBAR - Tools */}
      <aside className="w-20 bg-black/50 border-r border-white/10 flex flex-col items-center py-8 gap-8">
        <div className="w-12 h-12 rounded-2xl bg-brand-primary flex items-center justify-center text-white font-bold cursor-pointer hover:scale-110 transition-transform">L</div>

        <div className="flex flex-col gap-4">
          <ToolButton icon={Type} active label="Captions" />
          <ToolButton icon={Palette} label="Styling" />
          <ToolButton icon={Languages} label="Translate" />
          <ToolButton icon={Settings} label="Config" />
        </div>

        <div className="mt-auto flex flex-col gap-4">
          <ToolButton icon={Save} label="Save" />
          <ToolButton icon={Download} label="Export" />
        </div>
      </aside>

      {/* MAIN EDITOR AREA */}
      <main className="flex-1 flex flex-col">
        {/* Top Bar */}
        <header className="h-16 border-b border-white/10 flex items-center justify-between px-8 bg-black/20 backdrop-blur-sm">
          <h2 className="text-lg font-semibold text-white/80">Project: <span className="text-white">Global Reach Clip</span></h2>
          <div className="flex items-center gap-3">
             <button className="px-4 py-2 rounded-lg bg-white/5 hover:bg-white/10 text-sm transition-all border border-white/10">Preview</button>
             <button className="px-4 py-2 rounded-lg bg-brand-primary text-white text-sm font-bold hover:brightness-110 transition-all">Export Video</button>
          </div>
        </header>

        {/* Video Preview Section */}
        <div className="flex-1 relative bg-neutral-900 flex items-center justify-center p-12 group">
          <div className="relative max-w-4xl w-full aspect-video bg-black rounded-3xl overflow-hidden shadow-2xl ring-1 ring-white/20">
            <video
              ref={videoRef}
              onTimeUpdate={handleTimeUpdate}
              onLoadedMetadata={handleLoadedMetadata}
              className="w-full h-full object-contain"
              src="https://www.w3schools.com/html/mov_bbb.mp4"
            />

            {/* Dynamic Overlay Captions */}
            <AnimatePresence>
              {captions.filter(c => currentTime >= c.start && currentTime <= c.end).map(caption => (
                <motion.div
                  key={caption.id}
                  initial={{ opacity: 0, y: 20, scale: 0.8 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  className="absolute bottom-12 left-0 right-0 flex justify-center px-4 pointer-events-none"
                >
                  <span
                    style={{
                      color: activeStyle.color,
                      fontFamily: activeStyle.font,
                      textShadow: activeStyle.shadow,
                      transform: activeStyle.scale
                    }}
                    className="text-3xl md:text-5xl font-black uppercase text-center leading-tight transition-all duration-300"
                  >
                    {caption.text}
                  </span>
                </motion.div>
              ))}
            </AnimatePresence>

            {/* Play Overlay */}
            {!isPlaying && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer" onClick={togglePlay}>
                <div className="w-20 h-20 rounded-full bg-brand-primary flex items-center justify-center text-white shadow-xl scale-90 group-hover:scale-100 transition-transform">
                  <Play size={40} fill="currentColor" />
                </div>
              </div>
            )}
          </div>

          {/* Timeline Controls */}
          <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex items-center gap-6 bg-black/60 backdrop-blur-xl px-6 py-3 rounded-full border border-white/10">
            <button onClick={() => { if(videoRef.current) videoRef.current.currentTime -= 5 }} className="text-gray-400 hover:text-white transition-colors"><SkipBack size={20} /></button>
            <button onClick={togglePlay} className="w-12 h-12 rounded-full bg-white text-black flex items-center justify-center hover:scale-110 transition-transform">
              {isPlaying ? <Pause size={24} fill="currentColor" /> : <Play size={24} fill="currentColor" />}
            </button>
            <button onClick={() => { if(videoRef.current) videoRef.current.currentTime += 5 }} className="text-gray-400 hover:text-white transition-colors"><SkipForward size={20} /></button>
            <div className="w-px h-6 bg-white/20 mx-2" />
            <span className="text-xs font-mono text-gray-300">{formatTime(currentTime)} / {formatTime(duration)}</span>
          </div>
        </div>

        {/* BOTTOM PANELS - Captions & Styles */}
        <div className="h-80 border-t border-white/10 bg-black/40 backdrop-blur-sm flex">
          {/* Caption List */}
          <div className="flex-1 overflow-y-auto p-6 border-r border-white/10">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-bold text-gray-400 uppercase tracking-widest">Timeline Captions</h3>
              <div className="flex items-center gap-2">
                <select
                  className="bg-white/5 border border-white/10 rounded-lg px-2 py-1 text-xs text-white outline-none mr-2"
                  value={targetLang}
                  onChange={(e) => setTargetLang(e.target.value)}
                >
                  <option value="es">Spanish</option>
                  <option value="hi">Hindi</option>
                  <option value="fr">French</option>
                  <option value="de">German</option>
                </select>
                <button
                  onClick={handleTranslateAll}
                  disabled={isTranslating}
                  className="flex items-center gap-2 px-3 py-1 rounded-lg bg-brand-primary text-white text-xs font-bold hover:brightness-110 transition-all disabled:opacity-50"
                >
                  {isTranslating ? <Loader2 className="animate-spin" size={14} /> : <Languages size={14} />}
                  {isTranslating ? 'Translating...' : 'AI Translate'}
                </button>
                <button
                  onClick={() => setCaptions([...captions, { id: Date.now(), start: currentTime, end: currentTime + 2, text: "New Caption", lang: "en" }])}
                  className="p-2 rounded-lg bg-brand-primary/20 text-brand-primary hover:bg-brand-primary hover:text-white transition-all"
                >
                  <Plus size={16} />
                </button>
              </div>
            </div>
            <div className="space-y-2">
              {captions.map(caption => (
                <div
                  key={caption.id}
                  onClick={() => setSelectedCaption(caption.id)}
                  className={`flex items-center gap-4 p-3 rounded-xl transition-all cursor-pointer ${selectedCaption === caption.id ? 'bg-brand-primary/20 border border-brand-primary/40' : 'bg-white/5 border border-transparent hover:bg-white/10'}`}
                >
                  <span className="text-xs font-mono text-gray-500 w-12">{formatTime(caption.start)}</span>
                  <input
                    className="bg-transparent flex-1 text-sm text-white outline-none focus:text-brand-primary transition-colors"
                    value={caption.text}
                    onChange={(e) => {
                      const newCaps = [...captions];
                      const idx = newCaps.findIndex(c => c.id === caption.id);
                      newCaps[idx].text = e.target.value;
                      setCaptions(newCaps);
                    }}
                  />
                  <button
                    onClick={(e) => { e.stopPropagation(); setCaptions(captions.filter(c => c.id !== caption.id)); }}
                    className="p-1.5 text-gray-600 hover:text-red-400 transition-colors"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Style Panel */}
          <div className="w-80 p-6 overflow-y-auto bg-black/20">
            <h3 className="text-sm font-bold text-gray-400 uppercase tracking-widest mb-4">Visual Style</h3>
            <div className="grid grid-cols-2 gap-3 mb-8">
              {STYLE_TEMPLATES.map(style => (
                <button
                  key={style.id}
                  onClick={() => setActiveStyle(style)}
                  className={`p-3 rounded-xl text-xs font-medium transition-all border ${activeStyle.id === style.id ? 'bg-brand-primary border-brand-primary text-white' : 'bg-white/5 border-white/10 text-gray-400 hover:bg-white/10'}`}
                >
                  {style.name}
                </button>
              ))}
            </div>

            <div className="space-y-6">
              <div className="space-y-3">
                <label className="text-[10px] uppercase font-bold text-gray-500">Custom Color</label>
                <div className="flex gap-2">
                  <input
                    type="color"
                    className="w-10 h-10 rounded-lg bg-transparent border-none cursor-pointer"
                    value={activeStyle.color}
                    onChange={(e) => setActiveStyle({...activeStyle, color: e.target.value})}
                  />
                  <input
                    type="text"
                    className="flex-1 bg-white/5 border border-white/10 rounded-lg px-3 text-xs text-white outline-none"
                    value={activeStyle.color}
                    onChange={(e) => setActiveStyle({...activeStyle, color: e.target.value})}
                  />
                </div>
              </div>

              <div className="space-y-3">
                <label className="text-[10px] uppercase font-bold text-gray-500">Font Family</label>
                <select
                  className="w-full bg-white/5 border border-white/10 rounded-lg p-2 text-xs text-white outline-none"
                  value={activeStyle.font}
                  onChange={(e) => setActiveStyle({...activeStyle, font: e.target.value})}
                >
                  <option value="Inter">Inter (Modern)</option>
                  <option value="Montserrat">Montserrat (Bold)</option>
                  <option value="Playfair Display">Playfair (Elegant)</option>
                  <option value="Orbitron">Orbitron (Future)</option>
                </select>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

const ToolButton = ({ icon: Icon, active, label }) => (
  <div className="group relative flex items-center justify-center">
    <button className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all ${active ? 'bg-brand-primary text-white' : 'text-gray-500 hover:bg-white/10 hover:text-white'}`}>
      <Icon size={20} />
    </button>
    <span className="absolute left-16 px-2 py-1 rounded bg-white text-black text-[10px] font-bold opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-50">
      {label}
    </span>
  </div>
);

const formatTime = (time: number) => {
  const minutes = Math.floor(time / 60);
  const seconds = Math.floor(time % 60);
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
};

export default VideoEditor;
