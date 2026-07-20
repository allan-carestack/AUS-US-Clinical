import { Checkbox as BaseCheckbox } from '@base-ui/react/checkbox';
import styles from './index.module.css';
import { TickIcon, MinusIcon } from '../Icon';

interface CheckboxProps extends React.ComponentPropsWithoutRef<typeof BaseCheckbox.Root> {
  children?: React.ReactNode;
}

export default function Checkbox({ children, className, ...props }: CheckboxProps) {
  return (
    <label className={styles.Label}>
      <BaseCheckbox.Root className={[styles.Root, className].filter(Boolean).join(' ')} {...props}>
        <BaseCheckbox.Indicator className={styles.Indicator}>
          <TickIcon className={styles.CheckIcon} />
          <MinusIcon className={styles.IndeterminateIcon} />
        </BaseCheckbox.Indicator>
      </BaseCheckbox.Root>
      {children && <span>{children}</span>}
    </label>
  );
}
