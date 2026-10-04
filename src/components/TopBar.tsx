import React, { useState, useEffect, useRef } from 'react';
import { 
  Maximize2, 
  Minimize2, 
  Monitor, 
  Check, 
  ChevronDown
} from 'lucide-react';
import { EFIConfig } from '../types/efi';

interface TopBarProps {
  config: EFIConfig;
  onUpdateConfig: (newConfig: Partial<EFIConfig>) => void;
  measuredHz?: number;
}

export const TopBar: React.FC<TopBarProps> = ({
  config,
  onUpdateConfig,
  measuredHz
}) => {
  const [showResMenu, setShowResMenu] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const resMenuRef = useRef<HTMLDivElement>(null);

  // Close resolution dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (resMenuRef.current && !resMenuRef.current.contains(e.target as Node)) {
        setShowResMenu(false);
      }
    };
    if (showResMenu) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showResMenu]);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
      setIsFullscreen(true);
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen().catch(() => {});
        setIsFullscreen(false);
      }
    }
  };

  const resolutions: { label: string; value: EFIConfig['resolution']; desc: string }[] = [
    { label: '1920 × 1080 @ 100Hz', value: '1920x1080@100Hz', desc: 'DirectGOP Natif (100Hz vSync)' },
    { label: '1920 × 1080 @ 60Hz', value: '1920x1080@60Hz', desc: 'Compatibilité standard' },
    { label: '2560 × 1440 @ 100Hz', value: '2560x1440@100Hz', desc: 'Mise à l\'échelle HiDPI' },
  ];

  return (
    <header className="relative z-30 flex items-center justify-between pl-16 pr-5 sm:pr-8 py-2.5 border-b border-white/10 bg-[#080A12]/80 backdrop-blur-2xl">
      {/* Branding Wordmark */}
      <div className="flex items-center gap-3">
        <div className="text-sm font-bold tracking-tight text-white flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.9)]" />
          <span>NOVA EFI Boot Manager</span>
        </div>
        <span className="text-[10px] text-slate-500 font-mono hidden sm:inline">UEFI x64 DirectGOP</span>
      </div>

      {/* Right Controls: Resolution dropdown + Fullscreen */}
      <div className="flex items-center gap-2">
        {/* Resolution selector */}
        <div className="relative" ref={resMenuRef}>
          <button
            onClick={() => setShowResMenu((prev) => !prev)}
            className={`flex items-center gap-1.5 px-2.5 py-1 text-xs font-mono font-medium rounded-xl border transition-colors whitespace-nowrap ${
              showResMenu
                ? 'bg-white/20 text-white border-white/30'
                : 'text-slate-300 bg-white/[0.05] hover:bg-white/[0.1] border-white/10'
            }`}
            title="Résolution et fréquence d'affichage"
          >
            <Monitor className="w-3 h-3 text-amber-400" />
            <span className="hidden sm:inline">{config.resolution.replace('@', ' · ')}</span>
            <span className="sm:hidden">{measuredHz || 100}Hz</span>
            <ChevronDown className={`w-3 h-3 text-slate-400 transition-transform ${showResMenu ? 'rotate-180' : ''}`} />
          </button>

          {showResMenu && (
            <div className="absolute right-0 mt-2 w-64 p-2.5 rounded-2xl bg-[#0F1422] border border-white/20 shadow-2xl z-50 animate-in fade-in slide-in-from-top-2 duration-150">
              <div className="px-2 py-1 text-[10px] font-semibold text-slate-400 uppercase tracking-wider flex items-center justify-between">
                <span>Modes GOP Disponibles</span>
                <span className="text-emerald-400 font-mono">{measuredHz || 100}Hz</span>
              </div>
              <div className="space-y-1 mt-1">
                {resolutions.map((res) => (
                  <button
                    key={res.value}
                    onClick={() => {
                      onUpdateConfig({ resolution: res.value });
                      setShowResMenu(false);
                    }}
                    className={`w-full flex items-start justify-between p-2 rounded-xl text-left text-xs transition-colors ${
                      config.resolution === res.value
                        ? 'bg-amber-500/20 text-white border border-amber-500/30'
                        : 'text-slate-300 hover:bg-white/10'
                    }`}
                  >
                    <div>
                      <div className="font-mono font-semibold text-xs">{res.label}</div>
                      <div className="text-[10px] text-slate-400 mt-0.5">{res.desc}</div>
                    </div>
                    {config.resolution === res.value && (
                      <Check className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
                    )}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Fullscreen toggle */}
        <button
          onClick={toggleFullscreen}
          className="p-1.5 text-slate-400 hover:text-white bg-white/[0.05] hover:bg-white/[0.1] border border-white/10 rounded-xl transition-colors"
          title={isFullscreen ? 'Quitter le plein écran' : 'Plein écran'}
        >
          {isFullscreen ? <Minimize2 className="w-3 h-3" /> : <Maximize2 className="w-3 h-3" />}
        </button>
      </div>
    </header>
  );
};
