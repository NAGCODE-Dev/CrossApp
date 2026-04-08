export function registerAthleteModalListeners({
  root,
  toast,
  getUiState,
  applyUiPatch,
  isImportBusy,
  handleAthleteModalOverlayClick,
  handleAthleteModalEscapeKey,
}) {
  root.addEventListener('click', async (event) => {
    await handleAthleteModalOverlayClick(event, {
      toast,
      getUiState,
      applyUiPatch,
      isImportBusy,
    });
  });

  document.addEventListener('keydown', async (event) => {
    await handleAthleteModalEscapeKey(event, {
      toast,
      getUiState,
      applyUiPatch,
      isImportBusy,
    });
  });
}

