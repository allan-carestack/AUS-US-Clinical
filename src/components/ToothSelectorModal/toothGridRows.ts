import { getArchRows, type ToothMeta } from '../Odontogram/toothData';

export interface GridRow {
  teeth: (ToothMeta | null)[];
  variant: 'permanent' | 'primary';
}

/** Center a shorter row (primary dentition) within the wider permanent row's column count. */
function pad(row: ToothMeta[], total: number): (ToothMeta | null)[] {
  const gap = total - row.length;
  const left = Math.floor(gap / 2);
  const right = gap - left;
  return [...Array(left).fill(null), ...row, ...Array(right).fill(null)];
}

/** The "Regular" tab grid: permanent arches on the outer rows, primary
    (deciduous) arches centered on the inner rows — matches the Figma layout. */
export function buildRegularGridRows(): GridRow[] {
  const permanent = getArchRows('permanent');
  const primary = getArchRows('primary');
  const width = permanent.upper.length;

  return [
    { teeth: permanent.upper, variant: 'permanent' },
    { teeth: pad(primary.upper, width), variant: 'primary' },
    { teeth: pad(primary.lower, width), variant: 'primary' },
    { teeth: permanent.lower, variant: 'permanent' },
  ];
}
