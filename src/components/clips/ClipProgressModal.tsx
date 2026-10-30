"use client";

import React from 'react';
import { Loader2, CheckCircle2, AlertCircle, Sparkles, Scissors, Film } from 'lucide-react';
import { ClipGenerationStage } from '@/types';

interface ClipProgressModalProps {
  isOpen: boolean;
  stage: ClipGenerationStage;
  currentClipIndex: number;
  currentClipTitle: string;
}

export const ClipProgressModal: React.FC<ClipProgressModalProps> = ({
  isOpen,
  stage,
  currentClipIndex,
  currentClipTitle,
}) => {
  if (!isOpen) return null;

  const STAGES = [
    'Preparing transcript',
    'Finding candidate highlights',
    'Scoring & validating candidates',
    'Cutting video segments',
    'Reframing video format',
    'Rendering subtitles',
    'Exporting playable clips',
    'Validating output files',
    'Generation complete',
  ];

  const overallPercent = Math.min(100, Math.round((stage.step / stage.totalSteps) * 100));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fadeIn">
      <div className="relative w-full max-w-lg bg-neutral-900 border border-white/15 rounded-3xl p-6 sm:p-8 shadow-2xl overflow-hidden text-center">
        {/* Glow */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-brand-primary/15 rounded-full blur-3xl -z-10" />

        {/* Animated Icon */}
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-brand-primary to-brand-secondary flex items-center justify-center text-white mx-auto shadow-xl shadow-brand-primary/30 mb-5">
          {stage.step >= stage.totalSteps ? (
            <CheckCircle2 size={32} className="text-white" />
          ) : (
            <Loader2 size={32} className="animate-spin text-white" />
          )}
        </div>

        {/* Title & Status */}
        <h3 className="text-xl font-black text-white">{stage.title}</h3>
        <p className="text-xs text-gray-400 mt-1 max-w-sm mx-auto leading-relaxed">
          {stage.detail}
        </p>

        {currentClipTitle && (
          <div className="mt-3 px-3 py-1.5 rounded-xl bg-white/5 border border-white/10 text-xs text-brand-primary inline-flex items-center gap-1.5">
            <Film size={13} />
            <span className="font-semibold truncate max-w-xs">{currentClipTitle}</span>
          </div>
        )}

        {/* Progress Bar */}
        <div className="mt-6 space-y-2">
          <div className="w-full bg-white/10 rounded-full h-3 overflow-hidden p-0.5 border border-white/10">
            <div
              className="bg-gradient-to-r from-brand-primary via-brand-secondary to-emerald-400 h-full rounded-full transition-all duration-300"
              style={{ width: `${overallPercent}%` }}
            />
          </div>
          <div className="flex justify-between text-xs text-gray-500 font-mono">
            <span>Stage {stage.step} of {stage.totalSteps}</span>
            <span>{overallPercent}%</span>
          </div>
        </div>

        {/* Clip Counts Summary */}
        <div className="grid grid-cols-3 gap-2 mt-6 p-3 rounded-2xl bg-black/40 border border-white/10 text-center">
          <div>
            <span className="text-[10px] uppercase font-bold text-gray-500 block">Completed</span>
            <span className="text-sm font-bold text-emerald-400">{stage.completedClips}</span>
          </div>
          <div>
            <span className="text-[10px] uppercase font-bold text-gray-500 block">Total Target</span>
            <span className="text-sm font-bold text-white">{stage.totalClips}</span>
          </div>
          <div>
            <span className="text-[10px] uppercase font-bold text-gray-500 block">Failed</span>
            <span className="text-sm font-bold text-rose-400">{stage.failedClips}</span>
          </div>
        </div>

        {/* Stages Checklist */}
        <div className="mt-6 text-left max-h-40 overflow-y-auto space-y-1.5 pr-2 border-t border-white/10 pt-4">
          {STAGES.map((s, idx) => {
            const isDone = stage.step > idx + 1;
            const isCurrent = stage.step === idx + 1;
            return (
              <div
                key={s}
                className={`flex items-center gap-2 text-xs py-0.5 transition-colors ${
                  isDone
                    ? 'text-emerald-400 font-medium'
                    : isCurrent
                    ? 'text-white font-bold'
                    : 'text-gray-500'
                }`}
              >
                {isDone ? (
                  <CheckCircle2 size={13} className="text-emerald-400 shrink-0" />
                ) : isCurrent ? (
                  <Loader2 size={13} className="animate-spin text-brand-primary shrink-0" />
                ) : (
                  <div className="w-3 h-3 rounded-full border border-gray-600 shrink-0" />
                )}
                <span className="truncate">{s}</span>
              </div>
            );
          })}
        </div>

        <p className="text-[11px] text-gray-500 italic mt-4">
          Please keep this tab open while your short clips are generated and rendered.
        </p>
      </div>
    </div>
  );
};
