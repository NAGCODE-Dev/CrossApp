export async function handleAthletePrAction(action, context) {
  const {
    element,
    root,
    toast,
    finalizeUiChange,
    getAppBridge,
    pickJsonFile,
    syncAthletePrIfAuthenticated,
    invalidateHydrationCache,
    hydrateAthleteSummary,
    hydrateAthleteResultsBlock,
    cssEscape,
  } = context;

  switch (action) {
    case 'prs:add': {
      const nameElement = root.querySelector('#ui-prsNewName');
      const valueElement = root.querySelector('#ui-prsNewValue');
      const rawName = (nameElement?.value || '').trim();
      const value = Number(valueElement?.value);

      if (!rawName) throw new Error('Informe o nome do exercício');
      if (!Number.isFinite(value) || value <= 0) throw new Error('Informe um PR válido');

      const exercise = rawName.toUpperCase();
      const result = await getAppBridge().addPR(exercise, value);
      if (!result?.success) throw new Error(result?.error || 'Falha ao adicionar PR');
      await syncAthletePrIfAuthenticated(exercise, value);

      if (nameElement) nameElement.value = '';
      if (valueElement) valueElement.value = '';
      await finalizeUiChange({ toastMessage: 'PR salvo' });
      return true;
    }

    case 'prs:save': {
      const exercise = element.dataset.exercise;
      if (!exercise) return true;

      const input = root.querySelector(
        `input[data-action="prs:editValue"][data-exercise="${cssEscape(exercise)}"]`
      );
      const value = Number(input?.value);
      if (!Number.isFinite(value) || value <= 0) throw new Error('PR inválido');

      const result = await getAppBridge().addPR(exercise, value);
      if (!result?.success) throw new Error(result?.error || 'Falha ao salvar PR');
      await syncAthletePrIfAuthenticated(exercise, value);
      await finalizeUiChange({ toastMessage: 'PR atualizado' });
      return true;
    }

    case 'prs:remove': {
      const exercise = element.dataset.exercise;
      if (!exercise) return true;

      const confirmed = confirm(`Remover PR de "${exercise}"?`);
      if (!confirmed) return true;

      const result = await getAppBridge().removePR(exercise);
      if (!result?.success) throw new Error(result?.error || 'Falha ao remover PR');
      const currentPrs = getAppBridge()?.getState?.()?.prs || {};
      if (getAppBridge()?.getProfile?.()?.data) {
        await getAppBridge()?.syncAthletePrSnapshot?.(currentPrs);
        const profile = getAppBridge()?.getProfile?.()?.data || null;
        invalidateHydrationCache({ coach: false, athlete: true, account: true });
        await hydrateAthleteSummary(profile, { force: true });
        await hydrateAthleteResultsBlock(profile, { force: true });
      }

      await finalizeUiChange({ toastMessage: 'PR removido' });
      return true;
    }

    case 'prs:import-file': {
      const file = await pickJsonFile();
      if (!file) return true;
      try {
        const text = await file.text();
        const result = getAppBridge().importPRs(text);
        if (!result?.success) throw new Error(result?.error || 'Falha ao importar');
        await finalizeUiChange({ toastMessage: `${result.imported} PRs importados de ${file.name}` });
      } catch (error) {
        toast(error?.message || 'Erro ao ler arquivo');
        console.error(error);
      }
      return true;
    }

    case 'prs:export': {
      const result = getAppBridge().exportPRs();
      if (!result?.success) throw new Error(result?.error || 'Falha ao exportar PRs');
      toast('PRs exportados');
      return true;
    }

    case 'prs:import': {
      const json = prompt('Cole aqui o JSON de PRs (ex: {"BACK SQUAT":120})');
      if (!json) return true;

      const result = getAppBridge().importPRs(json);
      if (!result?.success) throw new Error(result?.error || 'Falha ao importar PRs');
      await finalizeUiChange({ toastMessage: 'PRs importados' });
      return true;
    }

    default:
      return false;
  }
}
