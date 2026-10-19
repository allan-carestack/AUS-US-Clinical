import { getArchRows } from '../Odontogram/toothData';
import { Popover, PopoverContent } from '../Popover';
import { ToothQuickEntry, type IcdConfig } from './ToothQuickEntry';

export type { IcdConfig };
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
  /** Further pre-selected teeth besides `toothId`. */
  queueIds?: string[];
  surfaceLetters: string;
  /** Final submit — fired once, on the last Enter / Add. */
  onCommit?: (toothId: string, surfaceLetters: string, more: boolean, icd: string[]) => void;
  /** ICD field settings; omit to hide the field. */
  icd?: IcdConfig;
  /** Enables Shift+Enter: add and keep the popover open for the next tooth. */
  allowMore?: boolean;
  /** Where focus goes when the popover closes. */
  finalFocus?: () => HTMLElement | null;
}

// Primary (deciduous) teeth are shown greyed out and can't be picked.
const VALID_TEETH = new Set(
  (() => {
    const { upper, lower } = getArchRows('permanent');
    return [...upper, ...lower].map(t => t.id);
  })(),
);

export function ToothSelectorPopover({
  open, onOpenChange, anchor, side = 'top', title, requiresSurface,
  toothId, queueIds, surfaceLetters, onCommit, allowMore, icd, finalFocus,
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
        className={[styles.Popup, side === 'overlay' ? styles.PopupMorph : ''].filter(Boolean).join(' ')}
        style={side === 'overlay' ? ({ '--morph-w': `${anchor.getBoundingClientRect().width}px`, '--morph-h': `${anchor.getBoundingClientRect().height}px` } as React.CSSProperties) : undefined}
        data-tooth-selector-popup
      >
        <ToothQuickEntry
          title={title}
          requiresSurface={requiresSurface}
          validTeeth={VALID_TEETH}
          toothId={toothId}
          queueIds={queueIds}
          surfaceLetters={surfaceLetters}
          allowMore={allowMore}
          icd={icd}
          onCommit={(t, s, more, codes) => onCommit?.(t, s, more, codes)}
        />
      </PopoverContent>
    </Popover>
  );
}
