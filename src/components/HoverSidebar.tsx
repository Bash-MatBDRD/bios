import React, { useState } from 'react';
import { 
  Play, 
  Cpu, 
  Flame, 
  FolderLock, 
  Terminal, 
  Volume2, 
  Download, 
  ChevronRight,
  Sparkles,
  Layers,
  Settings
} from 'lucide-react';

interface HoverSidebarProps {
  activeTab: 'boot' | 'diagnostics' | 'thermal' | 'partition' | 'logs';
  onSelectTab: (tab: 'boot' | 'diagnostics' | 'thermal' | 'partition' | 'logs') => void;
  onOpenSoundModal: () => void;
  onDownloadEfi: () => void;
  isDownloading: boolean;
  hasActiveAlerts?: boolean;
}

export const HoverSidebar: React.FC<HoverSidebarProps> = ({
  activeTab,
  onSelectTab,
  onOpenSoundModal,
  onDownloadEfi,
  isDownloading,
  hasActiveAlerts,
}) => {
  const [isHovered, setIsHovered] = useState(false);

  const navItems = [
    {
      id: 'boot' as const,
      label: 'Sélecteur de Boot',
      desc: 'macOS Tahoe & Windows 11',
      icon: Play,
      badge: 'Dual-Boot'
    },
    {
      id: 'diagnostics' as const,
      label: 'Diagnostic Matériel',
      desc: 'Composants physiques réels',
      icon: Cpu,
    },
    {
      id: 'thermal' as const,
      label: 'Télémétrie Thermique',
      desc: 'Sondes et ventilation',
      icon: Flame,
      alert: hasActiveAlerts
    },
    {
      id: 'partition' as const,
      label: 'Partition EFI',
      desc: 'OpenCore & config.plist',
      icon: FolderLock,
    },
    {
      id: 'logs' as const,
      label: 'Journaux Système',
      desc: 'Traces ACPI & Kernel',
      icon: Terminal,
    }
  ];

  return (
    <aside
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className={`fixed left-0 top-0 bottom-0 z-50 transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] flex flex-col justify-between bg-[#080A12]/95 backdrop-blur-2xl border-r border-white/10 shadow-2xl select-none ${
        isHovered ? 'w-64' : 'w-14'
      }`}
    >
      {/* Top Branding / Logo */}
      <div className="p-3.5 border-b border-white/10 flex items-center gap-3 overflow-hidden">
        <div className="w-7 h-7 rounded-xl bg-amber-400 flex items-center justify-center shrink-0 shadow-[0_0_12px_rgba(251,191,36,0.5)]">
          <span className="w-2.5 h-2.5 rounded-full bg-black" />
        </div>
        <div className={`transition-opacity duration-200 whitespace-nowrap overflow-hidden ${isHovered ? 'opacity-100' : 'opacity-0'}`}>
          <div className="font-bold text-xs text-white tracking-tight">NOVA EFI BOOT</div>
          <div className="text-[10px] text-slate-400 font-mono">EDK II Release 1.0</div>
        </div>
      </div>

      {/* Navigation Items */}
      <nav className="flex-1 py-4 px-2 space-y-1.5 overflow-hidden">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;

          return (
            <button
              key={item.id}
              onClick={() => onSelectTab(item.id)}
              className={`w-full flex items-center gap-3 px-2.5 py-2.5 rounded-xl text-left transition-all relative ${
                isActive
                  ? 'bg-amber-500/20 text-white font-semibold border border-amber-500/30 shadow-md'
                  : 'text-slate-400 hover:text-white hover:bg-white/[0.05]'
              }`}
              title={item.label}
            >
              <div className="relative shrink-0">
                <Icon className={`w-4 h-4 ${isActive ? 'text-amber-400' : 'text-slate-400'}`} />
                {item.alert && (
                  <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                )}
              </div>

              {/* Expanded Label & Description */}
              <div className={`transition-opacity duration-200 overflow-hidden whitespace-nowrap ${isHovered ? 'opacity-100' : 'opacity-0'}`}>
                <div className="text-xs leading-tight">{item.label}</div>
                <div className="text-[10px] text-slate-500 font-normal leading-tight mt-0.5">{item.desc}</div>
              </div>

              {isActive && isHovered && (
                <ChevronRight className="w-3.5 h-3.5 text-amber-400 ml-auto shrink-0" />
              )}
            </button>
          );
        })}

        {/* Sound Customization Button */}
        <div className="pt-2 border-t border-white/10">
          <button
            onClick={onOpenSoundModal}
            className="w-full flex items-center gap-3 px-2.5 py-2.5 rounded-xl text-left text-slate-300 hover:text-white hover:bg-white/[0.06] transition-colors"
            title="Changer les sons & carillon"
          >
            <Volume2 className="w-4 h-4 text-amber-400 shrink-0" />
            <div className={`transition-opacity duration-200 overflow-hidden whitespace-nowrap ${isHovered ? 'opacity-100' : 'opacity-0'}`}>
              <div className="text-xs font-medium">Changer les Sons</div>
              <div className="text-[10px] text-slate-400">Carillon de démarrage</div>
            </div>
          </button>
        </div>
      </nav>

      {/* Bottom Download Action */}
      <div className="p-2 border-t border-white/10 overflow-hidden">
        <button
          onClick={onDownloadEfi}
          disabled={isDownloading}
          className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-xl bg-amber-400 hover:bg-amber-300 disabled:opacity-50 text-black font-semibold text-xs transition-colors shadow-[0_0_12px_rgba(251,191,36,0.3)]"
          title="Télécharger GoldenGate EFI (.zip)"
        >
          <Download className="w-4 h-4 shrink-0" />
          <span className={`transition-opacity duration-200 whitespace-nowrap overflow-hidden ${isHovered ? 'opacity-100' : 'opacity-0'}`}>
            Télécharger EFI
          </span>
        </button>
      </div>
    </aside>
  );
};
