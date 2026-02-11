"use client";

import React, { useState, useEffect, useRef } from 'react';
import { useStore } from '@/lib/store';
import { audioEngine } from '@/lib/audioEngine';
import VoiceRecorder from './VoiceRecorder';
// import BackgroundViz from './BackgroundViz'; // Temporarily disabled for deployment
import TrackLane from './TrackLane';
import {
    Play, Square, Music2, Layers, Sparkles, HelpCircle, Save,
    Zap, Mic, Layout, Download, Disc, Search, Command, Menu, X, Plus, Info, ArrowUpRight
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import axios from 'axios';
import LoopBrowser from './LoopBrowser';

interface NLUDecision {
    params: Record<string, number>;
}

export default function Studio() {
    const {
        isPlaying, togglePlay, bpm, setBpm, tracks, setTracks,
        isGenerating, setGenerating, addTrack, removeTrack, updateTrackPattern
    } = useStore();

    const [mounted, setMounted] = useState(false);
    const [localPrompt, setLocalPrompt] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [activeTab, setActiveTab] = useState<'forge' | 'library' | 'history'>('forge');
    const [showSidebar, setShowSidebar] = useState(false);
    const [proLoops, setProLoops] = useState<any[]>([]);
    const inputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        setMounted(true);
        const saved = localStorage.getItem('pulseforge_session');
        if (saved) {
            try {
                const data = JSON.parse(saved);
                if (data.tracks) setTracks(data.tracks);
                if (data.bpm) setBpm(data.bpm);
            } catch (e) { console.error("Session load fail", e); }
        }

        fetch('/loops/library.json')
            .then(res => res.json())
            .then(data => setProLoops(data))
            .catch(e => console.error("Library load fail", e));
    }, [setTracks, setBpm]);

    useEffect(() => {
        if (mounted) {
            localStorage.setItem('pulseforge_session', JSON.stringify({ tracks, bpm }));
        }
    }, [tracks, bpm, mounted]);

    const handleTogglePlay = async () => {
        const engine = audioEngine;
        if (!engine) return;
        if (!isPlaying) await engine.startTransport();
        else engine.stopTransport();
        togglePlay();
    };

    const handleGenerate = async (suggestedType: string = 'synth', audioBlob?: Blob) => {
        const currentPrompt = localPrompt || (audioBlob ? "Professional EDM melody from voice" : "");
        if (!currentPrompt && !audioBlob) return;

        setGenerating(true);
        setError(null);

        let type = suggestedType;
        const pl = currentPrompt.toLowerCase();
        if (pl.includes('drum') || pl.includes('kick')) type = 'drums';
        if (pl.includes('bass')) type = 'bass';
        if (pl.includes('lead') || pl.includes('synth')) type = 'lead';

        const finalPrompt = audioBlob ? `${currentPrompt} (Variation: ${Math.random().toString(36).substring(7)})` : currentPrompt;

        try {
            const engine = audioEngine;
            if (engine && !isPlaying) {
                await engine.startTransport();
                togglePlay();
            }

            const nluRes = await axios.post<NLUDecision>('/api/command', { command: currentPrompt });
            const params = nluRes.data.params || {};

            if (params.loopCategory && proLoops.length > 0) {
                const categoryLoops = proLoops.filter(l => l.category === params.loopCategory);
                if (categoryLoops.length > 0) {
                    const randomLoop = categoryLoops[Math.floor(Math.random() * categoryLoops.length)];
                    await handleAddProLoop(randomLoop, params);
                    setLocalPrompt('');
                    return;
                }
            }

            let response;
            if (audioBlob) {
                const formData = new FormData();
                formData.append('prompt', finalPrompt);
                formData.append('type', type);
                formData.append('audio', audioBlob);
                response = await axios.post('/api/generate', formData, {
                    headers: { 'Content-Type': 'multipart/form-data' }
                });
            } else {
                response = await axios.post('/api/generate', { prompt: finalPrompt, type: type });
            }

            const trackId = Math.random().toString(36).substr(2, 9);
            const humanName = (localPrompt || "VOICE FORGE").toUpperCase();

            if (response.data.audio) {
                addTrack({
                    id: trackId,
                    name: response.data.name || humanName,
                    type: (response.data.type || type) as any,
                    url: response.data.audio,
                    color: type === 'drums' ? '#a855f7' : type === 'bass' ? '#ec4899' : '#3b82f6',
                    isActive: true,
                    bpm: bpm
                });

                if (engine) {
                    Object.entries(params).forEach(([fx, val]) => engine.updateEffect(trackId, fx, (val as number)));
                    await engine.playTrack(trackId, response.data.audio);
                }
            }
            setLocalPrompt('');
        } catch (err: any) {
            setError('Forging failed. Try a different prompt.');
        } finally {
            setGenerating(false);
        }
    };

    const handleAddProLoop = async (loop: any, initialEffects: any = {}) => {
        const engine = audioEngine;
        if (!engine) return;
        if (!isPlaying) { await engine.startTransport(); togglePlay(); }

        const trackId = `pro_${Math.random().toString(36).substr(2, 9)}`;
        addTrack({
            id: trackId,
            name: `PRO ${loop.name.split(' - ')[2] || loop.name}`.toUpperCase(),
            type: loop.category as any,
            url: `/${loop.path}`,
            color: '#8b5cf6',
            isActive: true,
            bpm: bpm
        });

        if (initialEffects) {
            Object.entries(initialEffects).forEach(([fx, val]) => {
                if (fx !== 'loopCategory') engine.updateEffect(trackId, fx, (val as number));
            });
        }

        await engine.playTrack(trackId, `/${loop.path}`, loop.bpm);
    };

    if (!mounted) return null;

    return (
        <div className="studio-container">
            {/* <BackgroundViz /> */}

            {/* Header / Nav */}
            <header className="top-nav">
                <div className="flex items-center gap-4">
                    <button className="md:hidden" onClick={() => setShowSidebar(!showSidebar)}>
                        {showSidebar ? <X size={20} /> : <Menu size={20} />}
                    </button>
                    <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-purple-500 to-pink-500 flex items-center justify-center shadow-lg shadow-purple-500/20">
                            <Zap size={18} color="white" fill="white" />
                        </div>
                        <h1 className="text-lg font-black tracking-tighter">PULSE<span className="text-purple-500">FORGE</span></h1>
                    </div>
                </div>

                <div className="flex items-center gap-4 bg-white/5 border border-white/5 rounded-2xl p-1">
                    <button onClick={handleTogglePlay} className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all ${isPlaying ? 'bg-red-500/20 text-red-500' : 'bg-green-500/20 text-green-500'}`}>
                        {isPlaying ? <Square size={18} fill="currentColor" /> : <Play size={18} fill="currentColor" className="ml-0.5" />}
                    </button>
                    <div className="flex items-center gap-2 px-3">
                        <span className="text-[10px] font-black text-white/30 truncate">BPM</span>
                        <input type="number" value={bpm} onChange={(e) => {
                            const b = Number(e.target.value);
                            setBpm(b);
                            audioEngine?.setBpm(b);
                        }} className="w-12 bg-transparent text-sm font-bold border-none outline-none text-center" />
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    <button className="hidden md:flex items-center gap-2 px-4 py-2 bg-white/5 rounded-xl text-[10px] font-bold text-white/60 hover:bg-white/10 transition-all">
                        <Save size={14} /> EXPORT
                    </button>
                    <div className="w-10 h-10 rounded-full bg-white/5 border border-white/10 flex items-center justify-center overflow-hidden">
                        <img src="https://api.dicebear.com/7.x/bottts/svg?seed=producer" className="w-full h-full" alt="profile" />
                    </div>
                </div>
            </header>

            <main className="flex-1 flex overflow-hidden">
                {/* Sidebar - Pro Features */}
                <aside className={`sidebar-premium ${showSidebar ? 'active' : ''}`}>
                    <div className="flex p-6 gap-2">
                        {['forge', 'library'].map((tab) => (
                            <button
                                key={tab}
                                onClick={() => setActiveTab(tab as any)}
                                className={`flex-1 py-1 px-4 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === tab ? 'bg-purple-600 text-white shadow-lg' : 'text-white/40'}`}
                            >
                                {tab}
                            </button>
                        ))}
                    </div>

                    <div className="flex-1 overflow-y-auto px-6 pb-24 custom-scrollbar">
                        <AnimatePresence mode="wait">
                            {activeTab === 'forge' ? (
                                <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }} className="flex flex-col gap-6">
                                    <div className="p-5 rounded-3xl bg-gradient-to-br from-purple-500/10 to-transparent border border-purple-500/10">
                                        <div className="flex items-center gap-3 mb-4">
                                            <Sparkles size={16} className="text-purple-400" />
                                            <h3 className="text-[11px] font-black text-white/40 uppercase tracking-widest">Global Forge</h3>
                                        </div>
                                        <div className="grid grid-cols-2 gap-3">
                                            <button onClick={() => handleGenerate('drums')} className="p-4 rounded-2xl bg-white/5 border border-white/5 flex flex-col items-center gap-2 hover:bg-white/10 hover:border-white/10 transition-all">
                                                <Music2 size={24} className="text-blue-400" />
                                                <span className="text-[9px] font-bold">DRUMS</span>
                                            </button>
                                            <button onClick={() => handleGenerate('bass')} className="p-4 rounded-2xl bg-white/5 border border-white/5 flex flex-col items-center gap-2 hover:bg-white/10 hover:border-white/10 transition-all">
                                                <Layers size={24} className="text-pink-400" />
                                                <span className="text-[9px] font-bold">BASS</span>
                                            </button>
                                        </div>
                                    </div>

                                    <div className="flex flex-col gap-4">
                                        <div className="flex items-center gap-3">
                                            <Mic size={16} className="text-purple-400" />
                                            <h3 className="text-[11px] font-black text-white/40 uppercase tracking-widest">Voice Forge</h3>
                                        </div>
                                        <VoiceRecorder onUpload={(blob) => handleGenerate('lead', blob)} />
                                    </div>
                                </motion.div>
                            ) : (
                                <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }}>
                                    <LoopBrowser onAddLoop={handleAddProLoop} />
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>
                </aside>

                {/* Main Arrangement Area */}
                <section className="flex-1 flex flex-col relative">
                    <div className="tracks-container custom-scrollbar">
                        <div className="flex items-center justify-between mb-8">
                            <h2 className="text-3xl font-black tracking-tight">Timeline</h2>
                            <div className="flex items-center gap-4 text-xs font-bold text-white/20">
                                {tracks.length} TRACKS • {isPlaying ? 'PLAYING' : 'IDLE'}
                            </div>
                        </div>

                        {tracks.length > 0 ? (
                            tracks.map(track => (
                                <TrackLane
                                    key={track.id}
                                    track={track}
                                    isPlaying={isPlaying}
                                    onRemove={(id) => {
                                        audioEngine?.stopTrack(id);
                                        removeTrack(id);
                                    }}
                                    onEffectChange={(id, type, val) => audioEngine?.updateEffect(id, type, val)}
                                    onPatternChange={(id, p) => {
                                        audioEngine?.updateLocalPattern(id, p);
                                        updateTrackPattern(id, p);
                                    }}
                                />
                            ))
                        ) : (
                            <div className="flex-1 flex flex-col items-center justify-center border-2 border-dashed border-white/5 rounded-[40px] p-20 text-center">
                                <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center mb-6">
                                    <Sparkles size={32} className="text-white/10" />
                                </div>
                                <h4 className="text-lg font-bold text-white/60 mb-2">Your Studio is Empty</h4>
                                <p className="text-sm text-white/20 max-w-xs">Forge a sound or browse the library to begin your next banger.</p>
                            </div>
                        )}
                    </div>

                    {/* Bottom Force Bar */}
                    <div className="absolute bottom-6 left-6 right-6 flex items-center justify-center z-50">
                        <div className="w-full max-w-3xl glass p-4 rounded-[32px] shadow-2xl shadow-black/50 border border-white/10">
                            <div className="relative group">
                                <Search size={20} className="absolute left-6 top-1/2 -translate-y-1/2 text-white/20 group-focus-within:text-purple-500 transition-colors" />
                                <input
                                    ref={inputRef}
                                    value={localPrompt}
                                    onChange={(e) => setLocalPrompt(e.target.value)}
                                    onKeyDown={(e) => e.key === 'Enter' && handleGenerate()}
                                    placeholder="Make it a dark industrial techno lead..."
                                    className="w-full h-16 bg-white/[0.03] rounded-2xl pl-16 pr-32 text-sm font-medium border border-transparent focus:border-purple-500/20 focus:bg-white/[0.06] outline-none transition-all"
                                />
                                <button
                                    onClick={() => handleGenerate()}
                                    disabled={isGenerating || !localPrompt}
                                    className="absolute right-2 top-2 bottom-2 px-6 rounded-xl bg-gradient-to-r from-purple-600 to-pink-600 font-black text-[10px] tracking-widest text-white uppercase shadow-lg shadow-purple-500/20 active:scale-95 disabled:opacity-50 transition-all flex items-center gap-2"
                                >
                                    {isGenerating ? 'Forging...' : <><Zap size={14} fill="white" /> Forge</>}
                                </button>
                            </div>
                        </div>
                    </div>
                </section>
            </main>
        </div>
    );
}
