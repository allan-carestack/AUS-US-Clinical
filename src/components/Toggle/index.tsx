import { Toggle as BaseToggle } from '@base-ui/react/toggle';
import { ToggleGroup as BaseToggleGroup } from '@base-ui/react/toggle-group';
import styles from './index.module.css';

interface ToggleProps extends React.ComponentPropsWithoutRef<typeof BaseToggle> {
  children: React.ReactNode;
}

interface ToggleGroupProps extends React.ComponentPropsWithoutRef<typeof BaseToggleGroup> {
  children: React.ReactNode;
}

export function Toggle({ children, className, ...props }: ToggleProps) {
  return (
    <BaseToggle className={[styles.Toggle, className].filter(Boolean).join(' ')} {...props}>
      {children}
    </BaseToggle>
  );
}

export function ToggleGroup({ children, className, ...props }: ToggleGroupProps) {
  return (
    <BaseToggleGroup className={[styles.Group, className].filter(Boolean).join(' ')} {...props}>
      {children}
    </BaseToggleGroup>
  );
}
