"use client";

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Upload, Globe, Zap, Sparkles, ChevronRight, Play, MousePointer2, Layers, Cpu } from 'lucide-react';
import VideoEditor from '@/components/editor/VideoEditor';

const Navbar = () => (
  <nav className="fixed top-0 w-full z-50 px-6 py-4 flex justify-between items-center glass-nav">
    <div className="flex items-center gap-2 group cursor-pointer">
      <div className="w-10 h-10 bg-gradient-to-br from-brand-primary to-brand-secondary rounded-xl flex items-center justify-center font-bold text-white shadow-lg shadow-brand-primary/30 group-hover:rotate-12 transition-transform">L</div>
      <span className="text-2xl font-bold tracking-tighter text-white">LingoSync <span className="text-brand-primary">AI</span></span>
    </div>
    <div className="hidden md:flex items-center gap-8 text-sm font-medium text-gray-400">
      <a href="#" className="hover:text-white transition-colors relative group">
        Features
        <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-brand-primary transition-all group-hover:w-full" />
      </a>
      <a href="#" className="hover:text-white transition-colors relative group">
        Templates
        <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-brand-primary transition-all group-hover:w-full" />
      </a>
      <a href="#" className="hover:text-white transition-colors relative group">
        Pricing
        <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-brand-primary transition-all group-hover:w-full" />
      </a>
      <button className="px-6 py-2 rounded-full bg-white text-black font-bold hover:bg-gray-200 transition-all shadow-xl shadow-white/10">Get Started</button>
    </div>
  </nav>
);

const Hero = ({ onStart }) => (
  <section className="relative pt-40 pb-20 px-6 flex flex-col items-center text-center max-w-6xl mx-auto">
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-brand-primary/10 border border-brand-primary/30 text-brand-primary text-xs font-bold uppercase tracking-widest mb-8 backdrop-blur-sm"
    >
      <Sparkles size={14} className="animate-pulse" />
      <span>The Future of Video accessibility</span>
    </motion.div>

    <motion.h1
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.1 }}
      className="text-6xl md:text-8xl font-black tracking-tighter leading-[1.1] mb-8"
    >
      Break the Sound Barrier. <br />
      <span className="text-gradient">Reach the World.</span>
    </motion.h1>

    <motion.p
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.2 }}
      className="text-gray-400 text-xl md:text-2xl max-w-3xl mb-12 leading-relaxed font-light"
    >
      AI-powered subtitles that don't just transcribe—they <span className="text-white font-medium">translate, style, and sync</span> your content for global audiences instantly.
    </motion.p>

    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay: 0.3 }}
      className="flex flex-col sm:flex-row gap-6"
    >
      <button
        onClick={onStart}
        className="glow-button px-10 py-5 rounded-full bg-brand-primary text-white font-black text-xl flex items-center gap-3 group transition-all"
      >
        Start Creating Now <ChevronRight className="group-hover:translate-x-1 transition-transform" />
      </button>
      <button className="px-10 py-5 rounded-full bg-white/5 border border-white/10 text-white font-bold text-xl hover:bg-white/10 transition-all flex items-center gap-3 backdrop-blur-md">
        <Play size={24} fill="currentColor" /> Watch Demo
      </button>
    </motion.div>

    {/* 3D-like Background Elements */}
    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-brand-primary/20 rounded-full blur-[150px] -z-10 animate-pulse" />
    <div className="absolute top-1/4 -right-20 w-[500px] h-[500px] bg-brand-secondary/20 rounded-full blur-[120px] -z-10" />
    <div className="absolute bottom-0 -left-20 w-[500px] h-[500px] bg-brand-accent/10 rounded-full blur-[120px] -z-10" />
  </section>
);

const FeatureCard = ({ icon: Icon, title, description, index }) => (
  <motion.div
    initial={{ opacity: 0, y: 30 }}
    whileInView={{ opacity: 1, y: 0 }}
    transition={{ delay: index * 0.1 }}
    whileHover={{ y: -10, rotateX: 5, rotateY: 5 }}
    className="glass-card p-10 rounded-[40px] flex flex-col gap-6 transition-all duration-300 group cursor-default perspective-1000"
  >
    <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-brand-primary to-brand-secondary flex items-center justify-center text-white shadow-lg group-hover:scale-110 transition-transform">
      <Icon size={32} />
    </div>
    <h3 className="text-2xl font-bold text-white">{title}</h3>
    <p className="text-gray-400 leading-relaxed text-lg">{description}</p>
    <div className="mt-4 h-1 w-0 bg-brand-primary group-hover:w-full transition-all duration-500" />
  </motion.div>
);

const Features = () => (
  <section className="py-32 px-6 max-w-7xl mx-auto">
    <div className="text-center mb-20">
      <h2 className="text-4xl md:text-6xl font-bold text-white mb-4">Built for the <span className="text-brand-primary">Next Generation</span></h2>
      <p className="text-gray-400 text-lg">Everything you need to go viral globally.</p>
    </div>
    <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
      <FeatureCard
        index={0}
        icon={Globe}
        title="Global Translation"
        description="Instantly convert your speech into 50+ languages with context-aware AI that understands slang and culture."
      />
      <FeatureCard
        index={1}
        icon={Zap}
        title="Hyper-Fast Sync"
        description="Millisecond-perfect timestamps. Your captions hit exactly when the word is spoken, keeping the energy high."
      />
      <FeatureCard
        index={2}
        icon={Upload}
        title="Local-First Privacy"
        description="We don't store your videos. Processing happens in your browser, ensuring absolute privacy and security."
      />
    </div>
  </section>
);

const BentoSection = () => (
  <section className="py-32 px-6 max-w-7xl mx-auto">
    <div className="grid grid-cols-1 md:grid-cols-4 gap-6 h-full">
      <div className="md:col-span-2 glass-card p-10 rounded-[40px] flex flex-col justify-center relative overflow-hidden group">
         <div className="absolute -right-20 -top-20 w-64 h-64 bg-brand-primary/20 blur-3xl rounded-full" />
         <Cpu size={48} className="text-brand-primary mb-6" />
         <h3 className="text-3xl font-bold text-white mb-4">AI Core Engine</h3>
         <p className="text-gray-400 text-lg">Powered by the latest in neural transcription, LingoSync handles accents and noise with ease.</p>
      </div>
      <div className="glass-card p-10 rounded-[40px] flex flex-col justify-center text-center group hover:bg-white/10 transition-all">
         <Layers size={48} className="text-brand-secondary mx-auto mb-6" />
         <h3 className="text-xl font-bold text-white mb-2">Pro Templates</h3>
         <p className="text-gray-400">The MrBeast style, Cinematic, and more.</p>
      </div>
      <div className="glass-card p-10 rounded-[40px] flex flex-col justify-center text-center group hover:bg-white/10 transition-all">
         <MousePointer2 size={48} className="text-brand-accent mx-auto mb-6" />
         <h3 className="text-xl font-bold text-white mb-2">No-Code UI</h3>
         <p className="text-gray-400">Edit captions like a pro, without the complex software.</p>
      </div>
    </div>
  </section>
);

export default function LandingPage() {
  const [editorMode, setEditorMode] = useState(false);

  if (editorMode) {
    return <VideoEditor />;
  }

  return (
    <div className="min-h-screen bg-dark text-white bg-mesh">
      <Navbar />
      <Hero onStart={() => setEditorMode(true)} />
      <Features />
      <BentoSection />
      <footer className="py-20 text-center border-t border-white/5">
        <p className="text-gray-500 text-sm">© 2026 LingoSync AI. Engineered for Global reach.</p>
      </footer>
    </div>
  );
}
