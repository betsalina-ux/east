type DerivEnv = 'production' | 'preview';

function getEnv(): DerivEnv {
  if (typeof globalThis !== 'undefined' && typeof process !== 'undefined') {
    const env = process.env.NEXT_PUBLIC_DERIV_ENV;
    if (env === 'preview') return 'preview';
  }

  return 'production';
}

const URLS = {
  production: {
    authBase: 'https://auth.deriv.com/oauth2',
    apiBase: 'https://api.derivws.com/trading/v1/options',
    publicWs: 'wss://ws.derivws.com/websockets/v3?app_id=1',
  },
  preview: {
    authBase: 'https://auth.deriv.com/oauth2',
    apiBase: 'https://staging-api.derivws.com/trading/v1/options',
    publicWs: 'wss://ws.derivws.com/websockets/v3?app_id=1',,
  },
} as const;

export function getAuthBaseUrl(): string {
  return URLS[getEnv()].authBase;
}

export function getApiBaseUrl(): string {
  return URLS[getEnv()].apiBase;
}

export function getPublicWsUrl(): string {
  return URLS[getEnv()].publicWs;
}
