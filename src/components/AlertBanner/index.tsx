import styles from './index.module.css';
import { InfoSolidIcon, CautionIcon, WarningIcon, SuccessIcon } from '../Icon';

export type AlertVariant = 'info' | 'warning' | 'error' | 'success';

interface AlertBannerProps {
  variant?: AlertVariant;
  title?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}

const icons = {
  info:    InfoSolidIcon,
  warning: CautionIcon,
  error:   WarningIcon,
  success: SuccessIcon,
};

export function AlertBanner({ variant = 'info', title, children, className }: AlertBannerProps) {
  const Icon = icons[variant];
  return (
    <div className={[styles.Alert, styles[variant], className].filter(Boolean).join(' ')}>
      <div className={styles.Icon}>
        <Icon />
      </div>
      {title ? (
        <div className={styles.Content}>
          <div className={styles.Title}>{title}</div>
          <div className={styles.Body}>{children}</div>
        </div>
      ) : (
        <div className={styles.Body}>{children}</div>
      )}
    </div>
  );
}
