"use client";

import React, { useState } from 'react';
import {
  X, Sparkles, Scissors, Clock, Layers, Smartphone, Square, Monitor,
  Sliders, Type, Film, CheckCircle2, ChevronRight
} from 'lucide-react';
import {
  ClipConfig, ClipDurationOption, ClipAspectOption, ClipSelectionCriteria,
  SubtitleStyle
} from '@/types';
import { STYLE_PRESETS } from '@/services/font.service';

interface ClipConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  onStartGeneration: (config: ClipConfig) => void;
  currentStyle: SubtitleStyle;
  videoDuration: number;
}

export const ClipConfigModal: React.FC<ClipConfigModalProps> = ({
  isOpen,
  onClose,
  onStartGeneration,
  currentStyle,
  videoDuration,
}) => {
  const [durationOption, setDurationOption] = useState<ClipDurationOption>('15-30');
  const [customMin, setCustomMin] = useState(15);
  const [customMax, setCustomMax] = useState(30);
  const [numClips, setNumClips] = useState(3);
  const [isCustomClips, setIsCustomClips] = useState(false);
  const [aspectRatio, setAspectRatio] = useState<ClipAspectOption>('9:16');
  const [criteria, setCriteria] = useState<ClipSelectionCriteria>('ai_highlights');
  const [selectedStyle, setSelectedStyle] = useState<SubtitleStyle>(currentStyle);
  const [burnSubtitles, setBurnSubtitles] = useState(true);
  const [wordHighlight, setWordHighlight] = useState(true);
  const [reframingMode, setReframingMode] = useState<'center_crop' | 'blurred_background'>('center_crop');

  if (!isOpen) return null;

  const handleGenerate = () => {
    onStartGeneration({
      durationOption,
      customDurationMin: customMin,
      customDurationMax: customMax,
      numClips,
      aspectRatio,
      criteria,
      subtitleStyle: selectedStyle,
      burnSubtitles,
      wordHighlight,
      reframingMode,
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn">
      <div className="relative w-full max-w-2xl max-h-[92vh] overflow-y-auto bg-neutral-900 border border-white/15 rounded-3xl p-6 sm:p-8 shadow-2xl">
        {/* Glow Element */}
        <div className="absolute top-0 right-0 w-80 h-80 bg-brand-primary/10 rounded-full blur-3xl -z-10 pointer-events-none" />

        {/* Header */}
        <div className="flex items-center justify-between pb-5 border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-brand-primary to-brand-secondary flex items-center justify-center text-white shadow-lg shadow-brand-primary/30">
              <Scissors size={20} />
            </div>
            <div>
              <h3 className="text-xl font-black text-white flex items-center gap-2">
                AI Short Clips Generator
                <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-brand-primary/20 text-brand-primary border border-brand-primary/30">
                  Shorts / Reels / TikTok
                </span>
              </h3>
              <p className="text-xs text-gray-400 mt-0.5">
                Automatically extract viral highlights, reframe, and generate captioned short videos.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-gray-400 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Configuration Sections */}
        <div className="py-6 space-y-6">
          {/* 1. Clip Duration */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-gray-300 flex items-center gap-1.5 uppercase tracking-wider">
              <Clock size={14} className="text-brand-primary" /> Target Clip Duration
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
              {[
                { id: '15-30', label: '15–30s', desc: 'Fast Viral' },
                { id: '30-45', label: '30–45s', desc: 'Standard' },
                { id: '45-60', label: '45–60s', desc: 'Detailed' },
                { id: '60-90', label: '60–90s', desc: 'Deep Dive' },
                { id: 'custom', label: 'Custom', desc: 'Custom Range' },
              ].map((opt) => (
                <button
                  key={opt.id}
                  onClick={() => setDurationOption(opt.id as ClipDurationOption)}
                  className={`p-3 rounded-2xl border text-center transition-all ${
                    durationOption === opt.id
                      ? 'bg-brand-primary/20 border-brand-primary text-white shadow-md'
                      : 'bg-white/5 border-white/10 text-gray-400 hover:text-white'
                  }`}
                >
                  <span className="text-xs font-bold block">{opt.label}</span>
                  <span className="text-[10px] text-gray-500 block mt-0.5">{opt.desc}</span>
                </button>
              ))}
            </div>

            {durationOption === 'custom' && (
              <div className="flex items-center gap-4 p-3 rounded-xl bg-white/5 border border-white/10 mt-2">
                <div className="flex-1">
                  <span className="text-[11px] text-gray-400 block mb-1">Min Duration (seconds)</span>
                  <input
                    type="number"
                    min="10"
                    max={customMax - 5}
                    value={customMin}
                    onChange={(e) => setCustomMin(parseInt(e.target.value, 10) || 15)}
                    className="w-full bg-black/40 border border-white/10 rounded-lg p-1.5 text-xs text-white"
                  />
                </div>
                <div className="flex-1">
                  <span className="text-[11px] text-gray-400 block mb-1">Max Duration (seconds)</span>
                  <input
                    type="number"
                    min={customMin + 5}
                    max={Math.floor(videoDuration)}
                    value={customMax}
                    onChange={(e) => setCustomMax(parseInt(e.target.value, 10) || 30)}
                    className="w-full bg-black/40 border border-white/10 rounded-lg p-1.5 text-xs text-white"
                  />
                </div>
              </div>
            )}
          </div>

          {/* 2. Number of Clips */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-gray-300 flex items-center gap-1.5 uppercase tracking-wider">
              <Layers size={14} className="text-brand-secondary" /> Number of Clips to Generate
            </label>
            <div className="grid grid-cols-4 gap-2">
              {[3, 5, 10].map((num) => (
                <button
                  key={num}
                  onClick={() => {
                    setNumClips(num);
                    setIsCustomClips(false);
                  }}
                  className={`py-2.5 px-3 rounded-xl border text-center transition-all ${
                    !isCustomClips && numClips === num
                      ? 'bg-brand-primary/20 border-brand-primary text-white shadow-md'
                      : 'bg-white/5 border-white/10 text-gray-400 hover:text-white'
                  }`}
                >
                  <span className="text-xs font-bold">{num} Clips</span>
                </button>
              ))}
              <button
                onClick={() => setIsCustomClips(true)}
                className={`py-2.5 px-3 rounded-xl border text-center transition-all ${
                  isCustomClips
                    ? 'bg-brand-primary/20 border-brand-primary text-white shadow-md'
                    : 'bg-white/5 border-white/10 text-gray-400 hover:text-white'
                }`}
              >
                <span className="text-xs font-bold">Custom</span>
              </button>
            </div>
            {isCustomClips && (
              <div className="p-3 rounded-xl bg-white/5 border border-white/10 mt-2">
                <div className="flex justify-between text-xs text-gray-400 mb-1">
                  <span>Target Count:</span>
                  <span className="font-mono text-white">{numClips} clips</span>
                </div>
                <input
                  type="range"
                  min="1"
                  max="15"
                  value={numClips}
                  onChange={(e) => setNumClips(parseInt(e.target.value, 10))}
                  className="w-full h-1.5 bg-white/10 rounded-lg appearance-none cursor-pointer accent-brand-primary"
                />
              </div>
            )}
          </div>

          {/* 3. Output Format & Reframing */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-gray-300 flex items-center gap-1.5 uppercase tracking-wider">
              <Smartphone size={14} className="text-emerald-400" /> Output Format & Platform
            </label>
            <div className="grid grid-cols-3 gap-2">
              <button
                onClick={() => setAspectRatio('9:16')}
                className={`p-3 rounded-2xl border text-left transition-all ${
                  aspectRatio === '9:16'
                    ? 'bg-brand-primary/20 border-brand-primary text-white shadow-md'
                    : 'bg-white/5 border-white/10 text-gray-400 hover:text-white'
                }`}
              >
                <Smartphone size={18} className="text-emerald-400 mb-1" />
                <span className="text-xs font-bold block">Vertical 9:16</span>
                <span className="text-[10px] text-gray-500 block">Shorts, Reels, TikTok</span>
              </button>

              <button
                onClick={() => setAspectRatio('1:1')}
                className={`p-3 rounded-2xl border text-left transition-all ${
                  aspectRatio === '1:1'
                    ? 'bg-brand-primary/20 border-brand-primary text-white shadow-md'
                    : 'bg-white/5 border-white/10 text-gray-400 hover:text-white'
                }`}
              >
                <Square size={18} className="text-amber-400 mb-1" />
                <span className="text-xs font-bold block">Square 1:1</span>
                <span className="text-[10px] text-gray-500 block">Instagram Feed, X</span>
              </button>

              <button
                onClick={() => setAspectRatio('original')}
                className={`p-3 rounded-2xl border text-left transition-all ${
                  aspectRatio === 'original'
                    ? 'bg-brand-primary/20 border-brand-primary text-white shadow-md'
                    : 'bg-white/5 border-white/10 text-gray-400 hover:text-white'
                }`}
              >
                <Monitor size={18} className="text-cyan-400 mb-1" />
                <span className="text-xs font-bold block">Original Ratio</span>
                <span className="text-[10px] text-gray-500 block">Preserve original</span>
              </button>
            </div>

            {aspectRatio === '9:16' && (
              <div className="flex items-center gap-3 p-3 rounded-xl bg-white/5 border border-white/10 text-xs text-gray-300">
                <span className="text-[11px] text-gray-400">Reframing Mode:</span>
                <button
                  onClick={() => setReframingMode('center_crop')}
                  className={`px-3 py-1 rounded-lg text-xs font-medium transition-all ${
                    reframingMode === 'center_crop'
                      ? 'bg-brand-primary text-white'
                      : 'bg-white/5 text-gray-400 hover:text-white'
                  }`}
                >
                  Center Crop
                </button>
                <button
                  onClick={() => setReframingMode('blurred_background')}
                  className={`px-3 py-1 rounded-lg text-xs font-medium transition-all ${
                    reframingMode === 'blurred_background'
                      ? 'bg-brand-primary text-white'
                      : 'bg-white/5 text-gray-400 hover:text-white'
                  }`}
                >
                  Blurred Background
                </button>
              </div>
            )}
          </div>

          {/* 4. Clip Selection Criteria */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-gray-300 flex items-center gap-1.5 uppercase tracking-wider">
              <Sparkles size={14} className="text-amber-400" /> Highlight Selection Criteria
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {[
                { id: 'ai_highlights', label: 'Best Highlights', desc: 'Top engaging moments' },
                { id: 'educational', label: 'Educational / Info', desc: 'Concepts & explanations' },
                { id: 'stories', label: 'Stories & Personal', desc: 'Narratives & experiences' },
                { id: 'qa', label: 'Q & A Moments', desc: 'Questions answered' },
                { id: 'entertaining', label: 'Entertaining / Funny', desc: 'Humor & high energy' },
                { id: 'manual', label: 'Manual Range', desc: 'Pick exact timestamps' },
              ].map((crit) => (
                <button
                  key={crit.id}
                  onClick={() => setCriteria(crit.id as ClipSelectionCriteria)}
                  className={`p-3 rounded-2xl border text-left transition-all ${
                    criteria === crit.id
                      ? 'bg-brand-primary/20 border-brand-primary text-white shadow-md'
                      : 'bg-white/5 border-white/10 text-gray-400 hover:text-white'
                  }`}
                >
                  <span className="text-xs font-bold block">{crit.label}</span>
                  <span className="text-[10px] text-gray-500 block mt-0.5">{crit.desc}</span>
                </button>
              ))}
            </div>
          </div>

          {/* 5. Subtitle Style Preset for Clips */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-gray-300 flex items-center gap-1.5 uppercase tracking-wider">
              <Type size={14} className="text-rose-400" /> Clip Subtitle Styling
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {STYLE_PRESETS.slice(0, 4).map((p) => (
                <button
                  key={p.id}
                  onClick={() => setSelectedStyle(p)}
                  className={`p-2.5 rounded-xl border text-left transition-all ${
                    selectedStyle.id === p.id
                      ? 'bg-brand-primary/20 border-brand-primary text-white'
                      : 'bg-white/5 border-white/10 text-gray-400 hover:text-white'
                  }`}
                >
                  <span className="text-xs font-bold block truncate">{p.name}</span>
                  <span className="text-[10px] text-gray-500 block font-mono">{p.fontFamily}</span>
                </button>
              ))}
            </div>

            <div className="flex items-center justify-between p-3 rounded-xl bg-white/5 border border-white/10 mt-2">
              <span className="text-xs text-gray-300 font-medium">Burn-in Subtitles onto Video</span>
              <button
                onClick={() => setBurnSubtitles(!burnSubtitles)}
                className={`w-11 h-6 flex items-center rounded-full p-1 transition-colors ${
                  burnSubtitles ? 'bg-brand-primary justify-end' : 'bg-white/20 justify-start'
                }`}
              >
                <div className="w-4 h-4 rounded-full bg-white shadow-md" />
              </button>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="pt-4 border-t border-white/10 flex items-center justify-between">
          <span className="text-xs text-gray-500 flex items-center gap-1.5">
            <CheckCircle2 size={14} className="text-emerald-400" /> Free & Offline Processing
          </span>

          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="px-5 py-2.5 rounded-full text-xs font-bold text-gray-400 hover:text-white transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleGenerate}
              className="glow-button px-6 py-2.5 rounded-full bg-gradient-to-r from-brand-primary to-brand-secondary text-white text-xs sm:text-sm font-bold flex items-center gap-2 transition-all shadow-lg shadow-brand-primary/30"
            >
              <Sparkles size={16} />
              <span>Generate Short Clips</span>
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
