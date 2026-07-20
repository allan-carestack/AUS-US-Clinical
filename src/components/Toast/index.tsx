import { Toast } from '@base-ui/react/toast';
import styles from './index.module.css';
import { SuccessIcon, CautionIcon, InfoOutlineIcon, WarningIcon, CloseIcon } from '../Icon';
import Button from '../Button';

export type ToastType = 'success' | 'failure' | 'info' | 'warning';

const rootClass: Record<ToastType, string> = {
  success: styles.success,
  failure: styles.failure,
  info:    styles.info,
  warning: styles.warning,
};

const iconClass: Record<ToastType, string> = {
  success: styles.iconSuccess,
  failure: styles.iconFailure,
  info:    styles.iconInfo,
  warning: styles.iconWarning,
};

const typeIcons: Record<ToastType, React.ReactNode> = {
  success: <SuccessIcon />,
  failure: <CautionIcon />,
  info:    <InfoOutlineIcon />,
  warning: <WarningIcon />,
};

export function Toaster() {
  const { toasts } = Toast.useToastManager();

  return (
    <Toast.Viewport className={styles.Viewport}>
      {toasts.map((toast) => {
        const type: ToastType = (toast.data as { type?: ToastType })?.type ?? 'info';
        return (
          <Toast.Root key={toast.id} toast={toast} className={rootClass[type]}>
            <div className={iconClass[type]}>{typeIcons[type]}</div>
            <Toast.Title className={styles.Message} />
            <Toast.Close
              render={<Button variant="ghost" inverse iconOnly aria-label="Close notification" leftIcon={<CloseIcon />} style={{ flexShrink: 0 }} />}
            />
          </Toast.Root>
        );
      })}
    </Toast.Viewport>
  );
}

export { Toast };
