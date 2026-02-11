"use client";

import React, { useState, useRef } from 'react';
import { Mic, Square, Check, X } from 'lucide-react';

export default function VoiceRecorder({ onUpload }: { onUpload: (blob: Blob) => void }) {
    const [isRecording, setIsRecording] = useState(false);
    const [audioUrl, setAudioUrl] = useState<string | null>(null);
    const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
    const mediaRecorder = useRef<MediaRecorder | null>(null);
    const chunks = useRef<Blob[]>([]);

    const startRecording = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            mediaRecorder.current = new MediaRecorder(stream);
            chunks.current = [];

            mediaRecorder.current.ondataavailable = (e) => {
                if (e.data.size > 0) chunks.current.push(e.data);
            };

            mediaRecorder.current.onstop = () => {
                const blob = new Blob(chunks.current, { type: 'audio/wav' });
                const url = URL.createObjectURL(blob);
                setAudioBlob(blob);
                setAudioUrl(url);
                console.log("Recording stopped, blob created:", blob.size);
            };

            mediaRecorder.current.start();
            setIsRecording(true);
        } catch (err) {
            console.error("Microphone access denied:", err);
            alert("Please allow microphone access to use Voice Forge.");
        }
    };

    const stopRecording = () => {
        if (mediaRecorder.current && isRecording) {
            mediaRecorder.current.stop();
            setIsRecording(false);
        }
    };

    const handleUpload = () => {
        if (audioBlob) {
            console.log("Uploading audio blob...");
            onUpload(audioBlob);
            setAudioUrl(null);
            setAudioBlob(null);
        }
    };

    return (
        <div className="flex items-center gap-4 p-4 bg-white/5 rounded-2xl border border-white/5">
            {!audioUrl ? (
                <button
                    onClick={isRecording ? stopRecording : startRecording}
                    className={`w-12 h-12 rounded-full flex items-center justify-center transition-all ${isRecording
                            ? 'bg-red-500 shadow-[0_0_20px_rgba(239,68,68,0.4)]'
                            : 'bg-purple-500 shadow-[0_0_20px_rgba(139,92,246,0.2)] hover:scale-105'
                        }`}
                >
                    {isRecording ? <Square size={20} className="text-white fill-current" /> : <Mic size={20} className="text-white" />}
                </button>
            ) : (
                <div className="flex items-center gap-3">
                    <button onClick={() => setAudioUrl(null)} className="text-white/40 hover:text-white transition-colors">
                        <X size={16} />
                    </button>

                    {/* Visual Waveform placeholder */}
                    <div className="h-8 w-24 bg-white/5 rounded-full flex items-center px-3 overflow-hidden relative">
                        <div className="absolute inset-0 bg-purple-500/20 animate-pulse" />
                        <div className="flex gap-0.5 w-full justify-center items-center h-full z-10">
                            {[...Array(10)].map((_, i) => (
                                <div key={i} className="w-1 bg-purple-400 rounded-full" style={{ height: `${Math.random() * 100}%` }} />
                            ))}
                        </div>
                    </div>

                    <button
                        onClick={handleUpload}
                        className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-500 to-pink-500 rounded-xl text-[10px] font-black text-white shadow-lg shadow-purple-500/20 hover:scale-105 transition-transform"
                    >
                        USE HUM <Check size={12} />
                    </button>
                </div>
            )}

            <div className="flex flex-col">
                <span className="text-[9px] font-black text-white/40 uppercase tracking-widest leading-tight">
                    {isRecording ? 'Recording...' : audioUrl ? 'Review' : 'Voice/Bass'}
                </span>
                <span className="text-[9px] text-white/20 font-medium">
                    {isRecording ? 'Sing a melody' : audioUrl ? 'Ready to forge' : 'Hum a melody'}
                </span>
            </div>
        </div>
    );
}
