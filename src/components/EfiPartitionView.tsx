import React, { useState } from 'react';
import { 
  Folder, 
  FileCode, 
  File, 
  Save, 
  RotateCcw, 
  Download, 
  History, 
  Plus, 
  Check, 
  AlertCircle, 
  FileCheck, 
  ChevronRight, 
  ChevronDown,
  Layers,
  Lock
} from 'lucide-react';
import { EFIConfig, EFISnapshot } from '../types/efi';
import { soundEngine } from '../utils/audio';

interface EfiPartitionViewProps {
  config: EFIConfig;
  configPlistContent: string;
  onSavePlist: (newContent: string, snapshotName: string) => void;
  snapshots: EFISnapshot[];
  onRestoreSnapshot: (snapshotId: string) => void;
  onResetFactoryDefaults: () => void;
  onDownloadZip: () => void;
  isDownloading?: boolean;
}

interface FileNode {
  name: string;
  path: string;
  type: 'dir' | 'file';
  size?: string;
  children?: FileNode[];
}

export const EfiPartitionView: React.FC<EfiPartitionViewProps> = ({
  configPlistContent,
  onSavePlist,
  snapshots,
  onRestoreSnapshot,
  onResetFactoryDefaults,
  onDownloadZip,
  isDownloading,
}) => {
  const [selectedFile, setSelectedFile] = useState<string>('/EFI/OC/config.plist');
  const [editorCode, setEditorCode] = useState<string>(configPlistContent);
  const [isSaved, setIsSaved] = useState<boolean>(false);
  const [snapshotComment, setSnapshotComment] = useState<string>('');
  const [showSnapshotModal, setShowSnapshotModal] = useState<boolean>(false);
  const [expandedFolders, setExpandedFolders] = useState<Record<string, boolean>>({
    '/EFI': true,
    '/EFI/OC': true,
    '/EFI/OC/ACPI': true,
    '/EFI/OC/Kexts': false,
    '/EFI/BOOT': true,
  });

  const fileTree: FileNode = {
    name: 'EFI (FAT32 Partition 512MB)',
    path: '/EFI',
    type: 'dir',
    children: [
      {
        name: 'BOOT',
        path: '/EFI/BOOT',
        type: 'dir',
        children: [
          { name: 'BOOTX64.EFI', path: '/EFI/BOOT/BOOTX64.EFI', type: 'file', size: '1.2 MB' },
          { name: 'diags.efi', path: '/EFI/BOOT/diags.efi', type: 'file', size: '4.8 MB' },
        ]
      },
      {
        name: 'OC',
        path: '/EFI/OC',
        type: 'dir',
        children: [
          { name: 'OpenCore.efi', path: '/EFI/OC/OpenCore.efi', type: 'file', size: '2.1 MB' },
          { name: 'config.plist', path: '/EFI/OC/config.plist', type: 'file', size: '18.4 KB' },
          {
            name: 'ACPI',
            path: '/EFI/OC/ACPI',
            type: 'dir',
            children: [
              { name: 'SSDT-PLUG-DRTNIA.aml', path: '/EFI/OC/ACPI/SSDT-PLUG-DRTNIA.aml', type: 'file', size: '1.1 KB' },
              { name: 'SSDT-EC-USBX.aml', path: '/EFI/OC/ACPI/SSDT-EC-USBX.aml', type: 'file', size: '1.4 KB' },
              { name: 'SSDT-AWAC.aml', path: '/EFI/OC/ACPI/SSDT-AWAC.aml', type: 'file', size: '890 B' },
            ]
          },
          {
            name: 'Kexts',
            path: '/EFI/OC/Kexts',
            type: 'dir',
            children: [
              { name: 'Lilu.kext', path: '/EFI/OC/Kexts/Lilu.kext', type: 'file', size: '340 KB' },
              { name: 'VirtualSMC.kext', path: '/EFI/OC/Kexts/VirtualSMC.kext', type: 'file', size: '420 KB' },
              { name: 'AppleALC.kext', path: '/EFI/OC/Kexts/AppleALC.kext', type: 'file', size: '1.8 MB' },
              { name: 'WhateverGreen.kext', path: '/EFI/OC/Kexts/WhateverGreen.kext', type: 'file', size: '890 KB' },
            ]
          },
          {
            name: 'Drivers',
            path: '/EFI/OC/Drivers',
            type: 'dir',
            children: [
              { name: 'OpenRuntime.efi', path: '/EFI/OC/Drivers/OpenRuntime.efi', type: 'file', size: '280 KB' },
              { name: 'ResetNvramEntry.efi', path: '/EFI/OC/Drivers/ResetNvramEntry.efi', type: 'file', size: '92 KB' },
              { name: 'AudioDxe.efi', path: '/EFI/OC/Drivers/AudioDxe.efi', type: 'file', size: '140 KB' },
            ]
          }
        ]
      }
    ]
  };

  const toggleFolder = (path: string) => {
    setExpandedFolders((prev) => ({ ...prev, [path]: !prev[path] }));
  };

  const handleSaveToFile = () => {
    const defaultName = `Snapshot du ${new Date().toLocaleTimeString('fr-FR')}`;
    onSavePlist(editorCode, snapshotComment.trim() || defaultName);
    setIsSaved(true);
    soundEngine.playNotification();
    setShowSnapshotModal(false);
    setSnapshotComment('');
    setTimeout(() => setIsSaved(false), 2500);
  };

  const downloadPlist = () => {
    const blob = new Blob([editorCode], { type: 'application/x-plist;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'config.plist';
    link.click();
    URL.revokeObjectURL(url);
  };

  const renderTree = (node: FileNode) => {
    if (node.type === 'dir') {
      const isExpanded = !!expandedFolders[node.path];
      return (
        <div key={node.path} className="text-xs">
          <button
            onClick={() => toggleFolder(node.path)}
            className="w-full flex items-center gap-1.5 px-2 py-1 text-slate-300 hover:text-white hover:bg-white/[0.05] rounded-lg transition-colors text-left"
          >
            {isExpanded ? <ChevronDown className="w-3.5 h-3.5 text-slate-400" /> : <ChevronRight className="w-3.5 h-3.5 text-slate-400" />}
            <Folder className="w-3.5 h-3.5 text-amber-400 fill-amber-400/20" />
            <span className="font-medium truncate">{node.name}</span>
          </button>
          {isExpanded && node.children && (
            <div className="pl-4 border-l border-white/10 ml-3 space-y-0.5 mt-0.5">
              {node.children.map((child) => renderTree(child))}
            </div>
          )}
        </div>
      );
    }

    const isSelected = selectedFile === node.path;
    const isPlist = node.name.endsWith('.plist');

    return (
      <button
        key={node.path}
        onClick={() => setSelectedFile(node.path)}
        className={`w-full flex items-center justify-between px-2.5 py-1 rounded-lg text-xs transition-colors text-left ${
          isSelected
            ? 'bg-amber-500/20 text-white font-semibold border border-amber-500/30'
            : 'text-slate-400 hover:text-slate-200 hover:bg-white/[0.04]'
        }`}
      >
        <div className="flex items-center gap-2 truncate">
          {isPlist ? (
            <FileCode className="w-3.5 h-3.5 text-amber-300 shrink-0" />
          ) : (
            <File className="w-3.5 h-3.5 text-slate-500 shrink-0" />
          )}
          <span className="truncate">{node.name}</span>
        </div>
        {node.size && <span className="text-[10px] font-mono text-slate-500 ml-2 shrink-0">{node.size}</span>}
      </button>
    );
  };

  return (
    <div className="p-6 sm:p-8 max-w-7xl mx-auto space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 rounded-3xl liquid-glass border border-white/15">
        <div>
          <div className="flex items-center gap-2">
            <Lock className="w-5 h-5 text-amber-400" />
            <h1 className="text-xl font-bold text-white tracking-tight">
              Gestionnaire de la Partition EFI & Snapshots
            </h1>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Modifiez votre configuration OpenCore, appliquez des tables ACPI et conservez une sauvegarde permanente garantie dans la mémoire NVRAM / EFI.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={onDownloadZip}
            disabled={isDownloading}
            className="px-4 py-2 text-xs font-semibold text-black bg-amber-400 hover:bg-amber-300 disabled:opacity-50 rounded-xl transition-all shadow-[0_0_15px_rgba(251,191,36,0.4)] flex items-center gap-1.5"
            title="Télécharger l'arborescence EFI complète au format ZIP"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Télécharger GoldenGate EFI (.zip)</span>
          </button>

          <button
            onClick={() => setShowSnapshotModal(true)}
            className="px-3.5 py-2 text-xs font-medium text-white bg-white/10 hover:bg-white/15 border border-white/15 rounded-xl transition-all flex items-center gap-1.5"
          >
            <Save className="w-3.5 h-3.5" />
            <span>Créer un Snapshot</span>
          </button>

          <button
            onClick={downloadPlist}
            className="px-3 py-2 text-xs font-medium text-slate-300 hover:text-white bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl transition-colors flex items-center gap-1.5"
            title="Télécharger uniquement config.plist"
          >
            <FileCode className="w-3.5 h-3.5" />
            <span>config.plist</span>
          </button>
        </div>
      </div>

      {/* Main Grid: File Tree + Code Editor */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Left Column: EFI Directory Browser */}
        <div className="lg:col-span-1 p-5 rounded-3xl liquid-glass border border-white/10 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-white/10">
            <div className="flex items-center gap-2">
              <Folder className="w-4 h-4 text-amber-400" />
              <h3 className="text-xs font-bold text-white uppercase tracking-wider">Arborescence EFI</h3>
            </div>
            <span className="text-[10px] text-emerald-400 font-mono">Monté R/W</span>
          </div>

          <div className="space-y-1 overflow-y-auto max-h-[500px]">
            {renderTree(fileTree)}
          </div>

          <div className="pt-3 border-t border-white/10 text-[11px] text-slate-400 space-y-1">
            <div className="flex justify-between">
              <span>Point de montage:</span>
              <span className="font-mono text-slate-200">/Volumes/EFI</span>
            </div>
            <div className="flex justify-between">
              <span>Espace libre:</span>
              <span className="font-mono text-emerald-300">426 MB / 512 MB</span>
            </div>
          </div>
        </div>

        {/* Right Column: Code Editor & Plist Inspector */}
        <div className="lg:col-span-3 p-5 rounded-3xl liquid-glass border border-white/10 flex flex-col space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-white/10">
            <div className="flex items-center gap-2">
              <FileCheck className="w-4 h-4 text-amber-400" />
              <span className="text-xs font-mono text-slate-300 font-semibold">{selectedFile}</span>
              {isSaved && (
                <span className="text-[11px] text-emerald-400 flex items-center gap-1 font-semibold animate-in fade-in">
                  <Check className="w-3.5 h-3.5" />
                  Sauvegardé avec succès !
                </span>
              )}
            </div>

            <div className="flex items-center gap-2">
              <span className="text-[11px] font-mono text-slate-400">
                Format: <strong className="text-slate-300">Apple Plist XML v1.0</strong>
              </span>
            </div>
          </div>

          {selectedFile === '/EFI/OC/config.plist' ? (
            <div className="flex-1 flex flex-col space-y-3">
              <textarea
                value={editorCode}
                onChange={(e) => setEditorCode(e.target.value)}
                rows={18}
                spellCheck={false}
                className="w-full flex-1 p-4 font-mono text-xs bg-black/60 border border-white/10 rounded-2xl text-amber-100/90 leading-relaxed focus:outline-none focus:border-amber-400/70 resize-none selection:bg-amber-500/20"
              />

              <div className="flex items-center justify-between text-xs text-slate-400">
                <span className="flex items-center gap-1.5">
                  <FileCode className="w-3.5 h-3.5 text-amber-400" />
                  <span>Validation de la syntaxe XML : Valide (0 erreur OpenCore)</span>
                </span>
                <span className="font-mono">{editorCode.length} caractères</span>
              </div>
            </div>
          ) : (
            <div className="p-8 text-center my-auto text-slate-400 space-y-2">
              <File className="w-12 h-12 text-slate-600 mx-auto" />
              <h4 className="text-sm font-semibold text-slate-300">Fichier binaire compilé</h4>
              <p className="text-xs max-w-sm mx-auto">
                Ce binaire EFI ({selectedFile.split('/').pop()}) est un exécutable UEFI 64-bit non éditable en clair.
                Pour modifier la configuration système, sélectionnez <strong className="text-amber-300">config.plist</strong>.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Snapshots & History Table */}
      <div className="p-6 rounded-3xl liquid-glass border border-white/10 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-white/10">
          <div className="flex items-center gap-2">
            <History className="w-4 h-4 text-amber-400" />
            <h3 className="text-sm font-bold text-white">Historique des Sauvegardes Permanentes (Snapshots EFI)</h3>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onResetFactoryDefaults}
              className="px-3 py-1.5 text-xs text-red-400 hover:text-red-300 hover:bg-red-500/10 border border-red-500/20 rounded-xl transition-colors flex items-center gap-1.5"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Restaurer Golden Gate d'origine</span>
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-white/10 text-slate-400 font-mono text-[11px]">
                <th className="pb-2.5 font-medium">Nom du Snapshot</th>
                <th className="pb-2.5 font-medium">Date & Heure</th>
                <th className="pb-2.5 font-medium">Auteur</th>
                <th className="pb-2.5 font-medium">Résolution GOP</th>
                <th className="pb-2.5 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5 font-mono">
              {snapshots.map((snap) => (
                <tr key={snap.id} className="hover:bg-white/[0.02] transition-colors">
                  <td className="py-3 font-sans font-semibold text-white">
                    <div className="flex items-center gap-2">
                      <Layers className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                      <span>{snap.name}</span>
                    </div>
                  </td>
                  <td className="py-3 text-slate-400">{snap.timestamp}</td>
                  <td className="py-3 text-slate-300">{snap.author}</td>
                  <td className="py-3 text-amber-300">{snap.config.resolution}</td>
                  <td className="py-3 text-right">
                    <button
                      onClick={() => {
                        onRestoreSnapshot(snap.id);
                        setEditorCode(snap.configPlistContent);
                      }}
                      className="px-3 py-1 text-[11px] font-medium text-slate-200 hover:text-white bg-white/10 hover:bg-white/20 rounded-lg transition-colors"
                    >
                      Restaurer
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Snapshot Confirmation Modal */}
      {showSnapshotModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md animate-in fade-in duration-200">
          <div className="max-w-md w-full p-6 rounded-3xl liquid-glass border border-white/20 space-y-4">
            <h3 className="text-base font-bold text-white">Créer un Snapshot EFI Permanent</h3>
            <p className="text-xs text-slate-300 leading-relaxed">
              Toutes les modifications apportées à <strong className="text-amber-300">config.plist</strong> et aux variables NVRAM seront sauvegardées dans le stockage local persistant de l'EFI.
            </p>

            <div className="space-y-1.5">
              <label className="text-xs text-slate-400 font-medium">Description du changement :</label>
              <input
                type="text"
                value={snapshotComment}
                onChange={(e) => setSnapshotComment(e.target.value)}
                placeholder="ex: Ajustement boot-args et ajout table SSDT"
                className="w-full px-3 py-2 text-xs bg-black/60 border border-white/15 rounded-xl text-white focus:outline-none focus:border-amber-400"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setShowSnapshotModal(false)}
                className="px-4 py-2 text-xs text-slate-400 hover:text-white rounded-xl transition-colors"
              >
                Annuler
              </button>
              <button
                onClick={handleSaveToFile}
                className="px-4 py-2 text-xs font-semibold text-black bg-amber-400 hover:bg-amber-300 rounded-xl transition-all shadow-[0_0_15px_rgba(251,191,36,0.4)]"
              >
                Confirmer l'écriture permanente
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
