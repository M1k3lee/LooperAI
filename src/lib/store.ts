import { create } from 'zustand';

interface AudioTrack {
    id: string;
    name: string;
    type: 'bass' | 'drums' | 'synth' | 'fx' | 'vocal';
    url: string;
    color: string;
    isActive: boolean;
    bpm: number;
    pattern?: boolean[]; // 16-step rhythmic pattern
}

interface PulseForgeState {
    isPlaying: boolean;
    bpm: number;
    tracks: AudioTrack[];
    activePrompt: string;
    isGenerating: boolean;

    togglePlay: () => void;
    setBpm: (bpm: number) => void;
    addTrack: (track: AudioTrack) => void;
    removeTrack: (id: string) => void;
    updateTrackPattern: (id: string, pattern: boolean[]) => void;
    setGenerating: (status: boolean) => void;
    setPrompt: (prompt: string) => void;
    setTracks: (tracks: AudioTrack[]) => void;
}

export const useStore = create<PulseForgeState>((set) => ({
    isPlaying: false,
    bpm: 128,
    tracks: [],
    activePrompt: '',
    isGenerating: false,

    togglePlay: () => set((state) => ({ isPlaying: !state.isPlaying })),
    setBpm: (bpm) => set({ bpm }),
    addTrack: (track) => set((state) => ({ tracks: [...state.tracks, track] })),
    removeTrack: (id) => set((state) => ({ tracks: state.tracks.filter(t => t.id !== id) })),
    updateTrackPattern: (id, pattern) => set((state) => ({
        tracks: state.tracks.map(t => t.id === id ? { ...t, pattern } : t)
    })),
    setGenerating: (status) => set({ isGenerating: status }),
    setPrompt: (prompt) => set({ activePrompt: prompt }),
    setTracks: (tracks) => set({ tracks }),
}));
