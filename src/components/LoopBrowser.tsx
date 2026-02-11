"use client";

import React, { useState, useEffect } from 'react';
import { Music, Search, Play, Plus, Filter, Disc } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface Loop {
    id: string;
    name: string;
    category: string;
    path: string;
    key: string;
    bpm: number;
}

export default function LoopBrowser({ onAddLoop }: { onAddLoop: (loop: Loop) => void }) {
    const [loops, setLoops] = useState<Loop[]>([]);
    const [filteredLoops, setFilteredLoops] = useState<Loop[]>([]);
    const [search, setSearch] = useState('');
    const [category, setCategory] = useState('all');
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetch('/loops/library.json')
            .then(res => res.json())
            .then(data => {
                setLoops(data);
                setFilteredLoops(data);
                setLoading(false);
            })
            .catch(err => {
                console.error("Failed to load loop library", err);
                setLoading(false);
            });
    }, []);

    useEffect(() => {
        let filtered = loops.filter(l =>
            l.name.toLowerCase().includes(search.toLowerCase()) ||
            l.category.toLowerCase().includes(search.toLowerCase())
        );
        if (category !== 'all') {
            filtered = filtered.filter(l => l.category === category);
        }
        setFilteredLoops(filtered.slice(0, 50)); // Limit for performance
    }, [search, category, loops]);

    const categories = ['all', ...Array.from(new Set(loops.map(l => l.category)))];

    if (loading) return <div className="p-4 text-xs font-black text-purple-500 animate-pulse">LOADING PRO LIBRARY...</div>;

    return (
        <div className="flex flex-col gap-4 h-full">
            <div className="flex flex-col gap-2">
                <div className="relative">
                    <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/20" />
                    <input
                        type="text"
                        placeholder="Search loops..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="w-full bg-white/5 border border-white/10 rounded-xl py-2 pl-10 pr-4 text-xs text-white outline-none focus:border-purple-500/50 transition-colors"
                    />
                </div>
                <div className="flex gap-2 overflow-x-auto pb-2 no-scrollbar">
                    {categories.map(cat => (
                        <button
                            key={cat}
                            onClick={() => setCategory(cat)}
                            className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all whitespace-nowrap ${category === cat
                                    ? 'bg-purple-600 text-white shadow-lg shadow-purple-500/20'
                                    : 'bg-white/5 text-white/40 hover:bg-white/10'
                                }`}
                        >
                            {cat}
                        </button>
                    ))}
                </div>
            </div>

            <div className="flex-1 overflow-y-auto custom-scrollbar pr-2 flex flex-col gap-2 min-h-[200px] max-h-[400px]">
                {filteredLoops.map(loop => (
                    <div
                        key={loop.id}
                        className="group flex items-center justify-between p-3 rounded-xl bg-white/5 border border-white/5 hover:border-white/10 hover:bg-white/10 transition-all cursor-pointer"
                        onClick={() => onAddLoop(loop)}
                    >
                        <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-purple-500/20 to-pink-500/20 flex items-center justify-center text-purple-400 group-hover:scale-110 transition-transform">
                                <Disc size={16} />
                            </div>
                            <div className="flex flex-col">
                                <span className="text-[11px] font-bold text-white/80 group-hover:text-white transition-colors truncate max-w-[140px]">
                                    {loop.name.split(' - ')[2] || loop.name}
                                </span>
                                <div className="flex items-center gap-2">
                                    <span className="text-[9px] font-black text-purple-500/60 uppercase">{loop.category}</span>
                                    <span className="text-[9px] text-white/20">•</span>
                                    <span className="text-[9px] font-bold text-white/40">{loop.key}</span>
                                    <span className="text-[9px] text-white/20">•</span>
                                    <span className="text-[9px] font-bold text-white/40">{loop.bpm} BPM</span>
                                </div>
                            </div>
                        </div>
                        <button className="opacity-0 group-hover:opacity-100 p-2 text-purple-400 hover:text-purple-300 transition-all">
                            <Plus size={16} />
                        </button>
                    </div>
                ))}
            </div>
        </div>
    );
}
