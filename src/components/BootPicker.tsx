import React, { useState, useEffect } from 'react';
import { 
  Play, 
  Terminal, 
  Shield, 
  RotateCcw, 
  Check, 
  Settings2, 
  HardDrive, 
  Download, 
  Sliders, 
  ChevronRight,
  Sparkles,
  Command,
  FileCode,
  Copy
} from 'lucide-react';
import { BootEntry, EFIConfig } from '../types/efi';
import { soundEngine } from '../utils/audio';

interface BootPickerProps {
  entries: BootEntry[];
  config: EFIConfig;
  onSetDefaultEntry: (entryId: string) => void;
  onUpdateEntryArgs: (entryId: string, args: string) => void;
  onOpenPartitionTab: () => void;
  onDownloadEfi: () => void;
  measuredHz?: number;
}

export const BootPicker: React.FC<BootPickerProps> = ({
  entries,
  config,
  onSetDefaultEntry,
  onUpdateEntryArgs,
  onOpenPartitionTab,
  onDownloadEfi,
  measuredHz
}) => {
  const [selectedEntryId, setSelectedEntryId] = useState<string>(
    config.defaultEntryId || (entries[0]?.id ?? 'macos-sequoia')
  );
  const [customArgsInput, setCustomArgsInput] = useState<string>('');
  const [showArgsEditor, setShowArgsEditor] = useState<boolean>(false);
  const [bootActionFeedback, setBootActionFeedback] = useState<string | null>(null);
  const [copiedCmd, setCopiedCmd] = useState(false);

  const selectedEntry = entries.find((e) => e.id === selectedEntryId) || entries[0];

  useEffect(() => {
    if (selectedEntry) {
      setCustomArgsInput(selectedEntry.customArgs || config.nvramVars['boot-args'] || '');
    }
  }, [selectedEntry, config.nvramVars]);

  // Keyboard navigation like real Apple Startup Manager / OpenCanopy
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger if user is typing in an input
      if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement)?.tagName)) {
        return;
      }

      if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
        e.preventDefault();
        const currentIndex = entries.findIndex((entry) => entry.id === selectedEntryId);
        const nextIndex = (currentIndex + 1) % entries.length;
        setSelectedEntryId(entries[nextIndex].id);
        soundEngine.playNotification();
      } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
        e.preventDefault();
        const currentIndex = entries.findIndex((entry) => entry.id === selectedEntryId);
        const prevIndex = (currentIndex - 1 + entries.length) % entries.length;
        setSelectedEntryId(entries[prevIndex].id);
        soundEngine.playNotification();
      } else if (e.key === 'Enter') {
        e.preventDefault();
        handleExecuteBoot(selectedEntryId);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [entries, selectedEntryId]);

  const handleExecuteBoot = (entryId: string) => {
    const target = entries.find((e) => e.id === entryId) || entries[0];
    soundEngine.playBootChime();
    setBootActionFeedback(
      `Cible validée : ${target.title} (${target.volumeName}). Entrée NVRAM prioritaire mise à jour.`
    );
    setTimeout(() => {
      setBootActionFeedback(null);
    }, 4000);
  };

  const handleSaveArgs = () => {
    if (selectedEntry) {
      onUpdateEntryArgs(selectedEntry.id, customArgsInput);
      setShowArgsEditor(false);
      soundEngine.playNotification();
    }
  };

  const copyEfiCommand = (cmd: string) => {
    navigator.clipboard.writeText(cmd);
    setCopiedCmd(true);
    soundEngine.playNotification();
    setTimeout(() => setCopiedCmd(false), 2000);
  };

  return (
    <div className="relative min-h-[calc(100vh-60px)] flex flex-col justify-between p-6 sm:p-10 select-none bg-[#0B0D14]">
      {/* Top Header bar with EFI status */}
      <div className="flex flex-wrap items-center justify-between gap-4 text-xs">
        <div className="flex items-center gap-3">
          <div className="px-3 py-1.5 rounded-xl bg-white/[0.04] border border-white/10 flex items-center gap-2 text-slate-300 font-mono">
            <span className="w-2 h-2 rounded-full bg-emerald-400" />
            <span>Mode GOP: {config.resolution}</span>
            <span className="text-slate-600">·</span>
            <span className="text-emerald-300">{measuredHz || 100} Hz actif</span>
          </div>

          <div className="px-3 py-1.5 rounded-xl bg-white/[0.04] border border-white/10 flex items-center gap-2 text-slate-300">
            <Shield className="w-3.5 h-3.5 text-amber-400" />
            <span>SIP: <strong className="text-white">{config.sipEnabled ? '0x0 (Activé)' : 'Désactivé'}</strong></span>
            <span className="text-slate-600">·</span>
            <span className="text-slate-400 font-mono">Target: {config.secureBootModel}</span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={onDownloadEfi}
            className="px-3.5 py-1.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-black font-semibold text-xs transition-colors flex items-center gap-1.5 shadow-[0_0_12px_rgba(251,191,36,0.3)]"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Télécharger l'EFI (.zip)</span>
          </button>
        </div>
      </div>

      {/* Main Center Area: OpenCanopy / Apple Startup Manager layout */}
      <div className="my-auto py-8">
        <div className="text-center mb-10">
          <h1 className="text-2xl font-bold tracking-tight text-white">
            Sélecteur d'Amorçage OpenCore
          </h1>
          <p className="text-xs text-slate-400 mt-1 max-w-md mx-auto">
            Sélectionnez votre système d'exploitation avec les flèches du clavier ou la souris.
          </p>
        </div>

        {/* Disk Carousel */}
        <div className="flex items-center justify-center gap-6 sm:gap-8 flex-wrap max-w-5xl mx-auto px-4">
          {entries.map((entry) => {
            const isSelected = entry.id === selectedEntryId;
            const isDefault = entry.isDefault;

            return (
              <div
                key={entry.id}
                onClick={() => {
                  setSelectedEntryId(entry.id);
                  soundEngine.playNotification();
                }}
                onDoubleClick={() => handleExecuteBoot(entry.id)}
                className={`group cursor-pointer w-44 sm:w-48 p-5 rounded-2xl transition-all duration-200 flex flex-col items-center text-center ${
                  isSelected
                    ? 'bg-[#181D2D] border-2 border-amber-400/80 shadow-[0_12px_30px_rgba(0,0,0,0.5)] scale-105'
                    : 'bg-[#101420] border border-white/10 hover:border-white/20 hover:bg-[#141928] opacity-75 hover:opacity-100'
                }`}
              >
                {/* Default badge */}
                {isDefault && (
                  <div className="mb-1 flex items-center gap-1 text-[10px] font-semibold text-amber-300 bg-amber-500/20 px-2 py-0.5 rounded-full border border-amber-500/30">
                    <Check className="w-2.5 h-2.5" />
                    <span>Défaut NVRAM</span>
                  </div>
                )}

                {/* OS Big Clean Hardware Disk Icon */}
                <div className="my-3">
                  {entry.osType === 'macos' ? (
                    <div className="w-16 h-16 rounded-2xl bg-gradient-to-b from-white/10 to-white/5 border border-white/20 flex items-center justify-center shadow-lg group-hover:scale-105 transition-transform">
                      <svg className="w-8 h-8 text-white drop-shadow-[0_2px_10px_rgba(255,255,255,0.4)]" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M12.152 6.896c-.948 0-2.415-1.078-3.96-1.04-2.04.027-3.91 1.183-4.961 3.014-2.117 3.675-.546 9.103 1.519 12.09 1.013 1.454 2.208 3.09 3.792 3.039 1.52-.065 2.09-.987 3.935-.987 1.831 0 2.35.987 3.96.948 1.637-.026 2.676-1.48 3.676-2.948 1.156-1.688 1.636-3.325 1.662-3.415-.039-.013-3.182-1.221-3.22-4.857-.026-3.04 2.48-4.494 2.597-4.559-1.429-2.09-3.623-2.324-4.39-2.376-2-.156-3.675 1.09-4.61 1.09zM15.53 3.83c.843-1.012 1.4-2.427 1.245-3.83-1.207.052-2.662.805-3.532 1.818-.78.896-1.454 2.338-1.273 3.714 1.338.104 2.715-.688 3.559-1.701" />
                      </svg>
                    </div>
                  ) : entry.osType === 'windows' ? (
                    <div className="w-16 h-16 rounded-2xl bg-gradient-to-b from-[#0078D4]/20 to-[#0078D4]/5 border border-[#0078D4]/30 flex items-center justify-center shadow-lg group-hover:scale-105 transition-transform">
                      <svg className="w-8 h-8 drop-shadow-[0_2px_10px_rgba(0,120,212,0.45)]" viewBox="0 0 24 24" fill="none">
                        <rect x="1.5" y="1.5" width="9.8" height="9.8" rx="0.5" fill="#0078D4" />
                        <rect x="12.7" y="1.5" width="9.8" height="9.8" rx="0.5" fill="#0078D4" />
                        <rect x="1.5" y="12.7" width="9.8" height="9.8" rx="0.5" fill="#0078D4" />
                        <rect x="12.7" y="12.7" width="9.8" height="9.8" rx="0.5" fill="#0078D4" />
                      </svg>
                    </div>
                  ) : entry.osType === 'linux' ? (
                    <div className="w-16 h-16 rounded-2xl bg-[#0D101A] border border-white/15 flex items-center justify-center shadow-md text-cyan-400">
                      <Terminal className="w-7 h-7" />
                    </div>
                  ) : entry.osType === 'recovery' ? (
                    <div className="w-16 h-16 rounded-2xl bg-[#0D101A] border border-white/15 flex items-center justify-center shadow-md text-amber-400">
                      <RotateCcw className="w-7 h-7" />
                    </div>
                  ) : entry.osType === 'diagnostics' ? (
                    <div className="w-16 h-16 rounded-2xl bg-[#0D101A] border border-white/15 flex items-center justify-center shadow-md text-amber-300">
                      <Sparkles className="w-7 h-7" />
                    </div>
                  ) : (
                    <div className="w-16 h-16 rounded-2xl bg-[#0D101A] border border-white/15 flex items-center justify-center shadow-md text-indigo-400">
                      <Command className="w-7 h-7" />
                    </div>
                  )}
                </div>

                <h3 className="font-semibold text-xs text-white tracking-tight line-clamp-1">
                  {entry.title}
                </h3>
                <p className="text-[11px] text-slate-400 font-mono mt-0.5 line-clamp-1">
                  {entry.volumeName}
                </p>

                {isSelected && (
                  <div className="mt-2 text-amber-400 text-xs font-bold">
                    ↑
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Selected Volume Detail Card & Actions */}
        {selectedEntry && (
          <div className="max-w-2xl mx-auto mt-8 p-5 rounded-2xl bg-[#101422] border border-white/15 shadow-xl">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-white/10">
              <div>
                <div className="flex items-center gap-2">
                  <h4 className="text-base font-bold text-white">{selectedEntry.title}</h4>
                  <span className="text-xs text-slate-400 font-mono">({selectedEntry.version})</span>
                </div>
                <div className="flex items-center gap-2 text-xs text-slate-400 mt-1 font-mono">
                  <HardDrive className="w-3.5 h-3.5 text-amber-400" />
                  <span>{selectedEntry.volumeName}</span>
                  <span>·</span>
                  <span>{selectedEntry.partitionId}</span>
                  <span>·</span>
                  <span>{selectedEntry.fsType}</span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={() => handleExecuteBoot(selectedEntry.id)}
                  className="px-4 py-2 text-xs font-semibold text-black bg-amber-400 hover:bg-amber-300 rounded-xl transition-colors flex items-center gap-1.5 shadow-md"
                >
                  <Play className="w-3.5 h-3.5 fill-current" />
                  <span>Sélectionner ce volume</span>
                </button>

                {!selectedEntry.isDefault && (
                  <button
                    onClick={() => onSetDefaultEntry(selectedEntry.id)}
                    className="px-3 py-2 text-xs font-medium text-slate-300 hover:text-white bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl transition-colors"
                  >
                    Mettre par défaut
                  </button>
                )}

                <button
                  onClick={() => setShowArgsEditor(!showArgsEditor)}
                  className="p-2 text-slate-400 hover:text-white bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl transition-colors"
                  title="Modifier boot-args"
                >
                  <Settings2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Direct Feedback banner */}
            {bootActionFeedback && (
              <div className="mt-3 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs font-mono animate-in fade-in">
                {bootActionFeedback}
              </div>
            )}

            {/* Path info and boot args editor */}
            {showArgsEditor ? (
              <div className="pt-4 space-y-3">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-300 font-medium">Arguments de démarrage (boot-args NVRAM)</span>
                  <span className="text-[11px] text-slate-500 font-mono">Persisté dans config.plist</span>
                </div>
                <input
                  type="text"
                  value={customArgsInput}
                  onChange={(e) => setCustomArgsInput(e.target.value)}
                  placeholder="-v keepsyms=1 alcid=11 agdpmod=pikera"
                  className="w-full px-3 py-2 text-xs font-mono bg-black/60 border border-white/15 rounded-xl text-amber-200 focus:outline-none focus:border-amber-400"
                />
                <div className="flex items-center justify-end gap-2">
                  <button
                    onClick={() => setShowArgsEditor(false)}
                    className="px-3 py-1.5 text-xs text-slate-400 hover:text-white rounded-lg transition-colors"
                  >
                    Annuler
                  </button>
                  <button
                    onClick={handleSaveArgs}
                    className="px-3 py-1.5 text-xs font-medium text-black bg-amber-400 hover:bg-amber-300 rounded-lg transition-colors"
                  >
                    Enregistrer sur l'EFI
                  </button>
                </div>
              </div>
            ) : (
              <div className="pt-3 flex flex-wrap items-center justify-between gap-2 text-[11px] font-mono text-slate-400">
                <div className="flex items-center gap-2">
                  <span>Chemin EFI:</span>
                  <span className="text-slate-200">{selectedEntry.path}</span>
                  <button
                    onClick={() => copyEfiCommand(`bcfg boot add 0 ${selectedEntry.path} "${selectedEntry.title}"`)}
                    className="text-slate-500 hover:text-white"
                    title="Copier la commande EFI"
                  >
                    {copiedCmd ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                  </button>
                </div>
                <div>
                  Args: <span className="text-amber-300">{selectedEntry.customArgs || 'Défaut NVRAM'}</span>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Footer Navigation Hints */}
      <div className="flex flex-wrap items-center justify-between gap-4 pt-4 border-t border-white/10 text-xs text-slate-400">
        <div className="flex items-center gap-4">
          <span className="flex items-center gap-1.5">
            <kbd className="px-1.5 py-0.5 rounded bg-white/10 border border-white/20 font-mono text-[10px]">←</kbd>
            <kbd className="px-1.5 py-0.5 rounded bg-white/10 border border-white/20 font-mono text-[10px]">→</kbd>
            <span>Choisir</span>
          </span>
          <span className="flex items-center gap-1.5">
            <kbd className="px-1.5 py-0.5 rounded bg-white/10 border border-white/20 font-mono text-[10px]">Entrée</kbd>
            <span>Sélectionner</span>
          </span>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={onDownloadEfi}
            className="text-amber-300 hover:text-amber-200 font-medium transition-colors flex items-center gap-1.5"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Télécharger l'arborescence complète OpenCore (.zip)</span>
          </button>
          <span className="text-slate-600">·</span>
          <button
            onClick={onOpenPartitionTab}
            className="hover:text-white transition-colors"
          >
            Éditer config.plist
          </button>
        </div>
      </div>
    </div>
  );
};
