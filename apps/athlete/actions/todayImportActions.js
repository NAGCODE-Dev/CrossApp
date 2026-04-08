export async function handleAthleteImportAction(action, context) {
  const {
    toast,
    getUiState,
    applyUiState,
    finalizeUiChange,
    renderUi,
    setUiState,
    getAppBridge,
    readAppState,
    isImportBusy,
    idleImportStatus,
    guardAthleteImport,
    prepareImportFileForClientUse,
    pickPdfFile,
    pickJsonFile,
    pickUniversalFile,
    explainImportFailure,
    formatBytes,
    IMPORT_HARD_MAX_BYTES,
    IMAGE_COMPRESS_THRESHOLD_BYTES,
    IMAGE_TARGET_MAX_BYTES,
    IMAGE_MAX_DIMENSION,
    consumeAthleteImport,
  } = context;

  switch (action) {
    case 'pdf:pick': {
      if (isImportBusy()) {
        toast('Aguarde a importacao atual terminar');
        return true;
      }
      const ui = getUiState?.() || {};
      const importPolicy = await guardAthleteImport('pdf', ui);
      await applyUiState({ importStatus: idleImportStatus() }, { render: false });
      const selectedFile = await pickPdfFile();
      if (!selectedFile) {
        await applyUiState({ importStatus: idleImportStatus() });
        return true;
      }
      const file = await prepareImportFileForClientUse(selectedFile, {
        hardMaxBytes: IMPORT_HARD_MAX_BYTES,
        imageCompressThresholdBytes: IMAGE_COMPRESS_THRESHOLD_BYTES,
        imageTargetMaxBytes: IMAGE_TARGET_MAX_BYTES,
        imageMaxDimension: IMAGE_MAX_DIMENSION,
      });
      if (!file) return true;
      await renderUi();
      const result = await getAppBridge().uploadMultiWeekPdf(file);
      if (!result?.success) {
        throw new Error(result?.error || 'Falha ao importar PDF');
      }
      importPolicy.benefits && consumeAthleteImport?.(importPolicy.benefits, 'pdf');
      await applyUiState(
        {
          modal: null,
          importStatus: idleImportStatus(),
        },
        { toastMessage: 'PDF importado' },
      );
      return true;
    }

    case 'media:pick': {
      if (isImportBusy()) {
        toast('Aguarde a importacao atual terminar');
        return true;
      }
      const ui = getUiState?.() || {};
      const importPolicy = await guardAthleteImport('media', ui);
      await applyUiState({ importStatus: idleImportStatus() }, { render: false });
      const selectedFile = await pickUniversalFile();
      if (!selectedFile) {
        await applyUiState({ importStatus: idleImportStatus() });
        return true;
      }
      const file = await prepareImportFileForClientUse(selectedFile, {
        hardMaxBytes: IMPORT_HARD_MAX_BYTES,
        imageCompressThresholdBytes: IMAGE_COMPRESS_THRESHOLD_BYTES,
        imageTargetMaxBytes: IMAGE_TARGET_MAX_BYTES,
        imageMaxDimension: IMAGE_MAX_DIMENSION,
      });
      if (!file) return true;

      if (typeof getAppBridge()?.importFromFile !== 'function') {
        throw new Error('Importação universal não disponível');
      }

      await renderUi();
      const result = await getAppBridge().importFromFile(file);
      if (!result?.success) {
        throw new Error(explainImportFailure(result?.error || 'Falha ao importar arquivo', file));
      }

      if (selectedFile && file !== selectedFile) {
        toast(`Imagem reduzida de ${formatBytes(selectedFile.size)} para ${formatBytes(file.size)}`);
      }

      importPolicy.benefits && consumeAthleteImport?.(importPolicy.benefits, 'media');
      await applyUiState(
        {
          modal: null,
          importStatus: idleImportStatus(),
        },
        { toastMessage: 'Arquivo importado' },
      );
      return true;
    }

    case 'pdf:clear': {
      const confirmed = confirm(
        '⚠️ Limpar todos os PDFs salvos?\n\n' +
        'Isso removerá todas as semanas carregadas. Esta ação não pode ser desfeita.'
      );
      if (!confirmed) return true;

      const result = await getAppBridge().clearAllPdfs();
      if (!result?.success) throw new Error(result?.error || 'Falha ao limpar PDFs');

      await finalizeUiChange({ toastMessage: 'Todos os PDFs removidos' });
      return true;
    }

    case 'workout:copy': {
      const state = readAppState();
      const blocks = state?.workoutOfDay?.blocks || state?.workout?.blocks || [];
      if (!blocks.length) {
        toast('Nenhum treino carregado');
        return true;
      }

      const result = await getAppBridge().copyWorkout();
      if (!result?.success) throw new Error(result?.error || 'Falha ao copiar');
      toast('Treino copiado');
      return true;
    }

    case 'workout:export': {
      await setUiState({ modal: null });
      const state = readAppState();
      const blocks = state?.workoutOfDay?.blocks || state?.workout?.blocks || [];
      if (!blocks.length) {
        toast('Nenhum treino carregado');
        return true;
      }

      const result = getAppBridge().exportWorkout();
      if (!result?.success) throw new Error(result?.error || 'Falha ao exportar');
      toast('Exportado');
      return true;
    }

    case 'workout:import': {
      if (isImportBusy()) {
        toast('Aguarde a importacao atual terminar');
        return true;
      }
      await applyUiState({ modal: null }, { render: false });
      const file = await pickJsonFile();
      if (!file) return true;
      try {
        const result = await getAppBridge().importWorkout(file);
        if (result?.success) {
          await finalizeUiChange({ toastMessage: 'Treino importado!' });
        } else {
          toast(explainImportFailure(result?.error || 'Erro ao importar', file));
        }
      } catch (error) {
        toast(explainImportFailure(error?.message || 'Erro ao importar', file));
        console.error(error);
      }
      return true;
    }

    case 'backup:export': {
      if (typeof getAppBridge()?.exportBackup !== 'function') {
        throw new Error('Backup não disponível nesta versão');
      }

      const result = await getAppBridge().exportBackup();
      if (!result?.success) throw new Error(result?.error || 'Falha ao exportar backup');
      toast('Backup exportado');
      return true;
    }

    case 'backup:import': {
      if (typeof getAppBridge()?.importBackup !== 'function') {
        throw new Error('Restauração não disponível nesta versão');
      }

      const file = await pickJsonFile();
      if (!file) return true;
      try {
        const result = await getAppBridge().importBackup(file);
        if (!result?.success) {
          throw new Error(result?.error || 'Falha ao restaurar backup');
        }
        await finalizeUiChange({ toastMessage: 'Backup restaurado' });
      } catch (error) {
        toast(error?.message || 'Erro ao restaurar backup');
        console.error(error);
      }
      return true;
    }

    default:
      return false;
  }
}
