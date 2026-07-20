import { Switch as BaseSwitch } from '@base-ui/react/switch';
import styles from './index.module.css';

interface SwitchProps extends React.ComponentPropsWithoutRef<typeof BaseSwitch.Root> {
  children?: React.ReactNode;
}

export default function Switch({ children, className, ...props }: SwitchProps) {
  return (
    <label className={styles.Label}>
      <BaseSwitch.Root className={[styles.Root, className].filter(Boolean).join(' ')} {...props}>
        <BaseSwitch.Thumb className={styles.Thumb} />
      </BaseSwitch.Root>
      {children && <span>{children}</span>}
    </label>
  );
}
