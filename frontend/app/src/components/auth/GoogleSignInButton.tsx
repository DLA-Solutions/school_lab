import { useEffect, useRef } from 'react';
import Box from '@mui/material/Box';

const GOOGLE_SCRIPT_URL = 'https://accounts.google.com/gsi/client';

let scriptLoadPromise: Promise<void> | null = null;

const loadGoogleScript = () => {
  if (window.google?.accounts?.id) {
    return Promise.resolve();
  }

  if (!scriptLoadPromise) {
    scriptLoadPromise = new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = GOOGLE_SCRIPT_URL;
      script.async = true;
      script.defer = true;
      script.onload = () => resolve();
      script.onerror = () => reject(new Error('Failed to load Google Identity Services'));
      document.head.appendChild(script);
    });
  }

  return scriptLoadPromise;
};

interface GoogleSignInButtonProps {
  onCredential: (idToken: string) => void;
  disabled?: boolean;
  locale?: string;
}

const GoogleSignInButton = ({ onCredential, disabled = false, locale = 'pt-BR' }: GoogleSignInButtonProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const clientId = import.meta.env.VITE_GOOGLE_OAUTH_CLIENT_ID?.trim();

  useEffect(() => {
    if (!clientId || disabled) {
      return;
    }

    let cancelled = false;

    const renderButton = async () => {
      try {
        await loadGoogleScript();
        if (cancelled || !containerRef.current || !window.google?.accounts?.id) {
          return;
        }

        containerRef.current.replaceChildren();

        window.google.accounts.id.initialize({
          client_id: clientId,
          callback: (response) => {
            if (response.credential) {
              onCredential(response.credential);
            }
          },
        });

        window.google.accounts.id.renderButton(containerRef.current, {
          theme: 'outline',
          size: 'large',
          text: 'signin_with',
          width: containerRef.current.offsetWidth || 400,
          locale,
        });
      } catch {
        // GIS unavailable — button container stays empty; password login remains usable.
      }
    };

    renderButton();

    return () => {
      cancelled = true;
    };
  }, [clientId, disabled, locale, onCredential]);

  if (!clientId) {
    return null;
  }

  return (
    <Box
      ref={containerRef}
      sx={{
        width: '100%',
        display: 'flex',
        justifyContent: 'center',
        opacity: disabled ? 0.5 : 1,
        pointerEvents: disabled ? 'none' : 'auto',
      }}
    />
  );
};

export default GoogleSignInButton;
