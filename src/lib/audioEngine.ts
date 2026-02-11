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
        sendReverb: Tone.Gain,
        sendDelay: Tone.Gain,
        volume: Tone.Volume
    }> = new Map();
    private playerMetadata: Map<string, { originalBpm: number, url: string }> = new Map();
    private masterBus?: Tone.Gain;
    private globalReverb?: Tone.Reverb;
    private globalDelay?: Tone.FeedbackDelay;
    private analyzer?: Tone.Analyser;
    private isStarted: boolean = false;
    private duckingAmount: number = 0.5;

    constructor() {
        if (typeof window !== 'undefined') {
            console.log("[PulseForge] Audio Core Initializing...");
            // Optimize for performance
            Tone.getContext().lookAhead = 0.2;

            this.masterBus = new Tone.Gain(1.2);

            // Global FX Send/Return - One instance for ALL tracks
            this.globalReverb = new Tone.Reverb({ decay: 3, wet: 1 }).toDestination();
            this.globalDelay = new Tone.FeedbackDelay({ delayTime: "8n", feedback: 0.5, wet: 1 }).toDestination();

            const compressor = new Tone.Compressor({
                threshold: -18,
                ratio: 5,
                attack: 0.03,
                release: 0.1
            });
            const limiter = new Tone.Limiter(-0.5).toDestination();
            this.analyzer = new Tone.Analyser("fft", 1024);

            this.masterBus.chain(compressor, limiter, this.analyzer);
        }
    }

    getFFT(): Float32Array {
        return (this.analyzer ? this.analyzer.getValue() : new Float32Array(1024)) as Float32Array;
    }

    async startTransport() {
        if (Tone.context.state !== 'running') {
            await Tone.context.resume();
        }
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
        Tone.Transport.bpm.rampTo(bpm, 0.1);

        // Update all active players playback rate
        this.players.forEach((player, id) => {
            const meta = this.playerMetadata.get(id);
            if (meta) {
                const ratio = bpm / meta.originalBpm;
                player.playbackRate = ratio;
            }
        });
    }

    private getOrCreateTrackChain(id: string) {
        if (this.trackChains.has(id)) return this.trackChains.get(id)!;

        const input = new Tone.Gain();
        const pitch = new Tone.PitchShift(0);
        const filter = new Tone.Filter(20000, "lowpass");
        const dist = new Tone.Distortion(0);
        const sidechain = new Tone.Gain(1);
        const sendReverb = new Tone.Gain(0);
        const sendDelay = new Tone.Gain(0);
        const volume = new Tone.Volume(0);

        // Efficiency: Input -> Pitch -> Filter -> Dist -> Sidechain -> Volume -> Master
        input.chain(pitch, filter, dist, sidechain, volume, this.masterBus || Tone.getDestination());

        // Parallel FX Sends: Pipe audio to global shared effects
        if (this.globalReverb) sidechain.connect(sendReverb).connect(this.globalReverb);
        if (this.globalDelay) sidechain.connect(sendDelay).connect(this.globalDelay);

        const chain = { input, pitch, filter, dist, sidechain, sendReverb, sendDelay, volume };
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

        const player = new Tone.Player({
            url: url,
            loop: true,
            autostart: false,
            onload: () => {
                let finalOriginalBpm = originalBpm;
                const duration = player.buffer.duration;

                if (url.startsWith('data:audio') || url.includes('/generate')) {
                    const beatsAt120 = duration * 2; // Rough estimate
                    const beats = duration * (Tone.Transport.bpm.value / 60);
                    const targetBeats = beats > 12 ? 16 : 8;
                    finalOriginalBpm = (targetBeats / duration) * 60;
                }

                this.playerMetadata.set(id, { originalBpm: finalOriginalBpm, url });
                const ratio = Tone.Transport.bpm.value / finalOriginalBpm;
                player.playbackRate = ratio;

                // QUANTIZATION: Start on next bar if playing
                const startTime = Tone.Transport.state === 'started'
                    ? Tone.Transport.nextSubdivision("1m")
                    : 0;

                player.sync().start(startTime);
                console.log(`[PulseForge] Synced: ${id} | Start: ${startTime} | Original BPM: ${finalOriginalBpm.toFixed(1)}`);
            }
        });

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
                const db = value === 0 ? -Infinity : Tone.gainToDb(value * 2);
                chain.volume.volume.rampTo(db, 0.05);
                break;
            case 'reverb':
                chain.sendReverb.gain.rampTo(value, 0.05); // Adjusting send level instead of wet/dry
                break;
            case 'delay':
                chain.sendDelay.gain.rampTo(value, 0.05);
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
