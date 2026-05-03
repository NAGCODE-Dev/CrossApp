export interface AthleteRolloutConfig {
  app?: {
    rollout?: {
      athleteReactShell?: boolean;
    };
  };
}

export function isAthleteReactShellEnabled(config: AthleteRolloutConfig = {}): boolean {
  return config?.app?.rollout?.athleteReactShell === true;
}

export function resolveAthleteEntryUrl(
  config: AthleteRolloutConfig = {},
  fallbackUrl = '/sports/cross/index.html',
): string {
  return isAthleteReactShellEnabled(config) ? '/athlete/' : fallbackUrl;
}
