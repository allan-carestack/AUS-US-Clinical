import { Tooltip as BaseTooltip } from '@base-ui/react/tooltip';
import styles from './index.module.css';

interface TooltipProps {
  content: React.ReactNode;
  children: React.ReactElement;
  side?: 'top' | 'bottom' | 'left' | 'right';
  delay?: number;
  closeDelay?: number;
  closeOnClick?: boolean;
  disabled?: boolean;
  /** Controlled open state (e.g. to surface a validation error, not on hover). */
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export function Tooltip({ content, children, side = 'top', delay, closeDelay, closeOnClick, disabled, open, onOpenChange }: TooltipProps) {
  return (
    <BaseTooltip.Root disabled={disabled} open={open} onOpenChange={onOpenChange}>
      <BaseTooltip.Trigger render={children} delay={delay} closeDelay={closeDelay} closeOnClick={closeOnClick} />
      <BaseTooltip.Portal>
        <BaseTooltip.Positioner side={side} sideOffset={8} arrowPadding={4} className={styles.Positioner}>
          <BaseTooltip.Popup className={styles.Popup}>
            {content}
          </BaseTooltip.Popup>
        </BaseTooltip.Positioner>
      </BaseTooltip.Portal>
    </BaseTooltip.Root>
  );
}

export function TooltipProvider({ children, delay = 400 }: { children: React.ReactNode; delay?: number }) {
  return <BaseTooltip.Provider delay={delay}>{children}</BaseTooltip.Provider>;
}
