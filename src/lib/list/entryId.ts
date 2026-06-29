import { MediaType } from '@/types/media';

export function getDeterministicEntryId(type: MediaType, sourceId: string | number): string {
  return `${type}-${sourceId}`;
}
