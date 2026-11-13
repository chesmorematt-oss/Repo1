import React, { useMemo, useState } from 'react';
import {
  X,
  MonitorDown,
  ExternalLink,
  Download,
  CheckCircle2,
  Terminal,
  Copy,
  Check,
  Sparkles,
} from 'lucide-react';
import { useDesktopInstall } from '../context/DesktopInstallContext';
import { useToast } from '../context/ToastContext';

export const InstallDesktopModal: React.FC = () => {
  const {
    canPromptNative,
    isStandalone,
    isInIframe,
    installModalOpen,
    closeInstallModal,
    triggerNativeInstall,
  } = useDesktopInstall();
  const { showToast } = useToast();

  const detectedOs = useMemo<'windows' | 'mac' | 'linux'>(() => {
    const ua = typeof navigator !== 'undefined' ? navigator.userAgent.toLowerCase() : '';
    if (ua.includes('mac')) return 'mac';
    if (ua.includes('linux')) return 'linux';
    return 'windows';
  }, []);

  const [osTab, setOsTab] = useState<'windows' | 'mac' | 'linux'>(detectedOs);
  const [copiedCmd, setCopiedCmd] = useState(false);

  if (!installModalOpen) return null;

  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  const encodedOrigin = encodeURIComponent(origin);

  const handleNativeClick = async () => {
    const outcome = await triggerNativeInstall();
    if (outcome === 'accepted') {
      showToast('IndeeCheck is being installed to your desktop!');
      closeInstallModal();
    } else if (outcome === 'dismissed') {
      showToast('Desktop install prompt dismissed.', 'info');
    }
  };

  const handleCopyCli = async () => {
    try {
      await navigator.clipboard.writeText('npm run install:desktop');
      setCopiedCmd(true);
      showToast('Copied "npm run install:desktop" to clipboard.');
      setTimeout(() => setCopiedCmd(false), 2500);
    } catch {
      // ignore
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto no-print">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-2xl overflow-hidden my-auto">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50/70">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-civic-700 text-white flex items-center justify-center shadow-sm">
              <MonitorDown className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">
                Install IndeeCheck on Your Desktop
              </h2>
              <p className="text-xs text-slate-500">
                Launch City of Independence Planning &amp; Zoning directly from your Desktop, Start Menu, or Dock
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={closeInstallModal}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200/60"
            aria-label="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-5 max-h-[82vh] overflow-y-auto">
          {/* Top Preview Banner showing actual Desktop Icon */}
          <div className="rounded-2xl bg-gradient-to-br from-slate-900 via-civic-950 to-slate-900 p-5 text-white flex flex-col sm:flex-row items-center gap-5 border border-slate-800">
            {/* Simulated Desktop Tile with real icon */}
            <div className="shrink-0 flex flex-col items-center gap-1.5 px-4 py-3 rounded-xl bg-white/10 border border-white/15 backdrop-blur-sm">
              <img
                src="/icons/icon-512.png"
                alt="IndeeCheck Desktop Icon"
                className="w-16 h-16 rounded-xl shadow-lg"
              />
              <span className="text-[11px] font-medium text-white drop-shadow">
                IndeeCheck
              </span>
            </div>

            <div className="space-y-2 text-center sm:text-left flex-1">
              <div className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-sky-300 bg-sky-400/10 border border-sky-400/20 px-2.5 py-0.5 rounded-full">
                <Sparkles className="w-3 h-3" />
                Official Independence Planning &amp; Zoning App Icon
              </div>
              <h3 className="text-base font-bold text-white">
                Standalone Desktop Window + Custom Taskbar &amp; Desktop Icon
              </h3>
              <p className="text-xs text-slate-300 leading-relaxed">
                Opens in its own dedicated application window without browser tabs, complete with
                the Independence Planning &amp; Zoning crest on your Desktop and Taskbar/Dock.
              </p>

              {isStandalone ? (
                <div className="pt-1 inline-flex items-center gap-1.5 text-xs font-bold text-emerald-300">
                  <CheckCircle2 className="w-4 h-4" />
                  Currently running in installed Desktop App mode!
                </div>
              ) : canPromptNative ? (
                <div className="pt-1">
                  <button
                    type="button"
                    onClick={handleNativeClick}
                    className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs shadow-md transition-colors"
                  >
                    <MonitorDown className="w-4 h-4" />
                    Install Desktop App Now (1-Click)
                  </button>
                </div>
              ) : isInIframe ? (
                <div className="pt-1 flex flex-wrap items-center justify-center sm:justify-start gap-2">
                  <a
                    href={origin || '/'}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white text-slate-900 hover:bg-slate-100 font-bold text-xs shadow-sm transition-colors"
                  >
                    Open in Full Browser Tab for 1-Click PWA Install
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                </div>
              ) : null}
            </div>
          </div>

          {/* Direct OS Desktop Shortcut & Icon Downloaders */}
          <div className="space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h4 className="text-sm font-bold text-slate-900">
                  Option 1: Download Desktop Shortcut &amp; Icon Installer
                </h4>
                <p className="text-xs text-slate-500">
                  Places the IndeeCheck launcher icon directly on your Desktop right now
                </p>
              </div>

              <div className="inline-flex rounded-lg bg-slate-100 p-1 self-start">
                {(
                  [
                    { id: 'windows', label: 'Windows 10/11' },
                    { id: 'mac', label: 'macOS' },
                    { id: 'linux', label: 'Linux' },
                  ] as const
                ).map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setOsTab(t.id)}
                    className={`px-2.5 py-1 rounded-md text-xs font-semibold transition-all ${
                      osTab === t.id
                        ? 'bg-white text-slate-900 shadow-sm'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
            </div>

            {osTab === 'windows' && (
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <div className="text-xs font-bold text-slate-900">
                      Windows Desktop &amp; Start Menu App Installer (Recommended)
                    </div>
                    <p className="text-xs text-slate-600 mt-0.5">
                      Downloads the official <code className="font-mono">indeecheck.ico</code> icon
                      and creates <strong>IndeeCheck - Planning &amp; Zoning</strong> on your
                      Desktop &amp; Start Menu using your default Windows browser.
                    </p>
                    <p className="text-[11px] text-amber-800 bg-amber-50 border border-amber-200 rounded-lg px-2.5 py-1.5 mt-2">
                      <strong>Cloud Preview Tip:</strong> Temporary cloud preview URLs require your active browser session. Ensure your default Windows browser matches the browser where you are signed into Arena, or use <strong>Open in Full Browser Tab</strong> above to install directly from this browser!
                    </p>
                  </div>
                  <a
                    href={`/api/desktop/windows-installer.bat?origin=${encodedOrigin}`}
                    download="Install-IndeeCheck-Desktop.bat"
                    onClick={() =>
                      showToast('Downloaded Install-IndeeCheck-Desktop.bat — open it to add your Desktop icon!')
                    }
                    className="shrink-0 inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-civic-700 hover:bg-civic-800 text-white text-xs font-semibold shadow-sm transition-colors"
                  >
                    <Download className="w-4 h-4" />
                    Download Windows Installer (.bat)
                  </a>
                </div>

                <div className="pt-2.5 border-t border-slate-200/80 flex flex-wrap items-center gap-3 text-xs">
                  <span className="text-slate-500">Or download individual files:</span>
                  <a
                    href={`/api/desktop/windows-shortcut.url?origin=${encodedOrigin}`}
                    download="IndeeCheck - Planning & Zoning.url"
                    className="font-semibold text-civic-700 hover:underline inline-flex items-center gap-1"
                  >
                    <Download className="w-3.5 h-3.5" />
                    Desktop Shortcut (.url)
                  </a>
                  <a
                    href="/indeecheck.ico"
                    download="indeecheck.ico"
                    className="font-semibold text-civic-700 hover:underline inline-flex items-center gap-1"
                  >
                    <Download className="w-3.5 h-3.5" />
                    Windows Icon (indeecheck.ico)
                  </a>
                </div>
              </div>
            )}

            {osTab === 'mac' && (
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <div className="text-xs font-bold text-slate-900">
                      macOS Desktop App Bundle Builder (<code className="font-mono">IndeeCheck.app</code>)
                    </div>
                    <p className="text-xs text-slate-600 mt-0.5">
                      Creates a native <strong>IndeeCheck.app</strong> bundle on your macOS Desktop
                      and Dock with the City of Independence Planning &amp; Zoning icon.
                    </p>
                  </div>
                  <a
                    href={`/api/desktop/macos-installer.command?origin=${encodedOrigin}`}
                    download="Install-IndeeCheck-Mac.command"
                    onClick={() =>
                      showToast('Downloaded Install-IndeeCheck-Mac.command!')
                    }
                    className="shrink-0 inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-civic-700 hover:bg-civic-800 text-white text-xs font-semibold shadow-sm transition-colors"
                  >
                    <Download className="w-4 h-4" />
                    Download macOS Installer (.command)
                  </a>
                </div>
                <p className="text-[11px] text-slate-500">
                  Tip: In Safari on macOS Sonoma+, you can also click <strong>File &rarr; Add to Dock...</strong> when viewing IndeeCheck in a full tab.
                </p>
              </div>
            )}

            {osTab === 'linux' && (
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <div className="text-xs font-bold text-slate-900">
                    Linux Desktop Entry (<code className="font-mono">IndeeCheck.desktop</code>)
                  </div>
                  <p className="text-xs text-slate-600 mt-0.5">
                    Save to <code className="font-mono">~/Desktop</code> or{' '}
                    <code className="font-mono">~/.local/share/applications/</code>.
                  </p>
                </div>
                <a
                  href={`/api/desktop/linux-shortcut.desktop?origin=${encodedOrigin}`}
                  download="IndeeCheck.desktop"
                  className="shrink-0 inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-civic-700 hover:bg-civic-800 text-white text-xs font-semibold shadow-sm"
                >
                  <Download className="w-4 h-4" />
                  Download .desktop File
                </a>
              </div>
            )}
          </div>

          {/* Browser PWA Instructions + Local CLI */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="rounded-xl border border-slate-200 p-4 space-y-2">
              <div className="text-xs font-bold text-slate-900">
                Option 2: Browser Address-Bar Install (Edge / Chrome)
              </div>
              <ol className="text-xs text-slate-600 space-y-1.5 list-decimal list-inside leading-relaxed">
                <li>
                  Open IndeeCheck in a{' '}
                  <a
                    href={origin || '/'}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-civic-700 font-semibold hover:underline"
                  >
                    full browser tab
                  </a>
                  .
                </li>
                <li>
                  Click the <strong>Install IndeeCheck</strong> monitor icon in the right side of
                  your Chrome or Microsoft Edge address bar.
                </li>
                <li>
                  Check <strong>Create Desktop shortcut</strong> and click <strong>Install</strong>.
                </li>
              </ol>
            </div>

            <div className="rounded-xl border border-slate-200 p-4 space-y-2">
              <div className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                <Terminal className="w-3.5 h-3.5 text-civic-700" />
                Option 3: Local Cloned Repo Command
              </div>
              <p className="text-xs text-slate-600 leading-relaxed">
                Running IndeeCheck locally on your computer? Run one command to place a native icon
                on your Desktop:
              </p>
              <div className="flex items-center justify-between gap-2 bg-slate-900 text-slate-100 rounded-lg px-3 py-2 font-mono text-xs">
                <span>npm run install:desktop</span>
                <button
                  type="button"
                  onClick={handleCopyCli}
                  className="text-slate-400 hover:text-white transition-colors"
                  title="Copy command"
                >
                  {copiedCmd ? (
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                  ) : (
                    <Copy className="w-3.5 h-3.5" />
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
