'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { handleOAuthCallback } from '@deriv/core';

function getAuthConfig() {
  return {
    clientId: process.env.NEXT_PUBLIC_DERIV_APP_ID ?? '',
    redirectUri: process.env.NEXT_PUBLIC_DERIV_REDIRECT_URI ?? '',
    scopes: process.env.NEXT_PUBLIC_DERIV_OAUTH_SCOPES ?? 'trade',
  };
}

export default function AuthCallback() {
  const router = useRouter();

  useEffect(() => {
    const run = async () => {
      try {
        await handleOAuthCallback(window.location.href, getAuthConfig());
      } catch (e) {
        console.error('OAuth callback error:', e);
      }
      router.replace('/');
    };
    run();
  }, [router]);

  return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
      <p>Authenticating, please wait...</p>
    </div>
  );
}
