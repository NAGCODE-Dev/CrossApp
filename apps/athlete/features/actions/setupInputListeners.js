export function registerAthleteInputListeners({ root, filterAthletePrs }) {
  root.addEventListener('input', (event) => {
    const target = event.target;
    if (!target || target.id !== 'ui-prsSearch') return;
    filterAthletePrs(root, target.value);
  });
}

