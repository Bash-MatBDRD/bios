import React, { useState, useMemo } from 'react';
import { 
  Flame, 
  Wind, 
  Thermometer, 
  Sliders, 
  AlertTriangle, 
  ArrowUpDown,
  Zap,
  TrendingUp,
  Cpu
} from 'lucide-react';
import { ThermalTelemetry, ThermalAlertConfig } from '../types/efi';
import { RealHardwareInfo } from '../utils/hardwareDetector';

interface ThermalViewProps {
  telemetryHistory: ThermalTelemetry[];
  currentTelemetry: ThermalTelemetry;
  alertConfig: ThermalAlertConfig;
  onOpenAlertSettings: () => void;
  workloadMode: 'idle' | 'balanced' | 'heavy' | 'spike';
  onChangeWorkloadMode: (mode: 'idle' | 'balanced' | 'heavy' | 'spike') => void;
  fanProfile: 'silent' | 'balanced' | 'performance' | 'blast';
  onChangeFanProfile: (profile: 'silent' | 'balanced' | 'performance' | 'blast') => void;
  realHw?: RealHardwareInfo;
}

export const ThermalView: React.FC<ThermalViewProps> = ({
  telemetryHistory,
  currentTelemetry,
  alertConfig,
  onOpenAlertSettings,
  workloadMode,
  onChangeWorkloadMode,
  fanProfile,
  onChangeFanProfile,
  realHw,
}) => {
  const [coreSortBy, setCoreSortBy] = useState<'id' | 'temp' | 'margin'>('temp');

  // Sorted cores matching the user's real logical core count
  const sortedCores = useMemo(() => {
    const list = [...currentTelemetry.cores];
    return list.sort((a, b) => {
      if (coreSortBy === 'temp') return b.currentTempC - a.currentTempC;
      if (coreSortBy === 'margin') return a.tjMaxMarginC - b.tjMaxMarginC;
      return a.coreId - b.coreId;
    });
  }, [currentTelemetry.cores, coreSortBy]);

  // Compute SVG Points for the 60-second real-time curves
  const graphWidth = 900;
  const graphHeight = 220;
  const paddingY = 20;

  const points = useMemo(() => {
    if (telemetryHistory.length < 2) return { cpu: '', gpu: '', hotspot: '' };

    const minTemp = 25;
    const maxTemp = 105;
    const count = telemetryHistory.length;

    const scaleY = (temp: number) => {
      const clamped = Math.max(minTemp, Math.min(maxTemp, temp));
      const normalized = (clamped - minTemp) / (maxTemp - minTemp);
      return graphHeight - paddingY - normalized * (graphHeight - 2 * paddingY);
    };

    const cpuPoints = telemetryHistory.map((pt, i) => {
      const x = (i / (count - 1)) * graphWidth;
      const y = scaleY(pt.cpuPackageC);
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    }).join(' ');

    const gpuPoints = telemetryHistory.map((pt, i) => {
      const x = (i / (count - 1)) * graphWidth;
      const y = scaleY(pt.gpuCoreC);
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    }).join(' ');

    const hotspotPoints = telemetryHistory.map((pt, i) => {
      const x = (i / (count - 1)) * graphWidth;
      const y = scaleY(pt.gpuHotspotC);
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    }).join(' ');

    return { cpu: cpuPoints, gpu: gpuPoints, hotspot: hotspotPoints };
  }, [telemetryHistory]);

  const cpuWarningY = graphHeight - paddingY - ((alertConfig.cpuWarningC - 25) / 80) * (graphHeight - 2 * paddingY);
  const cpuCriticalY = graphHeight - paddingY - ((alertConfig.cpuCriticalC - 25) / 80) * (graphHeight - 2 * paddingY);

  return (
    <div className="p-6 sm:p-8 max-w-7xl mx-auto space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 p-6 rounded-3xl bg-[#0D101A] border border-white/10">
        <div>
          <div className="flex items-center gap-2">
            <Flame className="w-5 h-5 text-amber-400" />
            <h1 className="text-xl font-bold text-white tracking-tight">
              Télémétrie Thermique & Courbes Réelles
            </h1>
            <span className="text-[11px] font-mono text-amber-300 bg-amber-500/10 px-2 py-0.5 rounded-md border border-amber-500/20">
              {currentTelemetry.cores.length} Cœurs Réels Monitorés
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Surveillance thermique de votre machine physique ({realHw?.logicalCores || currentTelemetry.cores.length} cœurs processeur).
          </p>
        </div>

        {/* Workload Simulation Selector */}
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs text-slate-400 font-medium mr-1">Profil de charge :</span>
          <div className="flex items-center gap-1 p-1 bg-white/[0.04] border border-white/10 rounded-xl">
            <button
              onClick={() => onChangeWorkloadMode('idle')}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-all ${
                workloadMode === 'idle'
                  ? 'bg-emerald-500/20 text-emerald-200 border border-emerald-500/30'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Repos (38°C)
            </button>
            <button
              onClick={() => onChangeWorkloadMode('balanced')}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-all ${
                workloadMode === 'balanced'
                  ? 'bg-blue-500/20 text-blue-200 border border-blue-500/30'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Équilibré (62°C)
            </button>
            <button
              onClick={() => onChangeWorkloadMode('heavy')}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-all ${
                workloadMode === 'heavy'
                  ? 'bg-amber-500/20 text-amber-200 border border-amber-500/30'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Charge (84°C)
            </button>
            <button
              onClick={() => onChangeWorkloadMode('spike')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all flex items-center gap-1 ${
                workloadMode === 'spike'
                  ? 'bg-red-500/30 text-red-200 border border-red-500/50'
                  : 'text-red-400 hover:bg-red-500/10'
              }`}
              title="Tester la surchauffe critique et la notification push macOS"
            >
              <AlertTriangle className="w-3 h-3" />
              <span>Pic Alerte (96°C)</span>
            </button>
          </div>

          <button
            onClick={onOpenAlertSettings}
            className="p-2 rounded-xl bg-white/[0.06] hover:bg-white/[0.1] border border-white/15 text-slate-300 hover:text-white transition-colors"
            title="Seuils d'alertes"
          >
            <Sliders className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Main Metric Cards Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {/* CPU Package */}
        <div className="p-5 rounded-2xl bg-[#0D101A] border border-white/10">
          <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
            <span className="font-semibold text-slate-300">Package CPU</span>
            <Cpu className="w-4 h-4 text-amber-400" />
          </div>
          <div className="flex items-baseline gap-2 mt-2">
            <span className={`text-3xl sm:text-4xl font-mono font-bold tracking-tight ${
              currentTelemetry.cpuPackageC >= alertConfig.cpuCriticalC
                ? 'text-red-400'
                : currentTelemetry.cpuPackageC >= alertConfig.cpuWarningC
                ? 'text-amber-400'
                : 'text-emerald-400'
            }`}>
              {currentTelemetry.cpuPackageC.toFixed(1)}°C
            </span>
          </div>
          <div className="text-[11px] text-slate-400 mt-2 flex items-center justify-between font-mono">
            <span>TjMax: 100°C</span>
            <span>Marge: {(100 - currentTelemetry.cpuPackageC).toFixed(1)}°C</span>
          </div>
        </div>

        {/* GPU Core */}
        <div className="p-5 rounded-2xl bg-[#0D101A] border border-white/10">
          <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
            <span className="font-semibold text-slate-300 truncate max-w-[130px]">GPU ({realHw?.gpuVendor || 'Graphique'})</span>
            <Zap className="w-4 h-4 text-cyan-400" />
          </div>
          <div className="flex items-baseline gap-2 mt-2">
            <span className={`text-3xl sm:text-4xl font-mono font-bold tracking-tight ${
              currentTelemetry.gpuCoreC >= alertConfig.gpuCriticalC
                ? 'text-red-400'
                : currentTelemetry.gpuCoreC >= alertConfig.gpuWarningC
                ? 'text-amber-400'
                : 'text-cyan-400'
            }`}>
              {currentTelemetry.gpuCoreC.toFixed(1)}°C
            </span>
          </div>
          <div className="text-[11px] text-slate-400 mt-2 flex items-center justify-between font-mono">
            <span>Point Chaud:</span>
            <span className="text-amber-300 font-semibold">{currentTelemetry.gpuHotspotC.toFixed(1)}°C</span>
          </div>
        </div>

        {/* Left Fan */}
        <div className="p-5 rounded-2xl bg-[#0D101A] border border-white/10">
          <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
            <span className="font-semibold text-slate-300">Ventilation CPU</span>
            <Wind className="w-4 h-4 text-blue-400" />
          </div>
          <div className="flex items-baseline gap-2 mt-2">
            <span className="text-3xl sm:text-4xl font-mono font-bold tracking-tight text-white">
              {currentTelemetry.fanLeftRpm}
            </span>
            <span className="text-xs font-mono text-slate-400">RPM</span>
          </div>
          <div className="text-[11px] text-slate-400 mt-2 flex items-center justify-between font-mono">
            <span>Régime: {Math.round((currentTelemetry.fanLeftRpm / 5800) * 100)}%</span>
            <span>Max: 5800 RPM</span>
          </div>
        </div>

        {/* Right Fan */}
        <div className="p-5 rounded-2xl bg-[#0D101A] border border-white/10">
          <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
            <span className="font-semibold text-slate-300">Ventilation GPU</span>
            <Wind className="w-4 h-4 text-blue-400" />
          </div>
          <div className="flex items-baseline gap-2 mt-2">
            <span className="text-3xl sm:text-4xl font-mono font-bold tracking-tight text-white">
              {currentTelemetry.fanRightRpm}
            </span>
            <span className="text-xs font-mono text-slate-400">RPM</span>
          </div>
          <div className="text-[11px] text-slate-400 mt-2 flex items-center justify-between font-mono">
            <span>Régime: {Math.round((currentTelemetry.fanRightRpm / 5800) * 100)}%</span>
            <span>Max: 5800 RPM</span>
          </div>
        </div>
      </div>

      {/* REAL-TIME DUAL TEMPERATURE CURVE (SVG GRAPH) */}
      <div className="p-6 rounded-3xl bg-[#0D101A] border border-white/10 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-white/10">
          <div>
            <div className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-amber-400" />
              <h3 className="text-sm font-bold text-white">Courbe Thermique en Temps Réel (60 Dernières Secondes)</h3>
            </div>
            <p className="text-xs text-slate-400">
              Rafraîchissement direct de la sonde thermique toutes les secondes.
            </p>
          </div>

          <div className="flex items-center gap-4 text-xs font-mono">
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-1 bg-amber-400 rounded-full" />
              <span className="text-slate-300">CPU</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-1 bg-cyan-400 rounded-full" />
              <span className="text-slate-300">GPU</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-1 bg-orange-500 rounded-full" />
              <span className="text-slate-300">Hotspot</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-0.5 border-b border-dashed border-red-500" />
              <span className="text-red-400">Alerte Critique</span>
            </div>
          </div>
        </div>

        {/* SVG Graph Canvas */}
        <div className="relative w-full h-[220px] bg-black/40 rounded-2xl overflow-hidden border border-white/5 p-2">
          {/* Horizontal Temperature Reference Grid Lines */}
          <div className="absolute inset-0 pointer-events-none flex flex-col justify-between p-4 text-[10px] font-mono text-slate-600">
            <div className="flex items-center justify-between border-b border-white/5 pb-1">
              <span>100°C (TjMax Limit)</span>
              <span>100°C</span>
            </div>
            <div className="flex items-center justify-between border-b border-white/5 pb-1">
              <span>85°C (Seuil d'Alerte)</span>
              <span>85°C</span>
            </div>
            <div className="flex items-center justify-between border-b border-white/5 pb-1">
              <span>60°C (Charge normale)</span>
              <span>60°C</span>
            </div>
            <div className="flex items-center justify-between">
              <span>35°C (Température de repos)</span>
              <span>35°C</span>
            </div>
          </div>

          <svg
            className="w-full h-full overflow-visible"
            viewBox={`0 0 ${graphWidth} ${graphHeight}`}
            preserveAspectRatio="none"
          >
            {/* Threshold line: CPU Critical */}
            <line
              x1="0"
              y1={cpuCriticalY}
              x2={graphWidth}
              y2={cpuCriticalY}
              stroke="#EF4444"
              strokeDasharray="4 4"
              strokeWidth="1.5"
              strokeOpacity="0.7"
            />

            {/* Threshold line: CPU Warning */}
            <line
              x1="0"
              y1={cpuWarningY}
              x2={graphWidth}
              y2={cpuWarningY}
              stroke="#F59E0B"
              strokeDasharray="3 3"
              strokeWidth="1"
              strokeOpacity="0.5"
            />

            {/* Traces */}
            {points.hotspot && (
              <polyline
                fill="none"
                stroke="#EA580C"
                strokeWidth="1.5"
                strokeOpacity="0.6"
                strokeLinejoin="round"
                points={points.hotspot}
              />
            )}

            {points.gpu && (
              <polyline
                fill="none"
                stroke="#22D3EE"
                strokeWidth="2.5"
                strokeLinejoin="round"
                points={points.gpu}
              />
            )}

            {points.cpu && (
              <polyline
                fill="none"
                stroke="#FBBF24"
                strokeWidth="2.5"
                strokeLinejoin="round"
                points={points.cpu}
              />
            )}
          </svg>
        </div>

        {/* Fan Profile preset selector */}
        <div className="flex flex-wrap items-center justify-between gap-4 pt-2 text-xs">
          <div className="flex items-center gap-2">
            <span className="text-slate-400 font-medium">Politique de Ventilation :</span>
            <div className="flex items-center gap-1 p-1 bg-white/[0.04] border border-white/10 rounded-xl">
              <button
                onClick={() => onChangeFanProfile('silent')}
                className={`px-3 py-1 rounded-lg transition-colors ${
                  fanProfile === 'silent' ? 'bg-white/20 text-white font-semibold' : 'text-slate-400 hover:text-white'
                }`}
              >
                Silencieux (2,100 RPM)
              </button>
              <button
                onClick={() => onChangeFanProfile('balanced')}
                className={`px-3 py-1 rounded-lg transition-colors ${
                  fanProfile === 'balanced' ? 'bg-white/20 text-white font-semibold' : 'text-slate-400 hover:text-white'
                }`}
              >
                Équilibré (3,400 RPM)
              </button>
              <button
                onClick={() => onChangeFanProfile('performance')}
                className={`px-3 py-1 rounded-lg transition-colors ${
                  fanProfile === 'performance' ? 'bg-amber-500/20 text-amber-200 font-semibold' : 'text-slate-400 hover:text-white'
                }`}
              >
                Performance (4,800 RPM)
              </button>
              <button
                onClick={() => onChangeFanProfile('blast')}
                className={`px-3 py-1 rounded-lg transition-colors ${
                  fanProfile === 'blast' ? 'bg-red-500/30 text-red-200 font-semibold' : 'text-slate-400 hover:text-white'
                }`}
              >
                100% Pleine Vitesse
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* DETAILED PER-CORE PROCESSOR JOURNAL (MATCHING USER'S REAL LOGICAL CORE COUNT) */}
      <div className="p-6 rounded-3xl bg-[#0D101A] border border-white/10 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-3 border-b border-white/10">
          <div>
            <div className="flex items-center gap-2">
              <Thermometer className="w-4 h-4 text-amber-400" />
              <h3 className="text-sm font-bold text-white">
                Journal des Températures par Cœur ({sortedCores.length} Cœurs Réels)
              </h3>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Relevé thermique pour chaque cœur matériel détecté sur votre machine.
            </p>
          </div>

          {/* Filters & Sorting */}
          <div className="flex items-center gap-2 text-xs">
            <div className="flex items-center gap-1 p-1 bg-white/[0.04] border border-white/10 rounded-xl">
              <button
                onClick={() => setCoreSortBy('temp')}
                className={`px-2.5 py-1 rounded-lg transition-colors flex items-center gap-1 ${
                  coreSortBy === 'temp' ? 'bg-white/20 text-white' : 'text-slate-400 hover:text-white'
                }`}
                title="Trier par température décroissante"
              >
                <ArrowUpDown className="w-3 h-3" />
                <span>Plus Chaud</span>
              </button>
              <button
                onClick={() => setCoreSortBy('id')}
                className={`px-2.5 py-1 rounded-lg transition-colors ${
                  coreSortBy === 'id' ? 'bg-white/20 text-white' : 'text-slate-400 hover:text-white'
                }`}
                title="Trier par ordre numérique"
              >
                N° Cœur
              </button>
            </div>
          </div>
        </div>

        {/* Real Cores Grid View */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
          {sortedCores.map((core) => {
            const isHot = core.currentTempC >= alertConfig.cpuWarningC;
            const isCritical = core.currentTempC >= alertConfig.cpuCriticalC;

            return (
              <div
                key={core.coreId}
                className={`p-3.5 rounded-2xl border transition-all ${
                  isCritical
                    ? 'bg-red-950/40 border-red-500/40 text-red-100'
                    : isHot
                    ? 'bg-amber-950/30 border-amber-500/30 text-amber-100'
                    : 'bg-white/[0.03] border-white/10 text-slate-200'
                }`}
              >
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-white">{core.name}</span>
                  </div>
                  <span className={`font-mono font-bold text-sm ${
                    isCritical ? 'text-red-400' : isHot ? 'text-amber-400' : 'text-emerald-400'
                  }`}>
                    {core.currentTempC.toFixed(0)}°C
                  </span>
                </div>

                {/* Progress Heat Bar */}
                <div className="mt-2.5 mb-2">
                  <div className="w-full h-1.5 bg-neutral-800 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-300 ${
                        core.currentTempC > 90 ? 'bg-red-500' : core.currentTempC > 80 ? 'bg-amber-500' : 'bg-emerald-500'
                      }`}
                      style={{ width: `${Math.min(100, (core.currentTempC / 100) * 100)}%` }}
                    />
                  </div>
                </div>

                {/* Telemetry metrics */}
                <div className="grid grid-cols-3 gap-1 text-[10px] font-mono text-slate-400 pt-1">
                  <div>
                    <span className="block text-slate-500 text-[9px]">Min / Max</span>
                    <span>{core.minTempC.toFixed(0)} / {core.maxTempC.toFixed(0)}°C</span>
                  </div>
                  <div>
                    <span className="block text-slate-500 text-[9px]">Fréquence</span>
                    <span className="text-slate-300">{core.frequencyGhz.toFixed(2)} GHz</span>
                  </div>
                  <div className="text-right">
                    <span className="block text-slate-500 text-[9px]">Marge TjMax</span>
                    <span className={core.tjMaxMarginC < 15 ? 'text-amber-300 font-semibold' : 'text-slate-300'}>
                      {core.tjMaxMarginC.toFixed(0)}°C
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
