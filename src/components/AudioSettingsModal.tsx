import React, { useState } from 'react';
import { 
  Volume2, 
  VolumeX, 
  Play, 
  Check, 
  X, 
  Sparkles,
  Music,
  Radio,
  Clock
} from 'lucide-react';
import { soundEngine, SOUND_THEMES, SoundTheme } from '../utils/audio';

interface AudioSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onThemeChanged?: (theme: SoundTheme) => void;
}

export const AudioSettingsModal: React.FC<AudioSettingsModalProps> = ({
  isOpen,
  onClose,
  onThemeChanged,
}) => {
  const [selectedTheme, setSelectedTheme] = useState<SoundTheme>(soundEngine.getTheme());
  const [volume, setVolume] = useState<number>(soundEngine.getVolume());
  const [playingTheme, setPlayingTheme] = useState<SoundTheme | null>(null);
  const [filterCategory, setFilterCategory] = useState<string>('all');

  if (!isOpen) return null;

  const handleSelectTheme = (theme: SoundTheme) => {
    setSelectedTheme(theme);
    soundEngine.setTheme(theme);
    if (onThemeChanged) onThemeChanged(theme);
    handlePlayPreview(theme);
  };

  const handlePlayPreview = (theme: SoundTheme) => {
    setPlayingTheme(theme);
    soundEngine.playBootChime(theme);
    setTimeout(() => {
      setPlayingTheme(null);
    }, 2200);
  };

  const handleVolumeChange = (newVol: number) => {
    setVolume(newVol);
    soundEngine.setVolume(newVol);
  };

  const filteredThemes = filterCategory === 'all'
    ? SOUND_THEMES
    : SOUND_THEMES.filter(t => t.category === filterCategory);

  const categories = [
    { id: 'all', label: `Tous (${SOUND_THEMES.length})` },
    { id: 'apple', label: 'Apple' },
    { id: 'pc', label: 'PC / Windows' },
    { id: 'synth', label: 'Spatial / Synth' },
    { id: 'retro', label: 'Rétro & BIOS' },
    { id: 'minimal', label: 'Silencieux' }
  ];

  return (
    <div 
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-150 cursor-pointer"
    >
      <div 
        onClick={(e) => e.stopPropagation()}
        className="max-w-lg w-full p-6 rounded-3xl bg-[#111523] border border-white/15 shadow-2xl space-y-4 cursor-default text-xs max-h-[90vh] flex flex-col"
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-white/10 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 rounded-2xl bg-amber-500/15 border border-amber-500/30 text-amber-400">
              <Music className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white flex items-center gap-1.5">
                <span>Carillons & Thèmes Sonores</span>
                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 font-semibold">
                  {SOUND_THEMES.length} Sons
                </span>
              </h3>
              <p className="text-[11px] text-slate-400">Synthèse sonore Web Audio multi-oscillateurs en temps réel</p>
            </div>
          </div>

          <button 
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Volume Slider */}
        <div className="p-3.5 rounded-2xl bg-white/[0.03] border border-white/5 space-y-2 shrink-0">
          <div className="flex items-center justify-between text-slate-300 font-medium">
            <span className="flex items-center gap-1.5">
              {volume > 0 ? <Volume2 className="w-3.5 h-3.5 text-amber-400" /> : <VolumeX className="w-3.5 h-3.5 text-slate-500" />}
              <span>Volume des carillons & alertes</span>
            </span>
            <span className="font-mono text-amber-300 font-bold">{Math.round(volume * 100)}%</span>
          </div>
          <input
            type="range"
            min="0"
            max="1"
            step="0.05"
            value={volume}
            onChange={(e) => handleVolumeChange(parseFloat(e.target.value))}
            className="w-full h-1.5 bg-neutral-800 rounded-lg appearance-none cursor-pointer accent-amber-400"
          />
        </div>

        {/* Category Filters */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 shrink-0 scrollbar-none">
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setFilterCategory(cat.id)}
              className={`px-2.5 py-1 rounded-xl text-[11px] font-medium whitespace-nowrap transition-colors ${
                filterCategory === cat.id
                  ? 'bg-amber-400 text-black font-semibold shadow-sm'
                  : 'bg-white/[0.04] hover:bg-white/[0.08] text-slate-400 hover:text-slate-200 border border-white/5'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>

        {/* Sound Themes List - Scrollable */}
        <div className="flex-1 overflow-y-auto space-y-1.5 pr-1 scrollbar-thin scrollbar-thumb-white/10">
          {filteredThemes.map((theme) => {
            const isSelected = selectedTheme === theme.id;
            const isPlaying = playingTheme === theme.id;

            return (
              <div
                key={theme.id}
                onClick={() => handleSelectTheme(theme.id)}
                className={`p-3 rounded-2xl border transition-all cursor-pointer flex items-center justify-between group ${
                  isSelected
                    ? 'bg-amber-500/15 border-amber-500/40 text-white shadow-md'
                    : 'bg-white/[0.02] hover:bg-white/[0.05] border-white/5 text-slate-300'
                }`}
              >
                <div className="space-y-1 pr-2 min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold text-xs text-white">{theme.name}</span>
                    <span className="text-[10px] text-slate-400 bg-white/[0.06] px-1.5 py-0.2 rounded border border-white/5">
                      {theme.categoryLabel}
                    </span>
                    {isSelected && (
                      <span className="text-[9px] text-amber-300 font-mono bg-amber-500/25 px-1.5 py-0.2 rounded font-bold">
                        Actif
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-slate-400 leading-snug line-clamp-1">{theme.description}</p>
                  <div className="flex items-center gap-3 text-[10px] font-mono text-slate-500">
                    <span>{theme.previewNote}</span>
                    {theme.durationLabel !== '0s' && (
                      <span className="flex items-center gap-1 text-slate-600">
                        <Clock className="w-2.5 h-2.5" />
                        {theme.durationLabel}
                      </span>
                    )}
                  </div>
                </div>

                {/* Right Action buttons */}
                <div className="flex items-center gap-2 shrink-0">
                  {theme.id !== 'silent' && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handlePlayPreview(theme.id);
                      }}
                      className={`p-2 rounded-xl border transition-all flex items-center gap-1.5 ${
                        isPlaying
                          ? 'bg-amber-400 text-black border-amber-300 scale-105 shadow-[0_0_12px_rgba(251,191,36,0.5)]'
                          : 'bg-white/[0.08] hover:bg-white/[0.15] border-white/10 text-slate-200'
                      }`}
                      title="Écouter un extrait"
                    >
                      {isPlaying ? (
                        <>
                          <Radio className="w-3.5 h-3.5 animate-pulse" />
                          <span className="text-[10px] font-bold">Joue...</span>
                        </>
                      ) : (
                        <Play className="w-3.5 h-3.5 fill-current" />
                      )}
                    </button>
                  )}
                  {isSelected && <Check className="w-4 h-4 text-amber-400 shrink-0" />}
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div className="pt-3 border-t border-white/10 flex items-center justify-between shrink-0">
          <span className="text-[11px] text-slate-500">Choix actif enregistré en NVRAM locale</span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-black font-semibold text-xs transition-colors shadow-sm"
          >
            Fermer
          </button>
        </div>
      </div>
    </div>
  );
};
