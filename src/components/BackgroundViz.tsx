"use client";

import React, { useEffect, useRef } from 'react';
import { audioEngine } from '@/lib/audioEngine';

export default function BackgroundViz() {
    const canvasRef = useRef<HTMLCanvasElement>(null);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        let animationFrameId: number;
        let particles: Array<{ x: number, y: number, size: number, speedX: number, speedY: number, color: string }> = [];

        const resize = () => {
            canvas.width = window.innerWidth;
            canvas.height = window.innerHeight;
            init(); // Re-init particles on resize to avoid clustering
        };

        const init = () => {
            particles = [];
            for (let i = 0; i < 50; i++) {
                particles.push({
                    x: Math.random() * canvas.width,
                    y: Math.random() * canvas.height,
                    size: Math.random() * 2 + 1,
                    speedX: (Math.random() - 0.5) * 0.4,
                    speedY: (Math.random() - 0.5) * 0.4,
                    color: Math.random() > 0.5 ? '#8b5cf6' : '#ec4899'
                });
            }
        };

        const draw = () => {
            // Get audio data
            const fft = audioEngine?.getFFT() || new Float32Array(1024);
            // Calculate average energy
            let sum = 0;
            for (let i = 0; i < 32; i++) sum += Math.abs(fft[i]);
            const energy = Math.min(sum / 32, 1);

            // Clear with dark fade
            ctx.fillStyle = 'rgba(10, 10, 12, 0.15)';
            ctx.fillRect(0, 0, canvas.width, canvas.height);

            // Draw reactive spectrum lines at the bottom
            const barWidth = canvas.width / 64;
            for (let i = 0; i < 64; i++) {
                const val = (fft[i] as any as number) * 300;
                const hue = 280 + (i * 2);
                ctx.fillStyle = `hsla(${hue}, 70%, 60%, 0.2)`;
                ctx.fillRect(i * barWidth * 1.5, canvas.height, barWidth, -val - (energy * 100));
            }

            particles.forEach((p, i) => {
                const valAtI = fft[i % 32] as any as number;
                const audioScale = 1 + (Math.abs(valAtI) * 5);
                ctx.fillStyle = p.color;
                ctx.beginPath();
                ctx.arc(p.x, p.y, p.size * audioScale, 0, Math.PI * 2);
                ctx.fill();

                // Subtle glow that pulses with energy
                ctx.shadowBlur = 10 + (energy * 40);
                ctx.shadowColor = p.color;

                const moveScale = 1 + (energy * 5);
                p.x += p.speedX * moveScale;
                p.y += p.speedY * moveScale;

                // Bounce
                if (p.x < 0 || p.x > canvas.width) p.speedX *= -1;
                if (p.y < 0 || p.y > canvas.height) p.speedY *= -1;
            });

            animationFrameId = requestAnimationFrame(draw);
        };

        window.addEventListener('resize', resize);
        resize();
        draw();

        return () => {
            window.removeEventListener('resize', resize);
            cancelAnimationFrame(animationFrameId);
        };
    }, []);

    return (
        <canvas
            ref={canvasRef}
            style={{
                position: 'fixed',
                top: 0,
                left: 0,
                width: '100vw',
                height: '100vh',
                pointerEvents: 'none',
                zIndex: 0,
                opacity: 0.6
            }}
        />
    );
}
