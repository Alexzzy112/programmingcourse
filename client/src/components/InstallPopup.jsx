import { useState, useEffect } from 'react';

export default function InstallPopup() {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone) {
      return;
    }

    const ua = window.navigator.userAgent;
    const isSafari = /Safari/.test(ua) && !/Chrome/.test(ua);
    const ios = /iPad|iPhone|iPod/.test(ua);
    const isIOS = ios && isSafari;

    const handler = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setShow(true);
    };

    window.addEventListener('beforeinstallprompt', handler);

    if (isIOS) {
      setShow(true);
    }

    const onInstalled = () => {
      setShow(false);
      setDeferredPrompt(null);
    };
    window.addEventListener('appinstalled', onInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handler);
      window.removeEventListener('appinstalled', onInstalled);
    };
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const result = await deferredPrompt.userChoice;
    if (result.outcome === 'accepted') {
      setShow(false);
    }
    setDeferredPrompt(null);
  };

  if (window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone) return null;
  if (!show) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 p-4 pb-6">
      <div className="mx-auto max-w-md rounded-2xl bg-white shadow-2xl border border-gray-100 p-5">
        <div className="flex items-start gap-4">
          <div className="flex-shrink-0 w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
            <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
            </svg>
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-sm font-semibold text-gray-900">Install Course App</h3>
            <p className="text-xs text-gray-500 mt-0.5">
              {/iPad|iPhone|iPod/.test(window.navigator.userAgent) && /Safari/.test(window.navigator.userAgent) && !/Chrome/.test(window.navigator.userAgent)
                ? 'Tap the Share button and select "Add to Home Screen"'
                : 'Install the app for a better experience'}
            </p>
          </div>
          <button onClick={() => setShow(false)} className="flex-shrink-0 p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div className="mt-3 flex gap-2">
          <button
            onClick={() => setShow(false)}
            className="flex-1 px-4 py-2.5 text-sm font-medium text-gray-600 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors min-h-[44px]"
          >
            Later
          </button>
          {deferredPrompt && (
            <button
              onClick={handleInstall}
              className="flex-1 px-4 py-2.5 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors min-h-[44px]"
            >
              Install
            </button>
          )}
          {!deferredPrompt && /iPad|iPhone|iPod/.test(window.navigator.userAgent) && /Safari/.test(window.navigator.userAgent) && !/Chrome/.test(window.navigator.userAgent) && (
            <button
              onClick={() => setShow(false)}
              className="flex-1 px-4 py-2.5 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors min-h-[44px]"
            >
              Got it
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
