import {
  BurstModeIcon,
  CdtIcon,
  CursorIcon,
  InfoOutlineIcon,
  PrintIcon,
  TeethIcon,
  ThreeDIcon,
} from '../Icon';
import { Menu, MenuContent, MenuRadioGroup, MenuRadioItem, MenuTrigger } from '../Menu';
import { Tooltip } from '../Tooltip';
import type { Dentition } from './toothData';
import styles from './ChartTools.module.css';

export interface ChartToolsProps {
  dentition: Dentition;
  onDentitionChange: (dentition: Dentition) => void;
}

// Mouth-wide dentition (Permanent / Deciduous / Mixed) — controls the actual
// chart layout via the shared `Dentition` state (see toothData.ts).
const MOUTH_DENTITION_ABBREVIATION: Record<Dentition, string> = {
  permanent: 'Pe',
  primary: 'De',
  mixed: 'Mi',
};

const MOUTH_DENTITION_LABEL: Record<Dentition, string> = {
  permanent: 'Permanent',
  primary: 'Deciduous',
  mixed: 'Mixed',
};

function DentitionControl({
  value,
  onChange,
}: {
  value: Dentition;
  onChange: (value: Dentition) => void;
}) {
  return (
    <Menu modal={false}>
      <Tooltip content="Mouth dentition" side="right" delay={600}>
        <MenuTrigger openOnHover>
          <button type="button" className={styles.Tool} aria-label="Mouth dentition">
            <span className={styles.DentitionLabel}>{MOUTH_DENTITION_ABBREVIATION[value]}</span>
          </button>
        </MenuTrigger>
      </Tooltip>
      <MenuContent side="right">
        <MenuRadioGroup value={value} onValueChange={v => onChange(v as Dentition)}>
          {(Object.keys(MOUTH_DENTITION_LABEL) as Dentition[]).map(option => (
            <MenuRadioItem key={option} value={option} closeOnClick>
              {MOUTH_DENTITION_LABEL[option]} ({MOUTH_DENTITION_ABBREVIATION[option]})
            </MenuRadioItem>
          ))}
        </MenuRadioGroup>
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

export function ChartTools({ dentition, onDentitionChange }: ChartToolsProps) {
  return (
    <div className={styles.Rail} role="toolbar" aria-label="Chart tools">
      <ToolButton label="Select" active>
        <CursorIcon />
      </ToolButton>
      <ToolButton label="Info">
        <InfoOutlineIcon />
      </ToolButton>
      <DentitionControl value={dentition} onChange={onDentitionChange} />
      <ToolButton label={MOUTH_DENTITION_LABEL[dentition]}>
        <TeethIcon />
      </ToolButton>
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
