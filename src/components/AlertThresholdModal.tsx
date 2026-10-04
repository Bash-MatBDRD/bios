import React, { useState } from 'react';
import { 
  X, 
  Flame, 
  Volume2, 
  VolumeX, 
  Clock, 
  Save, 
  Send, 
  ShieldAlert, 
  Check, 
  HardDrive
} from 'lucide-react';
import { ThermalAlertConfig } from '../types/efi';
import { soundEngine } from '../utils/audio';

interface AlertThresholdModalProps {
  isOpen: boolean;
  onClose: () => void;
  config: ThermalAlertConfig;
  onSaveConfig: (newConfig: ThermalAlertConfig) => void;
  onTriggerTestNotification: () => void;
}

export const AlertThresholdModal: React.FC<AlertThresholdModalProps> = ({
  isOpen,
  onClose,
  config,
  onSaveConfig,
  onTriggerTestNotification,
}) => {
  const [formData, setFormData] = useState<ThermalAlertConfig>({ ...config });
  const [isSaved, setIsSaved] = useState(false);

  if (!isOpen) return null;

  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  const handleSave = () => {
    onSaveConfig(formData);
    setIsSaved(true);
    soundEngine.playNotification();
    setTimeout(() => {
      setIsSaved(false);
      onClose();
    }, 800);
  };

  return (
    <div 
      onClick={handleBackdropClick}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-150 cursor-pointer"
    >
      <div 
        onClick={(e) => e.stopPropagation()}
        className="max-w-xl w-full p-6 sm:p-8 rounded-3xl bg-[#131722] border border-white/15 shadow-2xl space-y-6 max-h-[90vh] overflow-y-auto cursor-default"
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-white/10">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white tracking-tight">
                Seuils d'Alertes Matérielles & Notifications Push
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Personnalisez les déclencheurs de chauffe et le comportement du slide macOS.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form Body */}
        <div className="space-y-5 text-xs">
          {/* CPU Thresholds */}
          <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/10 space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-white flex items-center gap-2">
                <Flame className="w-4 h-4 text-amber-400" />
                <span>Seuils Thermiques Processeur (CPU)</span>
              </span>
              <span className="font-mono text-slate-400 text-[11px]">TjMax: 100°C</span>
            </div>

            <div className="space-y-3 pt-1">
              <div>
                <div className="flex justify-between mb-1">
                  <span className="text-slate-400">Alerte d'avertissement CPU :</span>
                  <span className="font-mono font-bold text-amber-300">{formData.cpuWarningC}°C</span>
                </div>
                <input
                  type="range"
                  min={65}
                  max={90}
                  value={formData.cpuWarningC}
                  onChange={(e) => setFormData({ ...formData, cpuWarningC: Number(e.target.value) })}
                  className="w-full accent-amber-400 cursor-pointer"
                />
              </div>

              <div>
                <div className="flex justify-between mb-1">
                  <span className="text-slate-400">Alerte critique CPU (Throttling imminent) :</span>
                  <span className="font-mono font-bold text-red-400">{formData.cpuCriticalC}°C</span>
                </div>
                <input
                  type="range"
                  min={82}
                  max={98}
                  value={formData.cpuCriticalC}
                  onChange={(e) => setFormData({ ...formData, cpuCriticalC: Number(e.target.value) })}
                  className="w-full accent-red-400 cursor-pointer"
                />
              </div>
            </div>
          </div>

          {/* GPU Thresholds */}
          <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/10 space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-white flex items-center gap-2">
                <Flame className="w-4 h-4 text-cyan-400" />
                <span>Seuils Thermiques Carte Graphique (GPU)</span>
              </span>
              <span className="font-mono text-slate-400 text-[11px]">TjMax: 92°C</span>
            </div>

            <div className="space-y-3 pt-1">
              <div>
                <div className="flex justify-between mb-1">
                  <span className="text-slate-400">Avertissement GPU :</span>
                  <span className="font-mono font-bold text-cyan-300">{formData.gpuWarningC}°C</span>
                </div>
                <input
                  type="range"
                  min={60}
                  max={82}
                  value={formData.gpuWarningC}
                  onChange={(e) => setFormData({ ...formData, gpuWarningC: Number(e.target.value) })}
                  className="w-full accent-cyan-400 cursor-pointer"
                />
              </div>

              <div>
                <div className="flex justify-between mb-1">
                  <span className="text-slate-400">Alerte critique GPU :</span>
                  <span className="font-mono font-bold text-red-400">{formData.gpuCriticalC}°C</span>
                </div>
                <input
                  type="range"
                  min={75}
                  max={92}
                  value={formData.gpuCriticalC}
                  onChange={(e) => setFormData({ ...formData, gpuCriticalC: Number(e.target.value) })}
                  className="w-full accent-red-400 cursor-pointer"
                />
              </div>
            </div>
          </div>

          {/* Storage & Fan Failures */}
          <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/10 space-y-3">
            <span className="font-semibold text-white flex items-center gap-2">
              <HardDrive className="w-4 h-4 text-emerald-400" />
              <span>Disques & Sécurité Mécanique</span>
            </span>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              <div>
                <div className="flex justify-between mb-1 text-[11px]">
                  <span className="text-slate-400">Surchauffe SSD NVMe :</span>
                  <span className="font-mono font-bold text-white">{formData.diskWarningC}°C</span>
                </div>
                <input
                  type="range"
                  min={45}
                  max={70}
                  value={formData.diskWarningC}
                  onChange={(e) => setFormData({ ...formData, diskWarningC: Number(e.target.value) })}
                  className="w-full accent-emerald-400 cursor-pointer"
                />
              </div>

              <div>
                <div className="flex justify-between mb-1 text-[11px]">
                  <span className="text-slate-400">RPM min. de ventilation :</span>
                  <span className="font-mono font-bold text-white">{formData.fanMinRpm} RPM</span>
                </div>
                <input
                  type="range"
                  min={800}
                  max={2000}
                  step={100}
                  value={formData.fanMinRpm}
                  onChange={(e) => setFormData({ ...formData, fanMinRpm: Number(e.target.value) })}
                  className="w-full accent-blue-400 cursor-pointer"
                />
              </div>
            </div>
          </div>

          {/* Push & Audio Behavior */}
          <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/10 flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setFormData({ ...formData, soundEnabled: !formData.soundEnabled })}
                className={`p-2 rounded-xl border transition-colors ${
                  formData.soundEnabled
                    ? 'bg-amber-500/20 text-amber-300 border-amber-500/30'
                    : 'bg-white/5 text-slate-500 border-white/10'
                }`}
              >
                {formData.soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
              </button>
              <div>
                <div className="font-semibold text-white">Carillon sonore macOS</div>
                <div className="text-[11px] text-slate-400">Synthétiseur audio Web Audio API pour les alertes</div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Clock className="w-3.5 h-3.5 text-slate-400" />
              <select
                value={formData.autoDismissSec}
                onChange={(e) => setFormData({ ...formData, autoDismissSec: Number(e.target.value) })}
                className="bg-black/60 border border-white/10 rounded-lg px-2.5 py-1 text-slate-300 text-xs focus:outline-none"
              >
                <option value={5}>Disparition après 5s</option>
                <option value={8}>Disparition après 8s (Recommandé)</option>
                <option value={15}>Disparition après 15s</option>
                <option value={0}>Persistant (Jusqu'au clic)</option>
              </select>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-3 border-t border-white/10">
          <button
            type="button"
            onClick={onTriggerTestNotification}
            className="px-3.5 py-2 text-xs font-medium text-slate-200 hover:text-white bg-white/10 hover:bg-white/15 border border-white/15 rounded-xl transition-colors flex items-center justify-center gap-1.5"
          >
            <Send className="w-3.5 h-3.5" />
            <span>Tester la notification push en direct</span>
          </button>

          <div className="flex items-center justify-end gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 text-xs text-slate-400 hover:text-white rounded-xl transition-colors"
            >
              Annuler
            </button>
            <button
              onClick={handleSave}
              className="px-4 py-2 text-xs font-semibold text-black bg-amber-400 hover:bg-amber-300 rounded-xl transition-all shadow-[0_0_15px_rgba(251,191,36,0.4)] flex items-center gap-1.5"
            >
              {isSaved ? <Check className="w-3.5 h-3.5" /> : <Save className="w-3.5 h-3.5" />}
              <span>{isSaved ? 'Enregistré !' : 'Enregistrer sur l\'EFI'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
