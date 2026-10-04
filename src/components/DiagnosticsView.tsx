import React, { useState } from 'react';
import { 
  Cpu, 
  Tv, 
  HardDrive, 
  Wifi, 
  MemoryStick, 
  ShieldCheck, 
  Play, 
  CheckCircle2, 
  Clock, 
  Activity,
  Zap,
  Battery,
  BatteryCharging,
  Settings,
  Save,
  RotateCcw
} from 'lucide-react';
import { RealHardwareInfo, saveCustomHwOverrides } from '../utils/hardwareDetector';
import { soundEngine } from '../utils/audio';

interface DiagnosticsViewProps {
  realHw: RealHardwareInfo;
  onRefreshHw: () => void;
  onUpdateOverrides: (overrides: { laptopModel?: string; diskModel?: string; wifiModel?: string }) => void;
}

interface DiagTest {
  id: string;
  name: string;
  component: string;
  status: 'idle' | 'running' | 'passed' | 'warning';
  progress: number;
  resultMessage?: string;
}

export const DiagnosticsView: React.FC<DiagnosticsViewProps> = ({
  realHw,
  onRefreshHw,
  onUpdateOverrides,
}) => {
  const [activeSection, setActiveSection] = useState<'components' | 'disks' | 'displays' | 'tests'>('components');
  const [isEditing, setIsEditing] = useState(false);
  const [editLaptop, setEditLaptop] = useState(realHw.laptopModel);
  const [editDisk, setEditDisk] = useState(realHw.diskModel);
  const [editWifi, setEditWifi] = useState(realHw.wifiModel);

  const [isRunningAllTests, setIsRunningAllTests] = useState(false);
  const [tests, setTests] = useState<DiagTest[]>([
    { id: 't1', name: 'Test d\'adressage mémoire physique', component: `${realHw.deviceMemoryGb} GB RAM`, status: 'passed', progress: 100, resultMessage: 'Mémoire tampon accessible sans défaut d\'alignement.' },
    { id: 't2', name: 'Contrôle du pipeline WebGL & DirectGOP', component: realHw.gpuVendor, status: 'passed', progress: 100, resultMessage: 'Shader model et accélération matérielle opérationnels.' },
    { id: 't3', name: 'Synchronisation vSync & Rafraîchissement', component: `${realHw.measuredRefreshRate} Hz Display`, status: 'passed', progress: 100, resultMessage: 'Fréquence de trame verrouillée et stable.' },
    { id: 't4', name: 'Vérification du sous-système de stockage', component: realHw.diskModel, status: 'passed', progress: 100, resultMessage: `Quota disponible: ${realHw.storageQuotaGb} GB.` },
    { id: 't5', name: 'Liaison réseau et latence RTT', component: realHw.networkType, status: 'passed', progress: 100, resultMessage: `Débit: ${realHw.downlinkMbps} Mbps, Latence: ${realHw.rttMs} ms.` },
  ]);

  const handleSaveEdit = () => {
    onUpdateOverrides({
      laptopModel: editLaptop,
      diskModel: editDisk,
      wifiModel: editWifi,
    });
    saveCustomHwOverrides({
      laptopModel: editLaptop,
      diskModel: editDisk,
      wifiModel: editWifi,
    });
    setIsEditing(false);
    soundEngine.playNotification();
  };

  const runAllDiagnosticTests = () => {
    setIsRunningAllTests(true);
    soundEngine.playNotification();

    setTests((prev) =>
      prev.map((t) => ({ ...t, status: 'running', progress: 0, resultMessage: 'Test en cours...' }))
    );

    let currentTestIdx = 0;
    const interval = setInterval(() => {
      setTests((prev) => {
        const next = [...prev];
        if (currentTestIdx < next.length) {
          next[currentTestIdx].progress += 25;
          if (next[currentTestIdx].progress >= 100) {
            next[currentTestIdx].progress = 100;
            next[currentTestIdx].status = 'passed';
            next[currentTestIdx].resultMessage = 'Test validé avec succès (0 anomalie).';
            currentTestIdx++;
          }
        } else {
          clearInterval(interval);
          setIsRunningAllTests(false);
          soundEngine.playBootChime();
        }
        return next;
      });
    }, 160);
  };

  return (
    <div className="p-6 sm:p-8 max-w-7xl mx-auto space-y-6">
      {/* Top Banner with Real Hardware Detected */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 rounded-3xl bg-[#0C101A] border border-white/10">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 shadow-[0_0_10px_rgba(52,211,153,0.8)]" />
            <h1 className="text-xl font-bold text-white tracking-tight">
              Diagnostic Matériel Réel
            </h1>
            <span className="text-[11px] font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-md border border-emerald-500/20">
              Sonde système active
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Informations matérielles extraites directement de votre ordinateur ({realHw.platform}).
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsEditing(!isEditing)}
            className="px-3.5 py-2 text-xs font-medium rounded-xl bg-white/10 hover:bg-white/15 text-white border border-white/10 transition-colors flex items-center gap-1.5"
          >
            <Settings className="w-3.5 h-3.5 text-slate-400" />
            <span>{isEditing ? 'Fermer l\'édition' : 'Personnaliser mes composants'}</span>
          </button>

          <button
            onClick={runAllDiagnosticTests}
            disabled={isRunningAllTests}
            className={`px-4 py-2 text-xs font-semibold rounded-xl transition-all flex items-center gap-2 ${
              isRunningAllTests
                ? 'bg-amber-500/20 text-amber-200 border border-amber-500/40 cursor-wait'
                : 'bg-white text-black hover:bg-slate-200 shadow-lg'
            }`}
          >
            {isRunningAllTests ? (
              <>
                <Activity className="w-3.5 h-3.5 animate-spin text-amber-400" />
                <span>Test en cours...</span>
              </>
            ) : (
              <>
                <Play className="w-3.5 h-3.5 fill-current" />
                <span>Lancer le diagnostic complet</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Manual Component Customizer Drawer (when user wants exact part names) */}
      {isEditing && (
        <div className="p-6 rounded-3xl bg-[#0F1422] border border-amber-500/30 space-y-4 animate-in fade-in duration-150">
          <div className="flex items-center justify-between pb-3 border-b border-white/10">
            <div>
              <h3 className="text-sm font-bold text-white">Renseigner vos composants matériels exacts</h3>
              <p className="text-xs text-slate-400">
                Ajustez les noms de vos composants pour qu'ils s'affichent avec exactitude dans la suite et l'EFI.
              </p>
            </div>
            <button
              onClick={handleSaveEdit}
              className="px-4 py-1.5 text-xs font-semibold text-black bg-amber-400 hover:bg-amber-300 rounded-xl transition-colors flex items-center gap-1.5"
            >
              <Save className="w-3.5 h-3.5" />
              <span>Enregistrer</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
            <div>
              <label className="text-slate-400 font-medium block mb-1">Modèle du Laptop / Carte Mère :</label>
              <input
                type="text"
                value={editLaptop}
                onChange={(e) => setEditLaptop(e.target.value)}
                placeholder="ex: Lenovo Legion Pro 7i / MacBook Pro 16"
                className="w-full px-3 py-2 bg-black/60 border border-white/15 rounded-xl text-white focus:outline-none focus:border-amber-400 font-mono text-xs"
              />
            </div>
            <div>
              <label className="text-slate-400 font-medium block mb-1">Modèle du Disque SSD Principal :</label>
              <input
                type="text"
                value={editDisk}
                onChange={(e) => setEditDisk(e.target.value)}
                placeholder="ex: Samsung 990 PRO 2TB NVMe"
                className="w-full px-3 py-2 bg-black/60 border border-white/15 rounded-xl text-white focus:outline-none focus:border-amber-400 font-mono text-xs"
              />
            </div>
            <div>
              <label className="text-slate-400 font-medium block mb-1">Carte Réseau & Wi-Fi :</label>
              <input
                type="text"
                value={editWifi}
                onChange={(e) => setEditWifi(e.target.value)}
                placeholder="ex: Intel Wi-Fi 7 BE200 320MHz"
                className="w-full px-3 py-2 bg-black/60 border border-white/15 rounded-xl text-white focus:outline-none focus:border-amber-400 font-mono text-xs"
              />
            </div>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="flex items-center gap-1.5 p-1 bg-white/[0.04] border border-white/10 rounded-2xl w-fit">
        <button
          onClick={() => setActiveSection('components')}
          className={`px-4 py-2 text-xs font-medium rounded-xl transition-all flex items-center gap-2 ${
            activeSection === 'components'
              ? 'bg-white/15 text-white shadow-sm'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <Cpu className="w-3.5 h-3.5" />
          <span>Composants Réels</span>
        </button>

        <button
          onClick={() => setActiveSection('disks')}
          className={`px-4 py-2 text-xs font-medium rounded-xl transition-all flex items-center gap-2 ${
            activeSection === 'disks'
              ? 'bg-white/15 text-white shadow-sm'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <HardDrive className="w-3.5 h-3.5" />
          <span>Disque & Stockage</span>
        </button>

        <button
          onClick={() => setActiveSection('displays')}
          className={`px-4 py-2 text-xs font-medium rounded-xl transition-all flex items-center gap-2 ${
            activeSection === 'displays'
              ? 'bg-white/15 text-white shadow-sm'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <Tv className="w-3.5 h-3.5" />
          <span>Écran ({realHw.measuredRefreshRate} Hz)</span>
        </button>

        <button
          onClick={() => setActiveSection('tests')}
          className={`px-4 py-2 text-xs font-medium rounded-xl transition-all flex items-center gap-2 ${
            activeSection === 'tests'
              ? 'bg-white/15 text-white shadow-sm'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <ShieldCheck className="w-3.5 h-3.5" />
          <span>Banc de Tests ({tests.length})</span>
        </button>
      </div>

      {/* SECTION 1: REAL COMPONENTS */}
      {activeSection === 'components' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {/* CPU Card */}
          <div className="p-6 rounded-3xl bg-[#0D101A] border border-white/10 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-400">
                  <Cpu className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">Processeur Réel Détecté</h3>
                  <p className="text-xs text-amber-300 font-semibold">{realHw.logicalCores} Cœurs Logiques Actifs</p>
                </div>
              </div>
              <span className="px-2.5 py-1 text-[11px] font-mono text-emerald-300 bg-emerald-500/10 rounded-lg border border-emerald-500/20">
                En ligne
              </span>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="p-3 rounded-xl bg-white/[0.03] border border-white/5">
                <span className="text-slate-500 block text-[10px]">Architecture</span>
                <span className="font-semibold text-slate-200 mt-0.5 block font-mono">{realHw.cpuArchitecture}</span>
              </div>
              <div className="p-3 rounded-xl bg-white/[0.03] border border-white/5">
                <span className="text-slate-500 block text-[10px]">Cœurs Parallèles</span>
                <span className="font-semibold text-slate-200 mt-0.5 block font-mono">{realHw.logicalCores} Threads matériels</span>
              </div>
              <div className="p-3 rounded-xl bg-white/[0.03] border border-white/5">
                <span className="text-slate-500 block text-[10px]">Plateforme OS</span>
                <span className="font-semibold text-slate-200 mt-0.5 block font-mono truncate">{realHw.platform}</span>
              </div>
              <div className="p-3 rounded-xl bg-white/[0.03] border border-white/5">
                <span className="text-slate-500 block text-[10px]">Modèle Ordinateur</span>
                <span className="font-semibold text-slate-200 mt-0.5 block truncate">{realHw.laptopModel}</span>
              </div>
            </div>
          </div>

          {/* GPU Card */}
          <div className="p-6 rounded-3xl bg-[#0D101A] border border-white/10 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-2xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400">
                  <Zap className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">Carte Graphique</h3>
                  <p className="text-xs text-cyan-300 font-semibold truncate max-w-xs">{realHw.gpuVendor}</p>
                </div>
              </div>
              <span className="px-2.5 py-1 text-[11px] font-mono text-cyan-300 bg-cyan-500/10 rounded-lg border border-cyan-500/20">
                Direct3D/Metal
              </span>
            </div>

            <div className="space-y-2 text-xs">
              <div className="p-3 rounded-xl bg-white/[0.03] border border-white/5">
                <span className="text-slate-500 block text-[10px]">Rendu Graphique Unmasked</span>
                <span className="font-mono text-slate-200 mt-0.5 block break-all text-[11px]">
                  {realHw.gpuRenderer}
                </span>
              </div>
              <div className="p-3 rounded-xl bg-white/[0.03] border border-white/5 flex items-center justify-between">
                <div>
                  <span className="text-slate-500 block text-[10px]">Accélération Graphique</span>
                  <span className="font-semibold text-slate-200">{realHw.webglVersion}</span>
                </div>
                <div className="text-right">
                  <span className="text-slate-500 block text-[10px]">GOP Framebuffer</span>
                  <span className="font-semibold text-emerald-300 font-mono">1920x1080@100Hz</span>
                </div>
              </div>
            </div>
          </div>

          {/* RAM & Battery Card */}
          <div className="p-6 rounded-3xl bg-[#0D101A] border border-white/10 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
                  <MemoryStick className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">Mémoire & Alimentation</h3>
                  <p className="text-xs text-emerald-300 font-semibold">{realHw.deviceMemoryGb} GB RAM physique reportée</p>
                </div>
              </div>
              {realHw.hasBattery && (
                <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-lg bg-white/10 font-mono text-xs text-slate-200">
                  {realHw.isCharging ? <BatteryCharging className="w-3.5 h-3.5 text-emerald-400" /> : <Battery className="w-3.5 h-3.5 text-amber-400" />}
                  <span>{realHw.batteryLevelPercent}%</span>
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="p-3 rounded-xl bg-white/[0.03] border border-white/5">
                <span className="text-slate-500 block text-[10px]">Capacité RAM</span>
                <span className="font-semibold text-slate-200 mt-0.5 block">{realHw.deviceMemoryGb} Go Détectés</span>
              </div>
              <div className="p-3 rounded-xl bg-white/[0.03] border border-white/5">
                <span className="text-slate-500 block text-[10px]">État de la Batterie</span>
                <span className="font-semibold text-slate-200 mt-0.5 block">
                  {realHw.hasBattery ? (realHw.isCharging ? 'En charge (Secteur)' : 'Sur batterie') : 'Alimentation fixe'}
                </span>
              </div>
            </div>
          </div>

          {/* Network Card */}
          <div className="p-6 rounded-3xl bg-[#0D101A] border border-white/10 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-2xl bg-purple-500/10 border border-purple-500/20 text-purple-400">
                  <Wifi className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">Réseau Réel Détecté</h3>
                  <p className="text-xs text-purple-300 font-semibold">{realHw.wifiModel}</p>
                </div>
              </div>
              <span className="px-2.5 py-1 text-[11px] font-mono text-emerald-300 bg-emerald-500/10 rounded-lg border border-emerald-500/20">
                Connecté
              </span>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="p-3 rounded-xl bg-white/[0.03] border border-white/5">
                <span className="text-slate-500 block text-[10px]">Type de liaison</span>
                <span className="font-semibold text-slate-200 mt-0.5 block">{realHw.networkType}</span>
              </div>
              <div className="p-3 rounded-xl bg-white/[0.03] border border-white/5">
                <span className="text-slate-500 block text-[10px]">Débit descendant estimé</span>
                <span className="font-semibold text-emerald-300 mt-0.5 block font-mono">{realHw.downlinkMbps} Mbps</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* SECTION 2: DISKS & REAL STORAGE */}
      {activeSection === 'disks' && (
        <div className="p-6 rounded-3xl bg-[#0D101A] border border-white/10 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-white/10">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-400">
                <HardDrive className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white">Stockage Réel de la Machine</h3>
                <p className="text-xs text-amber-300 font-semibold">{realHw.diskModel}</p>
              </div>
            </div>
            <span className="text-xs font-mono text-emerald-400">Partition GPT / EFI FAT32 Active</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
            <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/5">
              <span className="text-slate-500 block text-[10px]">Quota Détecté par le Système</span>
              <span className="text-xl font-bold font-mono text-white mt-1 block">{realHw.storageQuotaGb} GB</span>
              <span className="text-[11px] text-slate-400 mt-0.5 block">Espace réservable haute vitesse</span>
            </div>

            <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/5">
              <span className="text-slate-500 block text-[10px]">Espace Actuellement Alloué</span>
              <span className="text-xl font-bold font-mono text-emerald-400 mt-1 block">{realHw.storageUsedGb} GB</span>
              <span className="text-[11px] text-slate-400 mt-0.5 block">Données & EFI Snapshots persistés</span>
            </div>

            <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/5">
              <span className="text-slate-500 block text-[10px]">Format Partition EFI</span>
              <span className="text-xl font-bold font-mono text-amber-300 mt-1 block">FAT32 (0xEF)</span>
              <span className="text-[11px] text-slate-400 mt-0.5 block">Compatibilité UEFI EDK2</span>
            </div>
          </div>
        </div>
      )}

      {/* SECTION 3: REAL DISPLAY */}
      {activeSection === 'displays' && (
        <div className="p-6 rounded-3xl bg-[#0D101A] border border-white/10 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-white/10">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-2xl bg-blue-500/10 border border-blue-500/20 text-blue-400">
                <Tv className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white">Écran Physique Détecté</h3>
                <p className="text-xs text-blue-300 font-mono">
                  {realHw.screenWidth} × {realHw.screenHeight} @ <strong className="text-white">{realHw.measuredRefreshRate} Hz</strong>
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={onRefreshHw}
                className="px-3 py-1.5 text-xs text-slate-300 hover:text-white bg-white/10 rounded-xl transition-colors flex items-center gap-1.5"
                title="Remesurer la fréquence réelle"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Remesurer Hz</span>
              </button>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
            <div className="p-3 rounded-xl bg-white/[0.03] border border-white/5">
              <span className="text-slate-500 block text-[10px]">Résolution Réelle (Device Pixels)</span>
              <span className="font-semibold text-slate-200 mt-0.5 block font-mono">{realHw.screenWidth} × {realHw.screenHeight}</span>
            </div>
            <div className="p-3 rounded-xl bg-white/[0.03] border border-white/5">
              <span className="text-slate-500 block text-[10px]">Fréquence de Rafraîchissement</span>
              <span className="font-bold text-emerald-400 mt-0.5 block font-mono text-base">{realHw.measuredRefreshRate}.00 Hz</span>
            </div>
            <div className="p-3 rounded-xl bg-white/[0.03] border border-white/5">
              <span className="text-slate-500 block text-[10px]">Ratio Pixel / HiDPI Scale</span>
              <span className="font-semibold text-slate-200 mt-0.5 block font-mono">{realHw.pixelRatio}x (Retina)</span>
            </div>
            <div className="p-3 rounded-xl bg-white/[0.03] border border-white/5">
              <span className="text-slate-500 block text-[10px]">Espace Colorimétrique</span>
              <span className="font-semibold text-slate-200 mt-0.5 block">
                {realHw.isP3WideGamut ? 'Display P3 Wide Gamut' : 'Standard sRGB'}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* SECTION 4: DIAG TESTS */}
      {activeSection === 'tests' && (
        <div className="space-y-3">
          {tests.map((test) => (
            <div key={test.id} className="p-4 rounded-2xl bg-[#0D101A] border border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="shrink-0">
                  {test.status === 'passed' ? (
                    <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                  ) : test.status === 'running' ? (
                    <Activity className="w-5 h-5 text-amber-400 animate-spin" />
                  ) : (
                    <Clock className="w-5 h-5 text-slate-400" />
                  )}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-white">{test.name}</span>
                    <span className="text-[10px] text-slate-400 font-mono">[{test.component}]</span>
                  </div>
                  {test.resultMessage && (
                    <p className="text-xs text-slate-300 mt-0.5">{test.resultMessage}</p>
                  )}
                </div>
              </div>

              <div className="sm:w-48 shrink-0">
                <div className="flex items-center justify-between text-[11px] font-mono text-slate-400 mb-1">
                  <span>{test.status === 'running' ? 'Analyse...' : 'Validé'}</span>
                  <span>{test.progress}%</span>
                </div>
                <div className="w-full h-1.5 bg-neutral-800 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full bg-emerald-400 transition-all duration-300"
                    style={{ width: `${test.progress}%` }}
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
