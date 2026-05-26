
'use client';

import { useEffect } from 'react';

export default function AuthCallback() {
  useEffect(() => {
    const params = window.location.search;
    window.location.href = '/' + params;
  }, []);

  return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
      <p>Authenticating, please wait...</p>
    </div>
  );
}
