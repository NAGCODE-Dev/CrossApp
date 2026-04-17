export type AccessWindow = "active" | "grace" | "blocked";

export type SubscriptionRecord = {
  planId?: string | null;
  status?: string | null;
  provider?: string | null;
  renewAt?: string | null;
  updatedAt?: string | null;
};

export type SubscriptionAccessState = {
  isActive: boolean;
  isExpired: boolean;
  isGracePeriod: boolean;
  graceUntil: string | null;
  accessTier: AccessWindow;
  daysRemaining: number;
};

export type AthleteBenefitTier =
  | "base"
  | "athlete_plus"
  | "starter"
  | "pro"
  | "performance";

export type AthleteBenefitProfile = {
  tier: AthleteBenefitTier;
  coachPlan: "none" | "athlete_plus" | "starter" | "pro" | "performance";
  source: "base" | "personal" | "coach";
  label: string;
  planLabel: string;
  importsPerMonth: number | null;
  historyDays: number | null;
  premiumFeatures: boolean;
  inherited: boolean;
  personal: boolean;
  accessBlocked: boolean;
  gymId: number | null;
  gymName: string | null;
};

export type GymMembershipContextInput = {
  gymId: number;
  gymName: string | null;
  role: string;
  status: string;
  ownerSubscription: SubscriptionRecord & SubscriptionAccessState;
  canCoachManage: boolean;
  canAthletesUseApp: boolean;
  warning: string | null;
  athleteBenefits: AthleteBenefitProfile;
};

const DAY_MS = 24 * 60 * 60 * 1000;

export const ATHLETE_BENEFIT_ORDER: AthleteBenefitTier[] = [
  "base",
  "athlete_plus",
  "starter",
  "pro",
  "performance",
];

export const ATHLETE_BENEFIT_MATRIX: Record<
  AthleteBenefitTier,
  Omit<AthleteBenefitProfile, "inherited" | "personal" | "accessBlocked" | "gymId" | "gymName">
> = {
  base: {
    tier: "base",
    coachPlan: "none",
    source: "base",
    label: "Liberado",
    planLabel: "Atleta liberado",
    importsPerMonth: null,
    historyDays: null,
    premiumFeatures: true,
  },
  athlete_plus: {
    tier: "athlete_plus",
    coachPlan: "athlete_plus",
    source: "personal",
    label: "Liberado",
    planLabel: "Atleta liberado",
    importsPerMonth: null,
    historyDays: null,
    premiumFeatures: true,
  },
  starter: {
    tier: "starter",
    coachPlan: "starter",
    source: "coach",
    label: "Liberado",
    planLabel: "Atleta liberado",
    importsPerMonth: null,
    historyDays: null,
    premiumFeatures: true,
  },
  pro: {
    tier: "pro",
    coachPlan: "pro",
    source: "coach",
    label: "Liberado",
    planLabel: "Atleta liberado",
    importsPerMonth: null,
    historyDays: null,
    premiumFeatures: true,
  },
  performance: {
    tier: "performance",
    coachPlan: "performance",
    source: "coach",
    label: "Liberado",
    planLabel: "Atleta liberado",
    importsPerMonth: null,
    historyDays: null,
    premiumFeatures: true,
  },
};

function toTierRank(tier: AthleteBenefitTier) {
  return ATHLETE_BENEFIT_ORDER.indexOf(tier);
}

export function normalizeSubscriptionPlanId(value: unknown) {
  const raw = String(value || "")
    .trim()
    .toLowerCase();
  if (raw === "coach") return "pro";
  if (
    raw === "athlete plus" ||
    raw === "athlete-plus" ||
    raw === "athleteplus" ||
    raw === "plus"
  ) {
    return "athlete_plus";
  }
  if (["starter", "pro", "performance", "athlete_plus"].includes(raw)) {
    return raw;
  }
  return "";
}

export function resolveSubscriptionPlanTier(value: unknown): AthleteBenefitTier {
  const normalized = normalizeSubscriptionPlanId(value);
  if (!normalized) return "base";
  if (normalized === "athlete_plus") return "athlete_plus";
  if (normalized === "starter") return "starter";
  if (normalized === "pro") return "pro";
  if (normalized === "performance") return "performance";
  return "base";
}

export function resolveCoachPlanTier(value: unknown): "base" | "starter" | "pro" | "performance" {
  const tier = resolveSubscriptionPlanTier(value);
  return tier === "starter" || tier === "pro" || tier === "performance"
    ? tier
    : "base";
}

export function resolvePersonalAthleteTier(value: unknown): "base" | "athlete_plus" {
  const tier = resolveSubscriptionPlanTier(value);
  return tier === "athlete_plus" ? tier : "base";
}

export function computeRenewAt({
  currentRenewAt = null,
  renewDays = 30,
}: {
  currentRenewAt?: string | null;
  renewDays?: number;
} = {}) {
  const now = Date.now();
  const currentTime = currentRenewAt ? new Date(currentRenewAt).getTime() : 0;
  const baseTime = Number.isFinite(currentTime) && currentTime > now ? currentTime : now;
  return new Date(baseTime + renewDays * DAY_MS).toISOString();
}

export function getSubscriptionAccessState(
  subscription: SubscriptionRecord | null | undefined,
): SubscriptionAccessState {
  if (!subscription) {
    return {
      isActive: false,
      isExpired: true,
      isGracePeriod: false,
      graceUntil: null,
      accessTier: "blocked",
      daysRemaining: 0,
    };
  }

  const renewAt = subscription.renewAt ? new Date(subscription.renewAt) : null;
  const now = Date.now();
  const renewTime = renewAt?.getTime() || null;
  const statusActive = subscription.status === "active";
  const isRenewValid = !renewTime || renewTime >= now;
  const graceUntilTime = renewTime ? renewTime + 7 * DAY_MS : null;
  const isGracePeriod = !isRenewValid && !!graceUntilTime && graceUntilTime >= now;
  const daysRemaining = renewTime
    ? Math.max(0, Math.ceil((renewTime - now) / DAY_MS))
    : 0;

  return {
    isActive: statusActive && isRenewValid,
    isExpired: !statusActive || !isRenewValid,
    isGracePeriod,
    graceUntil: graceUntilTime ? new Date(graceUntilTime).toISOString() : null,
    accessTier: statusActive && isRenewValid ? "active" : isGracePeriod ? "grace" : "blocked",
    daysRemaining,
  };
}

export function serializeSubscriptionStatus(
  subscription: SubscriptionRecord | null | undefined,
) {
  const accessState = getSubscriptionAccessState(subscription);
  return {
    plan: normalizeSubscriptionPlanId(subscription?.planId) || null,
    status: String(subscription?.status || "inactive")
      .trim()
      .toLowerCase(),
    provider: String(subscription?.provider || "mock").trim() || "mock",
    renewAt: subscription?.renewAt || null,
    updatedAt: subscription?.updatedAt || null,
    accessTier: accessState.accessTier,
    isGracePeriod: accessState.isGracePeriod,
    graceUntil: accessState.graceUntil,
    daysRemaining: accessState.daysRemaining,
  };
}

function buildBenefitProfile(
  tier: AthleteBenefitTier,
  {
    inherited,
    personal,
    gymId = null,
    gymName = null,
  }: {
    inherited: boolean;
    personal: boolean;
    gymId?: number | null;
    gymName?: string | null;
  },
): AthleteBenefitProfile {
  return {
    ...ATHLETE_BENEFIT_MATRIX[tier],
    inherited,
    personal,
    accessBlocked: false,
    gymId,
    gymName,
  };
}

export function getAthleteBenefitProfile({
  ownerSubscription,
}: {
  ownerSubscription?: SubscriptionRecord | null;
  canAthletesUseApp?: boolean;
} = {}) {
  const tier = resolveCoachPlanTier(ownerSubscription?.planId);
  return buildBenefitProfile(tier, {
    inherited: tier !== "base",
    personal: false,
  });
}

export function getPersonalAthleteBenefitProfile(
  subscription: SubscriptionRecord | null | undefined,
) {
  const tier = resolvePersonalAthleteTier(subscription?.planId);
  return buildBenefitProfile(tier, {
    inherited: false,
    personal: tier !== "base",
  });
}

export function selectEffectiveAthleteBenefits({
  gymContexts = [],
  personalSubscription = null,
}: {
  gymContexts?: GymMembershipContextInput[];
  personalSubscription?: SubscriptionRecord | null;
}) {
  const profiles = gymContexts
    .map((context) => context.athleteBenefits)
    .filter(Boolean);

  const personalProfile = getPersonalAthleteBenefitProfile(personalSubscription);
  if (personalProfile.tier !== "base") {
    profiles.push(personalProfile);
  }

  if (!profiles.length) {
    return buildBenefitProfile("base", {
      inherited: false,
      personal: false,
    });
  }

  return profiles.reduce((best, current) => {
    const bestRank = toTierRank(best.tier);
    const currentRank = toTierRank(current.tier);

    if (currentRank > bestRank) return current;
    if (currentRank === bestRank && current.personal && !best.personal) return current;
    return best;
  });
}

export function canManageGym(role: unknown) {
  const normalized = String(role || "")
    .trim()
    .toLowerCase();
  return normalized === "owner" || normalized === "coach";
}

export function buildGymWarning(
  ownerSubscription: (SubscriptionRecord & SubscriptionAccessState) | null | undefined,
) {
  if (!ownerSubscription) {
    return "Assinatura do coach inativa ou expirada";
  }

  if (ownerSubscription.accessTier === "active") {
    return ownerSubscription.daysRemaining > 0 && ownerSubscription.daysRemaining <= 7
      ? `Assinatura vence em ${ownerSubscription.daysRemaining} dia(s)`
      : null;
  }

  if (ownerSubscription.accessTier === "grace") {
    return "Coach em periodo de graca. Atletas seguem usando o app normalmente.";
  }

  return "Assinatura do coach inativa ou expirada. Atletas seguem com acesso ao app.";
}

export function buildDefaultOwnerSubscription() {
  return {
    planId: null,
    status: "inactive",
    provider: "mock",
    renewAt: null,
    updatedAt: null,
    ...getSubscriptionAccessState(null),
  };
}

export function buildGymMembershipContext(input: {
  gymId: number;
  gymName: string | null;
  role: string;
  status: string;
  ownerSubscription?: SubscriptionRecord | null;
}) {
  const ownerSubscriptionBase = input.ownerSubscription || null;
  const ownerSubscription = {
    ...(ownerSubscriptionBase || buildDefaultOwnerSubscription()),
    ...getSubscriptionAccessState(ownerSubscriptionBase),
  };

  return {
    gymId: input.gymId,
    gymName: input.gymName,
    role: input.role,
    status: input.status,
    ownerSubscription,
    canCoachManage: ownerSubscription.accessTier === "active",
    canAthletesUseApp: true,
    warning: buildGymWarning(ownerSubscription),
    athleteBenefits: {
      ...getAthleteBenefitProfile({ ownerSubscription }),
      gymId: input.gymId,
      gymName: input.gymName,
    },
  } satisfies GymMembershipContextInput;
}

export function buildEntitlements({
  subscription,
  gymContexts = [],
}: {
  subscription?: SubscriptionRecord | null;
  gymContexts?: GymMembershipContextInput[];
}) {
  const entitlements = ["athlete_app"];
  const coachTier = resolveCoachPlanTier(subscription?.planId);
  const subscriptionState = getSubscriptionAccessState(subscription);
  const subscriptionIsEnabled =
    String(subscription?.status || "").trim().toLowerCase() === "active" ||
    subscriptionState.isGracePeriod;

  if (subscriptionIsEnabled) {
    entitlements.push("premium");
    if (coachTier === "pro" || coachTier === "performance") {
      entitlements.push("advanced_analytics");
    }
  }

  if (subscriptionIsEnabled && coachTier !== "base") {
    entitlements.push("coach_portal");
  }

  if (gymContexts.some((context) => canManageGym(context.role) && context.canCoachManage)) {
    entitlements.push("coach_portal");
  }

  const athleteBenefits = selectEffectiveAthleteBenefits({
    gymContexts,
    personalSubscription: subscription || null,
  });

  if (athleteBenefits.tier !== "base") {
    entitlements.push(
      athleteBenefits.tier === "athlete_plus"
        ? "athlete_plus"
        : `athlete_${athleteBenefits.tier}`,
    );
  }

  return Array.from(new Set(entitlements));
}
