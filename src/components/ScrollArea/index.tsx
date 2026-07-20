import { ScrollArea as BaseScrollArea } from '@base-ui/react/scroll-area';
import styles from './index.module.css';

export function ScrollArea({ children, className, ...props }: React.ComponentProps<typeof BaseScrollArea.Root>) {
  return (
    <BaseScrollArea.Root className={[styles.ScrollArea, className].filter(Boolean).join(' ')} {...props}>
      {children}
    </BaseScrollArea.Root>
  );
}

export function ScrollAreaViewport({ children, className, ...props }: React.ComponentProps<typeof BaseScrollArea.Viewport>) {
  return (
    <BaseScrollArea.Viewport className={[styles.Viewport, className].filter(Boolean).join(' ')} {...props}>
      {children}
    </BaseScrollArea.Viewport>
  );
}

export function ScrollAreaContent({ children, className, ...props }: React.ComponentProps<typeof BaseScrollArea.Content>) {
  return (
    <BaseScrollArea.Content className={[styles.Content, className].filter(Boolean).join(' ')} {...props}>
      {children}
    </BaseScrollArea.Content>
  );
}

export function ScrollAreaScrollbar({ className, ...props }: React.ComponentProps<typeof BaseScrollArea.Scrollbar>) {
  return <BaseScrollArea.Scrollbar className={[styles.Scrollbar, className].filter(Boolean).join(' ')} {...props} />;
}

export function ScrollAreaThumb({ className, ...props }: React.ComponentProps<typeof BaseScrollArea.Thumb>) {
  return <BaseScrollArea.Thumb className={[styles.Thumb, className].filter(Boolean).join(' ')} {...props} />;
}

export function ScrollAreaCorner({ className, ...props }: React.ComponentProps<typeof BaseScrollArea.Corner>) {
  return <BaseScrollArea.Corner className={[styles.Corner, className].filter(Boolean).join(' ')} {...props} />;
}

interface ScrollAreaBoxProps {
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
  viewportClassName?: string;
  orientation?: 'vertical' | 'horizontal' | 'both';
}

export function ScrollAreaBox({ children, className, style, viewportClassName, orientation = 'vertical' }: ScrollAreaBoxProps) {
  return (
    <ScrollArea className={className} style={style}>
      <ScrollAreaViewport className={viewportClassName}>
        <ScrollAreaContent>{children}</ScrollAreaContent>
      </ScrollAreaViewport>
      {orientation !== 'horizontal' && (
        <ScrollAreaScrollbar>
          <ScrollAreaThumb />
        </ScrollAreaScrollbar>
      )}
      {orientation !== 'vertical' && (
        <ScrollAreaScrollbar orientation="horizontal">
          <ScrollAreaThumb />
        </ScrollAreaScrollbar>
      )}
      {orientation === 'both' && <ScrollAreaCorner />}
    </ScrollArea>
  );
}
