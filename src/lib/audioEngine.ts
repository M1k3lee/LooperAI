import * as Tone from 'tone';

class AudioEngine {
    private players: Map<string, Tone.Player> = new Map<string, Tone.Player>();
    private synths: Map<string, { synth: any, loop: Tone.Loop, pattern: boolean[], type: string }> = new Map();
    private trackChains: Map<string, {
        input: Tone.Gain,
        pitch: Tone.PitchShift,
        filter: Tone.Filter,
        dist: Tone.Distortion,
        sidechain: Tone.Gain,
        reverb: Tone.Reverb,
        delay: Tone.FeedbackDelay,
        volume: Tone.Volume
    }> = new Map();
    private masterBus?: Tone.Gain;
    private analyzer?: Tone.Analyser;
    private isStarted: boolean = false;
    private duckingAmount: number = 0.5;

    constructor() {
        if (typeof window !== 'undefined') {
            console.log("[PulseForge] Audio Core Initializing...");
            // Increase lookahead to prevent cracking on slower systems
            Tone.getContext().lookAhead = 0.1;

            this.masterBus = new Tone.Gain(2.0); // Boosted master for web audio parity
            const limiter = new Tone.Limiter(-0.5).toDestination();
            this.analyzer = new Tone.Analyser("fft", 1024);
            this.masterBus.chain(limiter, this.analyzer);
        }
    }

    getFFT(): Float32Array {
        return (this.analyzer ? this.analyzer.getValue() : new Float32Array(1024)) as Float32Array;
    }

    async startTransport() {
        if (!this.isStarted) {
            await Tone.start();
            this.isStarted = true;
            console.log("[PulseForge] Audio Engine Started");
        }
        if (Tone.Transport.state !== 'started') {
            Tone.Transport.start();
        }
    }

    stopTransport() {
        Tone.Transport.stop();
    }

    setBpm(bpm: number) {
        Tone.Transport.bpm.value = bpm;
    }

    private getOrCreateTrackChain(id: string) {
        if (this.trackChains.has(id)) return this.trackChains.get(id)!;

        // Create Nodes
        const input = new Tone.Gain();
        const pitch = new Tone.PitchShift(0);
        const filter = new Tone.Filter(20000, "lowpass");
        const dist = new Tone.Distortion(0);
        const sidechain = new Tone.Gain(1);
        const reverb = new Tone.Reverb({ wet: 0, decay: 2.5 });
        const delay = new Tone.FeedbackDelay({ wet: 0, delayTime: "8n", feedback: 0.4 });
        const volume = new Tone.Volume(0);

        // Connect Chain: Input -> Pitch -> Filter -> Dist -> Sidechain -> Reverb -> Delay -> Volume -> Master
        if (this.masterBus) {
            input.chain(pitch, filter, dist, sidechain, reverb, delay, volume, this.masterBus);
        } else {
            input.chain(pitch, filter, dist, sidechain, reverb, delay, volume, Tone.getDestination());
        }

        const chain = { input, pitch, filter, dist, sidechain, reverb, delay, volume };
        this.trackChains.set(id, chain);
        return chain;
    }

    // Trigger sidechain ducking globally
    private triggerSidechainDucking(time: number) {
        const duckDuration = "8n";
        this.trackChains.forEach((chain, id) => {
            // Only duck non-kick tracks that have sidechain enabled
            // (We'll store specific track tags in a metadata map if needed, 
            // but for now we duck everything that isn't the trigger)
            const trackType = this.synths.get(id)?.type;
            if (trackType !== 'kick') {
                chain.sidechain.gain.cancelScheduledValues(time);
                chain.sidechain.gain.setValueAtTime(1, time);
                chain.sidechain.gain.exponentialRampToValueAtTime(1 - this.duckingAmount, time + 0.05);
                chain.sidechain.gain.exponentialRampToValueAtTime(1, time + Tone.Time(duckDuration).toSeconds());
            }
        });
    }

    async playTrack(id: string, url: string, originalBpm: number = 126) {
        if (this.players.has(id)) return;

        const chain = this.getOrCreateTrackChain(id);

        // Create player
        const player = new Tone.Player({
            url: url,
            loop: true,
            autostart: false,
            onload: () => {
                // Determine length in bars (assuming 4/4)
                // AI clips are often exactly 5, 10, or 30 seconds. 
                // We'll try to guess if it's 2, 4, or 8 bars.
                let detectedBpm = originalBpm;
                const duration = player.buffer.duration;

                // If it's an AI clip (usually very long), we might need to "fit" it
                if (url.startsWith('data:audio') || url.includes('/generate')) {
                    // Force fit: Assume the user hummed a 2 or 4 bar loop
                    // Calculate what BPM would make this duration X bars
                    const beats = duration * (Tone.Transport.bpm.value / 60);
                    // Round to nearest power of 2 bars (8, 16 beats)
                    const targetBeats = beats > 12 ? 16 : 8;
                    detectedBpm = (targetBeats / duration) * 60;
                }

                const ratio = Tone.Transport.bpm.value / detectedBpm;
                player.playbackRate = ratio;
                player.sync().start(0);

                console.log(`[PulseForge] Synced: ${id} | Duration: ${duration.toFixed(2)}s | Target BPM: ${detectedBpm.toFixed(1)}`);
            }
        });

        const bpmListener = () => {
            const duration = player.buffer.duration;
            if (!duration) return;

            let detectedBpm = originalBpm;
            if (url.startsWith('data:audio') || url.includes('/generate')) {
                const beats = duration * (Tone.Transport.bpm.value / 60);
                const targetBeats = beats > 12 ? 16 : 8;
                detectedBpm = (targetBeats / duration) * 60;
            }

            const ratio = Tone.Transport.bpm.value / detectedBpm;
            player.playbackRate = ratio;
        };

        Tone.Transport.on('start', bpmListener);

        player.connect(chain.input);
        this.players.set(id, player);
    }

    createLocalDrumLoop(id: string, name: string = "Drum", initialPattern?: boolean[], prompt: string = "") {
        const chain = this.getOrCreateTrackChain(id);
        const pl = prompt.toLowerCase();
        const isKick = pl.includes('kick');
        const isHat = pl.includes('hat') || pl.includes('shaker');
        const isIndustrial = pl.includes('industrial') || pl.includes('dubstep');

        let synth: any;
        if (isKick) {
            synth = new Tone.MembraneSynth({
                envelope: { sustain: 0, attack: 0.001, decay: isIndustrial ? 0.4 : 0.2 },
                octaves: isIndustrial ? 10 : 4,
                pitchDecay: 0.05
            });
        } else if (isHat) {
            synth = new Tone.NoiseSynth({
                noise: { type: "white" },
                envelope: { sustain: 0, attack: 0.001, decay: 0.05 }
            });
        } else {
            // Snare / Clap style
            synth = new Tone.NoiseSynth({
                noise: { type: isIndustrial ? "pink" : "white" },
                envelope: { sustain: 0, attack: 0.002, decay: isIndustrial ? 0.4 : 0.15 }
            });
        }

        // CONNECT TO CHAIN INPUT
        synth.connect(chain.input);

        const patternArray = initialPattern ? [...initialPattern] : [true, false, false, false, true, false, false, false, true, false, false, false, true, false, false, false];

        const loop = new Tone.Loop(time => {
            const current = this.synths.get(id);
            if (!current) return;

            const ticksPer16th = Tone.Transport.PPQ / 4;
            const scheduledTick = Tone.Transport.getTicksAtTime(time);
            const currentStep = Math.round(scheduledTick / ticksPer16th) % 16;

            if (current.pattern[currentStep]) {
                if (isKick) {
                    (synth as Tone.MembraneSynth).triggerAttackRelease(isIndustrial ? "B0" : "C1", "8n", time);
                    this.triggerSidechainDucking(time);
                }
                else (synth as Tone.NoiseSynth).triggerAttackRelease("8n", time);
            }
        }, "16n").start(0);

        this.synths.set(id, { synth, loop, pattern: patternArray, type: isKick ? 'kick' : 'perc' });
    }

    createLocalBassline(id: string, initialPattern?: boolean[], prompt: string = "") {
        const chain = this.getOrCreateTrackChain(id);
        const pl = prompt.toLowerCase();
        const isDark = pl.includes('dark') || pl.includes('dubstep') || pl.includes('heavy');

        const synth = new Tone.MonoSynth({
            oscillator: { type: isDark ? "sawtooth" : "square" },
            envelope: { attack: 0.05, decay: 0.3, sustain: 0.2, release: 0.8 },
            filterEnvelope: { attack: 0.1, baseFrequency: isDark ? 60 : 150, octaves: 4 }
        }).connect(chain.input);

        const patternArray = initialPattern ? [...initialPattern] : [true, false, true, false, true, false, true, false, true, false, true, false, true, false, true, false];

        const loop = new Tone.Loop(time => {
            const current = this.synths.get(id);
            if (!current) return;

            const ticksPer16th = Tone.Transport.PPQ / 4;
            const scheduledTick = Tone.Transport.getTicksAtTime(time);
            const currentStep = Math.round(scheduledTick / ticksPer16th) % 16;

            if (current.pattern[currentStep]) {
                synth.triggerAttackRelease(isDark ? "E1" : "C2", "16n", time);
            }
        }, "16n").start(0);

        this.synths.set(id, { synth, loop, pattern: patternArray, type: 'bass' });
    }

    createLocalLead(id: string, initialPattern?: boolean[], prompt: string = "") {
        const chain = this.getOrCreateTrackChain(id);
        const pl = prompt.toLowerCase();

        // High quality melodic synth
        const synth = new Tone.DuoSynth({
            vibratoAmount: 0.5,
            vibratoRate: 5,
            harmonicity: 1.5,
            voice0: {
                oscillator: { type: "sawtooth" },
                envelope: { attack: 0.1, decay: 0.3, sustain: 0.4, release: 1 }
            },
            voice1: {
                oscillator: { type: "sine" },
                envelope: { attack: 0.2, decay: 0.2, sustain: 0.3, release: 1 }
            }
        }).connect(chain.input);

        // Melodic pattern for hummed input
        const patternArray = initialPattern ? [...initialPattern] : [true, false, false, true, false, false, true, false, true, false, false, true, false, true, false, false];

        // Create a randomized melodic sequence from a solid EDM scale (C Minor/Dorian)
        const scales = [
            ["C3", "Eb3", "F3", "G3", "Bb3", "C4", "Bb3", "G3"],
            ["C3", "D3", "Eb3", "F3", "G3", "A3", "Bb3", "C4"],
            ["F2", "Ab2", "Bb2", "C3", "Eb3", "F3", "Eb3", "C3"]
        ];
        const selectedScale = scales[Math.floor(Math.random() * scales.length)];
        const notes = Array.from({ length: 16 }, () => selectedScale[Math.floor(Math.random() * selectedScale.length)]);

        const loop = new Tone.Loop(time => {
            const current = this.synths.get(id);
            if (!current) return;

            const ticksPer16th = Tone.Transport.PPQ / 4;
            const scheduledTick = Tone.Transport.getTicksAtTime(time);
            const currentStep = Math.round(scheduledTick / ticksPer16th) % 16;

            if (current.pattern[currentStep]) {
                const note = notes[currentStep];
                synth.triggerAttackRelease(note, "8n", time);
            }
        }, "16n").start(0);

        this.synths.set(id, { synth, loop, pattern: patternArray, type: 'lead' });
    }

    createNoiseRiser(id: string, durationBars: number = 4) {
        const chain = this.getOrCreateTrackChain(id);
        const synth = new Tone.NoiseSynth({
            noise: { type: "white" },
            envelope: { attack: durationBars * 2, release: 0.1, sustain: 0.5 }
        }).connect(chain.input);

        // Manual filter sweep for that pro riser sound
        chain.filter.frequency.setValueAtTime(100, Tone.now());
        chain.filter.frequency.exponentialRampToValueAtTime(15000, Tone.now() + (durationBars * 2));

        synth.triggerAttackRelease(durationBars * 2);
        this.synths.set(id, { synth, loop: null as any, pattern: [], type: 'fx' });
    }

    updateLocalPattern(id: string, pattern: boolean[]) {
        const local = this.synths.get(id);
        if (local) {
            local.pattern.splice(0, local.pattern.length, ...pattern);
        }
    }

    stopTrack(id: string) {
        this.players.get(id)?.dispose();
        this.players.delete(id);

        const local = this.synths.get(id);
        if (local) {
            local.loop.dispose();
            local.synth.dispose();
            this.synths.delete(id);
        }

        const chain = this.trackChains.get(id);
        if (chain) {
            Object.values(chain).forEach(node => node.dispose());
            this.trackChains.delete(id);
        }
    }

    updateEffect(id: string, type: string, value: number) {
        const chain = this.trackChains.get(id);
        if (!chain) return;

        switch (type) {
            case 'mute':
                chain.volume.mute = !!value;
                break;
            case 'volume':
                // Map 0-1 to -60dB to +6dB for better range/boost
                const db = value === 0 ? -Infinity : Tone.gainToDb(value * 4);
                chain.volume.volume.rampTo(db, 0.05);
                break;
            case 'reverb':
                chain.reverb.wet.rampTo(value, 0.05);
                break;
            case 'delay':
                chain.delay.wet.rampTo(value, 0.05);
                break;
            case 'filter':
                // Logarithmic frequency mapping
                const freq = 20 + (value * 19980);
                chain.filter.frequency.rampTo(freq, 0.05);
                break;
            case 'pitch':
                // Pitch Shift is in semitones (-12 to 12)
                chain.pitch.pitch = (value - 0.5) * 24;
                break;
            case 'dist':
                chain.dist.distortion = value;
                break;
            case 'pump':
                // This resets the base gain manually, but triggerSidechainDucking 
                // is what actually performs the ducking movement.
                chain.sidechain.gain.rampTo(1, 0.05);
                break;
        }
    }
}

export const audioEngine = typeof window !== 'undefined' ? new AudioEngine() : null;
