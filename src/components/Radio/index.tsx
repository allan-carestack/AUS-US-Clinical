import { Radio as BaseRadio } from '@base-ui/react/radio';
import { RadioGroup as BaseRadioGroup } from '@base-ui/react/radio-group';
import styles from './index.module.css';

interface RadioProps extends React.ComponentPropsWithoutRef<typeof BaseRadio.Root> {
  children?: React.ReactNode;
}

interface RadioGroupProps extends React.ComponentPropsWithoutRef<typeof BaseRadioGroup> {
  children: React.ReactNode;
}

export function Radio({ children, className, ...props }: RadioProps) {
  return (
    <label className={styles.Label}>
      <BaseRadio.Root className={[styles.Root, className].filter(Boolean).join(' ')} {...props}>
        <BaseRadio.Indicator className={styles.Indicator} />
      </BaseRadio.Root>
      {children && <span>{children}</span>}
    </label>
  );
}

export function RadioGroup({ children, className, ...props }: RadioGroupProps) {
  return (
    <BaseRadioGroup className={[styles.Group, className].filter(Boolean).join(' ')} {...props}>
      {children}
    </BaseRadioGroup>
  );
}
