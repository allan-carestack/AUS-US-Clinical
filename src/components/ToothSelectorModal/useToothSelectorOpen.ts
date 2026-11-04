import { useSyncExternalStore } from 'react';

// How many tooth selector popovers are open, so the rest of the page (the odontogram) can step back
// while the user is working in one. A count, not a flag, so two open at once don't switch each other off.
let openCount = 0;
const listeners = new Set<() => void>();
const emit = () => listeners.forEach(l => l());

/** Marks a popover as open; returns the function that marks it closed again. */
export function markToothSelectorOpen() {
  openCount += 1;
  emit();
  return () => {
    openCount -= 1;
    emit();
  };
}

/** True while any tooth selector popover is open. */
export function useToothSelectorOpen() {
  return useSyncExternalStore(
    l => { listeners.add(l); return () => { listeners.delete(l); }; },
    () => openCount > 0,
  );
}
