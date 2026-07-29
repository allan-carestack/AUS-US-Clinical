import styles from './index.module.css';

/** Fixed close-up quadrant layout — matches the Figma diagram's static
    labelling convention (not recomputed per-tooth anatomy). */
type SurfaceRegionKey = 'buccal' | 'mesial' | 'occlusal' | 'distal' | 'lingual';

const REGIONS: { key: SurfaceRegionKey; label: string; clip: string; letters: string[]; toggleLetter: string }[] = [
  { key: 'buccal',   label: 'B/La', clip: 'polygon(0 0, 100% 0, 68% 24%, 32% 24%)',       letters: ['B'],      toggleLetter: 'B' },
  { key: 'mesial',   label: 'M',    clip: 'polygon(0 0, 32% 24%, 32% 76%, 0 100%)',       letters: ['M'],      toggleLetter: 'M' },
  { key: 'occlusal', label: 'O/I',  clip: 'polygon(32% 24%, 68% 24%, 68% 76%, 32% 76%)',  letters: ['O', 'I'], toggleLetter: 'O' },
  { key: 'distal',   label: 'D',    clip: 'polygon(100% 0, 68% 24%, 68% 76%, 100% 100%)', letters: ['D'],      toggleLetter: 'D' },
  { key: 'lingual',  label: 'L/P',  clip: 'polygon(0 100%, 100% 100%, 68% 76%, 32% 76%)', letters: ['L', 'P'], toggleLetter: 'L' },
];

interface ToothSurfaceDiagramProps {
  /** Uppercase surface letters currently selected, e.g. "MOD" — the same
      value the Th/Area cell's inline editor reads and writes. */
  selectedLetters: string;
  onToggleLetter: (letter: string) => void;
  disabled?: boolean;
}

export function ToothSurfaceDiagram({ selectedLetters, onToggleLetter, disabled }: ToothSurfaceDiagramProps) {
  const selected = new Set(selectedLetters);
  return (
    <div className={styles.Diagram}>
      {REGIONS.map(region => {
        const isSelected = region.letters.some(l => selected.has(l));
        return (
          <button
            key={region.key}
            type="button"
            className={[styles.DiagramRegion, isSelected ? styles.DiagramRegionSelected : ''].filter(Boolean).join(' ')}
            style={{ clipPath: region.clip }}
            disabled={disabled}
            onClick={() => onToggleLetter(region.toggleLetter)}
            aria-pressed={isSelected}
            aria-label={`Surface ${region.label}`}
          />
        );
      })}
      {REGIONS.map(region => (
        <span
          key={`${region.key}-label`}
          className={[styles.DiagramLabel, styles[`label${region.key.charAt(0).toUpperCase()}${region.key.slice(1)}`]].join(' ')}
        >
          {region.label}
        </span>
      ))}
    </div>
  );
}
