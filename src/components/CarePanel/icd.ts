import type { DentalCode } from './dentalCodes';
import { useSyncExternalStore } from 'react';
import type { IcdConfig } from '../ToothSelectorModal';

// ponytail: prototype-only switch so the popover can be compared with and without the ICD field.
let icdEnabled = false;
const listeners = new Set<() => void>();
export const setIcdEnabled = (on: boolean) => { icdEnabled = on; listeners.forEach(l => l()); };
export const useIcdEnabled = () =>
  useSyncExternalStore(cb => { listeners.add(cb); return () => { listeners.delete(cb); }; }, () => icdEnabled);

// ponytail: pre-fills are set per code when a clinic is onboarded; this stands in for that data in the prototype.
const PROTOTYPE_ICD: Record<string, IcdConfig> = {
  '526': { required: true, defaults: ['A001', 'A009'] },
  '536': { required: true, defaults: [] },
  '661': { required: true, defaults: ['K08.1'] },
};

/** ICD field settings for a code, or undefined when it needs none (the field is hidden). */
export function icdConfigFor(code: DentalCode): IcdConfig | undefined {
  if (!icdEnabled) return undefined;
  const proto = PROTOTYPE_ICD[code.code];
  const required = !!code.icdRequired || !!proto?.required;
  const defaults = proto?.defaults ?? [];
  return required || defaults.length ? { required, defaults } : undefined;
}
