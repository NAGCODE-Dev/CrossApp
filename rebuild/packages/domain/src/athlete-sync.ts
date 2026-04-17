import {
  athleteAppStateSnapshotSchema,
  importedPlanSnapshotSchema,
} from "@ryxen/contracts";
import type { z } from "zod";

export type AthleteAppStateSnapshot = z.infer<typeof athleteAppStateSnapshotSchema>;
export type ImportedPlanSnapshot = z.infer<typeof importedPlanSnapshotSchema>;

export type SyncOutboxItem =
  | { kind: "app-state"; payload: AthleteAppStateSnapshot }
  | { kind: "imported-plan"; payload: ImportedPlanSnapshot }
  | { kind: "prs"; payload: Record<string, number> }
  | { kind: "measurements"; payload: unknown[] };

export interface AthleteSyncRepository {
  readAppState(): Promise<AthleteAppStateSnapshot | null>;
  writeAppState(snapshot: AthleteAppStateSnapshot): Promise<void>;
  readImportedPlan(): Promise<ImportedPlanSnapshot | null>;
  writeImportedPlan(snapshot: ImportedPlanSnapshot): Promise<void>;
  enqueue(item: SyncOutboxItem): Promise<void>;
  flush(): Promise<void>;
}

export function shouldSyncSnapshot(
  previousUpdatedAt: string | null,
  nextUpdatedAt: string,
) {
  if (!previousUpdatedAt) return true;
  return new Date(nextUpdatedAt).getTime() >= new Date(previousUpdatedAt).getTime();
}
