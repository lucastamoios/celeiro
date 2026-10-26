export type PatternAction = 'categorize' | 'ignore';

export function getPatternCapabilities(action: PatternAction) {
  const categorizes = action === 'categorize';
  return {
    requiresTargets: categorizes,
    supportsPlannedEntries: categorizes,
    supportsRetroactive: categorizes,
  };
}

export function initialPatternAction(isIgnored: boolean): PatternAction {
  return isIgnored ? 'ignore' : 'categorize';
}
