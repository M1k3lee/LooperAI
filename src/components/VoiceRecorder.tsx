"use client";

import React, { useState, useRef } from 'react';
import { Mic, Square, Play, Check, X } from 'lucide-react';
import { motion } from 'framer-motion';

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
            };

            mediaRecorder.current.start();
            setIsRecording(true);
        } catch (err) {
            console.error("Microphone access denied:", err);
        }
    };

    const stopRecording = () => {
        mediaRecorder.current?.stop();
        setIsRecording(false);
    };

    return (
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '1rem', background: 'rgba(255,255,255,0.03)', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.05)' }}>
            {!audioUrl ? (
                <button
                    onClick={isRecording ? stopRecording : startRecording}
                    style={{
                        width: '48px', height: '48px', borderRadius: '50%',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        transition: 'all 0.2s ease',
                        background: isRecording ? '#ef4444' : '#8b5cf6',
                        border: 'none',
                        cursor: 'pointer',
                        boxShadow: isRecording ? '0 0 20px rgba(239, 68, 68, 0.4)' : '0 0 20px rgba(139, 92, 246, 0.2)'
                    }}
                >
                    {isRecording ? <Square size={20} color="white" fill="white" /> : <Mic size={20} color="white" />}
                </button>
            ) : (
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <button onClick={() => setAudioUrl(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.4)' }}>
                        <X size={16} />
                    </button>
                    <div style={{ height: '32px', width: '100px', background: 'rgba(255,255,255,0.05)', borderRadius: '16px', display: 'flex', alignItems: 'center', padding: '0 12px' }}>
                        <div style={{ height: '2px', width: '100%', background: 'rgba(139, 92, 246, 0.3)', borderRadius: '2px', position: 'relative', overflow: 'hidden' }}>
                            <div className="animate-progress" style={{ position: 'absolute', inset: 0, background: '#8b5cf6' }} />
                        </div>
                    </div>
                    <button
                        onClick={() => {
                            if (audioBlob) {
                                onUpload(audioBlob);
                                setAudioUrl(null);
                                setAudioBlob(null);
                            }
                        }}
                        style={{
                            display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 16px',
                            background: 'linear-gradient(135deg, #8b5cf6, #ec4899)',
                            border: 'none', borderRadius: '8px', color: 'white',
                            fontSize: '10px', fontWeight: 'bold', cursor: 'pointer',
                            boxShadow: '0 4px 15px rgba(139, 92, 246, 0.3)'
                        }}
                    >
                        USE HUM <Check size={12} />
                    </button>
                </div>
            )}
            <div style={{ display: 'flex', flexDirection: 'column' }}>
                <span style={{ fontSize: '9px', fontWeight: 900, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                    {isRecording ? 'Recording...' : audioUrl ? 'Review' : 'Voice/Bass'}
                </span>
                <span style={{ fontSize: '9px', color: 'rgba(255,255,255,0.2)' }}>Hum a melody</span>
            </div>
        </div>
    );
}
