import { BootEntry, ComponentInfo, DiskInfo, DisplayInfo, EFIConfig, EFISnapshot, SystemErrorLog, ThermalAlertConfig } from '../types/efi';

const STORAGE_KEY_CONFIG = 'goldengate_efi_config_v1';
const STORAGE_KEY_ENTRIES = 'goldengate_efi_entries_v1';
const STORAGE_KEY_PLIST = 'goldengate_efi_plist_v1';
const STORAGE_KEY_ALERTS = 'goldengate_efi_alerts_v1';
const STORAGE_KEY_SNAPSHOTS = 'goldengate_efi_snapshots_v1';
const STORAGE_KEY_LOGS = 'goldengate_efi_logs_v1';

export const DEFAULT_EFI_CONFIG: EFIConfig = {
  bootTimeout: 5,
  defaultEntryId: 'macos-sequoia',
  resolution: '1920x1080@100Hz',
  sipEnabled: true,
  secureBootModel: 'j180',
  verboseBoot: false,
  showPicker: true,
  liquidGlassIntensity: 85,
  ambientGlowColor: 'amber',
  appleHotkeysEnabled: true,
  nvramVars: {
    'boot-args': '-v keepsyms=1 alcid=11 agdpmod=pikera npci=0x2000',
    'prev-lang:kbd': 'fr-FR:223',
    'csr-active-config': '0x00000000',
    'bluetoothActiveControllerIOServicePath': 'IOService:/AppleACPIPlatformExpert/...',
    'run-efi-updater': 'No',
    'UIScale': '01',
    'TargetDisplayMode': '1920x1080@100Hz'
  }
};

export const DEFAULT_BOOT_ENTRIES: BootEntry[] = [
  {
    id: 'macos',
    title: 'macOS',
    version: 'OpenCore Loader',
    volumeName: 'EFICORE (LDLC F7)',
    diskId: 'ldlc-f7',
    partitionId: 'D:',
    osType: 'macos',
    path: '\\EFI\\OC\\OpenCore.efi',
    customArgs: 'keepsyms=1 alcid=11 agdpmod=pikera',
    isDefault: true,
    isAuxiliary: false,
    uuid: 'LDLC-F7-EFICORE-0001',
    iconName: 'Apple',
    fsType: 'FAT32 (195 Mo)',
    sizeGb: 195
  },
  {
    id: 'windows',
    title: 'Windows Boot Manager',
    version: 'Windows Boot Manager',
    volumeName: 'Partition EFI (KXG6A)',
    diskId: 'kxg6a',
    partitionId: 'EFI System',
    osType: 'windows',
    path: '\\EFI\\Microsoft\\Boot\\bootmgfw.efi',
    customArgs: '',
    isDefault: false,
    isAuxiliary: false,
    uuid: 'KXG6A-EFI-SYS-0002',
    iconName: 'Windows',
    fsType: 'FAT32 (EFI System)',
    sizeGb: 260
  }
];

export const DEFAULT_CONFIG_PLIST = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <!-- Apple Golden Gate Custom Bootloader Configuration -->
  <key>ACPI</key>
  <dict>
    <key>Add</key>
    <array>
      <dict>
        <key>Comment</key>
        <string>CPU Power Management Plug-in</string>
        <key>Enabled</key>
        <true/>
        <key>Path</key>
        <string>SSDT-PLUG-DRTNIA.aml</string>
      </dict>
      <dict>
        <key>Comment</key>
        <string>Embedded Controller &amp; USB Power</string>
        <key>Enabled</key>
        <true/>
        <key>Path</key>
        <string>SSDT-EC-USBX.aml</string>
      </dict>
      <dict>
        <key>Comment</key>
        <string>RTC AWAC / System Clock Sync</string>
        <key>Enabled</key>
        <true/>
        <key>Path</key>
        <string>SSDT-AWAC.aml</string>
      </dict>
    </array>
    <key>Quirks</key>
    <dict>
      <key>FadtEnableReset</key>
      <false/>
      <key>NormalizeHeaders</key>
      <false/>
      <key>RebaseRegions</key>
      <false/>
    </dict>
  </dict>
  <key>Booter</key>
  <dict>
    <key>Quirks</key>
    <dict>
      <key>AvoidRuntimeDefrag</key>
      <true/>
      <key>EnableSafeModeSlide</key>
      <true/>
      <key>ProvideCustomSlide</key>
      <true/>
      <key>SetupVirtualMap</key>
      <true/>
    </dict>
  </dict>
  <key>DeviceProperties</key>
  <dict>
    <key>Add</key>
    <dict>
      <key>PciRoot(0x0)/Pci(0x1b,0x0)</key>
      <dict>
        <key>layout-id</key>
        <data>CwAAAA==</data>
      </dict>
      <key>PciRoot(0x0)/Pci(0x2,0x0)</key>
      <dict>
        <key>AAPL,ig-platform-id</key>
        <data>AACbPg==</data>
        <key>framebuffer-patch-enable</key>
        <data>AQAAAA==</data>
      </dict>
    </dict>
  </dict>
  <key>NVRAM</key>
  <dict>
    <key>Add</key>
    <dict>
      <key>7C436110-AB2A-4BBB-A880-FE41995C9F82</key>
      <dict>
        <key>boot-args</key>
        <string>-v keepsyms=1 alcid=11 agdpmod=pikera npci=0x2000</string>
        <key>csr-active-config</key>
        <data>AAAAAA==</data>
        <key>prev-lang:kbd</key>
        <data>ZnItRlI6MjIz</data>
      </dict>
    </dict>
  </dict>
  <key>UEFI</key>
  <dict>
    <key>Output</key>
    <dict>
      <key>Resolution</key>
      <string>1920x1080@100Hz</string>
      <key>UIScale</key>
      <integer>1</integer>
      <key>ConsoleMode</key>
      <string>Max</string>
      <key>DirectGopRendering</key>
      <true/>
      <key>GopPassThrough</key>
      <string>Enabled</string>
    </dict>
    <key>Drivers</key>
    <array>
      <string>OpenRuntime.efi</string>
      <string>OpenCanopy.efi</string>
      <string>AudioDxe.efi</string>
      <string>ResetNvramEntry.efi</string>
    </array>
  </dict>
</dict>
</plist>`;

export const DEFAULT_ALERT_CONFIG: ThermalAlertConfig = {
  cpuWarningC: 82,
  cpuCriticalC: 92,
  gpuWarningC: 75,
  gpuCriticalC: 86,
  diskWarningC: 55,
  fanMinRpm: 1200,
  soundEnabled: true,
  autoDismissSec: 8
};

export const HARDWARE_DISKS: DiskInfo[] = [
  {
    id: 'ldlc-f7',
    name: 'Disque LDLC F7 (macOS & OpenCore)',
    model: 'LDLC F7 SSD NVMe PCIe',
    vendor: 'LDLC',
    busType: 'PCIe 4.0 x4 NVMe',
    capacityGb: 1000,
    tempC: 39,
    healthPercent: 100,
    powerOnHours: 1140,
    readSpeedMBs: 5000,
    writeSpeedMBs: 4400,
    smartStatus: 'Verified',
    partitions: [
      {
        id: 'D:',
        name: 'EFICORE (Partition EFI Principale)',
        type: 'EFI System (Amorçable)',
        fsType: 'FAT32 (195 Mo)',
        capacityGb: 0.195,
        usedGb: 0.055,
        mountPoint: 'D:\\',
        isBootable: true,
        uuid: 'LDLC-F7-EFICORE-0001'
      },
      {
        id: 'macos-data',
        name: 'Macintosh HD (Système macOS)',
        type: 'Apple APFS Container',
        fsType: 'APFS (macOS Tahoe 26.6)',
        capacityGb: 999.8,
        usedGb: 420,
        mountPoint: '/',
        isBootable: true,
        uuid: 'E7B49F21-987A-4C21-BD33-1A8090C5E119'
      }
    ]
  },
  {
    id: 'kxg6a',
    name: 'Disque KXG6A (Windows 11)',
    model: 'KIOXIA / Toshiba KXG6A NVMe SSD',
    vendor: 'Kioxia / Toshiba',
    busType: 'PCIe 3.0 x4 NVMe',
    capacityGb: 1024,
    tempC: 38,
    healthPercent: 100,
    powerOnHours: 1820,
    readSpeedMBs: 3200,
    writeSpeedMBs: 2900,
    smartStatus: 'Verified',
    partitions: [
      {
        id: 'kxg6a-efi',
        name: 'Partition EFI Système Windows',
        type: 'EFI System',
        fsType: 'FAT32 (260 Mo)',
        capacityGb: 0.26,
        usedGb: 0.038,
        mountPoint: undefined,
        isBootable: true,
        uuid: 'KXG6A-EFI-SYS-0002'
      },
      {
        id: 'C:',
        name: 'Windows 11 Famille Edition',
        type: 'Microsoft Basic Data',
        fsType: 'NTFS (Windows 11 Famille)',
        capacityGb: 1023.7,
        usedGb: 480,
        mountPoint: 'C:\\',
        isBootable: true,
        uuid: 'F8C1109B-12C8-4228-98BB-732B258CF442'
      }
    ]
  }
];

export const DETECTED_DISPLAYS: DisplayInfo[] = [
  {
    id: 'disp0',
    name: 'Liquid Retina XDR Pro Display (Built-in)',
    type: 'Internal eDP',
    resolution: '1920x1080 (GOP Native Framebuffer)',
    refreshRateHz: 100,
    colorSpace: 'Display P3 Wide Gamut (D65)',
    bitDepth: 10,
    isPrimary: true,
    edidVendor: 'Apple Computer Inc. (APL082F)',
    timing: '100.00 Hz vSync / 112.5 kHz hSync',
    hdrSupport: true
  },
  {
    id: 'disp1',
    name: 'Apple Studio Display 27"',
    type: 'External Thunderbolt / DP',
    resolution: '5120x2880 @ 60Hz (Thunderbolt 4 Alt Mode)',
    refreshRateHz: 60,
    colorSpace: 'Display P3 True Tone',
    bitDepth: 10,
    isPrimary: false,
    edidVendor: 'Apple Inc. (APL9241)',
    timing: '59.94 Hz vSync / 180.2 kHz hSync',
    hdrSupport: false
  }
];

export const SYSTEM_COMPONENTS: ComponentInfo = {
  cpu: {
    model: 'Intel Core i9-14900HX (Raptor Lake Refresh)',
    architecture: 'x86_64 / Hybrid Architecture',
    cores: '24 Cores (8 Performance-cores + 16 Efficient-cores)',
    threads: '32 Threads',
    baseClock: '2.20 GHz (E-Core) / 2.40 GHz (P-Core)',
    boostClock: '5.80 GHz Thermal Velocity Boost',
    cache: '36 MB Intel Smart Cache (L3)',
    tjMax: '100 °C Thermal Junction Limit',
    socket: 'BGA1964 Mobile Package',
    status: 'Nominal / All microcode patches loaded'
  },
  gpu: {
    discrete: 'NVIDIA GeForce RTX 4090 Laptop GPU (16GB GDDR6X, 175W Max TGP)',
    integrated: 'Intel UHD Graphics 770 (32 EUs, 1.65 GHz Dynamic)',
    vbios: '95.03.26.00.1F (UEFI GOP 0x7001)',
    pcieBus: 'PCI Express 4.0 x16 @ x16 16.0 GT/s',
    cudaCores: '9728 CUDA Cores / 304 Tensor Cores',
    memoryBus: '256-bit / 576.0 GB/s bandwidth',
    driverLevel: 'UEFI DirectGOP / Metal 3 / Vulkan 1.3'
  },
  ram: {
    total: '64 GB Dual-Channel DDR5',
    speed: '5600 MT/s (PC5-44800)',
    modules: '2x 32GB Kingston FURY Impact SODIMM',
    timings: 'CL38-38-38-78 @ 1.10V',
    eccStatus: 'On-Die ECC (ODECC) Verified Active',
    bandwidth: '89.6 GB/s Dual Channel Peak'
  },
  disks: {
    primary: 'Samsung 990 PRO 2TB NVMe PCIe 4.0 x4 (Health 99%)',
    secondary: 'WD_BLACK SN850X 1TB NVMe PCIe 4.0 x4 (Health 100%)',
    external: 'SanDisk Extreme Pro 1TB USB4/TB4 (Health 98%)',
    totalCapacity: '4,000 GB High-Speed Solid State'
  },
  network: {
    wifi: 'Intel Wi-Fi 7 BE200 (802.11be Tri-Band 2.4/5/6GHz, 320MHz Channel, 5.8 Gbps)',
    ethernet: 'Realtek RTL8125B 2.5 Gigabit Ethernet Controller (2500 Mbps Link)',
    bluetooth: 'Bluetooth 5.4 Dual-Mode LE Controller (Intel AX/BE Bluetooth Stack)',
    macWifi: '3C:52:82:A4:1F:02',
    macEth: '00:E0:4C:68:04:8E'
  },
  motherboard: {
    manufacturer: 'Apple GoldenGate Custom Board Platform',
    product: 'MacBookPro18,2-GOP Revision 3',
    smbiosUuid: 'E49D3902-18A2-4CF0-91AE-9828CF8721A0',
    uefiFirmware: 'Apple EFI GoldenGate Firmware v15.4.1 (EDK2 Built Sep 2026)',
    ecFirmware: 'Apple SMC Embedded Controller v2.48f12'
  }
};

export const INITIAL_ERROR_LOGS: SystemErrorLog[] = [
  {
    id: 'log-001',
    timestamp: '2026-10-03 05:22:04',
    severity: 'info',
    subsystem: 'BOOT',
    code: 'OC_TARGET_RESOLVE',
    message: 'NOVA Boot: Scan des volumes UEFI terminé. 2 cibles bootables prêtes.',
    details: 'Cible 0 : macOS Tahoe 26.6 (D:\\EFI\\OC\\OpenCore.efi sur LDLC F7 EFICORE)\nCible 1 : Windows 11 Famille Edition (\\EFI\\Microsoft\\Boot\\bootmgfw.efi sur KXG6A)',
    stackTrace: 'NOVA::ScanForTargets() [Handle 0x7E3B200, 0x7E3F400]'
  },
  {
    id: 'log-002',
    timestamp: '2026-10-03 05:22:01',
    severity: 'info',
    subsystem: 'GOP',
    code: 'GOP_FRAMEBUFFER_INIT',
    message: 'EFI_GRAPHICS_OUTPUT_PROTOCOL: Mode 1920x1080 initialisé avec succès.',
    details: 'Framebuffer Base: 0x7E000000, Pitch: 1920 pixels (7680 octets/ligne), Pixel Format: B8G8R8A8. vSync synchrone.',
    stackTrace: 'BS->LocateProtocol(&GraphicsOutputProtocol) -> EFI_SUCCESS'
  },
  {
    id: 'log-003',
    timestamp: '2026-10-03 05:21:58',
    severity: 'info',
    subsystem: 'ACPI',
    code: 'ACPI_TABLE_LOAD',
    message: 'Chargement des tables ACPI : SSDT-PLUG, SSDT-EC-USBX, SSDT-AWAC injectées.',
    details: 'DSDT OEMID: LDLC, TableID: F7-NVME. SSDT-PLUG: CPU0 _PR.PR00 plugin-type=1 validé.',
    stackTrace: 'OC::AcpiLoadTables() -> SSDT-PLUG.aml (CRC32: 0x4A19BF20)'
  },
  {
    id: 'log-004',
    timestamp: '2026-10-03 05:21:52',
    severity: 'info',
    subsystem: 'NVRAM',
    code: 'NVRAM_BOOT_ARGS',
    message: 'Lecture des variables NVRAM 7C436110-AB2A-4BBB-A880-FE41995C9F82:boot-args.',
    details: 'Valeur active : "-v keepsyms=1 alcid=11 agdpmod=pikera". SIP (csr-active-config) : 0x00000000 (Activé).',
    stackTrace: 'RT->GetVariable(L"boot-args", &gAppleBootVariableGuid, ...)'
  },
  {
    id: 'log-005',
    timestamp: '2026-10-03 05:21:40',
    severity: 'info',
    subsystem: 'KERNEL',
    code: 'KEXT_DEPENDENCY_RESOLVE',
    message: 'Extensions du noyau validées : Lilu v1.6.9, VirtualSMC v1.3.3, WhateverGreen v1.6.7, AppleALC v1.9.1.',
    details: 'Toutes les signatures kext ont passé la validation PrelinkedKernel sans conflit de symboles.',
    stackTrace: 'OpenCore::KernelProcess() [Prelinked injection OK]'
  },
  {
    id: 'log-006',
    timestamp: '2026-10-03 05:21:30',
    severity: 'warning',
    subsystem: 'STORAGE',
    code: 'DISK_TIMEOUT_CLEARED',
    message: 'Contrôleur NVMe KXG6A : NVM Express Namespace 1 réveillé après réinitialisation de liaison PCIe.',
    details: 'PCIe Link speed : Gen 3 x4 négociée. Délai d initialisation : 42 ms (Tolérance normale).',
    stackTrace: 'AppleNVMeController::Start() [Device KXG6A ready]'
  }
];

export const INITIAL_SNAPSHOT: EFISnapshot = {
  id: 'snap-factory',
  timestamp: '2026-10-03 00:00:00',
  name: 'Golden Gate Golden Master Snapshot',
  description: 'Configuration EFI avec macOS Tahoe 26.6 et Windows 11 Famille Edition.',
  author: 'Apple GoldenGate Firmware Engine',
  config: DEFAULT_EFI_CONFIG,
  configPlistContent: DEFAULT_CONFIG_PLIST
};

// Storage helper functions
export function loadEFIConfig(): EFIConfig {
  try {
    const data = localStorage.getItem(STORAGE_KEY_CONFIG);
    if (data) {
      return { ...DEFAULT_EFI_CONFIG, ...JSON.parse(data) };
    }
  } catch {
    // fallback
  }
  return DEFAULT_EFI_CONFIG;
}

export function saveEFIConfig(config: EFIConfig): void {
  try {
    localStorage.setItem(STORAGE_KEY_CONFIG, JSON.stringify(config));
  } catch (err) {
    console.error('Error saving EFI config:', err);
  }
}

export function loadBootEntries(): BootEntry[] {
  try {
    const data = localStorage.getItem(STORAGE_KEY_ENTRIES);
    if (data) {
      return JSON.parse(data);
    }
  } catch {
    // fallback
  }
  return DEFAULT_BOOT_ENTRIES;
}

export function saveBootEntries(entries: BootEntry[]): void {
  try {
    localStorage.setItem(STORAGE_KEY_ENTRIES, JSON.stringify(entries));
  } catch (err) {
    console.error('Error saving boot entries:', err);
  }
}

export function loadConfigPlist(): string {
  try {
    const data = localStorage.getItem(STORAGE_KEY_PLIST);
    if (data) return data;
  } catch {
    // fallback
  }
  return DEFAULT_CONFIG_PLIST;
}

export function saveConfigPlist(plist: string): void {
  try {
    localStorage.setItem(STORAGE_KEY_PLIST, plist);
  } catch (err) {
    console.error('Error saving config plist:', err);
  }
}

export function loadAlertConfig(): ThermalAlertConfig {
  try {
    const data = localStorage.getItem(STORAGE_KEY_ALERTS);
    if (data) {
      return { ...DEFAULT_ALERT_CONFIG, ...JSON.parse(data) };
    }
  } catch {
    // fallback
  }
  return DEFAULT_ALERT_CONFIG;
}

export function saveAlertConfig(config: ThermalAlertConfig): void {
  try {
    localStorage.setItem(STORAGE_KEY_ALERTS, JSON.stringify(config));
  } catch (err) {
    console.error('Error saving alert config:', err);
  }
}

export function loadSnapshots(): EFISnapshot[] {
  try {
    const data = localStorage.getItem(STORAGE_KEY_SNAPSHOTS);
    if (data) {
      return JSON.parse(data);
    }
  } catch {
    // fallback
  }
  return [INITIAL_SNAPSHOT];
}

export function saveSnapshots(snapshots: EFISnapshot[]): void {
  try {
    localStorage.setItem(STORAGE_KEY_SNAPSHOTS, JSON.stringify(snapshots));
  } catch (err) {
    console.error('Error saving snapshots:', err);
  }
}

export function loadSystemLogs(): SystemErrorLog[] {
  try {
    const data = localStorage.getItem(STORAGE_KEY_LOGS);
    if (data) {
      return JSON.parse(data);
    }
  } catch {
    // fallback
  }
  return INITIAL_ERROR_LOGS;
}

export function saveSystemLogs(logs: SystemErrorLog[]): void {
  try {
    localStorage.setItem(STORAGE_KEY_LOGS, JSON.stringify(logs));
  } catch (err) {
    console.error('Error saving logs:', err);
  }
}
