export interface SharedValidationError {
  path: string;
  message: string;
}

export function validateWorkoutContract(workout: unknown): {
  valid: boolean;
  errors: SharedValidationError[];
};

export function validateOnboardingContract(onboarding: unknown): {
  valid: boolean;
  errors: SharedValidationError[];
};

export function sanitizeWorkout(workout: Record<string, unknown>): {
  blocks: Array<{
    type: string;
    lines: unknown[];
  }>;
};
