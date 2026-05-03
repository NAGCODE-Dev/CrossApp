import React, { Suspense, useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { inject } from '@vercel/analytics';
import { injectSpeedInsights } from '@vercel/speed-insights';
import { buildGoogleRedirectUrl, signOut } from '../packages/shared-web/auth.js';
import { createCoachApiRequest } from './apiClient';
import {
  applyCoachAuthRedirectFromLocation,
  DEFAULT_COACH_RETURN_TO,
  normalizeCoachReturnTo,
} from './authFlow';
import { clearAuthSession, readProfile, readToken, writeProfile, writeToken } from './storage';
import type { CoachLoginState, CoachProfile } from './types';
import '../coach/styles.css';

const CoachWorkspace = React.lazy(() => import('./workspace.js'));
const CoachWorkspaceView = CoachWorkspace as unknown as React.ComponentType<{
  profile: CoachProfile | null;
  onLogout: () => void;
}>;
const RYXEN_ICON_SRC = new URL('../branding/exports/ryxen-icon-64.png', import.meta.url).href;

const apiRequest = createCoachApiRequest({ readToken });

setupVercelObservability();

function App() {
  const [token, setToken] = useState(readToken());
  const [profile, setProfile] = useState<CoachProfile | null>(readProfile());
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [login, setLogin] = useState<CoachLoginState>({ email: '', password: '' });

  useEffect(() => {
    let cancelled = false;

    async function handleRedirect() {
      const redirect = await applyCoachAuthRedirectFromLocation();
      if (cancelled || !redirect.handled) return;
      if (redirect.token) setToken(redirect.token);
      if (redirect.user) setProfile(redirect.user);
      if (redirect.success) {
        setMessage('Sessão iniciada com Google');
        setError('');
      } else {
        setError(redirect.error || 'Não foi possível entrar com Google');
      }
    }

    void handleRedirect();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!token) return;
    void handleBillingReturn(setMessage, setError);
  }, [token]);

  async function handleLogin(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError('');
    setMessage('');
    try {
      const result = (await apiRequest('/auth/signin', {
        method: 'POST',
        body: login as unknown as Record<string, unknown>,
        token: '',
      })) as { token?: string; user?: CoachProfile | null };
      if (result?.token) writeToken(result.token);
      if (result?.user) writeProfile(result.user);
      setToken(result.token || '');
      setProfile(result.user || null);
      setMessage('Sessão iniciada');
    } catch (err) {
      setError((err as Error | undefined)?.message || 'Erro ao entrar');
    } finally {
      setLoading(false);
    }
  }

  function handleGoogleLogin() {
    setError('');
    setMessage('');
    setLoading(true);
    try {
      const target = buildGoogleRedirectUrl();
      const returnTo = normalizeCoachReturnTo(
        `${window.location.pathname}${window.location.search}`,
        DEFAULT_COACH_RETURN_TO,
      );
      target.searchParams.set('returnTo', returnTo);
      window.location.assign(target.toString());
    } catch (err) {
      setLoading(false);
      setError((err as Error | undefined)?.message || 'Google Sign-In indisponível');
    }
  }

  async function handleLogout() {
    await signOut();
    clearAuthSession();
    setToken('');
    setProfile(null);
    setMessage('Sessão encerrada');
    setError('');
  }

  if (!token) {
    return React.createElement(
      'div',
      { className: 'portal-shell auth-shell' },
      React.createElement(
        'div',
        { className: 'auth-layout' },
        React.createElement(
          'section',
          { className: 'auth-card' },
          React.createElement(
            'div',
            { className: 'auth-brandLockup' },
            React.createElement('img', {
              className: 'auth-brandMark',
              src: RYXEN_ICON_SRC,
              alt: '',
              width: 64,
              height: 64,
            }),
            React.createElement('span', null, 'Ryxen Coach'),
          ),
          React.createElement('h1', null, 'Coach Portal'),
          React.createElement(
            'p',
            { className: 'muted auth-cardLead' },
            'Entre para publicar treinos, acompanhar atletas e consultar benchmarks.',
          ),
          error ? React.createElement('div', { className: 'notice error' }, error) : null,
          message ? React.createElement('div', { className: 'notice success' }, message) : null,
          React.createElement(
            'form',
            { className: 'stack', onSubmit: handleLogin },
            React.createElement('input', {
              className: 'field',
              type: 'email',
              placeholder: 'Email',
              value: login.email,
              onChange: (e: React.ChangeEvent<HTMLInputElement>) =>
                setLogin((prev) => ({ ...prev, email: e.target.value })),
            }),
            React.createElement('input', {
              className: 'field',
              type: 'password',
              placeholder: 'Senha',
              value: login.password,
              onChange: (e: React.ChangeEvent<HTMLInputElement>) =>
                setLogin((prev) => ({ ...prev, password: e.target.value })),
            }),
            React.createElement(
              'button',
              { className: 'btn btn-primary', type: 'submit', disabled: loading },
              loading ? 'Entrando...' : 'Entrar',
            ),
          ),
          React.createElement(
            'div',
            { className: 'auth-divider', role: 'presentation' },
            React.createElement('span', { className: 'auth-dividerText' }, 'ou continue com Google'),
          ),
          React.createElement(
            'button',
            {
              className: 'btn btn-secondary auth-googlePortalBtn',
              type: 'button',
              disabled: loading,
              onClick: handleGoogleLogin,
            },
            React.createElement('span', { className: 'auth-googlePortalMark', 'aria-hidden': 'true' }, 'G'),
            React.createElement('span', null, 'Continuar com Google'),
          ),
          React.createElement(
            'div',
            { className: 'auth-links' },
            React.createElement('a', { className: 'portal-link', href: '/' }, 'Abrir app do atleta'),
            React.createElement('a', { className: 'portal-link', href: '/support.html' }, 'Suporte'),
          ),
        ),
        React.createElement(
          'aside',
          { className: 'auth-panel' },
          React.createElement('div', { className: 'eyebrow' }, 'Operação do coach'),
          React.createElement('h2', null, 'Portal do coach'),
          React.createElement(
            'p',
            { className: 'muted auth-panelCopy' },
            'Treinos, grupos, atletas, benchmarks, rankings e acesso em uma área própria.',
          ),
          React.createElement(
            'div',
            { className: 'auth-panelPreview', 'aria-hidden': 'true' },
            React.createElement('span', null, 'Treino publicado'),
            React.createElement('strong', null, 'Grupo RX'),
            React.createElement('small', null, 'Hoje · Back Squat + Engine'),
          ),
          React.createElement(
            'div',
            { className: 'auth-panelGrid' },
            authFeatureCard(
              'Publique treinos',
              'Envie programação para todos, grupos ou atletas específicos.',
            ),
            authFeatureCard(
              'Gerencie atletas',
              'Centralize membros, grupos e contexto operacional do gym.',
            ),
            authFeatureCard(
              'Acompanhe acesso',
              'Visualize status da conta, liberações e uso herdado pelos atletas.',
            ),
            authFeatureCard('Mesma conta', 'Atleta e coach usam o mesmo login.'),
          ),
        ),
      ),
    );
  }

  return React.createElement(
    Suspense,
    {
      fallback: React.createElement(
        'div',
        { className: 'portal-shell auth-shell' },
        React.createElement(
          'div',
          { className: 'auth-layout auth-layout-loading' },
          React.createElement(
            'div',
            { className: 'auth-card' },
            React.createElement('div', { className: 'eyebrow' }, 'Ryxen'),
            React.createElement('h1', null, 'Coach Portal'),
            React.createElement('p', { className: 'muted' }, 'Carregando workspace...'),
          ),
        ),
      ),
    },
    React.createElement(CoachWorkspaceView, { profile, onLogout: () => void handleLogout() }),
  );
}

function authFeatureCard(title: string, copy: string) {
  return React.createElement(
    'div',
    { className: 'auth-feature' },
    React.createElement('strong', null, title),
    React.createElement('span', null, copy),
  );
}

async function handleBillingReturn(
  setMessage: (value: string) => void,
  setError: (value: string) => void,
): Promise<void> {
  const params = new URLSearchParams(window.location.search);
  const billing = params.get('billing');
  if (billing === 'success') {
    setMessage('Cobrança concluída. Atualize o portal.');
    clearBillingParams(params);
    return;
  }

  if (billing === 'cancel') {
    setError('Checkout cancelado');
    clearBillingParams(params);
  }
}

function clearBillingParams(params: URLSearchParams): void {
  params.delete('billing');
  const next = `${window.location.pathname}${params.toString() ? `?${params.toString()}` : ''}`;
  window.history.replaceState({}, '', next);
}

function setupVercelObservability(): void {
  if (window.__RYXEN_VERCEL_OBSERVABILITY__ || shouldSkipVercelObservability()) return;
  window.__RYXEN_VERCEL_OBSERVABILITY__ = true;
  inject();
  injectSpeedInsights();
}

function shouldSkipVercelObservability(): boolean {
  try {
    const hostname = String(window.location?.hostname || '').trim().toLowerCase();
    return hostname === 'localhost' || hostname === '127.0.0.1';
  } catch {
    return false;
  }
}

const rootNode = document.getElementById('coach-root');
if (rootNode) {
  createRoot(rootNode).render(React.createElement(App));
}
