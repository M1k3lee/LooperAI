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
    const [selectedCategory, setSelectedCategory] = useState('all');
    const [loading, setLoading] = useState(true);

    const mainCategories = ['all', 'kick', 'drum', 'bass', 'synth', 'hat', 'fx'];

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
        if (selectedCategory !== 'all') {
            filtered = filtered.filter(l => l.category.toLowerCase().includes(selectedCategory.toLowerCase()));
        }
        setFilteredLoops(filtered.slice(0, 100)); // Show more items
    }, [search, selectedCategory, loops]);

    if (loading) return <div className="p-4 text-xs font-black text-purple-500 animate-pulse uppercase tracking-widest">Scanning Library...</div>;

    return (
        <div className="flex flex-col gap-6 h-full">
            {/* Search & Categories */}
            <div className="flex flex-col gap-4">
                <div className="relative group">
                    <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/20 group-focus-within:text-purple-500 transition-colors" />
                    <input
                        type="text"
                        placeholder="Search 1,200+ pro loops..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="w-full bg-white/5 border border-white/10 rounded-xl py-3 pl-10 pr-4 text-xs text-white outline-none focus:border-purple-500/50 focus:bg-white/10 transition-all"
                    />
                </div>

                <div className="grid grid-cols-3 gap-2">
                    {mainCategories.map(cat => (
                        <button
                            key={cat}
                            onClick={() => setSelectedCategory(cat)}
                            className={`px-2 py-2.5 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all border ${selectedCategory === cat
                                ? 'bg-purple-600 border-purple-500 text-white shadow-lg shadow-purple-500/20 scale-[1.02]'
                                : 'bg-white/5 border-white/5 text-white/40 hover:bg-white/10 hover:border-white/10'
                                }`}
                        >
                            {cat}
                        </button>
                    ))}
                </div>
            </div>

            {/* Results List */}
            <div className="flex-1 overflow-y-auto custom-scrollbar pr-1 flex flex-col gap-1.5 min-h-[300px] max-h-[60svh]">
                <div className="flex items-center justify-between px-1 mb-2">
                    <span className="text-[9px] font-black text-white/20 uppercase tracking-widest">{filteredLoops.length} Results</span>
                    {search && (
                        <button onClick={() => setSearch('')} className="text-[9px] font-black text-purple-400 uppercase tracking-widest hover:text-white">Clear</button>
                    )}
                </div>

                {filteredLoops.map(loop => (
                    <div
                        key={loop.id}
                        className="group flex items-center justify-between p-3 rounded-xl bg-white/[0.02] border border-white/0 hover:border-white/5 hover:bg-white/[0.06] transition-all cursor-pointer relative overflow-hidden active:scale-[0.98]"
                        onClick={() => onAddLoop(loop)}
                    >
                        <div className="flex items-center gap-3 relative z-10">
                            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500/10 to-pink-500/10 flex items-center justify-center text-purple-400 group-hover:from-purple-500/30 group-hover:to-pink-500/30 transition-all">
                                <Disc size={18} className="group-hover:rotate-90 transition-transform duration-500" />
                            </div>
                            <div className="flex flex-col gap-0.5">
                                <span className="text-[11px] font-bold text-white/70 group-hover:text-white transition-colors truncate max-w-[150px]">
                                    {loop.name.split(' - ')[2] || loop.name}
                                </span>
                                <div className="flex items-center gap-1.5">
                                    <span className={`text-[8px] font-black uppercase tracking-tighter px-1 rounded ${loop.category === 'kick' ? 'bg-red-500/20 text-red-400' :
                                        loop.category === 'bass' ? 'bg-purple-500/20 text-purple-400' :
                                            loop.category === 'synth' ? 'bg-cyan-500/20 text-cyan-400' :
                                                'bg-white/10 text-white/40'
                                        }`}>
                                        {loop.category}
                                    </span>
                                    <span className="text-[9px] font-medium text-white/20">{loop.bpm} BPM</span>
                                </div>
                            </div>
                        </div>
                        <div className="flex items-center gap-1 relative z-10">
                            <Plus size={16} className="text-white/10 group-hover:text-purple-400 transition-all group-hover:scale-110" />
                        </div>

                        {/* Hover Gradient Glow */}
                        <div className="absolute inset-0 bg-gradient-to-r from-purple-500/0 via-purple-500/0 to-purple-500/5 opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                ))}

                {filteredLoops.length === 0 && (
                    <div className="py-20 text-center">
                        <Music size={32} className="mx-auto text-white/5 mb-4" />
                        <p className="text-[10px] font-black text-white/20 uppercase tracking-widest">No loops found matching your search</p>
                    </div>
                )}
            </div>
        </div>
    );
}
