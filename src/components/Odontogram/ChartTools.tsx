import {
  BurstModeIcon,
  CdtIcon,
  CursorIcon,
  InfoOutlineIcon,
  PrintIcon,
  TeethIcon,
  ThreeDIcon,
} from '../Icon';
import { Tooltip } from '../Tooltip';
import type { Dentition } from './toothData';
import styles from './ChartTools.module.css';

export interface ChartToolsProps {
  dentition: Dentition;
  onDentitionChange: (dentition: Dentition) => void;
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
  const nextDentition: Dentition = dentition === 'permanent' ? 'primary' : 'permanent';
  const teethLabel =
    dentition === 'permanent' ? 'Switch to primary dentition' : 'Switch to permanent dentition';

  return (
    <div className={styles.Rail} role="toolbar" aria-label="Chart tools">
      <ToolButton label="Select" active>
        <CursorIcon />
      </ToolButton>
      <ToolButton label="Info">
        <InfoOutlineIcon />
      </ToolButton>
      <ToolButton
        label={teethLabel}
        active={dentition === 'primary'}
        pressed={dentition === 'primary'}
        onClick={() => onDentitionChange(nextDentition)}
      >
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
