"use client";

import React, { useState, useRef } from 'react';
import {
  X, Download, Play, Pause, Trash2, RotateCw, Sliders, Type,
  CheckCircle2, Film, Sparkles, ExternalLink, RefreshCw, Scissors
} from 'lucide-react';
import { ShortClip, SubtitleStyle } from '@/types';
import { STYLE_PRESETS } from '@/services/font.service';

interface ClipGalleryModalProps {
  isOpen: boolean;
  onClose: () => void;
  clips: ShortClip[];
  onDownloadClip: (clip: ShortClip) => void;
  onDownloadAll: () => void;
  onDeleteClip: (clipId: string) => void;
  onRegenerateClip: (clip: ShortClip) => void;
  onUpdateBoundaries: (clipId: string, newStart: number, newEnd: number) => void;
  onRestyleClip: (clipId: string, newStyle: SubtitleStyle) => void;
}

export const ClipGalleryModal: React.FC<ClipGalleryModalProps> = ({
  isOpen,
  onClose,
  clips,
  onDownloadClip,
  onDownloadAll,
  onDeleteClip,
  onRegenerateClip,
  onUpdateBoundaries,
  onRestyleClip,
}) => {
  const [selectedClipId, setSelectedClipId] = useState<string | null>(null);
  const [editingClip, setEditingClip] = useState<ShortClip | null>(null);
  const [restylingClip, setRestylingClip] = useState<ShortClip | null>(null);
  const [playingClipId, setPlayingClipId] = useState<string | null>(null);

  // Edit boundary states
  const [editStart, setEditStart] = useState(0);
  const [editEnd, setEditEnd] = useState(15);

  if (!isOpen) return null;

  const readyClips = clips.filter((c) => c.status === 'ready' && c.videoBlobUrl);

  const startEditBoundaries = (clip: ShortClip) => {
    setEditingClip(clip);
    setEditStart(clip.start);
    setEditEnd(clip.end);
  };

  const saveEditedBoundaries = () => {
    if (!editingClip) return;
    onUpdateBoundaries(editingClip.id, editStart, editEnd);
    setEditingClip(null);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/85 backdrop-blur-md animate-fadeIn">
      <div className="relative w-full max-w-6xl max-h-[94vh] flex flex-col bg-neutral-900 border border-white/15 rounded-3xl shadow-2xl overflow-hidden">
        {/* Glow */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-brand-primary/10 rounded-full blur-3xl -z-10 pointer-events-none" />

        {/* Header */}
        <div className="p-5 sm:p-6 border-b border-white/10 flex items-center justify-between shrink-0 bg-neutral-900/90 backdrop-blur-md">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-brand-primary to-brand-secondary flex items-center justify-center text-white shadow-lg shadow-brand-primary/30">
              <Film size={20} />
            </div>
            <div>
              <h3 className="text-lg sm:text-xl font-black text-white flex items-center gap-2">
                Generated Short Clips Gallery
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 font-bold border border-emerald-500/30">
                  {readyClips.length} {readyClips.length === 1 ? 'Clip' : 'Clips'} Ready
                </span>
              </h3>
              <p className="text-xs text-gray-400 mt-0.5">
                Preview, download, adjust timestamps, or change subtitle presets for your social clips.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            {readyClips.length > 1 && (
              <button
                onClick={onDownloadAll}
                className="glow-button px-4 py-2 rounded-full bg-brand-primary hover:brightness-110 text-white text-xs font-bold flex items-center gap-1.5 transition-all shadow-md"
              >
                <Download size={14} />
                <span>Download All ({readyClips.length})</span>
              </button>
            )}
            <button
              onClick={onClose}
              className="p-2 rounded-xl text-gray-400 hover:text-white hover:bg-white/10 transition-colors"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Clips Grid */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6">
          {clips.length === 0 ? (
            <div className="py-20 text-center space-y-3">
              <Scissors size={40} className="text-gray-600 mx-auto" />
              <p className="text-sm font-bold text-gray-400">No clips generated yet.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {clips.map((clip) => {
                const isPlaying = playingClipId === clip.id;

                return (
                  <div
                    key={clip.id}
                    className="flex flex-col bg-neutral-950 border border-white/10 rounded-2xl overflow-hidden hover:border-brand-primary/50 transition-all shadow-xl group"
                  >
                    {/* Video Player Card */}
                    <div className="relative aspect-[9/16] bg-black overflow-hidden flex items-center justify-center">
                      {clip.videoBlobUrl ? (
                        <video
                          src={clip.videoBlobUrl}
                          controls
                          playsInline
                          loop
                          className="w-full h-full object-contain"
                          onPlay={() => setPlayingClipId(clip.id)}
                          onPause={() => setPlayingClipId(null)}
                        />
                      ) : (
                        <div className="text-center p-4 text-xs text-gray-500">
                          {clip.status === 'processing' ? 'Rendering clip...' : 'Video unavailable'}
                        </div>
                      )}

                      {/* Source Badge */}
                      <div className="absolute top-3 left-3 flex items-center gap-1.5 z-10 pointer-events-none">
                        <span className="px-2 py-0.5 rounded-full bg-black/70 backdrop-blur-md text-[10px] font-bold text-white border border-white/20">
                          {clip.aspectRatio}
                        </span>
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          clip.source === 'ai'
                            ? 'bg-brand-primary/80 text-white'
                            : 'bg-emerald-500/80 text-white'
                        }`}>
                          {clip.source === 'ai' ? 'AI Highlight' : 'Rule-based'}
                        </span>
                      </div>

                      {/* Duration Tag */}
                      <div className="absolute top-3 right-3 px-2 py-0.5 rounded-md bg-black/80 text-[11px] font-mono font-bold text-white z-10 pointer-events-none">
                        {clip.duration.toFixed(1)}s
                      </div>
                    </div>

                    {/* Metadata & Details */}
                    <div className="p-4 flex-1 flex flex-col justify-between space-y-3 bg-neutral-900/50">
                      <div>
                        <h4 className="text-sm font-bold text-white leading-snug truncate">
                          {clip.title}
                        </h4>

                        {/* Source Timeline Range */}
                        <div className="flex items-center gap-1.5 text-[11px] font-mono text-gray-400 mt-1">
                          <span>Source:</span>
                          <span className="text-brand-primary font-bold">
                            {clip.start.toFixed(1)}s → {clip.end.toFixed(1)}s
                          </span>
                        </div>

                        {/* Reason */}
                        <p className="text-[11px] text-gray-400 mt-2 line-clamp-2 italic leading-relaxed">
                          "{clip.reason}"
                        </p>
                      </div>

                      {/* Card Action Buttons */}
                      <div className="pt-3 border-t border-white/10 flex items-center justify-between gap-1.5">
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => startEditBoundaries(clip)}
                            title="Edit Start / End Boundaries"
                            className="p-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-gray-400 hover:text-white transition-colors"
                          >
                            <Sliders size={14} />
                          </button>

                          <button
                            onClick={() => setRestylingClip(clip)}
                            title="Restyle Subtitles"
                            className="p-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-gray-400 hover:text-white transition-colors"
                          >
                            <Type size={14} />
                          </button>

                          <button
                            onClick={() => onRegenerateClip(clip)}
                            title="Rerender Clip"
                            className="p-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-gray-400 hover:text-white transition-colors"
                          >
                            <RefreshCw size={14} />
                          </button>

                          <button
                            onClick={() => onDeleteClip(clip.id)}
                            title="Delete Clip"
                            className="p-2 rounded-xl bg-white/5 hover:bg-red-500/20 border border-white/10 text-gray-400 hover:text-red-400 transition-colors"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>

                        <button
                          onClick={() => onDownloadClip(clip)}
                          disabled={!clip.videoBlobUrl}
                          className="px-3.5 py-1.5 rounded-xl bg-brand-primary hover:brightness-110 text-white text-xs font-bold flex items-center gap-1.5 transition-all shadow-md shadow-brand-primary/20 disabled:opacity-50"
                        >
                          <Download size={13} />
                          <span>Download</span>
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-white/10 flex items-center justify-between text-xs text-gray-500 bg-neutral-900 shrink-0">
          <span className="flex items-center gap-1.5">
            <CheckCircle2 size={14} className="text-emerald-400" /> All clips rendered with accurate synchronized subtitles
          </span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl text-gray-400 hover:text-white hover:bg-white/10 transition-colors"
          >
            Close Gallery
          </button>
        </div>

        {/* Boundary Editor Submodal */}
        {editingClip && (
          <div className="absolute inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-md">
            <div className="w-full max-w-md bg-neutral-900 border border-white/15 rounded-3xl p-6 shadow-2xl space-y-4">
              <h4 className="text-base font-bold text-white flex items-center gap-2">
                <Sliders size={18} className="text-brand-primary" /> Edit Clip Boundaries
              </h4>
              <p className="text-xs text-gray-400">
                Adjust the start and end timestamps. Subtitles will automatically retime to the new bounds.
              </p>

              <div className="space-y-3">
                <div>
                  <div className="flex justify-between text-xs text-gray-400 mb-1">
                    <span>Start Time:</span>
                    <span className="font-mono text-white">{editStart.toFixed(1)}s</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max={editEnd - 5}
                    step="0.5"
                    value={editStart}
                    onChange={(e) => setEditStart(parseFloat(e.target.value))}
                    className="w-full h-1.5 bg-white/10 rounded-lg appearance-none cursor-pointer accent-brand-primary"
                  />
                </div>

                <div>
                  <div className="flex justify-between text-xs text-gray-400 mb-1">
                    <span>End Time:</span>
                    <span className="font-mono text-white">{editEnd.toFixed(1)}s</span>
                  </div>
                  <input
                    type="range"
                    min={editStart + 5}
                    max={editingClip.end + 30}
                    step="0.5"
                    value={editEnd}
                    onChange={(e) => setEditEnd(parseFloat(e.target.value))}
                    className="w-full h-1.5 bg-white/10 rounded-lg appearance-none cursor-pointer accent-brand-primary"
                  />
                </div>

                <div className="p-2 rounded-xl bg-white/5 border border-white/10 text-xs text-center font-mono text-emerald-400">
                  New Duration: {(editEnd - editStart).toFixed(1)} seconds
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  onClick={() => setEditingClip(null)}
                  className="px-4 py-2 rounded-xl text-xs text-gray-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  onClick={saveEditedBoundaries}
                  className="px-5 py-2 rounded-xl bg-brand-primary text-white text-xs font-bold"
                >
                  Apply & Rerender
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Restyle Subtitles Submodal */}
        {restylingClip && (
          <div className="absolute inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-md">
            <div className="w-full max-w-md bg-neutral-900 border border-white/15 rounded-3xl p-6 shadow-2xl space-y-4">
              <h4 className="text-base font-bold text-white flex items-center gap-2">
                <Type size={18} className="text-brand-secondary" /> Restyle Clip Subtitles
              </h4>
              <p className="text-xs text-gray-400">
                Choose a new subtitle preset. Subtitles will rerender instantly without re-transcribing.
              </p>

              <div className="grid grid-cols-2 gap-2">
                {STYLE_PRESETS.map((preset) => (
                  <button
                    key={preset.id}
                    onClick={() => {
                      onRestyleClip(restylingClip.id, preset);
                      setRestylingClip(null);
                    }}
                    className="p-3 rounded-xl border text-left bg-white/5 border-white/10 hover:border-brand-primary hover:bg-white/10 transition-all"
                  >
                    <span className="text-xs font-bold text-white block">{preset.name}</span>
                    <span className="text-[10px] text-gray-400 font-mono block mt-0.5">{preset.fontFamily}</span>
                  </button>
                ))}
              </div>

              <div className="flex justify-end pt-2">
                <button
                  onClick={() => setRestylingClip(null)}
                  className="px-4 py-2 rounded-xl text-xs text-gray-400 hover:text-white"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

