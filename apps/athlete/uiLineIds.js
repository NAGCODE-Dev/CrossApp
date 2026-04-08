let cachedLineIds = { blocks: null, ids: [] };

export function computeLineIdsFromState(state) {
  const blocks = state?.workoutOfDay?.blocks || state?.workout?.blocks || [];
  if (cachedLineIds.blocks === blocks) {
    return cachedLineIds.ids;
  }
  const ids = [];
  blocks.forEach((block, blockIndex) => {
    const lines = block?.lines || [];
    lines.forEach((_, lineIndex) => ids.push(`b${blockIndex}-l${lineIndex}`));
  });
  cachedLineIds = { blocks, ids };
  return ids;
}
