import { getArchRows } from '../Odontogram/toothData';
import { Popover, PopoverContent } from '../Popover';
import { ToothQuickEntry } from './ToothQuickEntry';
import styles from './index.module.css';

export interface ToothSelectorPopoverProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Element to anchor the popover against. */
  anchor: Element;
  /** 'top' opens above the anchor; 'overlay' covers it, so the header sits exactly where the anchor item was. */
  side?: 'top' | 'overlay';
  /** e.g. "121 - Topical application of remineralisation and/or cariostatic agents, one treatment" */
  title: string;
  /** Whether this treatment needs a surface in addition to a tooth. */
  requiresSurface: boolean;
  /** Draft values the popover starts from. */
  toothId: string;
  surfaceLetters: string;
  /** Final submit — fired once, on the last Enter / Add. */
  onCommit?: (toothId: string, surfaceLetters: string) => void;
  /** Where focus goes when the popover closes. */
  finalFocus?: () => HTMLElement | null;
}

const VALID_TEETH = new Set(
  (['permanent', 'primary'] as const).flatMap(d => {
    const { upper, lower } = getArchRows(d);
    return [...upper, ...lower].map(t => t.id);
  }),
);

export function ToothSelectorPopover({
  open, onOpenChange, anchor, side = 'top', title, requiresSurface,
  toothId, surfaceLetters, onCommit, finalFocus,
}: ToothSelectorPopoverProps) {
  return (
    <Popover open={open} onOpenChange={onOpenChange}>
      <PopoverContent
        anchor={anchor}
        side={side === 'overlay' ? 'bottom' : 'top'}
        align={side === 'overlay' ? 'end' : 'start'}
        sideOffset={side === 'overlay' ? -anchor.getBoundingClientRect().height : 8}
        initialFocus={() => document.querySelector<HTMLElement>('[data-tooth-selector-popup] [data-first-focus]')}
        finalFocus={finalFocus}
        className={styles.Popup}
        data-tooth-selector-popup
      >
        <ToothQuickEntry
          title={title}
          requiresSurface={requiresSurface}
          validTeeth={VALID_TEETH}
          toothId={toothId}
          surfaceLetters={surfaceLetters}
          onCommit={(t, s) => onCommit?.(t, s)}
        />
      </PopoverContent>
    </Popover>
  );
}
