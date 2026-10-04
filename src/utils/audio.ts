/**
 * Web Audio API synthesizer for UEFI startup chimes and system alert tones.
 * Features 10 customizable sound themes with real-time multi-oscillator synthesis.
 */

export type SoundTheme = 
  | 'classic-mac' 
  | 'silicon-mac' 
  | 'vintage-mac'
  | 'powermac-bell'
  | 'windows-7'
  | 'windows-ambient'
  | 'nova-synth' 
  | 'cyberpunk-warp'
  | 'arcade-8bit'
  | 'post-beep' 
  | 'silent';

export interface SoundThemeOption {
  id: SoundTheme;
  name: string;
  category: 'apple' | 'pc' | 'retro' | 'synth' | 'minimal';
  categoryLabel: string;
  description: string;
  previewNote: string;
  durationLabel: string;
}

export const SOUND_THEMES: SoundThemeOption[] = [
  {
    id: 'classic-mac',
    name: 'Mac Chime Classique',
    category: 'apple',
    categoryLabel: 'Apple',
    description: 'Accord F# majeur résonant emblématique des Mac Intel & OpenCore',
    previewNote: 'F#3 · C#4 · F#4 · A#4',
    durationLabel: '2.4s'
  },
  {
    id: 'silicon-mac',
    name: 'Apple Silicon Moderne',
    category: 'apple',
    categoryLabel: 'Apple',
    description: 'Sonorité douce et chaleureuse inspirée des MacBook Pro récents',
    previewNote: 'C Major 9ème soyeux',
    durationLabel: '2.0s'
  },
  {
    id: 'vintage-mac',
    name: 'Vintage Mac Quadra (1993)',
    category: 'apple',
    categoryLabel: 'Apple',
    description: 'Accord C Majeur triomphal et chaleureux des Mac vintage des années 90',
    previewNote: 'C3 · G3 · C4 · E4 · G4',
    durationLabel: '2.5s'
  },
  {
    id: 'powermac-bell',
    name: 'PowerMac Cloche Harmonie',
    category: 'apple',
    categoryLabel: 'Apple',
    description: 'Carillon en cloche acoustique avec harmoniques inharmoniques',
    previewNote: 'Harmoniques de cloche résonante',
    durationLabel: '2.8s'
  },
  {
    id: 'windows-7',
    name: 'Windows 7 Démarrage',
    category: 'pc',
    categoryLabel: 'PC / Windows',
    description: 'Le carillon légendaire de démarrage de Windows 7 à 4 notes lumineuses',
    previewNote: 'B3 · C#4 · D#4 · F#4',
    durationLabel: '3.4s'
  },
  {
    id: 'windows-ambient',
    name: 'Windows Ambient Nostalgie',
    category: 'pc',
    categoryLabel: 'PC / Windows',
    description: 'Nappe aérienne ambient et lumineuse inspirée de l\'ère classique PC',
    previewNote: 'Eb3 · Bb3 · F4 · G4',
    durationLabel: '2.6s'
  },
  {
    id: 'nova-synth',
    name: 'Nova Futuriste',
    category: 'synth',
    categoryLabel: 'Spatial / Synth',
    description: 'Carillon synthétiseur spatial épuré pour firmware UEFI nouvelle génération',
    previewNote: 'Onde sinusoïdale cristalline',
    durationLabel: '1.6s'
  },
  {
    id: 'cyberpunk-warp',
    name: 'Cyberpunk Sub-Warp',
    category: 'synth',
    categoryLabel: 'Spatial / Synth',
    description: 'Basse sub-harmonique 45Hz avec glissando spectral et résonance',
    previewNote: 'Sub-bass 45Hz + Balayage',
    durationLabel: '2.2s'
  },
  {
    id: 'arcade-8bit',
    name: 'Rétro Chiptune 8-Bit',
    category: 'retro',
    categoryLabel: 'Rétro Gaming',
    description: 'Arpège carré ultra-rapide façon console rétro & Game Boy',
    previewNote: 'Arpège Square Wave 8-Bit',
    durationLabel: '1.2s'
  },
  {
    id: 'post-beep',
    name: 'Bip UEFI POST BIOS',
    category: 'retro',
    categoryLabel: 'BIOS / Carte Mère',
    description: 'Bip système diagnostic authentique 1000 Hz pour passionnés de BIOS',
    previewNote: 'Bip court 1000 Hz',
    durationLabel: '0.2s'
  },
  {
    id: 'silent',
    name: 'Mode Silencieux',
    category: 'minimal',
    categoryLabel: 'Désactivé',
    description: 'Désactive complètement tous les effets sonores et carillons',
    previewNote: 'Aucun son (Mute)',
    durationLabel: '0s'
  }
];

const STORAGE_THEME_KEY = 'goldengate_sound_theme';
const STORAGE_VOLUME_KEY = 'goldengate_sound_volume';

class SystemAudioEngine {
  private ctx: AudioContext | null = null;
  private currentTheme: SoundTheme = 'classic-mac';
  private volume: number = 0.8;

  constructor() {
    if (typeof window !== 'undefined') {
      try {
        const savedTheme = localStorage.getItem(STORAGE_THEME_KEY) as SoundTheme;
        if (savedTheme && SOUND_THEMES.some(t => t.id === savedTheme)) {
          this.currentTheme = savedTheme;
        }
        const savedVol = localStorage.getItem(STORAGE_VOLUME_KEY);
        if (savedVol !== null) {
          this.volume = parseFloat(savedVol);
        }
      } catch {
        // fallback
      }
    }
  }

  public getTheme(): SoundTheme {
    return this.currentTheme;
  }

  public setTheme(theme: SoundTheme) {
    this.currentTheme = theme;
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(STORAGE_THEME_KEY, theme);
      } catch {}
    }
  }

  public getVolume(): number {
    return this.volume;
  }

  public setVolume(vol: number) {
    this.volume = Math.max(0, Math.min(1, vol));
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(STORAGE_VOLUME_KEY, this.volume.toString());
      } catch {}
    }
  }

  private initCtx() {
    if (!this.ctx && typeof window !== 'undefined') {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
  }

  /**
   * Subtle alert notification tone
   */
  public playNotification() {
    if (this.currentTheme === 'silent' || this.volume <= 0) return;
    try {
      this.initCtx();
      if (!this.ctx) return;
      const now = this.ctx.currentTime;

      const osc1 = this.ctx.createOscillator();
      const osc2 = this.ctx.createOscillator();
      const gainNode = this.ctx.createGain();

      osc1.type = 'sine';
      osc2.type = 'triangle';

      osc1.frequency.setValueAtTime(587.33, now); // D5
      osc1.frequency.exponentialRampToValueAtTime(880, now + 0.12); // A5

      osc2.frequency.setValueAtTime(1174.66, now); // D6
      osc2.frequency.exponentialRampToValueAtTime(1760, now + 0.12); // A6

      gainNode.gain.setValueAtTime(0.001, now);
      gainNode.gain.linearRampToValueAtTime(0.12 * this.volume, now + 0.02);
      gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.35);

      osc1.connect(gainNode);
      osc2.connect(gainNode);
      gainNode.connect(this.ctx.destination);

      osc1.start(now);
      osc2.start(now);
      osc1.stop(now + 0.4);
      osc2.stop(now + 0.4);
    } catch {
      // Audio suppressed
    }
  }

  /**
   * Critical thermal warning chime
   */
  public playCriticalWarning() {
    if (this.currentTheme === 'silent' || this.volume <= 0) return;
    try {
      this.initCtx();
      if (!this.ctx) return;
      const now = this.ctx.currentTime;

      [440, 523.25, 659.25].forEach((freq, idx) => {
        if (!this.ctx) return;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(freq, now + idx * 0.08);

        gain.gain.setValueAtTime(0.001, now + idx * 0.08);
        gain.gain.linearRampToValueAtTime(0.15 * this.volume, now + idx * 0.08 + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.08 + 0.4);

        osc.connect(gain);
        gain.connect(this.ctx.destination);

        osc.start(now + idx * 0.08);
        osc.stop(now + idx * 0.08 + 0.45);
      });
    } catch {
      // Audio suppressed
    }
  }

  /**
   * Plays the boot chime based on selected theme
   */
  public playBootChime(customTheme?: SoundTheme) {
    const theme = customTheme || this.currentTheme;
    if (theme === 'silent' || this.volume <= 0) return;

    try {
      this.initCtx();
      if (!this.ctx) return;
      const now = this.ctx.currentTime;

      // 1. CLASSIC MAC (F# Major)
      if (theme === 'classic-mac') {
        const chord = [185.0, 277.18, 369.99, 466.16, 739.99];
        chord.forEach((freq, i) => {
          if (!this.ctx) return;
          const osc = this.ctx.createOscillator();
          const gain = this.ctx.createGain();

          osc.type = i === 0 ? 'triangle' : 'sine';
          osc.frequency.setValueAtTime(freq, now);

          gain.gain.setValueAtTime(0.001, now);
          gain.gain.linearRampToValueAtTime((0.16 / chord.length) * this.volume * 2.5, now + 0.04);
          gain.gain.exponentialRampToValueAtTime(0.0001, now + 2.3);

          osc.connect(gain);
          gain.connect(this.ctx.destination);

          osc.start(now);
          osc.stop(now + 2.4);
        });
      } 
      // 2. SILICON MAC (Modern C Major 9)
      else if (theme === 'silicon-mac') {
        const chord = [261.63, 329.63, 392.00, 493.88, 587.33];
        chord.forEach((freq) => {
          if (!this.ctx) return;
          const osc = this.ctx.createOscillator();
          const gain = this.ctx.createGain();

          osc.type = 'sine';
          osc.frequency.setValueAtTime(freq, now);

          gain.gain.setValueAtTime(0.001, now);
          gain.gain.linearRampToValueAtTime((0.14 / chord.length) * this.volume * 2, now + 0.06);
          gain.gain.exponentialRampToValueAtTime(0.0001, now + 1.9);

          osc.connect(gain);
          gain.connect(this.ctx.destination);

          osc.start(now);
          osc.stop(now + 2.0);
        });
      }
      // 3. VINTAGE MAC QUADRA (1993 C Major Triad)
      else if (theme === 'vintage-mac') {
        const chord = [130.81, 196.00, 261.63, 329.63, 392.00, 523.25];
        chord.forEach((freq, i) => {
          if (!this.ctx) return;
          const osc = this.ctx.createOscillator();
          const gain = this.ctx.createGain();

          osc.type = i < 2 ? 'sawtooth' : 'triangle';
          osc.frequency.setValueAtTime(freq, now);

          gain.gain.setValueAtTime(0.001, now);
          gain.gain.linearRampToValueAtTime((0.12 / chord.length) * this.volume * 2.2, now + 0.08);
          gain.gain.exponentialRampToValueAtTime(0.0001, now + 2.4);

          osc.connect(gain);
          gain.connect(this.ctx.destination);

          osc.start(now);
          osc.stop(now + 2.5);
        });
      }
      // 4. POWERMAC BELL (Resonant acoustic bell harmonics)
      else if (theme === 'powermac-bell') {
        const bellPartials = [
          { f: 523.25, decay: 2.6, vol: 0.15 },
          { f: 1046.50, decay: 2.2, vol: 0.10 },
          { f: 1567.98, decay: 1.8, vol: 0.07 },
          { f: 2093.00, decay: 1.4, vol: 0.05 },
          { f: 3135.96, decay: 0.9, vol: 0.03 }
        ];
        bellPartials.forEach((p) => {
          if (!this.ctx) return;
          const osc = this.ctx.createOscillator();
          const gain = this.ctx.createGain();

          osc.type = 'sine';
          osc.frequency.setValueAtTime(p.f, now);

          gain.gain.setValueAtTime(0.001, now);
          gain.gain.linearRampToValueAtTime(p.vol * this.volume, now + 0.015);
          gain.gain.exponentialRampToValueAtTime(0.0001, now + p.decay);

          osc.connect(gain);
          gain.connect(this.ctx.destination);

          osc.start(now);
          osc.stop(now + p.decay + 0.1);
        });
      }
      // 5. WINDOWS 7 STARTUP CHIME (Iconic 4-note ascending bell sequence)
      else if (theme === 'windows-7') {
        // Lush warm background pad chord (B2 + F#3 + D#4)
        const pads = [
          { f: 123.47, dur: 3.3, vol: 0.08, type: 'triangle' as OscillatorType }, // B2
          { f: 185.00, dur: 3.1, vol: 0.06, type: 'sine' as OscillatorType },     // F#3
          { f: 311.13, dur: 2.7, vol: 0.04, type: 'sine' as OscillatorType }      // D#4
        ];
        pads.forEach((p) => {
          if (!this.ctx) return;
          const osc = this.ctx.createOscillator();
          const gain = this.ctx.createGain();
          osc.type = p.type;
          osc.frequency.setValueAtTime(p.f, now);

          gain.gain.setValueAtTime(0.001, now);
          gain.gain.linearRampToValueAtTime(p.vol * this.volume, now + 0.35);
          gain.gain.exponentialRampToValueAtTime(0.0001, now + p.dur);

          osc.connect(gain);
          gain.connect(this.ctx.destination);
          osc.start(now);
          osc.stop(now + p.dur + 0.1);
        });

        // The 4 iconic crystalline ascending bell notes: B3 -> C#4 -> D#4 -> F#4
        const win7Chimes = [
          { f: 246.94, overtone: 493.88, time: 0.14, dur: 2.2, vol: 0.12 }, // B3
          { f: 277.18, overtone: 554.37, time: 0.44, dur: 2.2, vol: 0.13 }, // C#4
          { f: 311.13, overtone: 622.25, time: 0.74, dur: 2.4, vol: 0.14 }, // D#4
          { f: 369.99, overtone: 739.99, time: 1.08, dur: 2.8, vol: 0.18 }  // F#4 (resolving high bell)
        ];

        win7Chimes.forEach((n) => {
          if (!this.ctx) return;
          const startT = now + n.time;

          // Fundamental bell
          const osc = this.ctx.createOscillator();
          const gain = this.ctx.createGain();
          osc.type = 'sine';
          osc.frequency.setValueAtTime(n.f, startT);

          gain.gain.setValueAtTime(0.001, startT);
          gain.gain.linearRampToValueAtTime(n.vol * this.volume, startT + 0.025);
          gain.gain.exponentialRampToValueAtTime(0.0001, startT + n.dur);

          osc.connect(gain);
          gain.connect(this.ctx.destination);
          osc.start(startT);
          osc.stop(startT + n.dur + 0.1);

          // Bell shimmer overtone (1 octave up)
          const osc2 = this.ctx.createOscillator();
          const gain2 = this.ctx.createGain();
          osc2.type = 'triangle';
          osc2.frequency.setValueAtTime(n.overtone, startT);

          gain2.gain.setValueAtTime(0.001, startT);
          gain2.gain.linearRampToValueAtTime((n.vol * 0.4) * this.volume, startT + 0.02);
          gain2.gain.exponentialRampToValueAtTime(0.0001, startT + n.dur * 0.7);

          osc2.connect(gain2);
          gain2.connect(this.ctx.destination);
          osc2.start(startT);
          osc2.stop(startT + n.dur + 0.1);
        });
      }
      // 6. WINDOWS AMBIENT NOSTALGIE (Brian Eno ambient wash)
      else if (theme === 'windows-ambient') {
        const ambientNotes = [
          { f: 155.56, time: 0.0, dur: 2.5 },  // Eb3
          { f: 233.08, time: 0.15, dur: 2.4 }, // Bb3
          { f: 349.23, time: 0.35, dur: 2.2 }, // F4
          { f: 392.00, time: 0.55, dur: 2.0 }, // G4
          { f: 622.25, time: 0.75, dur: 1.8 }  // Eb5
        ];
        ambientNotes.forEach((n) => {
          if (!this.ctx) return;
          const osc = this.ctx.createOscillator();
          const gain = this.ctx.createGain();

          osc.type = 'sine';
          osc.frequency.setValueAtTime(n.f, now + n.time);

          const startT = now + n.time;
          gain.gain.setValueAtTime(0.001, startT);
          gain.gain.linearRampToValueAtTime(0.07 * this.volume, startT + 0.15);
          gain.gain.exponentialRampToValueAtTime(0.0001, startT + n.dur);

          osc.connect(gain);
          gain.connect(this.ctx.destination);

          osc.start(startT);
          osc.stop(startT + n.dur + 0.1);
        });
      }
      // 6. NOVA FUTURISTE (Crystal arpeggio)
      else if (theme === 'nova-synth') {
        [392.00, 523.25, 659.25, 783.99, 1046.50].forEach((freq, idx) => {
          if (!this.ctx) return;
          const osc = this.ctx.createOscillator();
          const gain = this.ctx.createGain();

          osc.type = 'sine';
          osc.frequency.setValueAtTime(freq, now + idx * 0.06);

          gain.gain.setValueAtTime(0.001, now + idx * 0.06);
          gain.gain.linearRampToValueAtTime(0.11 * this.volume, now + idx * 0.06 + 0.02);
          gain.gain.exponentialRampToValueAtTime(0.0001, now + idx * 0.06 + 1.4);

          osc.connect(gain);
          gain.connect(this.ctx.destination);

          osc.start(now + idx * 0.06);
          osc.stop(now + idx * 0.06 + 1.5);
        });
      }
      // 7. CYBERPUNK SUB-WARP (45Hz Sub-Bass + Spectral Sweep)
      else if (theme === 'cyberpunk-warp') {
        // Sub bass oscillator
        const subOsc = this.ctx.createOscillator();
        const subGain = this.ctx.createGain();
        subOsc.type = 'sine';
        subOsc.frequency.setValueAtTime(90, now);
        subOsc.frequency.exponentialRampToValueAtTime(45, now + 0.8);
        subOsc.frequency.setValueAtTime(45, now + 1.6);

        subGain.gain.setValueAtTime(0.001, now);
        subGain.gain.linearRampToValueAtTime(0.22 * this.volume, now + 0.05);
        subGain.gain.exponentialRampToValueAtTime(0.0001, now + 2.0);

        subOsc.connect(subGain);
        subGain.connect(this.ctx.destination);
        subOsc.start(now);
        subOsc.stop(now + 2.1);

        // Shimmer overtone
        const shimOsc = this.ctx.createOscillator();
        const shimGain = this.ctx.createGain();
        shimOsc.type = 'sawtooth';
        shimOsc.frequency.setValueAtTime(440, now);
        shimOsc.frequency.exponentialRampToValueAtTime(880, now + 0.6);

        shimGain.gain.setValueAtTime(0.001, now);
        shimGain.gain.linearRampToValueAtTime(0.05 * this.volume, now + 0.1);
        shimGain.gain.exponentialRampToValueAtTime(0.0001, now + 1.4);

        shimOsc.connect(shimGain);
        shimGain.connect(this.ctx.destination);
        shimOsc.start(now);
        shimOsc.stop(now + 1.5);
      }
      // 8. ARCADE 8-BIT (Chiptune fast arpeggio)
      else if (theme === 'arcade-8bit') {
        const arpeggio = [523.25, 659.25, 783.99, 1046.50, 1318.51, 1567.98];
        arpeggio.forEach((f, idx) => {
          if (!this.ctx) return;
          const osc = this.ctx.createOscillator();
          const gain = this.ctx.createGain();

          osc.type = 'square';
          osc.frequency.setValueAtTime(f, now + idx * 0.07);

          const startT = now + idx * 0.07;
          gain.gain.setValueAtTime(0.001, startT);
          gain.gain.linearRampToValueAtTime(0.08 * this.volume, startT + 0.01);
          gain.gain.setValueAtTime(0.08 * this.volume, startT + 0.06);
          gain.gain.linearRampToValueAtTime(0.001, startT + 0.12);

          osc.connect(gain);
          gain.connect(this.ctx.destination);

          osc.start(startT);
          osc.stop(startT + 0.13);
        });
      }
      // 9. POST BEEP (Authentic 1000Hz BIOS Beep)
      else if (theme === 'post-beep') {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = 'square';
        osc.frequency.setValueAtTime(1000, now);

        gain.gain.setValueAtTime(0.001, now);
        gain.gain.linearRampToValueAtTime(0.12 * this.volume, now + 0.005);
        gain.gain.setValueAtTime(0.12 * this.volume, now + 0.14);
        gain.gain.linearRampToValueAtTime(0.001, now + 0.15);

        osc.connect(gain);
        gain.connect(this.ctx.destination);

        osc.start(now);
        osc.stop(now + 0.16);
      }
    } catch {
      // Audio suppressed
    }
  }
}

export const soundEngine = new SystemAudioEngine();
