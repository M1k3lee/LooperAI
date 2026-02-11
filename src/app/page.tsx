"use client";

import dynamic from 'next/dynamic';

const Studio = dynamic(() => import('@/components/Studio'), {
  ssr: false,
  loading: () => (
    <div style={{ height: '100vh', width: '100vw', background: '#0a0a0c', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px' }}>
        <div style={{ width: '48px', height: '48px', border: '2px solid rgba(139, 92, 246, 0.1)', borderTopColor: '#8b5cf6', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
        <span style={{ fontSize: '10px', fontWeight: 900, color: '#8b5cf6', textTransform: 'uppercase', letterSpacing: '0.2em' }}>Initializing PulseForge DAW...</span>
      </div>
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  )
});

export default function Home() {
  return (
    <main style={{ minHeight: '100vh', background: '#0a0a0c', margin: 0, padding: 0, overflow: 'hidden' }}>
      <Studio />
    </main>
  );
}
