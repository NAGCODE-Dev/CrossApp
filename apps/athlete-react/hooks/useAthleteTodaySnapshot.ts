import { startTransition, useCallback, useEffect, useMemo, useState } from 'react';
import { applyAuthRedirectFromLocation, signOut, startGoogleRedirect } from '../../../packages/shared-web/auth.js';
import {
  clearTodayDayOverride,
  loadAthleteTodaySnapshot,
  persistTodaySelection,
} from '../../../packages/shared-web/athlete-shell.js';
import { createTodayViewModel } from '../services/todayViewModel';
import { buildInitialSnapshot, normalizeAuthMessage } from '../services/appShellState';
import type {
  AthleteSnapshot,
  AuthResult,
  TodaySelectionItem,
  UseAthleteTodaySnapshotResult,
} from '../types';

export function useAthleteTodaySnapshot(): UseAthleteTodaySnapshotResult {
  const [snapshot, setSnapshot] = useState<AthleteSnapshot>(() => buildInitialSnapshot());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [progressMessage, setProgressMessage] = useState('');

  const viewModel = useMemo(() => createTodayViewModel(snapshot), [snapshot]);

  const loadSnapshot = useCallback(async () => {
    setLoading(true);
    try {
      const nextSnapshot = (await loadAthleteTodaySnapshot({
        sportType: 'cross',
      })) as AthleteSnapshot;
      startTransition(() => {
        setSnapshot(nextSnapshot);
      });
      setError('');
    } catch (nextError) {
      const message =
        nextError instanceof Error ? nextError.message : 'Não consegui carregar o Today agora.';
      setError(message);
    } finally {
      setLoading(false);
      setProgressMessage('');
    }
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function boot() {
      const authResult: AuthResult = await applyAuthRedirectFromLocation();
      if (cancelled) return;

      const authMessage = normalizeAuthMessage(authResult);
      if (authMessage) {
        if (authResult.success) {
          setMessage(authMessage);
          setError('');
        } else {
          setError(authMessage);
          setMessage('');
        }
      }

      await loadSnapshot();
    }

    void boot();
    return () => {
      cancelled = true;
    };
  }, [loadSnapshot]);

  const handleSelectWeek = useCallback(async (item: TodaySelectionItem) => {
    const nextWeekNumber = Number(item?.key || item?.weekNumber) || null;
    await persistTodaySelection({
      activeWeekNumber: nextWeekNumber,
      currentDay: snapshot?.currentDay || null,
    });
    await loadSnapshot();
  }, [loadSnapshot, snapshot]);

  const handleSelectDay = useCallback(async (item: TodaySelectionItem) => {
    const nextDay = String(item?.key || item?.day || '').trim() || null;
    await persistTodaySelection({
      activeWeekNumber: snapshot?.activeWeekNumber || null,
      currentDay: nextDay,
    });
    await loadSnapshot();
  }, [loadSnapshot, snapshot]);

  const handleResetDay = useCallback(async () => {
    await clearTodayDayOverride();
    await loadSnapshot();
  }, [loadSnapshot]);

  const handleStartAuth = useCallback(async () => {
    setError('');
    setMessage('');
    await startGoogleRedirect({ returnTo: '/athlete/' });
  }, []);

  const handleSignOut = useCallback(async () => {
    await signOut();
    setMessage('Sessão encerrada.');
    setError('');
    await loadSnapshot();
  }, [loadSnapshot]);

  return {
    snapshot,
    viewModel,
    loading,
    error,
    message,
    progressMessage,
    setError,
    setMessage,
    setProgressMessage,
    loadSnapshot,
    handleSelectWeek,
    handleSelectDay,
    handleResetDay,
    handleStartAuth,
    handleSignOut,
  };
}
