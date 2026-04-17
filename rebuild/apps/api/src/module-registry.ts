export type BackendModule = {
  key:
    | "auth"
    | "athletes"
    | "gyms"
    | "workouts"
    | "benchmarks"
    | "billing"
    | "admin"
    | "telemetry"
    | "jobs";
  responsibilities: string[];
};

export const moduleRegistry: BackendModule[] = [
  {
    key: "auth",
    responsibilities: [
      "signup/signin/refresh/signout",
      "google oauth",
      "trusted device",
      "password reset",
      "password reset support",
    ],
  },
  {
    key: "athletes",
    responsibilities: [
      "summary/results/workouts",
      "measurements",
      "prs",
      "running history",
      "strength history",
      "app-state snapshots",
      "imported-plan snapshots",
    ],
  },
  {
    key: "gyms",
    responsibilities: [
      "gyms",
      "memberships",
      "groups",
      "insights",
      "access context",
    ],
  },
  {
    key: "workouts",
    responsibilities: [
      "publish workouts",
      "audience targeting",
      "feed delivery",
    ],
  },
  {
    key: "benchmarks",
    responsibilities: [
      "benchmark library",
      "result submission",
      "leaderboards",
    ],
  },
  {
    key: "billing",
    responsibilities: [
      "status",
      "entitlements",
      "checkout orchestration",
      "kiwify claims and reversals",
      "dev activation",
    ],
  },
  {
    key: "admin",
    responsibilities: [
      "overview",
      "ops health",
      "claim reprocess",
      "email retry",
      "manual reset",
      "account deletion",
    ],
  },
  {
    key: "telemetry",
    responsibilities: [
      "telemetry ingest",
      "consent-aware contracts",
    ],
  },
  {
    key: "jobs",
    responsibilities: [
      "mailer jobs",
      "retention jobs",
      "claim reconciliation",
      "account deletion workflows",
    ],
  },
];
