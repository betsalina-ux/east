'use client';

import { useEffect } from 'react';

export default function AuthCallback() {
  useEffect(() => {
    const run = async () => {
      const params = new URLSearchParams(window.location.search);
      const code = params.get('code');
      const state = params.get('state');
      const error = params.get('error');

      if (error) {
        window.location.href = '/?error=' + error;
        return;
      }

      if (!code) {
        window.location.href = '/';
        return;
      }

      const savedState =
        localStorage.getItem('marketeye_pkce_state') ||
        sessionStorage.getItem('marketeye_pkce_state');

      const verifier =
        localStorage.getItem('marketeye_pkce_verifier') ||
        sessionStorage.getItem('marketeye_pkce_verifier');

      if (!verifier || !savedState || savedState !== state) {
        window.location.href = '/?error=state_mismatch';
        return;
      }

      try {
        const response = await fetch('/api/deriv/token', {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: new URLSearchParams({
            grant_type: 'authorization_code',
            code,
            client_id: process.env.NEXT_PUBLIC_DERIV_APP_ID ?? '',
            redirect_uri: process.env.NEXT_PUBLIC_DERIV_REDIRECT_URI ?? '',
            code_verifier: verifier,
          }).toString(),
        });

        const data = await response.json();

        if (data.access_token) {
          localStorage.setItem('auth_info', JSON.stringify({
            access_token: data.access_token,
            token_type: data.token_type ?? 'Bearer',
            expires_in: data.expires_in ?? 3600,
            expires_at: Math.floor(Date.now() / 1000) + (data.expires_in ?? 3600),
            scope: data.scope ?? 'trade',
            refresh_token: data.refresh_token ?? '',
          }));
          localStorage.removeItem('marketeye_pkce_state');
          localStorage.removeItem('marketeye_pkce_verifier');
          sessionStorage.removeItem('marketeye_pkce_state');
          sessionStorage.removeItem('marketeye_pkce_verifier');
        }
      } catch (e) {
        console.error('Token exchange failed:', e);
      }

      window.location.href = '/';
    };

    run();
  }, []);

  return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
      <p>Authenticating, please wait...</p>
    </div>
  );
}
