import { Drawer as BaseDrawer } from '@base-ui/react/drawer';
import styles from './index.module.css';
import { CloseIcon } from '../Icon';
import Button from '../Button';
import { ScrollArea, ScrollAreaViewport, ScrollAreaContent, ScrollAreaScrollbar, ScrollAreaThumb } from '../ScrollArea';

export function Drawer({ children, ...props }: React.ComponentPropsWithoutRef<typeof BaseDrawer.Root>) {
  return <BaseDrawer.Root {...props}>{children}</BaseDrawer.Root>;
}

export function DrawerTrigger({ children, ...props }: React.ComponentPropsWithoutRef<typeof BaseDrawer.Trigger>) {
  return <BaseDrawer.Trigger render={children as React.ReactElement} {...props} />;
}

interface DrawerContentProps extends React.ComponentPropsWithoutRef<typeof BaseDrawer.Popup> {
  children: React.ReactNode;
  size?: 'sm' | 'md' | 'lg';
}

export function DrawerContent({ children, size = 'md', className, ...props }: DrawerContentProps) {
  return (
    <BaseDrawer.Portal>
      <BaseDrawer.Backdrop className={styles.Backdrop} />
      <BaseDrawer.Viewport className={styles.Viewport}>
        <BaseDrawer.Popup
          className={[styles.Popup, styles[size], className].filter(Boolean).join(' ')}
          {...props}
        >
          {children}
        </BaseDrawer.Popup>
      </BaseDrawer.Viewport>
    </BaseDrawer.Portal>
  );
}

export function DrawerHeader({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={[styles.Header, className].filter(Boolean).join(' ')}>{children}</div>;
}

export function DrawerBody({ children, className }: { children?: React.ReactNode; className?: string }) {
  return (
    <ScrollArea className={[styles.Body, className].filter(Boolean).join(' ')}>
      <ScrollAreaViewport>
        <ScrollAreaContent className={styles.BodyContent}>{children}</ScrollAreaContent>
      </ScrollAreaViewport>
      <ScrollAreaScrollbar>
        <ScrollAreaThumb />
      </ScrollAreaScrollbar>
    </ScrollArea>
  );
}

export function DrawerFooter({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={[styles.Footer, className].filter(Boolean).join(' ')}>{children}</div>;
}

export function DrawerTitle({ children, className, ...props }: React.ComponentPropsWithoutRef<typeof BaseDrawer.Title>) {
  return (
    <BaseDrawer.Title className={[styles.Title, className].filter(Boolean).join(' ')} {...props}>
      {children}
    </BaseDrawer.Title>
  );
}

export function DrawerDescription({ children, className, ...props }: React.ComponentPropsWithoutRef<typeof BaseDrawer.Description>) {
  return (
    <BaseDrawer.Description className={[styles.Description, className].filter(Boolean).join(' ')} {...props}>
      {children}
    </BaseDrawer.Description>
  );
}

export function DrawerClose({ children, className, ...props }: React.ComponentPropsWithoutRef<typeof BaseDrawer.Close>) {
  if (children) {
    return <BaseDrawer.Close render={children as React.ReactElement} {...props} />;
  }
  return (
    <BaseDrawer.Close
      render={<Button variant="ghost" inverse iconOnly aria-label="Close" leftIcon={<CloseIcon />} style={{ flexShrink: 0 }} />}
      className={className}
      {...props}
    />
  );
}
