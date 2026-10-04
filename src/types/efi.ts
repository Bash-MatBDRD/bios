export type OsType = 'macos' | 'windows' | 'linux' | 'recovery' | 'diagnostics' | 'shell';

export interface BootEntry {
  id: string;
  title: string;
  version: string;
  volumeName: string;
  diskId: string;
  partitionId: string;
  osType: OsType;
  path: string;
  customArgs: string;
  isDefault: boolean;
  isAuxiliary: boolean;
  uuid: string;
  iconName: string;
  fsType: string;
  sizeGb: number;
}

export interface EFIConfig {
  bootTimeout: number; // in seconds
  defaultEntryId: string;
  resolution: '1920x1080@100Hz' | '1920x1080@60Hz' | '2560x1440@100Hz';
  sipEnabled: boolean;
  secureBootModel: 'Default' | 'Disabled' | 'j137' | 'j180';
  verboseBoot: boolean;
  showPicker: boolean;
  liquidGlassIntensity: number; // 0 to 100
  ambientGlowColor: 'amber' | 'cyan' | 'emerald' | 'violet';
  appleHotkeysEnabled: boolean;
  nvramVars: Record<string, string>;
}

export interface ComponentInfo {
  cpu: {
    model: string;
    architecture: string;
    cores: string;
    threads: string;
    baseClock: string;
    boostClock: string;
    cache: string;
    tjMax: string;
    socket: string;
    status: string;
  };
  gpu: {
    discrete: string;
    integrated: string;
    vbios: string;
    pcieBus: string;
    cudaCores: string;
    memoryBus: string;
    driverLevel: string;
  };
  ram: {
    total: string;
    speed: string;
    modules: string;
    timings: string;
    eccStatus: string;
    bandwidth: string;
  };
  disks: {
    primary: string;
    secondary: string;
    external: string;
    totalCapacity: string;
  };
  network: {
    wifi: string;
    ethernet: string;
    bluetooth: string;
    macWifi: string;
    macEth: string;
  };
  motherboard: {
    manufacturer: string;
    product: string;
    smbiosUuid: string;
    uefiFirmware: string;
    ecFirmware: string;
  };
}

export interface PartitionInfo {
  id: string;
  name: string;
  type: string;
  fsType: string;
  capacityGb: number;
  usedGb: number;
  mountPoint?: string;
  isBootable: boolean;
  uuid: string;
}

export interface DiskInfo {
  id: string;
  name: string;
  model: string;
  vendor: string;
  busType: 'PCIe 4.0 x4 NVMe' | 'PCIe 3.0 x4 NVMe' | 'SATA III' | 'USB4 / TB4';
  capacityGb: number;
  tempC: number;
  healthPercent: number;
  powerOnHours: number;
  readSpeedMBs: number;
  writeSpeedMBs: number;
  smartStatus: 'Verified' | 'Warning' | 'Failing';
  partitions: PartitionInfo[];
}

export interface DisplayInfo {
  id: string;
  name: string;
  type: 'Internal eDP' | 'External Thunderbolt / DP' | 'HDMI 2.1';
  resolution: string;
  refreshRateHz: number;
  colorSpace: string;
  bitDepth: number;
  isPrimary: boolean;
  edidVendor: string;
  timing: string;
  hdrSupport: boolean;
}

export interface CoreTelemetry {
  coreId: number;
  type: 'P-Core' | 'E-Core';
  name: string;
  currentTempC: number;
  minTempC: number;
  maxTempC: number;
  frequencyGhz: number;
  usagePercent: number;
  tjMaxMarginC: number;
}

export interface ThermalTelemetry {
  timestamp: number;
  cpuPackageC: number;
  gpuCoreC: number;
  gpuHotspotC: number;
  gpuVramC: number;
  diskPrimaryC: number;
  ambientC: number;
  fanLeftRpm: number;
  fanRightRpm: number;
  cores: CoreTelemetry[];
}

export interface ThermalAlertConfig {
  cpuWarningC: number;
  cpuCriticalC: number;
  gpuWarningC: number;
  gpuCriticalC: number;
  diskWarningC: number;
  fanMinRpm: number;
  soundEnabled: boolean;
  autoDismissSec: number;
}

export interface SystemErrorLog {
  id: string;
  timestamp: string;
  severity: 'critical' | 'warning' | 'info';
  subsystem: 'ACPI' | 'PCIE' | 'KERNEL' | 'NVRAM' | 'THERMAL' | 'GOP' | 'BOOT' | 'STORAGE';
  code: string;
  message: string;
  details?: string;
  stackTrace?: string;
}

export interface EFISnapshot {
  id: string;
  timestamp: string;
  name: string;
  description: string;
  author: string;
  config: EFIConfig;
  configPlistContent: string;
}

export interface PushNotification {
  id: string;
  title: string;
  message: string;
  severity: 'critical' | 'warning' | 'info' | 'success';
  timestamp: number;
  actionLabel?: string;
  onAction?: () => void;
}
