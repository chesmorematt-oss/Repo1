import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
  prompt(): Promise<void>;
}

interface DesktopInstallContextValue {
  canPromptNative: boolean;
  isStandalone: boolean;
  isInIframe: boolean;
  installModalOpen: boolean;
  openInstallModal: () => void;
  closeInstallModal: () => void;
  triggerNativeInstall: () => Promise<'accepted' | 'dismissed' | 'unavailable'>;
}

const DesktopInstallContext = createContext<DesktopInstallContextValue>({
  canPromptNative: false,
  isStandalone: false,
  isInIframe: false,
  installModalOpen: false,
  openInstallModal: () => {},
  closeInstallModal: () => {},
  triggerNativeInstall: async () => 'unavailable',
});

export function DesktopInstallProvider({ children }: { children: React.ReactNode }) {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isStandalone, setIsStandalone] = useState(false);
  const [isInIframe, setIsInIframe] = useState(false);
  const [installModalOpen, setInstallModalOpen] = useState(false);

  useEffect(() => {
    try {
      setIsInIframe(window.self !== window.top);
    } catch {
      setIsInIframe(true);
    }

    const checkStandalone = () => {
      const mq = window.matchMedia?.('(display-mode: standalone)').matches;
      const iosStandalone = Boolean((window.navigator as unknown as { standalone?: boolean }).standalone);
      setIsStandalone(Boolean(mq || iosStandalone));
    };
    checkStandalone();

    const onBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    const onAppInstalled = () => {
      setDeferredPrompt(null);
      setIsStandalone(true);
    };

    window.addEventListener('beforeinstallprompt', onBeforeInstallPrompt);
    window.addEventListener('appinstalled', onAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', onBeforeInstallPrompt);
      window.removeEventListener('appinstalled', onAppInstalled);
    };
  }, []);

  const triggerNativeInstall = useCallback(async () => {
    if (!deferredPrompt) return 'unavailable';
    await deferredPrompt.prompt();
    const choice = await deferredPrompt.userChoice;
    if (choice.outcome === 'accepted') {
      setDeferredPrompt(null);
    }
    return choice.outcome;
  }, [deferredPrompt]);

  return (
    <DesktopInstallContext.Provider
      value={{
        canPromptNative: Boolean(deferredPrompt),
        isStandalone,
        isInIframe,
        installModalOpen,
        openInstallModal: () => setInstallModalOpen(true),
        closeInstallModal: () => setInstallModalOpen(false),
        triggerNativeInstall,
      }}
    >
      {children}
    </DesktopInstallContext.Provider>
  );
}

export function useDesktopInstall() {
  return useContext(DesktopInstallContext);
}
