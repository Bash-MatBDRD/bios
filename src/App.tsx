import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  BootEntry, 
  EFIConfig, 
  ThermalAlertConfig, 
  EFISnapshot, 
  SystemErrorLog, 
  ThermalTelemetry, 
  PushNotification 
} from './types/efi';
import { 
  loadEFIConfig, 
  saveEFIConfig, 
  loadBootEntries, 
  saveBootEntries, 
  loadConfigPlist, 
  saveConfigPlist, 
  loadAlertConfig, 
  saveAlertConfig, 
  loadSnapshots, 
  saveSnapshots, 
  loadSystemLogs, 
  saveSystemLogs, 
  DEFAULT_EFI_CONFIG,
  DEFAULT_CONFIG_PLIST
} from './utils/storage';
import { detectRealHardware, RealHardwareInfo } from './utils/hardwareDetector';
import { generateGoldenGateEfiZip } from './utils/zipGenerator';
import { soundEngine } from './utils/audio';
import { TopBar } from './components/TopBar';
import { BootPicker } from './components/BootPicker';
import { DiagnosticsView } from './components/DiagnosticsView';
import { ThermalView } from './components/ThermalView';
import { EfiPartitionView } from './components/EfiPartitionView';
import { SystemLogsView } from './components/SystemLogsView';
import { AlertThresholdModal } from './components/AlertThresholdModal';
import { NotificationCenter } from './components/NotificationCenter';
import { HoverSidebar } from './components/HoverSidebar';
import { AudioSettingsModal } from './components/AudioSettingsModal';

export default function App() {
  // Navigation tab
  const [activeTab, setActiveTab] = useState<'boot' | 'diagnostics' | 'thermal' | 'partition' | 'logs'>('boot');

  // Real Probed Client Hardware
  const [realHw, setRealHw] = useState<RealHardwareInfo>({
    logicalCores: typeof navigator !== 'undefined' ? navigator.hardwareConcurrency || 8 : 8,
    cpuArchitecture: 'x86_64 / ARM64',
    platform: typeof navigator !== 'undefined' ? navigator.platform || 'Système 64-bit' : 'Système 64-bit',
    userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : '',
    gpuRenderer: 'Accélérateur Graphique DirectGOP',
    gpuVendor: 'Constructeur Matériel',
    webglVersion: 'WebGL 2.0',
    deviceMemoryGb: 16,
    screenWidth: typeof window !== 'undefined' ? window.screen.width : 1920,
    screenHeight: typeof window !== 'undefined' ? window.screen.height : 1080,
    pixelRatio: typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1,
    viewportWidth: typeof window !== 'undefined' ? window.innerWidth : 1920,
    viewportHeight: typeof window !== 'undefined' ? window.innerHeight : 1080,
    colorDepth: 24,
    isP3WideGamut: true,
    isHdr: false,
    measuredRefreshRate: 100,
    storageQuotaGb: 500,
    storageUsedGb: 42,
    networkType: 'Gigabit LAN / Wi-Fi',
    downlinkMbps: 100,
    rttMs: 12,
    hasBattery: false,
    laptopModel: 'Laptop PC UEFI 64-bit',
    diskModel: 'Disque NVMe PCIe Haute Performance',
    wifiModel: 'Contrôleur Wi-Fi 6E/7 & Ethernet 2.5G'
  });

  // Persistent States
  const [config, setConfig] = useState<EFIConfig>(() => loadEFIConfig());
  const [entries, setEntries] = useState<BootEntry[]>(() => loadBootEntries());
  const [configPlistContent, setConfigPlistContent] = useState<string>(() => loadConfigPlist());
  const [alertConfig, setAlertConfig] = useState<ThermalAlertConfig>(() => loadAlertConfig());
  const [snapshots, setSnapshots] = useState<EFISnapshot[]>(() => loadSnapshots());
  const [systemLogs, setSystemLogs] = useState<SystemErrorLog[]>(() => loadSystemLogs());

  // Download ZIP state
  const [isDownloading, setIsDownloading] = useState(false);

  // Sound and Alert Modals state
  const [isSoundModalOpen, setIsSoundModalOpen] = useState(false);
  const [isAlertModalOpen, setIsAlertModalOpen] = useState(false);

  // Push Notifications state
  const [notifications, setNotifications] = useState<PushNotification[]>([]);

  // Thermal Simulation State
  const [workloadMode, setWorkloadMode] = useState<'idle' | 'balanced' | 'heavy' | 'spike'>('balanced');
  const [fanProfile, setFanProfile] = useState<'silent' | 'balanced' | 'performance' | 'blast'>('balanced');

  // Telemetry buffer: last 60 seconds
  const [telemetryHistory, setTelemetryHistory] = useState<ThermalTelemetry[]>([]);
  const lastAlertTimeRef = useRef<{ [key: string]: number }>({});

  // Probe real hardware on mount
  useEffect(() => {
    detectRealHardware().then((hw) => {
      setRealHw(hw);
      if (hw.measuredRefreshRate) {
        setConfig((prev) => ({
          ...prev,
          resolution: hw.measuredRefreshRate >= 95 ? '1920x1080@100Hz' : '1920x1080@60Hz'
        }));
      }
    });
  }, []);

  const refreshHardware = () => {
    detectRealHardware().then((hw) => {
      setRealHw(hw);
      soundEngine.playNotification();
    });
  };

  const handleUpdateOverrides = (overrides: { laptopModel?: string; diskModel?: string; wifiModel?: string }) => {
    setRealHw((prev) => ({
      ...prev,
      ...overrides
    }));
  };

  // Helper to add a notification
  const addNotification = useCallback((
    title: string,
    message: string,
    severity: 'critical' | 'warning' | 'info' | 'success',
    actionLabel?: string,
    onAction?: () => void
  ) => {
    const id = `notif-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`;
    const newNotif: PushNotification = {
      id,
      title,
      message,
      severity,
      timestamp: Date.now(),
      actionLabel,
      onAction
    };

    setNotifications((prev) => [newNotif, ...prev.slice(0, 3)]);

    if (alertConfig.soundEnabled) {
      if (severity === 'critical') {
        soundEngine.playCriticalWarning();
      } else {
        soundEngine.playNotification();
      }
    }

    if (alertConfig.autoDismissSec > 0) {
      setTimeout(() => {
        setNotifications((prev) => prev.filter((n) => n.id !== id));
      }, alertConfig.autoDismissSec * 1000);
    }
  }, [alertConfig.soundEnabled, alertConfig.autoDismissSec]);

  const dismissNotification = (id: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  };

  // Generate telemetry matching user's REAL physical core count
  const generateCores = useCallback((baseTemp: number, jitter: number) => {
    const totalCores = realHw.logicalCores || 8;
    return Array.from({ length: totalCores }).map((_, idx) => {
      const isPCore = idx < Math.ceil(totalCores / 2);
      const type = isPCore ? ('P-Core' as const) : ('E-Core' as const);
      const name = `Cœur ${idx + 1} (${type})`;
      const coreOffset = isPCore ? (Math.sin(idx * 0.8) * 3 + 2) : -(idx % 4) - 2;
      const coreTemp = Math.max(30, Math.min(100, baseTemp + coreOffset + (Math.random() * jitter - jitter / 2)));
      const freq = isPCore ? 4.0 + (Math.random() * 1.5) : 2.6 + (Math.random() * 0.8);

      return {
        coreId: idx,
        type,
        name,
        currentTempC: coreTemp,
        minTempC: Math.max(30, coreTemp - 7),
        maxTempC: Math.min(100, coreTemp + 6),
        frequencyGhz: freq,
        usagePercent: Math.min(100, Math.max(5, (coreTemp / 100) * 100 + (Math.random() * 8 - 4))),
        tjMaxMarginC: Math.max(0, 100 - coreTemp),
      };
    });
  }, [realHw.logicalCores]);

  // Real-time Telemetry Loop
  useEffect(() => {
    let baseT = workloadMode === 'idle' ? 38 : workloadMode === 'balanced' ? 62 : workloadMode === 'heavy' ? 84 : 96;
    const initialHistory: ThermalTelemetry[] = [];
    for (let i = 20; i > 0; i--) {
      const pastTime = Date.now() - i * 1000;
      initialHistory.push({
        timestamp: pastTime,
        cpuPackageC: baseT + (Math.random() * 2 - 1),
        gpuCoreC: baseT - 5 + (Math.random() * 2 - 1),
        gpuHotspotC: baseT + 4 + (Math.random() * 2 - 1),
        gpuVramC: baseT + 2 + (Math.random() * 2 - 1),
        diskPrimaryC: 41,
        ambientC: 22.4,
        fanLeftRpm: fanProfile === 'silent' ? 2100 : fanProfile === 'balanced' ? 3400 : fanProfile === 'performance' ? 4800 : 5800,
        fanRightRpm: fanProfile === 'silent' ? 2050 : fanProfile === 'balanced' ? 3350 : fanProfile === 'performance' ? 4750 : 5780,
        cores: generateCores(baseT, 1.5)
      });
    }
    setTelemetryHistory(initialHistory);

    const interval = setInterval(() => {
      let targetCpu = 38;
      let targetGpu = 34;

      if (workloadMode === 'idle') {
        targetCpu = 38;
        targetGpu = 34;
      } else if (workloadMode === 'balanced') {
        targetCpu = 62;
        targetGpu = 56;
      } else if (workloadMode === 'heavy') {
        targetCpu = 84;
        targetGpu = 78;
      } else if (workloadMode === 'spike') {
        targetCpu = 96.5;
        targetGpu = 90.5;
      }

      if (fanProfile === 'blast') {
        targetCpu -= 8;
        targetGpu -= 9;
      } else if (fanProfile === 'performance') {
        targetCpu -= 4;
        targetGpu -= 5;
      } else if (fanProfile === 'silent') {
        targetCpu += 6;
        targetGpu += 5;
      }

      const jitter = (Math.random() - 0.5) * 1.8;
      const currentCpu = Math.max(30, Math.min(100, targetCpu + jitter));
      const currentGpu = Math.max(28, Math.min(95, targetGpu + jitter * 0.8));
      const hotspot = currentGpu + 7 + (Math.random() * 1.5);

      const targetFanL = fanProfile === 'blast' ? 5800 : fanProfile === 'performance' ? 4800 : fanProfile === 'balanced' ? Math.round(2600 + (currentCpu / 100) * 2200) : 2100;
      const targetFanR = fanProfile === 'blast' ? 5780 : fanProfile === 'performance' ? 4750 : fanProfile === 'balanced' ? Math.round(2500 + (currentGpu / 95) * 2300) : 2050;

      const newSample: ThermalTelemetry = {
        timestamp: Date.now(),
        cpuPackageC: currentCpu,
        gpuCoreC: currentGpu,
        gpuHotspotC: hotspot,
        gpuVramC: currentGpu + 5,
        diskPrimaryC: 40 + (currentCpu > 80 ? 4 : 0),
        ambientC: 22.5,
        fanLeftRpm: targetFanL,
        fanRightRpm: targetFanR,
        cores: generateCores(currentCpu, 2.0)
      };

      setTelemetryHistory((prev) => [...prev.slice(-59), newSample]);

      // Check Alert Thresholds
      const now = Date.now();
      const throttleCooldown = 15000;

      if (currentCpu >= alertConfig.cpuCriticalC) {
        if (!lastAlertTimeRef.current.cpuCrit || now - lastAlertTimeRef.current.cpuCrit > throttleCooldown) {
          lastAlertTimeRef.current.cpuCrit = now;
          addNotification(
            'Surchauffe Critique du Processeur',
            `Le CPU Package a franchi le seuil d'urgence avec ${currentCpu.toFixed(1)}°C (Seuil: ${alertConfig.cpuCriticalC}°C).`,
            'critical',
            'Forcer ventilation à 100%',
            () => setFanProfile('blast')
          );
        }
      } else if (currentCpu >= alertConfig.cpuWarningC) {
        if (!lastAlertTimeRef.current.cpuWarn || now - lastAlertTimeRef.current.cpuWarn > throttleCooldown) {
          lastAlertTimeRef.current.cpuWarn = now;
          addNotification(
            'Alerte Température CPU Élevée',
            `Le CPU tourne à ${currentCpu.toFixed(1)}°C, approchant la limite thermique.`,
            'warning',
            'Activer profil Performance',
            () => setFanProfile('performance')
          );
        }
      }

      if (currentGpu >= alertConfig.gpuCriticalC) {
        if (!lastAlertTimeRef.current.gpuCrit || now - lastAlertTimeRef.current.gpuCrit > throttleCooldown) {
          lastAlertTimeRef.current.gpuCrit = now;
          addNotification(
            'Alerte Critique GPU',
            `Le processeur graphique a atteint ${currentGpu.toFixed(1)}°C (Point chaud: ${hotspot.toFixed(1)}°C).`,
            'critical',
            'Refroidissement Max',
            () => setFanProfile('blast')
          );
        }
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [workloadMode, fanProfile, alertConfig, generateCores, addNotification]);

  // Current telemetry point
  const currentTelemetry = telemetryHistory[telemetryHistory.length - 1] || {
    timestamp: Date.now(),
    cpuPackageC: 58.2,
    gpuCoreC: 51.4,
    gpuHotspotC: 60.1,
    gpuVramC: 56.0,
    diskPrimaryC: 41,
    ambientC: 22.5,
    fanLeftRpm: 3400,
    fanRightRpm: 3350,
    cores: generateCores(58.2, 2.0)
  };

  // Handlers for updating and persisting
  const handleUpdateConfig = (newConfig: Partial<EFIConfig>) => {
    const updated = { ...config, ...newConfig };
    setConfig(updated);
    saveEFIConfig(updated);
    addNotification('Configuration EFI Sauvegardée', 'Les variables de boot et paramètres GOP ont été écrites dans la NVRAM.', 'success');
  };

  const handleSetDefaultEntry = (entryId: string) => {
    const updatedEntries = entries.map((e) => ({
      ...e,
      isDefault: e.id === entryId
    }));
    setEntries(updatedEntries);
    saveBootEntries(updatedEntries);

    const updatedConfig = { ...config, defaultEntryId: entryId };
    setConfig(updatedConfig);
    saveEFIConfig(updatedConfig);

    const target = entries.find((e) => e.id === entryId);
    soundEngine.playNotification();
    addNotification('Volume par Défaut Mis à Jour', `${target?.title || 'Système'} est désormais le volume d'amorce principal.`, 'success');
  };

  const handleUpdateEntryArgs = (entryId: string, args: string) => {
    const updatedEntries = entries.map((e) => (e.id === entryId ? { ...e, customArgs: args } : e));
    setEntries(updatedEntries);
    saveBootEntries(updatedEntries);
    soundEngine.playNotification();
    addNotification('Arguments de Boot Enregistrés', `Les boot-args pour ce volume ont été sauvegardés de manière permanente.`, 'success');
  };

  const handleSavePlist = (newContent: string, snapshotName: string) => {
    setConfigPlistContent(newContent);
    saveConfigPlist(newContent);

    const newSnapshot: EFISnapshot = {
      id: `snap-${Date.now()}`,
      timestamp: new Date().toISOString().replace('T', ' ').slice(0, 19),
      name: snapshotName,
      description: 'Sauvegarde automatique lors de l\'édition de config.plist',
      author: 'Utilisateur Golden Gate',
      config,
      configPlistContent: newContent
    };

    const updatedSnapshots = [newSnapshot, ...snapshots];
    setSnapshots(updatedSnapshots);
    saveSnapshots(updatedSnapshots);

    addNotification('Snapshot EFI Créé', `La partition EFI a été sauvegardée avec succès ("${snapshotName}").`, 'success');
  };

  const handleRestoreSnapshot = (snapshotId: string) => {
    const target = snapshots.find((s) => s.id === snapshotId);
    if (!target) return;

    setConfig(target.config);
    saveEFIConfig(target.config);

    setConfigPlistContent(target.configPlistContent);
    saveConfigPlist(target.configPlistContent);

    soundEngine.playNotification();
    addNotification('Snapshot Restauré', `La configuration EFI a été rétablie depuis "${target.name}".`, 'info');
  };

  const handleResetFactoryDefaults = () => {
    setConfig(DEFAULT_EFI_CONFIG);
    saveEFIConfig(DEFAULT_EFI_CONFIG);

    setConfigPlistContent(DEFAULT_CONFIG_PLIST);
    saveConfigPlist(DEFAULT_CONFIG_PLIST);

    soundEngine.playBootChime();
    addNotification('Golden Gate Restauré', 'La partition EFI a été réinitialisée avec les réglages d\'usine d\'origine.', 'info');
  };

  const handleSaveAlertConfig = (newAlertConfig: ThermalAlertConfig) => {
    setAlertConfig(newAlertConfig);
    saveAlertConfig(newAlertConfig);
    addNotification('Seuils d\'Alertes Enregistrés', 'Les nouveaux seuils thermiques et de push ont été appliqués avec succès.', 'success');
  };

  const handleTriggerTestNotification = () => {
    addNotification(
      'Test d\'Alerte Thermique macOS',
      'Notification push temps réel avec slide-in haut-droit et carillon sonore.',
      'warning',
      'Augmenter ventilation',
      () => setFanProfile('performance')
    );
  };

  const handleClearLogs = () => {
    setSystemLogs([]);
    saveSystemLogs([]);
    soundEngine.playNotification();
    addNotification('Journal Vierge', 'Le journal d\'erreurs et d\'événements a été effacé.', 'info');
  };

  // DOWNLOAD REAL COMPLETE GOLDENGATE EFI ZIP PACKAGE
  const handleDownloadEfiZip = async () => {
    setIsDownloading(true);
    soundEngine.playNotification();
    try {
      const blob = await generateGoldenGateEfiZip(config, entries, configPlistContent, realHw);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `GoldenGate-EFI-${config.resolution.replace('@', '-')}.zip`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      addNotification(
        'GoldenGate EFI Téléchargé',
        'L\'archive GoldenGate-EFI.zip est prête à être copiée sur votre clé USB (formatée en FAT32).',
        'success'
      );
    } catch (err) {
      console.error('Download error:', err);
      addNotification(
        'Erreur lors du téléchargement',
        'Impossible de générer l\'archive ZIP de l\'EFI.',
        'critical'
      );
    } finally {
      setIsDownloading(false);
    }
  };

  const hasActiveAlerts = currentTelemetry.cpuPackageC >= alertConfig.cpuWarningC || currentTelemetry.gpuCoreC >= alertConfig.gpuWarningC;

  return (
    <div className="min-h-screen bg-[#07090F] text-slate-100 flex flex-col font-sans selection:bg-amber-500/20 selection:text-amber-200">
      {/* Sleek Hover Sidebar on the left (Auto-expands on mouseenter, collapses on mouseleave) */}
      <HoverSidebar
        activeTab={activeTab}
        onSelectTab={setActiveTab}
        onOpenSoundModal={() => setIsSoundModalOpen(true)}
        onDownloadEfi={handleDownloadEfiZip}
        isDownloading={isDownloading}
        hasActiveAlerts={hasActiveAlerts}
      />

      {/* Top Bar */}
      <TopBar
        config={config}
        onUpdateConfig={handleUpdateConfig}
        measuredHz={realHw.measuredRefreshRate}
      />

      {/* Main View Router - with left padding for sidebar */}
      <main className="flex-1 pb-10 pl-14 transition-all">
        {activeTab === 'boot' && (
          <BootPicker
            entries={entries}
            config={config}
            onSetDefaultEntry={handleSetDefaultEntry}
            onUpdateEntryArgs={handleUpdateEntryArgs}
            onOpenPartitionTab={() => setActiveTab('partition')}
            onDownloadEfi={handleDownloadEfiZip}
            measuredHz={realHw.measuredRefreshRate}
          />
        )}

        {activeTab === 'diagnostics' && (
          <DiagnosticsView
            realHw={realHw}
            onRefreshHw={refreshHardware}
            onUpdateOverrides={handleUpdateOverrides}
          />
        )}

        {activeTab === 'thermal' && (
          <ThermalView
            telemetryHistory={telemetryHistory}
            currentTelemetry={currentTelemetry}
            alertConfig={alertConfig}
            onOpenAlertSettings={() => setIsAlertModalOpen(true)}
            workloadMode={workloadMode}
            onChangeWorkloadMode={setWorkloadMode}
            fanProfile={fanProfile}
            onChangeFanProfile={setFanProfile}
            realHw={realHw}
          />
        )}

        {activeTab === 'partition' && (
          <EfiPartitionView
            config={config}
            configPlistContent={configPlistContent}
            onSavePlist={handleSavePlist}
            snapshots={snapshots}
            onRestoreSnapshot={handleRestoreSnapshot}
            onResetFactoryDefaults={handleResetFactoryDefaults}
            onDownloadZip={handleDownloadEfiZip}
            isDownloading={isDownloading}
          />
        )}

        {activeTab === 'logs' && (
          <SystemLogsView
            logs={systemLogs}
            onClearLogs={handleClearLogs}
          />
        )}
      </main>

      {/* macOS Style Push Notification Center (Top-Right Slide) */}
      <NotificationCenter
        notifications={notifications}
        onDismiss={dismissNotification}
      />

      {/* Customizable Alert Thresholds Modal */}
      <AlertThresholdModal
        isOpen={isAlertModalOpen}
        onClose={() => setIsAlertModalOpen(false)}
        config={alertConfig}
        onSaveConfig={handleSaveAlertConfig}
        onTriggerTestNotification={handleTriggerTestNotification}
      />

      {/* Sound Customization Modal */}
      <AudioSettingsModal
        isOpen={isSoundModalOpen}
        onClose={() => setIsSoundModalOpen(false)}
      />
    </div>
  );
}
