import { Dialog as BaseDialog } from '@base-ui/react/dialog';
import styles from './index.module.css';
import { CloseIcon } from '../Icon';
import Button from '../Button';

/* ── Re-export Root so consumers can use controlled open/onOpenChange ── */
export function Dialog({ children, ...props }: React.ComponentPropsWithoutRef<typeof BaseDialog.Root>) {
  return <BaseDialog.Root {...props}>{children}</BaseDialog.Root>;
}

/* ── Trigger — merges props onto the child element ── */
export function DialogTrigger({ children, ...props }: React.ComponentPropsWithoutRef<typeof BaseDialog.Trigger>) {
  return <BaseDialog.Trigger render={children as React.ReactElement} {...props} />;
}

/* ── Content — Portal + Backdrop + Viewport + Popup ── */
interface DialogContentProps extends React.ComponentPropsWithoutRef<typeof BaseDialog.Popup> {
  children: React.ReactNode;
  size?: 'sm' | 'md' | 'lg';
}

export function DialogContent({ children, size = 'md', className, ...props }: DialogContentProps) {
  const sizeClass = styles[size];
  return (
    <BaseDialog.Portal>
      <BaseDialog.Backdrop className={styles.Backdrop} />
      <BaseDialog.Viewport className={styles.Viewport}>
        <BaseDialog.Popup
          className={[styles.Popup, sizeClass, className].filter(Boolean).join(' ')}
          {...props}
        >
          {children}
        </BaseDialog.Popup>
      </BaseDialog.Viewport>
    </BaseDialog.Portal>
  );
}

/* ── Header — flex row with title on left, close on right ── */
export function DialogHeader({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={[styles.Header, className].filter(Boolean).join(' ')}>
      {children}
    </div>
  );
}

/* ── Body — padded content area ── */
export function DialogBody({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={[styles.Body, className].filter(Boolean).join(' ')}>
      {children}
    </div>
  );
}

/* ── Footer — right-aligned action row ── */
export function DialogFooter({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={[styles.Footer, className].filter(Boolean).join(' ')}>
      {children}
    </div>
  );
}

/* ── Title ── */
export function DialogTitle({ children, className, ...props }: React.ComponentPropsWithoutRef<typeof BaseDialog.Title>) {
  return (
    <BaseDialog.Title className={[styles.Title, className].filter(Boolean).join(' ')} {...props}>
      {children}
    </BaseDialog.Title>
  );
}

/* ── Description ── */
export function DialogDescription({ children, className, ...props }: React.ComponentPropsWithoutRef<typeof BaseDialog.Description>) {
  return (
    <BaseDialog.Description className={[styles.Description, className].filter(Boolean).join(' ')} {...props}>
      {children}
    </BaseDialog.Description>
  );
}

/* ── Close — icon button by default; pass a child element to merge close behaviour onto it ── */
export function DialogClose({ children, className, ...props }: React.ComponentPropsWithoutRef<typeof BaseDialog.Close>) {
  if (children) {
    return <BaseDialog.Close render={children as React.ReactElement} {...props} />;
  }
  return (
    <BaseDialog.Close
      render={<Button variant="ghost" iconOnly aria-label="Close" leftIcon={<CloseIcon />} style={{ flexShrink: 0 }} />}
      className={className}
      {...props}
    />
  );
}
