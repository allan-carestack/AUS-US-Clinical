import { Toolbar } from '@base-ui/react/toolbar';
import styles from './index.module.css';
import { Tooltip } from '../Tooltip';

export interface NavItem {
  id: string;
  icon: React.ReactNode;
  label: string;
  onClick?: () => void;
  active?: boolean;
  disabled?: boolean;
}

interface NavBarProps {
  items: NavItem[];
  className?: string;
}

export function NavBar({ items, className }: NavBarProps) {
  return (
    <nav className={[styles.NavBar, className].filter(Boolean).join(' ')}>
      <Toolbar.Root orientation="vertical" className={styles.Column}>
        {items.map((item) => (
          <Tooltip key={item.id} content={item.label} side="right" delay={600}>
            <Toolbar.Button
              className={styles.Item}
              onClick={item.onClick}
              disabled={item.disabled}
              aria-label={item.label}
              aria-pressed={item.active}
              data-active={item.active || undefined}
            >
              <span className={styles.IconWrap}>{item.icon}</span>
              <span className={styles.Label}>{item.label}</span>
            </Toolbar.Button>
          </Tooltip>
        ))}
      </Toolbar.Root>
    </nav>
  );
}

export default NavBar;
