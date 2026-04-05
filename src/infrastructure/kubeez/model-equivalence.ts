import { findRegistryEntryByBaseCardId, findRegistryEntryForModelId } from './model-family-registry';
import { parseVideoModelVariantSuffix } from './kubeez-video-model-variants';

/** True when two API model ids refer to the same logical product card / selection family. */
export function areModelsEquivalent(a: string, b: string): boolean {
  if (a === b) return true;

  const entryA = findRegistryEntryForModelId(a);
  const entryB = findRegistryEntryForModelId(b);
  if (entryA && entryB && entryA.baseCardId === entryB.baseCardId) return true;

  const baseA = findRegistryEntryForModelId(a)?.baseCardId;
  const baseB = findRegistryEntryForModelId(b)?.baseCardId;
  if (baseA && b === baseA) return true;
  if (baseB && a === baseB) return true;

  const pa = parseVideoModelVariantSuffix(a);
  const pb = parseVideoModelVariantSuffix(b);
  if (pa && pb && pa.baseId === pb.baseId) return true;

  return false;
}

/** True if concreteOrBase is any variant of the given registry base card id. */
export function modelBelongsToBaseCard(modelId: string, baseCardId: string): boolean {
  if (modelId === baseCardId) return true;
  const entry = findRegistryEntryByBaseCardId(baseCardId);
  if (entry?.matchModelId(modelId)) return true;
  const pb = parseVideoModelVariantSuffix(modelId);
  if (pb && pb.baseId === baseCardId) return true;
  return false;
}
