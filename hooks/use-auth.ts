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
const PKCE_STATE_KEY = 'marketeye_oauth_state';
const PKCE_REDIRECT_KEY = 'marketeye_oauth_redirect_uri';
const PKCE_CLIENT_KEY = 'marketeye_oauth_client_id';

function getAuthConfig(): AuthConfig {
  const config: AuthConfig = {
    clientId: process.env.NEXT_PUBLIC_DERIV_APP_ID ?? '',
    redirectUri:
      process.env.NEXT_PUBLIC_DERIV_REDIRECT_URI ??
      (typeof window !== 'undefined' ? window.location.origin : ''),
  };

  const scopesEnv =
    process.env.NEXT_PUBLIC_DERIV_OAUTH_SCOPES ?? 'trade,account_manage';

  config.scopes = scopesEnv
    .split(',')
    .map((s) => s.trim())
    .join(' ');

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

function randomString(length = 96): string {
  const chars =
    'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~';

  const values = new Uint8Array(length);
  crypto.getRandomValues(values);

  return Array.from(values, (v) => chars[v % chars.length]).join('');
}

function base64Url(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';

  bytes.forEach((b) => {
    binary += String.fromCharCode(b);
  });

  return btoa(binary)
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

function savePkceValue(key: string, value: string): void {
  localStorage.setItem(key, value);
  sessionStorage.setItem(key, value);
}

function readPkceValue(key: string): string | null {
  return localStorage.getItem(key) || sessionStorage.getItem(key);
}

function clearPkceValues(): void {
  [
    PKCE_VERIFIER_KEY,
    PKCE_STATE_KEY,
    PKCE_REDIRECT_KEY,
    PKCE_CLIENT_KEY,
  ].forEach((key) => {
    localStorage.removeItem(key);
    sessionStorage.removeItem(key);
  });
}

async function startDerivOAuth(
  config: AuthConfig,
  signUp = false
): Promise<void> {
  const state = randomString(32);
  const verifier = randomString(96);

  const digest = await crypto.subtle.digest(
    'SHA-256',
    new TextEncoder().encode(verifier)
  );

  const challenge = base64Url(digest);

  savePkceValue(PKCE_STATE_KEY, state);
  savePkceValue(PKCE_VERIFIER_KEY,
