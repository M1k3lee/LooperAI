"use client";

import React, { useState, useEffect, useRef } from 'react';
import { useStore } from '@/lib/store';
import { audioEngine } from '@/lib/audioEngine';
import VoiceRecorder from './VoiceRecorder';
import BackgroundViz from './BackgroundViz';
import TrackLane from './TrackLane';
import { Play, Pause, Square, Music2, Layers, Sparkles, HelpCircle, Save, Volume2, Settings2, Trash2, Edit3, Grid, Waves, Sliders, ArrowUpCircle, Zap, Plus, Mic, Settings, Layout, BarChart, Info, Activity, Download, Disc } from 'lucide-react';
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
    const [view, setView] = useState<'arrangement' | 'session'>('arrangement');
    const [showHelp, setShowHelp] = useState(true);
    const [proLoops, setProLoops] = useState<any[]>([]);
    const inputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        setMounted(true);
        // Auto-load last session from localStorage
        const saved = localStorage.getItem('pulseforge_session');
        if (saved) {
            try {
                const data = JSON.parse(saved);
                if (data.tracks) setTracks(data.tracks);
                if (data.bpm) setBpm(data.bpm);
            } catch (e) {
                console.error("Failed to load session", e);
            }
        }

        // Load Pro Loops for smart matching
        fetch('/loops/library.json')
            .then(res => res.json())
            .then(data => setProLoops(data))
            .catch(e => console.error("Library load fail", e));
    }, [setTracks, setBpm]);

    // Auto-save session
    useEffect(() => {
        if (mounted) {
            localStorage.setItem('pulseforge_session', JSON.stringify({ tracks, bpm }));
        }
    }, [tracks, bpm, mounted]);

    const downloadSession = () => {
        const data = JSON.stringify({ tracks, bpm, version: '1.0' }, null, 2);
        const blob = new Blob([data], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `PulseForge_Session_${new Date().toISOString().slice(0, 10)}.json`;
        a.click();
    };

    const importSession = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (ev) => {
            try {
                const data = JSON.parse(ev.target?.result as string);
                if (data.tracks) setTracks(data.tracks);
                if (data.bpm) setBpm(data.bpm);
            } catch (e) {
                setError("Invalid session file.");
            }
        };
        reader.readAsText(file);
    };

    const handleTogglePlay = async () => {
        const engine = audioEngine;
        if (!engine) return;
        if (!isPlaying) {
            await engine.startTransport();
        } else {
            engine.stopTransport();
        }
        togglePlay();
    };

    const extractTrackName = (prompt: string, type: string) => {
        // Return first 3-4 words of prompt for a clean but descriptive name
        const words = prompt.trim().split(/\s+/);
        const name = words.length > 3 ? words.slice(0, 4).join(' ') : prompt;
        return name.toUpperCase();
    };

    const getPatternByStyle = (prompt: string, type: string) => {
        const p = prompt.toLowerCase();
        const isKick = p.includes('kick');
        const isSnare = p.includes('snare') || p.includes('clap');
        const isHat = p.includes('hat') || p.includes('shaker');
        const isBass = type === 'bass';

        // DUBSTEP / TRAP / RIDDIM / FUTURE BASS (Half-time feel)
        if (p.includes('dubstep') || p.includes('trap') || p.includes('riddim') || p.includes('future bass') || p.includes('hip hop')) {
            if (isKick) return [true, false, false, false, false, false, false, false, false, false, true, false, false, false, false, false];
            if (isSnare) return [false, false, false, false, false, false, false, false, true, false, false, false, false, false, false, false];
            if (isHat) return [false, false, true, false, false, false, true, false, false, false, true, false, false, false, true, false];
            if (isBass) return [true, false, false, false, false, false, false, false, true, false, true, false, false, false, false, false];
            return [true, false, false, false, false, false, false, false, true, false, false, false, false, false, false, false];
        }

        // HOUSE / TECHNO (Four on the floor)
        if (p.includes('house') || p.includes('techno') || p.includes('edm') || p.includes('industrial')) {
            if (isKick) return [true, false, false, false, true, false, false, false, true, false, false, false, true, false, false, false];
            if (isSnare) return [false, false, false, false, true, false, false, false, false, false, false, false, true, false, false, false];
            if (isHat) return [false, false, true, false, false, false, true, false, false, false, true, false, false, false, true, false];
            return [true, false, true, false, true, false, true, false, true, false, true, false, true, false, true, false];
        }

        // DEFAULT (Safe 4/4)
        if (isKick) return [true, false, false, false, true, false, false, false, true, false, false, false, true, false, false, false];
        if (isHat) return [false, false, true, false, false, false, true, false, false, false, true, false, false, false, true, false];
        return [false, false, true, false, false, false, true, false, false, false, true, false, false, false, true, false];
    };

    const addRiser = () => {
        const engine = audioEngine;
        if (!engine) return;
        const trackId = `riser_${Math.random().toString(36).substr(2, 5)}`;
        addTrack({
            id: trackId,
            name: "FX RISER",
            type: 'synth',
            url: '',
            color: '#3b82f6',
            isActive: true,
            bpm: bpm
        });
        engine.createNoiseRiser(trackId, 4);
    };

    const buildFullDrop = async () => {
        setGenerating(true);
        // Build 3 layers with distinct patterns
        await handleGenerate('drums');
        setTimeout(() => handleGenerate('bass'), 500);
        setTimeout(() => handleGenerate('lead'), 1000);
    };

    const handleGenerate = async (suggestedType: string = 'synth', audioBlob?: Blob) => {
        const adjectives = ["vibrant", "pulsating", "distorted", "ethereal", "cinematic", "aggressive", "soft", "high-energy"];
        const randomAdj = adjectives[Math.floor(Math.random() * adjectives.length)];
        const currentPrompt = localPrompt || (audioBlob ? `Professional EDM melody from voice, ${randomAdj} texture` : "");
        if (!currentPrompt && !audioBlob) return;
        setGenerating(true);
        setError(null);
        setShowHelp(false);

        let type = suggestedType;
        const pl = currentPrompt.toLowerCase();
        if (pl.includes('drum') || pl.includes('kick') || pl.includes('snare') || pl.includes('hat') || pl.includes('clap') || pl.includes('perc')) type = 'drums';
        if (pl.includes('bass') || pl.includes('sub')) type = 'bass';
        if (pl.includes('lead') || pl.includes('synth') || pl.includes('melody')) type = 'lead';
        if (pl.includes('fx') || pl.includes('riser') || pl.includes('impact')) type = 'fx';

        const variation = Math.random().toString(36).substring(7);
        const finalPrompt = audioBlob
            ? `${currentPrompt} (Variation: ${variation})`
            : currentPrompt;

        try {
            const engine = audioEngine;
            if (engine && !isPlaying) {
                await engine.startTransport();
                togglePlay();
            }

            const nluRes = await axios.post<NLUDecision>('/api/command', { command: currentPrompt });
            const params = nluRes.data.params || {};

            // SMART MATCH: If AI suggests a pro loop category, use it!
            if (params.loopCategory && proLoops.length > 0) {
                const categoryLoops = proLoops.filter(l => l.category === params.loopCategory);
                if (categoryLoops.length > 0) {
                    const randomLoop = categoryLoops[Math.floor(Math.random() * categoryLoops.length)];
                    await handleAddProLoop(randomLoop);
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
            const humanName = audioBlob
                ? (localPrompt ? `VOICE: ${extractTrackName(localPrompt, type)}` : "VOICE FORGE")
                : extractTrackName(currentPrompt, type);

            if (response.data.useLocalFallback && engine) {
                const stylePattern = getPatternByStyle(currentPrompt, type);

                addTrack({
                    id: trackId,
                    name: `LOCAL ${humanName}`,
                    type: type as any,
                    url: '',
                    color: type === 'drums' ? '#a855f7' : '#ec4899',
                    isActive: true,
                    bpm: bpm,
                    pattern: stylePattern
                });

                if (type === 'drums') engine.createLocalDrumLoop(trackId, humanName, stylePattern, currentPrompt);
                else {
                    if (audioBlob) engine.createLocalLead(trackId, stylePattern, currentPrompt);
                    else engine.createLocalBassline(trackId, stylePattern, currentPrompt);
                }
                setError("AI Cloud Busy - Using Styled Local Engine");
            } else if (response.data.audio) {
                addTrack({
                    id: trackId,
                    name: response.data.name || humanName,
                    type: (response.data.type || type) as any,
                    url: response.data.audio,
                    color: type === 'drums' ? '#a855f7' : '#ec4899',
                    isActive: true,
                    bpm: bpm
                });

                if (engine && params) {
                    Object.entries(params).forEach(([fx, val]) => {
                        engine.updateEffect(trackId, fx, (val as number));
                    });
                }

                if (engine) {
                    await engine.playTrack(trackId, response.data.audio);
                }
            }

            setLocalPrompt('');
        } catch (err: any) {
            setError(err.message || 'Forging failed.');
        } finally {
            setGenerating(false);
        }
    };

    const handleEffectChange = (id: string, type: string, value: number) => {
        const engine = audioEngine;
        if (engine) engine.updateEffect(id, type, value);
    };

    const handlePatternChange = (id: string, pattern: boolean[]) => {
        const engine = audioEngine;
        if (engine) engine.updateLocalPattern(id, pattern);
        updateTrackPattern(id, pattern);
    };

    const removeAndStopTrack = (id: string) => {
        const engine = audioEngine;
        if (engine) engine.stopTrack(id);
        removeTrack(id);
    };

    const handleAddProLoop = async (loop: any) => {
        const engine = audioEngine;
        if (!engine) return;

        if (!isPlaying) {
            await engine.startTransport();
            togglePlay();
        }

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

        await engine.playTrack(trackId, `/${loop.path}`, loop.bpm);
        setShowHelp(false);
    };

    if (!mounted) return null;

    return (
        <div className="studio-container">
            <BackgroundViz />

            <header className="top-bar flex items-center justify-between">
                <div className="flex items-center gap-6">
                    <div className="flex items-center gap-3">
                        <div className="pulse-glow" style={{ width: '36px', height: '36px', background: 'linear-gradient(135deg, #8b5cf6, #ec4899)', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 0 20px var(--primary-glow)' }}>
                            <Zap size={20} color="white" fill="white" />
                        </div>
                        <h1 style={{ fontSize: '1.4rem', fontWeight: 900, letterSpacing: '-0.05em', color: '#fff' }}>PULSE<span style={{ color: '#8b5cf6' }}>FORGE</span></h1>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', background: 'rgba(255,255,255,0.03)', borderRadius: '16px', padding: '6px 20px', gap: '20px', border: '1px solid var(--glass-border)' }}>
                        <button onClick={handleTogglePlay} style={{ background: 'none', border: 'none', cursor: 'pointer', color: isPlaying ? '#ef4444' : '#22c55e', transition: 'all 0.2s' }}>
                            {isPlaying ? <Square size={20} fill="currentColor" /> : <Play size={20} fill="currentColor" style={{ marginLeft: '2px' }} />}
                        </button>
                        <div style={{ width: '1px', height: '24px', background: 'rgba(255,255,255,0.05)' }} />
                        <div className="flex items-center gap-2">
                            <span style={{ fontSize: '10px', fontWeight: 900, color: 'var(--fg-muted)' }}>BPM</span>
                            <input type="number" value={bpm} onChange={(e) => {
                                const newBpm = Number(e.target.value);
                                setBpm(newBpm);
                                if (audioEngine) audioEngine.setBpm(newBpm);
                            }} style={{ background: 'none', border: 'none', color: '#fff', fontWeight: 900, width: '45px', fontSize: '15px', outline: 'none', textAlign: 'center' }} />
                        </div>
                    </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                    <div style={{ display: 'flex', background: '#141417', borderRadius: '10px', padding: '3px', border: '1px solid rgba(255,255,255,0.05)' }}>
                        <button onClick={() => setView('arrangement')} style={{ padding: '8px 16px', borderRadius: '8px', background: view === 'arrangement' ? '#27272a' : 'none', border: 'none', color: view === 'arrangement' ? '#fff' : '#71717a', fontSize: '10px', fontWeight: 800, cursor: 'pointer' }}>
                            TIMELINE
                        </button>
                        <button onClick={() => setView('session')} style={{ padding: '8px 16px', borderRadius: '8px', background: view === 'session' ? '#27272a' : 'none', border: 'none', color: view === 'session' ? '#fff' : '#71717a', fontSize: '10px', fontWeight: 800, cursor: 'pointer' }}>
                            SESSION
                        </button>
                    </div>
                    <button onClick={() => setShowHelp(!showHelp)} style={{ background: 'none', border: 'none', color: showHelp ? '#8b5cf6' : 'rgba(255,255,255,0.2)', cursor: 'pointer' }}>
                        <HelpCircle size={20} />
                    </button>
                </div>
            </header>

            <main className="flex-1 flex overflow-hidden relative" style={{ zIndex: 10 }}>
                <aside className="sidebar glass-panel">
                    <div style={{ padding: '32px' }}>
                        <div className="flex items-center gap-3" style={{ marginBottom: '32px' }}>
                            <Sparkles size={16} color="#8b5cf6" className="pulse-glow" />
                            <h2 style={{ fontSize: '11px', fontWeight: 900, color: 'var(--fg-muted)', textTransform: 'uppercase', letterSpacing: '0.2em' }}>Forge Station</h2>
                        </div>

                        <div style={{ background: 'rgba(139, 92, 246, 0.03)', borderRadius: '28px', padding: '28px', border: '1px solid var(--glass-border)', marginBottom: '32px' }}>
                            <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.5)', lineHeight: '1.6', marginBottom: '24px' }}>Describe your sound then click Forge. Mix and layer AI results.</p>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
                                <button className="glass-card" onClick={() => handleGenerate('drums')} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '16px', cursor: 'pointer', transition: 'all 0.3s' }}>
                                    <Music2 size={24} color="#8b5cf6" style={{ marginBottom: '8px' }} />
                                    <span style={{ fontSize: '9px', fontWeight: 900, color: '#fff' }}>HITS/DRUMS</span>
                                </button>
                                <button className="glass-card" onClick={() => handleGenerate('bass')} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '16px', cursor: 'pointer' }}>
                                    <Layers size={24} color="#ec4899" style={{ marginBottom: '8px' }} />
                                    <span style={{ fontSize: '9px', fontWeight: 900, color: '#fff' }}>FORGE BASS</span>
                                </button>
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                                <button className="glass-card" onClick={addRiser} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '16px', cursor: 'pointer' }}>
                                    <ArrowUpCircle size={24} color="#3b82f6" style={{ marginBottom: '8px' }} />
                                    <span style={{ fontSize: '9px', fontWeight: 900, color: '#fff' }}>ADD RISER</span>
                                </button>
                                <button className="btn-primary" onClick={buildFullDrop} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '16px', cursor: 'pointer' }}>
                                    <Zap size={24} color="white" style={{ marginBottom: '8px' }} />
                                    <span style={{ fontSize: '9px', fontWeight: 900 }}>FORGE DROP</span>
                                </button>
                            </div>
                        </div>

                        <div className="flex items-center gap-3" style={{ marginBottom: '16px' }}>
                            <Mic size={16} color="#8b5cf6" />
                            <h2 style={{ fontSize: '11px', fontWeight: 900, color: 'var(--fg-muted)', textTransform: 'uppercase', letterSpacing: '0.2em' }}>Voice Forge</h2>
                        </div>
                        <div style={{ marginBottom: '32px' }}>
                            <VoiceRecorder onUpload={(blob) => handleGenerate('lead', blob)} />
                        </div>

                        <div className="flex items-center gap-3" style={{ marginBottom: '16px' }}>
                            <Disc size={16} color="#8b5cf6" />
                            <h2 style={{ fontSize: '11px', fontWeight: 900, color: 'var(--fg-muted)', textTransform: 'uppercase', letterSpacing: '0.2em' }}>Pro Library</h2>
                        </div>
                        <div style={{ marginBottom: '32px' }}>
                            <LoopBrowser onAddLoop={handleAddProLoop} />
                        </div>

                        <div className="flex items-center gap-3" style={{ marginBottom: '16px' }}>
                            <Save size={16} color="var(--accent)" />
                            <h2 style={{ fontSize: '11px', fontWeight: 900, color: 'var(--fg-muted)', textTransform: 'uppercase', letterSpacing: '0.2em' }}>Management</h2>
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '32px' }}>
                            <button onClick={downloadSession} className="glass-card flex items-center gap-2" style={{ padding: '12px', borderRadius: '12px', background: 'rgba(255,255,255,0.02)', border: '1px solid var(--glass-border)', color: '#fff', fontSize: '10px', fontWeight: 900, cursor: 'pointer' }}>
                                <Save size={14} color="var(--accent)" /> EXPORT
                            </button>
                            <label className="glass-card flex items-center gap-2" style={{ padding: '12px', borderRadius: '12px', background: 'rgba(255,255,255,0.02)', border: '1px solid var(--glass-border)', color: '#fff', fontSize: '10px', fontWeight: 900, cursor: 'pointer' }}>
                                <Download size={14} color="#8b5cf6" /> IMPORT
                                <input type="file" accept=".json" onChange={importSession} style={{ display: 'none' }} />
                            </label>
                        </div>
                    </div>
                </aside>

                <section className="main-content">
                    <div className="flex-1 p-8 overflow-y-auto custom-scrollbar" style={{ padding: '40px' }}>
                        <div style={{ maxWidth: '1400px', margin: '0 auto' }}>
                            {view === 'arrangement' ? (
                                <div className="flex flex-col">
                                    <div className="flex items-center justify-between" style={{ marginBottom: '48px' }}>
                                        <h3 style={{ fontSize: '32px', fontWeight: 900, letterSpacing: '-0.04em', color: '#fff' }}>Project Timeline</h3>
                                        <div className="flex items-center gap-4">
                                            <div style={{ fontSize: '11px', fontWeight: 900, color: 'var(--fg-muted)', textTransform: 'uppercase' }}>{tracks.length} Active Tracks</div>
                                        </div>
                                    </div>

                                    {tracks.length > 0 ? (
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                            {tracks.map(track => (
                                                <TrackLane
                                                    key={track.id}
                                                    track={track}
                                                    isPlaying={isPlaying}
                                                    onRemove={removeAndStopTrack}
                                                    onEffectChange={handleEffectChange}
                                                    onPatternChange={handlePatternChange}
                                                />
                                            ))}
                                        </div>
                                    ) : (
                                        <div style={{ height: '300px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', border: '2px dashed rgba(255,255,255,0.05)', borderRadius: '32px' }}>
                                            <Sparkles size={48} color="rgba(255,255,255,0.1)" style={{ marginBottom: '24px' }} />
                                            <p style={{ color: 'rgba(255,255,255,0.3)', fontWeight: 900, fontSize: '14px' }}>FORGE YOUR FIRST SOUND TO BEGIN</p>
                                        </div>
                                    )}
                                </div>
                            ) : (
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: '20px' }}>
                                    {[...Array(8)].map((_, i) => (
                                        <div key={i} style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '24px', aspectRatio: '1/1', padding: '32px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', cursor: 'pointer' }} onClick={() => handleGenerate('synth')}>
                                            <Plus size={20} color="rgba(255,255,255,0.1)" style={{ alignSelf: 'flex-end' }} />
                                            <div>
                                                <span style={{ fontSize: '10px', fontWeight: 900, color: 'rgba(255,255,255,0.1)', textTransform: 'uppercase' }}>SLOT {i + 1}</span>
                                                <span style={{ display: 'block', fontSize: '13px', fontWeight: 900, color: 'rgba(255,255,255,0.2)', marginTop: '8px' }}>FORGE CLIP</span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>

                    <div style={{ height: '120px', background: '#0a0a0c', borderTop: '1px solid rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 48px', position: 'relative' }}>
                        <div style={{ position: 'relative', width: '100%', maxWidth: '1000px' }}>
                            {isGenerating && (
                                <div style={{ position: 'absolute', top: '-1px', left: 0, width: '100%', height: '2px', overflow: 'hidden', zIndex: 10 }}>
                                    <div className="animate-progress" style={{ height: '100%', background: 'linear-gradient(90deg, transparent, #8b5cf6, transparent)', width: '100%' }} />
                                </div>
                            )}
                            <Mic size={24} color="rgba(255,255,255,0.1)" style={{ position: 'absolute', left: '28px', top: '50%', transform: 'translateY(-50%)' }} />
                            <input
                                ref={inputRef}
                                value={localPrompt}
                                onChange={(e) => setLocalPrompt(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && handleGenerate()}
                                placeholder="Forge your vision: 'Heavy industrial techno kick' or 'Deep melodic bass'..."
                                style={{ width: '100%', height: '72px', background: '#141417', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '24px', padding: '0 180px 0 72px', color: '#fff', fontSize: '16px', fontWeight: 500, outline: 'none' }}
                            />
                            <button
                                onClick={() => handleGenerate()}
                                disabled={isGenerating || !localPrompt}
                                style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', height: '48px', padding: '0 28px', background: 'linear-gradient(135deg, #8b5cf6, #ec4899)', border: 'none', borderRadius: '16px', color: '#fff', fontSize: '12px', fontWeight: 900, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '10px' }}
                            >
                                <Zap size={16} fill="#fff" /> {isGenerating ? 'FORGING...' : 'FORGE AI'}
                            </button>
                        </div>
                    </div>
                </section>
            </main>

            <AnimatePresence>
                {error && (
                    <motion.div initial={{ opacity: 0, y: 50 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} style={{ position: 'fixed', bottom: '140px', right: '40px', background: 'rgba(139, 92, 246, 0.15)', border: '1px solid rgba(139, 92, 246, 0.3)', padding: '16px 24px', borderRadius: '16px', color: '#fff', fontSize: '12px', fontWeight: 900, backdropFilter: 'blur(20px)', zIndex: 1000 }}>
                        <Info size={16} color="#8b5cf6" style={{ marginRight: '8px', verticalAlign: 'middle' }} /> {error}
                    </motion.div>
                )}
            </AnimatePresence>

            <style>{`
                .animate-progress { animation: progress 2s infinite linear; }
                @keyframes progress { 0% { transform: translateX(-100%); } 100% { transform: translateX(100%); } }
                .custom-scrollbar::-webkit-scrollbar { width: 5px; }
                .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(255, 255, 255, 0.05); border-radius: 10px; }
            `}</style>
        </div>
    );
}
