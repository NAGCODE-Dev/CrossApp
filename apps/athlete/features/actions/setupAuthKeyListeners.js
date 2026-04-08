export function registerAthleteAuthKeyListeners({ root, getUiState, handleAthleteAuthEnterKey }) {
  root.addEventListener('keydown', async (event) => {
    handleAthleteAuthEnterKey(event, {
      root,
      getUiState,
    });
  });

  root.addEventListener('keydown', async (event) => {
    if (event.key !== 'Enter') return;
    const target = event.target;
    if (!target?.closest?.('#ui-authForm')) return;
    if (target.tagName === 'BUTTON' || target.type === 'button') return;
    event.preventDefault();

    handleAthleteAuthEnterKey(event, {
      root,
      getUiState,
    });
  });
}

