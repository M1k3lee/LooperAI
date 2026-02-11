"use client";

import React, { useEffect, useRef, useState } from 'react';
import WaveSurfer from 'wavesurfer.js';
import { Volume2, VolumeX, Trash2, Sliders, Grid3X3, Music, Zap, Download, MoreHorizontal, Sparkles } from 'lucide-react';
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
        volume: 0.8,
        pitch: 0.5,
        dist: 0,
        pump: track.type === 'bass' || track.type === 'lead' ? 1 : 0
    });

    const [currentPattern, setCurrentPattern] = useState<boolean[]>(
        track.pattern || [true, false, false, false, true, false, false, false, true, false, false, false, true, false, false, false]
    );

    useEffect(() => {
        if (!containerRef.current || !track.url || activeTab !== 'wave') return;

        waveRef.current = WaveSurfer.create({
            container: containerRef.current,
            waveColor: `${track.color}22`,
            progressColor: track.color,
            cursorColor: 'transparent',
            barWidth: 2,
            barGap: 3,
            height: 48,
            normalize: true,
            interact: false,
        });
        waveRef.current.load(track.url);

        return () => {
            waveRef.current?.destroy();
            waveRef.current = null;
        };
    }, [track.url, track.color, activeTab]);

    const handleFXUpdate = (type: string, val: number) => {
        setFxValues(prev => ({ ...prev, [type]: val }));
        onEffectChange(track.id, type, val);
    };

    const toggleStep = (index: number) => {
        const newPattern = [...currentPattern];
        newPattern[index] = !newPattern[index];
        setCurrentPattern(newPattern);
        onPatternChange(track.id, newPattern);
    };

    return (
        <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className={`track-card flex items-stretch gap-6 group ${isMuted ? 'opacity-50' : ''}`}
        >
            {/* Control Panel (left) */}
            <div className="w-56 flex flex-col justify-between py-1">
                <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2 overflow-hidden">
                        <div className="w-2 h-6 rounded-full" style={{ background: track.color }} />
                        <h4 className="text-[11px] font-black text-white/80 uppercase tracking-widest truncate">{track.name}</h4>
                    </div>
                </div>

                <div className="flex flex-col gap-4">
                    <div className="flex items-center gap-3">
                        <button
                            onClick={() => setIsMuted(!isMuted)}
                            className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all ${isMuted ? 'bg-red-500/20 text-red-500' : 'bg-white/5 text-white/40 hover:bg-white/10'}`}
                        >
                            {isMuted ? <VolumeX size={16} /> : <Volume2 size={16} />}
                        </button>
                        <div className="flex-1">
                            <div className="flex justify-between text-[8px] font-black text-white/20 mb-1">
                                <span>GAIN</span>
                                <span>{Math.round(fxValues.volume * 100)}%</span>
                            </div>
                            <input
                                type="range" min="0" max="1" step="0.01" value={fxValues.volume}
                                onChange={(e) => handleFXUpdate('volume', parseFloat(e.target.value))}
                                className="w-full h-1 bg-white/5 rounded-full appearance-none cursor-pointer accent-purple-500"
                            />
                        </div>
                    </div>

                    <div className="flex gap-1.5 p-1 bg-black/20 rounded-xl">
                        {[
                            { id: 'wave', icon: Music },
                            { id: 'fx', icon: Sliders },
                            { id: 'pattern', icon: Grid3X3 }
                        ].map(tab => (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id as any)}
                                className={`flex-1 flex justify-center py-2 rounded-lg transition-all ${activeTab === tab.id ? 'bg-white/10 text-white' : 'text-white/20 hover:text-white/40'}`}
                            >
                                <tab.icon size={14} />
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {/* Main Interactive Area (center) */}
            <div className="flex-1 bg-black/20 rounded-2xl relative overflow-hidden flex items-center px-6">
                <AnimatePresence mode="wait">
                    {activeTab === 'wave' ? (
                        <motion.div key="wave" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="w-full">
                            {track.url ? <div ref={containerRef} /> : (
                                <div className="flex items-center justify-center opacity-10">
                                    <Sparkles size={24} />
                                </div>
                            )}
                        </motion.div>
                    ) : activeTab === 'fx' ? (
                        <motion.div key="fx" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="w-full grid grid-cols-4 gap-6">
                            <FXControl label="FILTER" value={fxValues.filter} onChange={v => handleFXUpdate('filter', v)} color={track.color} />
                            <FXControl label="REVERB" value={fxValues.reverb} onChange={v => handleFXUpdate('reverb', v)} color={track.color} />
                            <FXControl label="DELAY" value={fxValues.delay} onChange={v => handleFXUpdate('delay', v)} color={track.color} />
                            <div className="flex flex-col gap-2">
                                <span className="text-[8px] font-black text-white/20 uppercase">DYNAMICS</span>
                                <button
                                    onClick={() => handleFXUpdate('pump', fxValues.pump ? 0 : 1)}
                                    className={`flex-1 rounded-lg text-[9px] font-black tracking-widest transition-all ${fxValues.pump ? 'bg-purple-500 text-white shadow-lg shadow-purple-500/20' : 'bg-white/5 text-white/20'}`}
                                >
                                    PUMP {fxValues.pump ? 'ON' : 'OFF'}
                                </button>
                            </div>
                        </motion.div>
                    ) : (
                        <motion.div key="pattern" initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.98 }} className="w-full grid grid-cols-16 gap-2">
                            {currentPattern.map((active, i) => (
                                <div
                                    key={i}
                                    onClick={() => toggleStep(i)}
                                    className={`h-12 rounded-lg cursor-pointer transition-all border ${active ? 'bg-purple-500 border-purple-400 shadow-lg shadow-purple-500/20' : 'bg-white/5 border-transparent hover:border-white/10'} ${i % 4 === 0 ? 'opacity-100' : 'opacity-60'}`}
                                />
                            ))}
                        </motion.div>
                    )}
                </AnimatePresence>

                {isPlaying && (
                    <motion.div
                        animate={{ x: [0, 'full' as any] }}
                        transition={{ duration: 4, repeat: Infinity, ease: 'linear' }}
                        className="absolute left-0 top-0 bottom-0 w-[1px] bg-white z-10 shadow-[0_0_10px_white]"
                    />
                )}
            </div>

            {/* Actions (right) */}
            <div className="flex flex-col gap-2">
                <button onClick={() => onRemove(track.id)} className="p-3 rounded-xl bg-red-500/10 text-red-500/40 hover:text-red-500 hover:bg-red-500/20 transition-all">
                    <Trash2 size={16} />
                </button>
                {track.url && (
                    <a href={track.url} download={`${track.name}.wav`} className="p-3 rounded-xl bg-white/5 text-white/20 hover:text-white/60 hover:bg-white/10 transition-all">
                        <Download size={16} />
                    </a>
                )}
            </div>
        </motion.div>
    );
}

function FXControl({ label, value, onChange, color }: { label: string; value: number; onChange: (v: number) => void; color: string }) {
    return (
        <div className="flex flex-col gap-2">
            <div className="flex justify-between text-[8px] font-black text-white/20 uppercase tracking-widest">
                <span>{label}</span>
                <span className="text-white/40">{Math.round(value * 100)}%</span>
            </div>
            <input
                type="range" min="0" max="1" step="0.01" value={value}
                onChange={(e) => onChange(parseFloat(e.target.value))}
                className="w-full h-1 bg-white/5 rounded-full appearance-none cursor-pointer accent-purple-500"
            />
        </div>
    );
}
