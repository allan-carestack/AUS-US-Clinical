import {
  BurstModeIcon,
  CdtIcon,
  CursorIcon,
  InfoOutlineIcon,
  PrintIcon,
  TeethIcon,
  ThreeDIcon,
} from '../Icon';
import { Menu, MenuContent, MenuItem, MenuRadioGroup, MenuRadioItem, MenuTrigger } from '../Menu';
import { Tooltip } from '../Tooltip';
import { TOOTH_TYPE_LABEL, type DentitionView, type ToothType } from './toothData';
import styles from './ChartTools.module.css';

export interface ChartToolsProps {
  /** What every tooth currently is — 'mixed' when the mouth isn't one uniform type. */
  mouthType: ToothType | 'mixed';
  view: DentitionView;
  onViewChange: (view: DentitionView) => void;
  /** "Change all to …" from the teeth menu. */
  onChangeAll: (type: ToothType) => void;
  /** Teeth currently selected on the chart; when any, the teeth menu marks just those. */
  selectionCount: number;
  onMarkSelected: (type: ToothType) => void;
}

// Dentition view: the current teeth (default), or the current teeth plus a set of primary teeth.
// The button shows an abbreviation of what is on screen.
const MOUTH_ABBREVIATION: Record<ToothType | 'mixed', string> = {
  permanent: 'Pe',
  primary: 'De',
  unerupted: 'Un',
  mixed: 'Mi',
};

const VIEW_LABEL: Record<DentitionView, string> = {
  current: 'View current dentition',
  mixed: 'View mixed dentition',
};

function DentitionViewControl({
  mouthType,
  value,
  onChange,
}: {
  mouthType: ToothType | 'mixed';
  value: DentitionView;
  onChange: (value: DentitionView) => void;
}) {
  return (
    <Menu modal={false}>
      <Tooltip content="Dentition view" side="right" delay={600}>
        <MenuTrigger openOnHover>
          <button type="button" className={styles.Tool} aria-label="Dentition view">
            <span className={styles.DentitionLabel}>{value === 'mixed' ? 'Mi' : MOUTH_ABBREVIATION[mouthType]}</span>
          </button>
        </MenuTrigger>
      </Tooltip>
      <MenuContent side="right">
        <MenuRadioGroup value={value} onValueChange={v => onChange(v as DentitionView)}>
          {(Object.keys(VIEW_LABEL) as DentitionView[]).map(option => (
            <MenuRadioItem key={option} value={option} closeOnClick>
              {VIEW_LABEL[option]}
            </MenuRadioItem>
          ))}
        </MenuRadioGroup>
      </MenuContent>
    </Menu>
  );
}

// "Change all to …": sets every tooth to one type in a single action.
function TeethControl({ mouthType, view, selectionCount, onChangeAll, onMarkSelected }: {
  mouthType: ToothType | 'mixed';
  view: DentitionView;
  selectionCount: number;
  onChangeAll: (type: ToothType) => void;
  onMarkSelected: (type: ToothType) => void;
}) {
  const selected = selectionCount > 0;
  const label = selected
    ? `Mark ${selectionCount === 1 ? 'selected tooth' : 'selected teeth'}`
    : mouthType === 'mixed' ? 'Mixed' : TOOTH_TYPE_LABEL[mouthType];
  return (
    <Menu modal={false}>
      <Tooltip content={label} side="right" delay={600}>
        <MenuTrigger openOnHover>
          <button type="button" className={styles.Tool} aria-label={label}>
            <TeethIcon />
          </button>
        </MenuTrigger>
      </Tooltip>
      <MenuContent side="right">
        {(Object.keys(TOOTH_TYPE_LABEL) as ToothType[]).map(type => (
          // The mixed view shows both kinds of teeth side by side, so switching a tooth's kind makes no sense there.
          <MenuItem key={type} disabled={view === 'mixed' && type !== 'unerupted'} onClick={() => (selected ? onMarkSelected(type) : onChangeAll(type))}>
            {selected ? 'Mark selected as' : 'Change all to'} {TOOTH_TYPE_LABEL[type]}
          </MenuItem>
        ))}
      </MenuContent>
    </Menu>
  );
}

function ToolButton({
  label,
  active,
  pressed,
  onClick,
  children,
}: {
  label: string;
  active?: boolean;
  pressed?: boolean;
  onClick?: () => void;
  children: React.ReactNode;
}) {
  return (
    <Tooltip content={label} side="right" delay={600}>
      <button
        type="button"
        className={styles.Tool}
        aria-label={label}
        aria-pressed={pressed}
        data-active={active || undefined}
        onClick={onClick}
      >
        {children}
      </button>
    </Tooltip>
  );
}

export function ChartTools({ mouthType, view, selectionCount, onViewChange, onChangeAll, onMarkSelected }: ChartToolsProps) {
  return (
    <div className={styles.Rail} role="toolbar" aria-label="Chart tools">
      <ToolButton label="Select" active>
        <CursorIcon />
      </ToolButton>
      <ToolButton label="Info">
        <InfoOutlineIcon />
      </ToolButton>
      <DentitionViewControl mouthType={mouthType} value={view} onChange={onViewChange} />
      <TeethControl mouthType={mouthType} view={view} selectionCount={selectionCount} onChangeAll={onChangeAll} onMarkSelected={onMarkSelected} />
      <ToolButton label="3D view">
        <ThreeDIcon />
      </ToolButton>
      <ToolButton label="Print">
        <PrintIcon />
      </ToolButton>
      <ToolButton label="CDT">
        <CdtIcon />
      </ToolButton>
      <ToolButton label="Burst mode">
        <BurstModeIcon />
      </ToolButton>
    </div>
  );
}
