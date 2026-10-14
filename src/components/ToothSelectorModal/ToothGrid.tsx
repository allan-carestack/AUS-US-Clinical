import Button from '../Button';
import styles from './index.module.css';

const QUICKLINKS: { label: string; letters: string }[] = [
  { label: 'All', letters: 'BMODL' },
  { label: 'MO',  letters: 'MO' },
  { label: 'DO',  letters: 'DO' },
  { label: 'MOD', letters: 'MOD' },
  { label: 'ML',  letters: 'ML' },
  { label: 'DL',  letters: 'DL' },
];

/** Order-independent comparison — "MOD" and "DMO" are the same selection. */
function sameLetters(a: string, b: string): boolean {
  if (!a || !b) return false;
  const setA = new Set(a);
  const setB = new Set(b);
  return setA.size === setB.size && [...setA].every(c => setB.has(c));
}

export function SurfaceQuicklinks({ surfaceLetters, disabled, onSelect }: {
  surfaceLetters: string;
  disabled?: boolean;
  onSelect: (letters: string) => void;
}) {
  return (
    <div className={styles.Quicklinks}>
      {QUICKLINKS.map(link => (
        <Button
          key={link.label}
          variant="link"
          className={sameLetters(surfaceLetters, link.letters) ? styles.QuicklinkActive : ''}
          disabled={disabled}
          onClick={() => onSelect(link.letters)}
        >
          {link.label}
        </Button>
      ))}
    </div>
  );
}
