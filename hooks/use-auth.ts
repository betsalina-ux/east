'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import {
  refreshAccessToken,
  fetchAccounts,
  getWebSocketOTP,
  logout as coreLogout,
  getAuthInfo,
  getDerivAccounts,
  getActiveLoginId,
  setActiveLoginId,
  setAccountType,
  clearAllAuthData,
  parseReferralLink,
} from '@deriv/core';

import type {
  AuthInfo,
  DerivAccount,
  AuthState,
  AuthConfig,
} from '@deriv/core';

const PKCE_VERIFIER_KEY = 'marketeye_pkce_verifier';
const PKCE_STATE_KEY = 'marketeye_pkce_state';
const AUTH_INFO_KEY = 'auth_info';

function getAuthConfig(): AuthConfig {
  const config: AuthConfig = {
    clientId: process.env.NEXT_PUBLIC_DERIV_APP_ID ?? '',
    redirectUri:
      process.env.NEXT_PUBLIC_DERIV_REDIRECT_URI ??
      (typeof window !== 'undefined' ? window.location.origin : ''),
  };

  const scopesEnv =
    process.env.NEXT_PUBLIC_DERIV_OAUTH_SCOPES ?? 'trade,account_manage';

  config.scopes = scopesEnv.split(',').map((s) => s.trim()).join(' ');

  const referralLink = process.env.NEXT_PUBLIC_DERIV_REFERRAL_LINK ?? '';

  if (referralLink) {
    const referral = parseReferralLink(referralLink);
    if (referral) {
      config.affiliateToken = referral.affiliateToken;
      config.affiliateTokenParam = referral.affiliateTokenParam;
      config.utmCampaign = referral.utmCampaign;
      config.utmSource = referral.utmSource;
      config.utmMedium = referral.utmMedium;
    }
  }

  return config;
}

function base64UrlEncode(bytes: Uint8Array): string {
  let binary = '';
  bytes.forEach((byte) => { binary += String.fromCharCode(byte); });
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function generateCodeVerifier(): string {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return base64UrlEncode(array);
}

async function generateCodeChallenge(verifier: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(verifier);
  const digest = await crypto.subtle.digest('SHA-256', data);
  return base64UrlEncode(new Uint8Array(digest));
}

function generateState(): string {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return base64UrlEncode(array);
}

async function startDerivOAuth(config: AuthConfig, signUp = false): Promise<void> {
  const state = generateState();
  const verifier = generateCodeVerifier();
  const challenge = await generateCodeChallenge(verifier);

  localStorage.setItem(PKCE_STATE_KEY, state);
  localStorage.setItem(PKCE_VERIFIER_KEY, verifier);
  sessionStorage.setItem(PKCE_STATE_KEY, state);
  sessionStorage.setItem(PKCE_VERIFIER_KEY, verifier);

  const params = new URLSearchParams({
    response_type: 'code',
    client_id: config.clientId,
    redirect_uri: config.redirectUri,
    scope: config.scopes ?? 'trade account_manage',
    state,
    code_challenge: challenge,
    code_challenge_method: 'S256',
  });

  if (signUp) {
    params.set('prompt', 'registration');
    if (config.affiliateToken) {
      const tokenParam = config.affiliateTokenParam ?? 't';
      params.set(tokenParam, config.affiliateToken);
    }
    if (config.utmSource) params.set('utm_source', config.utmSource);
    if (config.utmMedium) params.set('utm_medium', config.utmMedium);
    if (config.utmCampaign) params.set('utm_campaign', config.utmCampaign);
  }

  window.location.href = `https://auth.deriv.com/oauth2/auth?${params.toString()}`;
}

function getSavedVerifier(): string | null {
  return localStorage.getItem(PKCE_VERIFIER_KEY) || sessionStorage.getItem(PKCE_VERIFIER_KEY);
}

function getSavedState(): string | null {
  return localStorage.getItem(PKCE_STATE_KEY) || sessionStorage.getItem(PKCE_STATE_KEY);
}

function clearPkce(): void {
  localStorage.removeItem(PKCE_STATE_KEY);
  localStorage.removeItem(PKCE_VERIFIER_KEY);
  sessionStorage.removeItem(PKCE_STATE_KEY);
  sessionStorage.removeItem(PKCE_VERIFIER_KEY);
}

async function exchangeCodeManually(code: string): Promise<AuthInfo> {
  const config = getAuthConfig();
  const returnedState = new URL(window.location.href).searchParams.get('state');
  const savedState = getSavedState();

  if (!savedState) throw new Error('Missing saved OAuth state');
  if (!returnedState || returnedState !== savedState) throw new Error('OAuth state mismatch');

  const verifier = getSavedVerifier();
  if (!verifier) throw new Error('Missing PKCE code verifier');

  const response = await fetch('/api/deriv/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      client_id: config.clientId,
      redirect_uri: config.redirectUri,
      code_verifier: verifier,
    }).toString(),
  });

  const tokenData = await response.json();

  if (!response.ok || !tokenData.access_token) {
    throw new Error(tokenData.error_description || tokenData.error || 'Token exchange failed');
  }

  const authInfo: AuthInfo = {
    access_token: tokenData.access_token,
    token_type: tokenData.token_type ?? 'Bearer',
    expires_in: tokenData.expires_in ?? 3600,
    expires_at: tokenData.expires_at ?? Math.floor(Date.now() / 1000) + (tokenData.expires_in ?? 3600),
    scope: tokenData.scope ?? config.scopes ?? 'trade account_manage',
    refresh_token: tokenData.refresh_token ?? '',
  };

  localStorage.setItem(AUTH_INFO_KEY, JSON.stringify(authInfo));
  clearPkce();

  return authInfo;
}

export interface UseAuthReturn {
  authState: AuthState;
  accounts: DerivAccount[];
  activeAccount: DerivAccount | null;
  activeAccountId: string | null;
  wsUrl: string | undefined;
  login: () => Promise<void>;
  signUp: () => Promise<void>;
  logout: () => void;
  switchAccount: (accountId: string) => Promise<void>;
  refreshAccounts: () => Promise<void>;
  error: string | null;
}

export function useAuth(): UseAuthReturn {
  const [authState, setAuthState] = useState<AuthState>(() =>
    typeof window !== 'undefined' && getAuthInfo() ? 'authenticated' : 'unauthenticated'
  );
  const [accounts, setAccounts] = useState<DerivAccount[]>(() => {
    if (typeof window === 'undefined') return [];
    return getDerivAccounts() ?? [];
  });
  const [activeAccountId, setActiveAccountIdState] = useState<string | null>(() => {
    if (typeof window === 'undefined') return null;
    return getActiveLoginId() ?? null;
  });
  const [wsUrl, setWsUrl] = useState<string | undefined>(undefined);
  const [error, setError] = useState<string | null>(null);
  const initRef = useRef(false);
  const activeAccountIdRef = useRef<string | null>(null);
  const tabHiddenAtRef = useRef<number | null>(null);

  const fetchOTPUrl = useCallback(async (accountId: string, authInfo: AuthInfo): Promise<string> => {
    return getWebSocketOTP(accountId, authInfo, getAuthConfig().clientId);
  }, []);

  const completeAuth = useCallback(async (authInfo: AuthInfo) => {
    try {
      const fetchedAccounts = await fetchAccounts(authInfo, getAuthConfig().clientId);
      setAccounts(fetchedAccounts);
      localStorage.setItem('deriv_accounts', JSON.stringify(fetchedAccounts));

      if (fetchedAccounts.length > 0) {
        const firstAccount = fetchedAccounts[0];
        setActiveLoginId(firstAccount.account_id);
        setActiveAccountIdState(firstAccount.account_id);
        const otpUrl = await fetchOTPUrl(firstAccount.account_id, authInfo);
        setWsUrl(otpUrl);
      }

      setAuthState('authenticated');
      setError(null);
    } catch (err) {
      console.error('completeAuth failed:', err);
      setAuthState('authenticated');
      setError(err instanceof Error ? err.message : 'Account fetch failed');
    }
  }, [fetchOTPUrl]);

  useEffect(() => {
    if (initRef.current) return;
    initRef.current = true;

    const init = async () => {
      const url = new URL(window.location.href);
      const code = url.searchParams.get('code');
      const oauthError = url.searchParams.get('error');
      const oauthErrorDescription = url.searchParams.get('error_description');

      if (oauthError) {
        setError(oauthErrorDescription || oauthError);
        setAuthState('error');
        return;
      }

      if (code) {
        setAuthState('authenticating');
        try {
          const authInfo = await exchangeCodeManually(code);
          await completeAuth(authInfo);
          window.history.replaceState({}, document.title, window.location.pathname);
        } catch (err) {
          setError(err instanceof Error ? err.message : 'Authentication failed');
          setAuthState('error');
        }
        return;
      }

      const storedAuth = getAuthInfo();
      if (storedAuth) {
        if (storedAuth.expires_at && Date.now() / 1000 > storedAuth.expires_at) {
          try {
            const refreshed = await refreshAccessToken(storedAuth.refresh_token, getAuthConfig().clientId);
            await completeAuth(refreshed);
          } catch {
            clearAllAuthData();
            setAuthState('unauthenticated');
          }
          return;
        }

        const storedAccounts = getDerivAccounts();
        if (storedAccounts && storedAccounts.length > 0) {
          setAccounts(storedAccounts);
          const loginId = getActiveLoginId() ?? storedAccounts[0].account_id;
          setActiveAccountIdState(loginId);
          try {
            const otpUrl = await fetchOTPUrl(loginId, storedAuth);
            setWsUrl(otpUrl);
            setAuthState('authenticated');
          } catch {
            setAuthState('authenticated');
          }
        } else {
          await completeAuth(storedAuth);
        }
      }
    };

    init();
  }, [completeAuth, fetchOTPUrl]);

  useEffect(() => {
    activeAccountIdRef.current = activeAccountId;
  }, [activeAccountId]);

  useEffect(() => {
    if (authState !== 'authenticated') return;

    const handleVisibilityChange = async () => {
      if (document.visibilityState === 'hidden') {
        tabHiddenAtRef.current = Date.now();
        return;
      }
      const hiddenAt = tabHiddenAtRef.current;
      if (!hiddenAt || Date.now() - hiddenAt < 30_000) return;
      tabHiddenAtRef.current = null;

      const accountId = activeAccountIdRef.current;
      const authInfo = getAuthInfo();
      if (!authInfo || !accountId) return;

      try {
        const otpUrl = await fetchOTPUrl(accountId, authInfo);
        setWsUrl(otpUrl);
      } catch {
        setWsUrl(undefined);
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [authState, fetchOTPUrl]);


  const refreshAccounts = useCallback(async () => {
    const authInfo = getAuthInfo();
    if (!authInfo) return;

    try {
      const fetchedAccounts = await fetchAccounts(authInfo, getAuthConfig().clientId);
      setAccounts(fetchedAccounts);
      localStorage.setItem('deriv_accounts', JSON.stringify(fetchedAccounts));

      const currentLoginId = getActiveLoginId();

      if (currentLoginId && fetchedAccounts.some((a) => a.account_id === currentLoginId)) {
        setActiveAccountIdState(currentLoginId);
      } else if (fetchedAccounts.length > 0) {
        setActiveLoginId(fetchedAccounts[0].account_id);
        setActiveAccountIdState(fetchedAccounts[0].account_id);
      }
    } catch (err) {
      console.error('refreshAccounts failed:', err);
    }
  }, []);

  useEffect(() => {
    window.addEventListener('marketeye:refresh-accounts', refreshAccounts);
    return () => window.removeEventListener('marketeye:refresh-accounts', refreshAccounts);
  }, [refreshAccounts]);

  const login = useCallback(async () => {
    await startDerivOAuth(getAuthConfig(), false);
  }, []);

  const signUp = useCallback(async () => {
    await startDerivOAuth(getAuthConfig(), true);
  }, []);

  const logout = useCallback(() => {
    coreLogout();
    setAccounts([]);
    setActiveAccountIdState(null);
    setWsUrl(undefined);
    setAuthState('unauthenticated');
    setError(null);
  }, []);

  const switchAccount = useCallback(async (accountId: string) => {
    const authInfo = getAuthInfo();
    if (!authInfo) return;
    try {
      const account = accounts.find((a) => a.account_id === accountId);
      if (account) setAccountType(account.account_type);
      const otpUrl = await fetchOTPUrl(accountId, authInfo);
      setActiveLoginId(accountId);
      setActiveAccountIdState(accountId);
      setWsUrl(otpUrl);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Account switch failed');
    }
  }, [fetchOTPUrl, accounts]);

  const activeAccount = accounts.find((acc) => acc.account_id === activeAccountId) ?? accounts[0] ?? null;

  return { authState, accounts, activeAccount, activeAccountId, wsUrl, login, signUp, logout, switchAccount, refreshAccounts, error };
}
