import { useState } from 'react';
import { Popover, PopoverContent, PopoverHeader, PopoverClose, PopoverTitle } from '../Popover';
import { AlertBanner } from '../AlertBanner';
import { Radio, RadioGroup } from '../Radio';
import { ToothSurfaceDiagram } from './ToothSurfaceDiagram';
import { ToothGrid } from './ToothGrid';
import styles from './index.module.css';

export interface ToothSelectorPopoverProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Element to anchor the popover against — positioned above it. */
  anchor: Element;
  /** e.g. "121 - Topical application of remineralisation and/or cariostatic agents, one treatment" */
  title: string;
  /** Whether this treatment needs a surface in addition to a tooth. */
  requiresSurface: boolean;
  /** Controlled — same draft value the Th/Area inline cell editor reads/writes. */
  toothId: string;
  onToothChange: (id: string) => void;
  /** Controlled — same draft value (e.g. "MOD") the Surface inline cell editor reads/writes. */
  surfaceLetters: string;
  onSurfaceLettersChange: (letters: string) => void;
}

export function ToothSelectorPopover({
  open, onOpenChange, anchor, title, requiresSurface,
  toothId, onToothChange, surfaceLetters, onSurfaceLettersChange,
}: ToothSelectorPopoverProps) {
  const [cavityClass, setCavityClass] = useState('class1');

  const toggleLetter = (letter: string) => {
    const set = new Set(surfaceLetters);
    if (set.has(letter)) set.delete(letter); else set.add(letter);
    onSurfaceLettersChange(Array.from(set).join(''));
  };

  const missingTooth = !toothId;
  const missingSurface = requiresSurface && !surfaceLetters;
  const showWarning = missingTooth || missingSurface;

  // Note: applying/closing on completion is driven by the caller (a tooth/
  // surface pick here is atomic, so it can auto-apply immediately) — typing
  // in the inline Th/Area or Surface cell only accepts a value on Enter, same
  // as before, and never auto-applies mid-keystroke.

  return (
    <Popover open={open} onOpenChange={onOpenChange}>
      <PopoverContent
        anchor={anchor}
        side="top"
        align="start"
        sideOffset={8}
        initialFocus={false}
        className={styles.Popup}
        data-tooth-selector-popup
      >
        <PopoverHeader>
          <PopoverTitle>{title}</PopoverTitle>
          <PopoverClose />
        </PopoverHeader>
        <div className={styles.Body}>
          {showWarning && (
            <AlertBanner variant="error" className={styles.Warning}>
              {missingTooth && missingSurface ? (
                <><strong>Tooth</strong> and <strong>Surface</strong> is mandatory for adding this treatment</>
              ) : missingTooth ? (
                <><strong>Tooth</strong> is mandatory for adding this treatment</>
              ) : (
                <><strong>Surface</strong> is mandatory for adding this treatment</>
              )}
            </AlertBanner>
          )}
          <div className={styles.SelectorRow}>
            {requiresSurface && (
              <div className={styles.SurfaceColumn}>
                <RadioGroup value={cavityClass} onValueChange={value => setCavityClass(value as string)} className={styles.ClassGroup}>
                  <Radio value="class1">Class 1</Radio>
                  <Radio value="classV">Class V</Radio>
                </RadioGroup>
                <ToothSurfaceDiagram selectedLetters={surfaceLetters} onToggleLetter={toggleLetter} disabled={!toothId} />
              </div>
            )}
            <ToothGrid
              selectedTooth={toothId || undefined}
              onSelectTooth={onToothChange}
              showSurfaceLinks={requiresSurface}
              surfaceLetters={surfaceLetters}
              onQuicklinkSelect={onSurfaceLettersChange}
            />
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
