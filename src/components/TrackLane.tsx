"use client";

import React, { useEffect, useRef, useState } from 'react';
import WaveSurfer from 'wavesurfer.js';
import { Volume2, VolumeX, Trash2, Sliders, Grid3X3, Music, Zap, Save, Download } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface TrackLaneProps {
    track: {
        id: string;
        name: string;
        type: string;
        url: string;
        color: string;
        pattern?: boolean[];
    };
    isPlaying: boolean;
    onRemove: (id: string) => void;
    onEffectChange: (id: string, type: string, value: number) => void;
    onPatternChange: (id: string, pattern: boolean[]) => void;
}

export default function TrackLane({ track, isPlaying, onRemove, onEffectChange, onPatternChange }: TrackLaneProps) {
    const containerRef = useRef<HTMLDivElement>(null);
    const waveRef = useRef<WaveSurfer | null>(null);
    const [isMuted, setIsMuted] = useState(false);
    const [activeTab, setActiveTab] = useState<'wave' | 'fx' | 'pattern'>('wave');
    const [fxValues, setFxValues] = useState({
        reverb: 0,
        delay: 0,
        filter: 1,
        volume: 1.0,
        pitch: 0.5,
        dist: 0,
        pump: track.type === 'bass' || track.type === 'lead' ? 1 : 0
    });

    const [currentPattern, setCurrentPattern] = useState<boolean[]>(
        track.pattern || (track.name.includes('KICK')
            ? [true, false, false, false, true, false, false, false, true, false, false, false, true, false, false, false]
            : [false, false, true, false, false, false, true, false, false, false, true, false, false, false, true, false])
    );

    useEffect(() => {
        if (!containerRef.current || (!track.url && !track.name.includes('LOCAL'))) return;

        if (track.url) {
            waveRef.current = WaveSurfer.create({
                container: containerRef.current,
                waveColor: `${track.color}44`,
                progressColor: track.color,
                cursorColor: '#fff',
                barWidth: 2,
                barGap: 3,
                height: 60,
                normalize: true,
                interact: false,
            });
            waveRef.current.load(track.url);
        }

        return () => {
            waveRef.current?.destroy();
        };
    }, [track.url, track.color, track.name]);

    const handleFXUpdate = (type: string, val: number) => {
        setFxValues(prev => ({ ...prev, [type]: val }));
        onEffectChange(track.id, type, val);
    };

    const handleMuteToggle = () => {
        const newVal = !isMuted;
        setIsMuted(newVal);
        onEffectChange(track.id, 'mute', newVal ? 1 : 0);
    };

    const toggleStep = (index: number) => {
        const newPattern = [...currentPattern];
        newPattern[index] = !newPattern[index];
        setCurrentPattern(newPattern);
        onPatternChange(track.id, newPattern);
    };

    return (
        <div style={{
            display: 'flex',
            alignItems: 'stretch',
            background: 'rgba(255,255,255,0.015)',
            borderRadius: '20px',
            margin: '0 0 10px 0',
            border: '1px solid rgba(255,255,255,0.03)',
            overflow: 'hidden',
            backdropFilter: 'blur(20px)',
            minHeight: '110px'
        }}>
            {/* TRACK HEAD */}
            <div style={{ width: '260px', padding: '24px', borderRight: '1px solid rgba(255,255,255,0.05)', flexShrink: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
                    <div style={{ width: '12px', height: '12px', borderRadius: '4px', background: track.color, boxShadow: `0 0 15px ${track.color}44` }} />
                    <span style={{ fontSize: '11px', fontWeight: 900, color: '#fff', textTransform: 'uppercase', letterSpacing: '0.1em', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{track.name}</span>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', flex: 1 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '8px', fontWeight: 900, color: 'rgba(255,255,255,0.3)' }}>
                            <span>VOL</span>
                            <span>{Math.round(fxValues.volume * 100)}%</span>
                        </div>
                        <input
                            type="range" min="0" max="1" step="0.01"
                            value={fxValues.volume}
                            onChange={(e) => handleFXUpdate('volume', parseFloat(e.target.value))}
                            style={{ accentColor: track.color, height: '3px', cursor: 'pointer' }}
                        />
                    </div>
                </div>

                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    <div style={{ display: 'flex', background: 'rgba(255,255,255,0.03)', borderRadius: '10px', padding: '4px' }}>
                        <button onClick={handleMuteToggle} title="Mute Output" style={{ background: isMuted ? '#ef4444' : 'none', border: 'none', borderRadius: '6px', padding: '8px', cursor: 'pointer', color: isMuted ? '#fff' : 'rgba(255,255,255,0.2)', display: 'flex' }}>
                            {isMuted ? <VolumeX size={14} /> : <Volume2 size={14} />}
                        </button>
                        <button onClick={() => setActiveTab('fx')} title="FX Sliders" style={{ background: activeTab === 'fx' ? `${track.color}22` : 'none', border: 'none', borderRadius: '6px', padding: '8px', cursor: 'pointer', color: activeTab === 'fx' ? track.color : 'rgba(255,255,255,0.2)', display: 'flex' }}>
                            <Sliders size={14} />
                        </button>
                        <button onClick={() => setActiveTab('pattern')} title="Pattern Grid" style={{ background: activeTab === 'pattern' ? `${track.color}22` : 'none', border: 'none', borderRadius: '6px', padding: '8px', cursor: 'pointer', color: activeTab === 'pattern' ? track.color : 'rgba(255,255,255,0.2)', display: 'flex' }}>
                            <Grid3X3 size={14} />
                        </button>
                        <button onClick={() => setActiveTab('wave')} title="Waveform" style={{ background: activeTab === 'wave' ? `${track.color}22` : 'none', border: 'none', borderRadius: '6px', padding: '8px', cursor: 'pointer', color: activeTab === 'wave' ? track.color : 'rgba(255,255,255,0.2)', display: 'flex' }}>
                            <Music size={14} />
                        </button>
                    </div>
                    <button onClick={() => onRemove(track.id)} style={{ marginLeft: 'auto', background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(239, 68, 68, 0.15)', display: 'flex' }} onMouseEnter={(e) => e.currentTarget.style.color = '#ef4444'} onMouseLeave={(e) => e.currentTarget.style.color = 'rgba(239, 68, 68, 0.15)'}>
                        <Trash2 size={14} />
                    </button>
                    {track.url && (
                        <a href={track.url} download={`${track.name}.wav`} style={{ display: 'flex', background: 'rgba(255,255,255,0.05)', borderRadius: '6px', padding: '6px', cursor: 'pointer', color: 'rgba(255,255,255,0.4)', transition: 'all 0.2s', textDecoration: 'none' }} onMouseEnter={(e) => e.currentTarget.style.color = '#fff'}>
                            <Download size={14} />
                        </a>
                    )}
                </div>
            </div>

            {/* TRACK BODY */}
            <div style={{ flex: 1, padding: '24px', position: 'relative', background: 'rgba(0,0,0,0.15)', display: 'flex', alignItems: 'center' }}>
                <AnimatePresence mode="wait">
                    {activeTab === 'fx' ? (
                        <motion.div key="fx" initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -5 }} style={{ width: '100%', display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '32px', padding: '0 10px' }}>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                                <FXSlider label="PITCH/TONE" value={fxValues.pitch} onChange={(v: number) => handleFXUpdate('pitch', v)} color={track.color} />
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 0' }}>
                                    <span style={{ fontSize: '9px', fontWeight: 900, color: 'rgba(255,255,255,0.4)', letterSpacing: '0.1em' }}>SIDECHAIN PUMP</span>
                                    <button
                                        onClick={() => handleFXUpdate('pump', fxValues.pump ? 0 : 1)}
                                        style={{
                                            padding: '8px 16px', borderRadius: '8px',
                                            background: fxValues.pump ? 'linear-gradient(135deg, #8b5cf6, #ec4899)' : 'rgba(255,255,255,0.05)',
                                            border: 'none', color: '#fff', fontSize: '10px', fontWeight: 900, cursor: 'pointer',
                                            boxShadow: fxValues.pump ? '0 0 15px rgba(139, 92, 246, 0.4)' : 'none'
                                        }}
                                    >
                                        {fxValues.pump ? 'ACTIVE' : 'OFF'}
                                    </button>
                                </div>
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                                <FXSlider label="FILTER" value={fxValues.filter} onChange={(v: number) => handleFXUpdate('filter', v)} color={track.color} />
                                <FXSlider label="DISTORTION" value={fxValues.dist} onChange={(v: number) => handleFXUpdate('dist', v)} color={track.color} />
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                                <FXSlider label="REVERB" value={fxValues.reverb} onChange={(v: number) => handleFXUpdate('reverb', v)} color={track.color} />
                                <FXSlider label="DELAY" value={fxValues.delay} onChange={(v: number) => handleFXUpdate('delay', v)} color={track.color} />
                                <FXSlider label="VOLUME" value={fxValues.volume} onChange={(v: number) => handleFXUpdate('volume', v)} color={track.color} />
                            </div>
                        </motion.div>
                    ) : activeTab === 'pattern' ? (
                        <motion.div key="pattern" initial={{ opacity: 0, scale: 0.99 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.99 }} style={{ width: '100%', display: 'grid', gridTemplateColumns: 'repeat(16, 1fr)', gap: '8px', padding: '0 10px' }}>
                            {currentPattern.map((active, i) => (
                                <div key={i} onClick={() => toggleStep(i)} style={{ aspectRatio: '1/2.5', background: active ? track.color : 'rgba(255,255,255,0.02)', borderRadius: '6px', cursor: 'pointer', border: i % 4 === 0 ? '1px solid rgba(255,255,255,0.08)' : '1px solid transparent', boxShadow: active ? `0 0 20px ${track.color}33` : 'none', transition: 'all 0.15s' }} />
                            ))}
                        </motion.div>
                    ) : (
                        <motion.div key="wave" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} style={{ width: '100%' }}>
                            {track.url ? (
                                <div ref={containerRef} style={{ opacity: isMuted ? 0.2 : 1 }} />
                            ) : (
                                <div style={{ height: '60px', width: '100%', display: 'flex', gap: '6px', alignItems: 'center', opacity: 0.15 }}>
                                    {currentPattern.map((active, i) => (
                                        <div key={i} style={{ flex: 1, height: active ? '50px' : '12px', background: track.color, borderRadius: '3px', opacity: i % 4 === 0 ? 1 : 0.6 }} />
                                    ))}
                                </div>
                            )}
                        </motion.div>
                    )}
                </AnimatePresence>

                {isPlaying && (
                    <motion.div
                        animate={{ x: ['1px', '100%'] }}
                        transition={{ duration: 4, repeat: Infinity, ease: 'linear' }}
                        style={{ position: 'absolute', top: 0, bottom: 0, width: '2px', background: '#fff', boxShadow: '0 0 15px #fff', zIndex: 10, pointerEvents: 'none' }}
                    />
                )}
            </div>
        </div >
    );
}

function FXSlider({ label, value, onChange, color }: any) {
    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '9px', fontWeight: 900, color: 'rgba(255,255,255,0.3)', letterSpacing: '0.05em' }}>
                <span>{label}</span>
                <span style={{ color: value > 0 ? color : 'inherit' }}>{Math.round(value * 100)}%</span>
            </div>
            <input
                type="range" min="0" max="1" step="0.01"
                value={value}
                onChange={(e) => onChange(parseFloat(e.target.value))}
                style={{ accentColor: color, cursor: 'pointer', width: '100%', height: '4px' }}
            />
        </div>
    );
}
