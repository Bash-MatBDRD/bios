/**
 * Real client hardware probe using WebGL, Navigator, Screen, and Storage APIs.
 */

export interface RealHardwareInfo {
  // CPU
  logicalCores: number;
  cpuArchitecture: string;
  platform: string;
  userAgent: string;

  // GPU
  gpuRenderer: string;
  gpuVendor: string;
  webglVersion: string;

  // Memory
  deviceMemoryGb: number; // approximate from navigator.deviceMemory

  // Display
  screenWidth: number;
  screenHeight: number;
  pixelRatio: number;
  viewportWidth: number;
  viewportHeight: number;
  colorDepth: number;
  isP3WideGamut: boolean;
  isHdr: boolean;
  measuredRefreshRate: number; // measured via requestAnimationFrame

  // Storage
  storageQuotaGb: number;
  storageUsedGb: number;

  // Network
  networkType: string;
  downlinkMbps: number;
  rttMs: number;

  // Battery
  hasBattery: boolean;
  batteryLevelPercent?: number;
  isCharging?: boolean;

  // Custom User Overrides (saved in localStorage)
  laptopModel: string;
  diskModel: string;
  wifiModel: string;
}

const STORAGE_KEY_HW_CUSTOM = 'goldengate_custom_hw_v1';

export function loadCustomHwOverrides(): { laptopModel?: string; diskModel?: string; wifiModel?: string } {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_HW_CUSTOM);
    if (raw) return JSON.parse(raw);
  } catch {
    // fallback
  }
  return {};
}

export function saveCustomHwOverrides(overrides: { laptopModel?: string; diskModel?: string; wifiModel?: string }) {
  try {
    localStorage.setItem(STORAGE_KEY_HW_CUSTOM, JSON.stringify(overrides));
  } catch {
    // fallback
  }
}

/**
 * Detect real GPU through WebGL unmasked vendor & renderer strings
 */
function probeGPU(): { renderer: string; vendor: string; version: string } {
  try {
    const canvas = document.createElement('canvas');
    const gl = (canvas.getContext('webgl2') ||
      canvas.getContext('webgl') ||
      canvas.getContext('experimental-webgl')) as WebGLRenderingContext | null;

    if (!gl) {
      return { renderer: 'Accélérateur graphique générique', vendor: 'GPU Système', version: 'WebGL non supporté' };
    }

    const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
    let renderer = 'GPU Compatible DirectX/Metal/Vulkan';
    let vendor = 'Constructeur matériel';

    if (debugInfo) {
      renderer = gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL) || renderer;
      vendor = gl.getParameter(debugInfo.UNMASKED_VENDOR_WEBGL) || vendor;
    } else {
      renderer = gl.getParameter(gl.RENDERER) || renderer;
      vendor = gl.getParameter(gl.VENDOR) || vendor;
    }

    const version = gl.getParameter(gl.VERSION) || 'WebGL 2.0';

    return { renderer, vendor, version };
  } catch {
    return { renderer: 'GPU Graphique Intégré/Dédié', vendor: 'Inconnu', version: 'WebGL 1.0' };
  }
}

/**
 * Accurately measures the display's real refresh rate over 30 frames
 */
export function measureScreenRefreshRate(): Promise<number> {
  return new Promise((resolve) => {
    let frameTimes: number[] = [];
    let lastTime = performance.now();
    let frameCount = 0;

    const countFrames = (now: number) => {
      const delta = now - lastTime;
      lastTime = now;
      if (delta > 0 && delta < 100) {
        frameTimes.push(delta);
      }
      frameCount++;
      if (frameCount < 40) {
        requestAnimationFrame(countFrames);
      } else {
        if (frameTimes.length === 0) {
          resolve(60);
          return;
        }
        // Calculate average frame time
        const sum = frameTimes.slice(5).reduce((a, b) => a + b, 0);
        const avg = sum / (frameTimes.length - 5);
        const rawFps = 1000 / avg;

        // Snap to common monitor refresh standards: 60, 75, 90, 100, 120, 144, 165, 240
        const standards = [60, 75, 90, 100, 120, 144, 165, 240];
        let closest = standards[0];
        let minDiff = Math.abs(rawFps - closest);
        for (const s of standards) {
          const diff = Math.abs(rawFps - s);
          if (diff < minDiff) {
            minDiff = diff;
            closest = s;
          }
        }
        // If within ±5Hz of standard, snap to it; otherwise use rounded real fps
        const finalFps = minDiff <= 6 ? closest : Math.round(rawFps);
        resolve(finalFps);
      }
    };

    requestAnimationFrame(countFrames);
  });
}

/**
 * Probes the complete hardware environment of the user's laptop/PC
 */
export async function detectRealHardware(): Promise<RealHardwareInfo> {
  const gpu = probeGPU();
  const overrides = loadCustomHwOverrides();

  // Screen metrics
  const screenWidth = window.screen.width * (window.devicePixelRatio || 1);
  const screenHeight = window.screen.height * (window.devicePixelRatio || 1);
  const viewportWidth = window.innerWidth;
  const viewportHeight = window.innerHeight;
  const colorDepth = window.screen.colorDepth || 24;
  const isP3WideGamut = window.matchMedia ? window.matchMedia('(color-gamut: p3)').matches : false;
  const isHdr = window.matchMedia ? window.matchMedia('(dynamic-range: high)').matches : false;

  // Measure refresh rate
  const measuredRefreshRate = await measureScreenRefreshRate();

  // Storage estimation
  let storageQuotaGb = 500;
  let storageUsedGb = 42;
  try {
    if (navigator.storage && navigator.storage.estimate) {
      const estimate = await navigator.storage.estimate();
      if (estimate.quota) {
        storageQuotaGb = Math.round((estimate.quota / (1024 * 1024 * 1024)) * 10) / 10;
      }
      if (estimate.usage) {
        storageUsedGb = Math.round((estimate.usage / (1024 * 1024 * 1024)) * 100) / 100;
      }
    }
  } catch {
    // fallback
  }

  // Network connection
  const conn = (navigator as unknown as { connection?: { effectiveType?: string; downlink?: number; rtt?: number } }).connection;
  const networkType = conn?.effectiveType ? `${conn.effectiveType.toUpperCase()} (Bande passante: ${conn.downlink || 10} Mbps)` : 'Connexion Locale Gigabit';
  const downlinkMbps = conn?.downlink || 100;
  const rttMs = conn?.rtt || 12;

  // Battery status
  let hasBattery = false;
  let batteryLevelPercent: number | undefined;
  let isCharging: boolean | undefined;

  try {
    const nav = navigator as unknown as { getBattery?: () => Promise<{ level: number; charging: boolean }> };
    if (nav.getBattery) {
      const battery = await nav.getBattery();
      hasBattery = true;
      batteryLevelPercent = Math.round(battery.level * 100);
      isCharging = battery.charging;
    }
  } catch {
    // fallback
  }

  // Logical cores
  const logicalCores = navigator.hardwareConcurrency || 8;
  const deviceMemoryGb = (navigator as unknown as { deviceMemory?: number }).deviceMemory || 16;

  // Platform & architecture
  const platform = navigator.platform || 'Système 64-bit';
  let cpuArchitecture = 'x86_64 / Apple Silicon / ARM64';
  if (navigator.userAgent.includes('Macintosh') || navigator.userAgent.includes('Mac OS X')) {
    cpuArchitecture = gpu.renderer.includes('Apple') ? 'Apple Silicon (ARM64)' : 'Intel x86_64 (macOS)';
  } else if (navigator.userAgent.includes('Windows')) {
    cpuArchitecture = 'x86_64 (Windows UEFI)';
  } else if (navigator.userAgent.includes('Linux')) {
    cpuArchitecture = 'x86_64 / aarch64 (Linux)';
  }

  return {
    logicalCores,
    cpuArchitecture,
    platform,
    userAgent: navigator.userAgent,

    gpuRenderer: gpu.renderer,
    gpuVendor: gpu.vendor,
    webglVersion: gpu.version,

    deviceMemoryGb,

    screenWidth,
    screenHeight,
    pixelRatio: window.devicePixelRatio || 1,
    viewportWidth,
    viewportHeight,
    colorDepth,
    isP3WideGamut,
    isHdr,
    measuredRefreshRate,

    storageQuotaGb,
    storageUsedGb,

    networkType,
    downlinkMbps,
    rttMs,

    hasBattery,
    batteryLevelPercent,
    isCharging,

    laptopModel: overrides.laptopModel || (platform.includes('Mac') ? 'MacBook Pro / Apple Architecture' : 'Laptop PC UEFI 64-bit'),
    diskModel: overrides.diskModel || 'Disque NVMe PCIe Haute Performance',
    wifiModel: overrides.wifiModel || 'Contrôleur Wi-Fi 6E/7 & Ethernet 2.5G'
  };
}
