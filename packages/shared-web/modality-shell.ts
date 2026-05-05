import { getStoredProfile, refreshSession, signIn, signOut } from './auth.js';
import { getAthleteDashboard, getWorkoutFeed } from './athlete-services.js';

export interface SharedModalityModel {
  profile: unknown;
  dashboard: unknown;
  feed: unknown[];
  [key: string]: unknown;
}

export interface SharedModalityViewState {
  period?: string;
  [key: string]: unknown;
}

export interface SharedModalityAppConfig {
  root: HTMLElement | null;
  sportType?: string;
  loadHistory: () => Promise<unknown>;
  logSession: (payload: unknown) => Promise<unknown>;
  renderLoading: () => void;
  renderApp: (model: SharedModalityModel) => void;
  setStatus: (message: string, isError?: boolean) => void;
  hydratePrefill: (payload: string) => void;
  buildLogPayload: (form: HTMLFormElement) => unknown;
  getModel: () => SharedModalityModel | null;
  setModel: (model: SharedModalityModel) => void;
  getViewState: () => SharedModalityViewState;
  setViewState: (state: SharedModalityViewState) => void;
  prefillAttribute: string;
  actionAttribute: string;
  periodAttribute: string;
  loginFormId: string;
  logFormId: string;
  loginPendingMessage?: string;
  loginErrorMessage?: string;
  logPendingMessage?: string;
  logSuccessMessage?: string;
  logErrorMessage?: string;
  historyKey?: string;
}

export interface SharedModalityAppHandle {
  boot: () => Promise<void>;
}

export function startAthleteModalityApp(
  config: SharedModalityAppConfig,
): SharedModalityAppHandle | undefined {
  const {
    root,
    sportType,
    loadHistory,
    logSession,
    renderLoading,
    renderApp,
    setStatus,
    hydratePrefill,
    buildLogPayload,
    getModel,
    setModel,
    getViewState,
    setViewState,
    prefillAttribute,
    actionAttribute,
    periodAttribute,
    loginFormId,
    logFormId,
    loginPendingMessage = 'Entrando...',
    loginErrorMessage = 'Falha ao entrar',
    logPendingMessage = 'Registrando sessão...',
    logSuccessMessage = 'Sessão registrada.',
    logErrorMessage = 'Falha ao registrar sessão',
    historyKey = 'history',
  } = config || {};

  if (!root) return undefined;
  const hostRoot = root;

  hostRoot.dataset.sportType = sportType || '';
  void boot();
  bindEvents();

  async function boot() {
    renderLoading();

    const profile = getStoredProfile();
    let dashboard: unknown = null;
    let feed: unknown[] = [];
    let history: unknown = null;
    let sessionOk = !!profile;

    if (profile) {
      try {
        await refreshSession();
        [dashboard, history, feed] = await Promise.all([
          getAthleteDashboard({ sportType }),
          loadHistory(),
          getWorkoutFeed({ sportType }).then(
            (response: { workouts?: unknown[] } | null | undefined) => response?.workouts || [],
          ),
        ]);
      } catch {
        sessionOk = false;
      }
    }

    const nextModel: SharedModalityModel = {
      profile: sessionOk ? getStoredProfile() : null,
      dashboard: dashboard || null,
      feed,
      [historyKey]: history || null,
    };

    setModel(nextModel);
    renderApp(nextModel);
  }

  function bindEvents() {
    hostRoot.onclick = async (event: MouseEvent) => {
      const target = event.target as Element | null;
      const prefillPayload = target
        ?.closest(`[${prefillAttribute}]`)
        ?.getAttribute(prefillAttribute);
      if (prefillPayload) {
        hydratePrefill(prefillPayload);
        return;
      }

      const action = target?.closest(`[${actionAttribute}]`)?.getAttribute(actionAttribute);
      if (!action) return;

      if (action === 'logout') {
        await signOut();
        await boot();
        return;
      }

      if (action === 'refresh') {
        await boot();
      }
    };

    hostRoot.onchange = (event: Event) => {
      const target = event.target as HTMLInputElement | HTMLSelectElement | null;
      const periodTarget = target?.closest(
        `[${periodAttribute}]`,
      ) as HTMLInputElement | HTMLSelectElement | null;
      const period = periodTarget?.value;
      if (!period) return;
      setViewState({ ...getViewState(), period });
      const currentModel = getModel();
      if (currentModel) renderApp(currentModel);
    };

    hostRoot.onsubmit = async (event: SubmitEvent) => {
      if (!(event.target instanceof HTMLFormElement)) return;

      if (event.target.id === loginFormId) {
        event.preventDefault();

        const email = String(
          (event.target.querySelector('[name="email"]') as HTMLInputElement | null)?.value || '',
        ).trim();
        const password = String(
          (event.target.querySelector('[name="password"]') as HTMLInputElement | null)?.value || '',
        ).trim();
        if (!email || !password) return;

        setStatus(loginPendingMessage);
        try {
          await signIn({ email, password });
          await boot();
        } catch (error) {
          setStatus(error instanceof Error ? error.message : loginErrorMessage, true);
        }
        return;
      }

      if (event.target.id === logFormId) {
        event.preventDefault();
        const payload = buildLogPayload(event.target);

        setStatus(logPendingMessage);
        try {
          await logSession(payload);
          await boot();
          setStatus(logSuccessMessage);
        } catch (error) {
          setStatus(error instanceof Error ? error.message : logErrorMessage, true);
        }
      }
    };
  }

  return { boot };
}
