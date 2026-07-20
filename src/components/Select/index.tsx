import { useId } from 'react';
import { Select as BaseSelect } from '@base-ui/react/select';
import styles from './index.module.css';
import { AngleUpIcon, TickIcon, CloseIcon } from '../Icon';
import { ListItem, type ListItemProps } from '../_shared/ListItem';
import { ScrollArea, ScrollAreaViewport, ScrollAreaContent, ScrollAreaScrollbar, ScrollAreaThumb } from '../ScrollArea';

export function Select(props: React.ComponentPropsWithoutRef<typeof BaseSelect.Root>) {
  return <BaseSelect.Root {...props} />;
}

interface SelectTriggerProps {
  placeholder?: string;
  className?: string;
  multiple?: boolean;
  value?: string[];
  onClear?: () => void;
  id?: string;
  'aria-label'?: string;
  'aria-labelledby'?: string;
}

export function SelectTrigger({
  placeholder,
  className,
  multiple,
  value = [],
  onClear,
  id,
  'aria-label': ariaLabel,
  'aria-labelledby': ariaLabelledby,
}: SelectTriggerProps) {
  // The trigger's accessible name always includes the visible value element, so
  // screen readers announce the current selection ("Married", "2 selected").
  // When the field is labeled, the label is prepended so it reads as
  // "Country, United States" rather than just the value.
  const valueId = useId();
  const internalLabelId = useId();
  const labelledBy = ariaLabelledby
    ? `${ariaLabelledby} ${valueId}`
    : ariaLabel
      ? `${internalLabelId} ${valueId}`
      : valueId;
  return (
    <div className={[styles.Trigger, className].filter(Boolean).join(' ')}>
      {ariaLabel && !ariaLabelledby && (
        <span id={internalLabelId} hidden>{ariaLabel}</span>
      )}
      <BaseSelect.Trigger id={id} className={styles.TriggerOverlay} aria-labelledby={labelledBy} />
      {multiple ? (
        <BaseSelect.Value id={valueId} placeholder={placeholder} className={styles.Value}>
          {(v: unknown) => {
            const vals = Array.isArray(v) ? v : [];
            if (vals.length === 0) return placeholder;
            if (vals.length === 1) return String(vals[0]);
            return <span className={styles.SelectedBadge}>{vals.length} selected</span>;
          }}
        </BaseSelect.Value>
      ) : (
        <BaseSelect.Value id={valueId} placeholder={placeholder} className={styles.Value} />
      )}
      {multiple && value.length > 0 && (
        <button
          type="button"
          className={styles.ClearButton}
          onClick={e => { e.stopPropagation(); onClear?.(); }}
          aria-label="Clear selection"
        >
          <CloseIcon />
        </button>
      )}
      <BaseSelect.Icon className={styles.Icon}>
        <AngleUpIcon />
      </BaseSelect.Icon>
    </div>
  );
}

export function SelectLabel({ className, ...props }: React.ComponentPropsWithoutRef<typeof BaseSelect.Label>) {
  return <BaseSelect.Label className={[styles.Label, className].filter(Boolean).join(' ')} {...props} />;
}

export function SelectBackdrop({ className, ...props }: React.ComponentPropsWithoutRef<typeof BaseSelect.Backdrop>) {
  return <BaseSelect.Backdrop className={[styles.Backdrop, className].filter(Boolean).join(' ')} {...props} />;
}

interface SelectContentProps {
  children: React.ReactNode;
  className?: string;
}

export function SelectContent({ children, className }: SelectContentProps) {
  return (
    <BaseSelect.Portal>
      <BaseSelect.Positioner sideOffset={4} alignItemWithTrigger={false} className={styles.Positioner}>
        <BaseSelect.Popup className={[styles.Popup, className].filter(Boolean).join(' ')}>
          <ScrollArea className={styles.ListScrollArea}>
            <ScrollAreaViewport>
              <ScrollAreaContent>
                <BaseSelect.List className={styles.List}>
                  {children}
                </BaseSelect.List>
              </ScrollAreaContent>
            </ScrollAreaViewport>
            <ScrollAreaScrollbar>
              <ScrollAreaThumb />
            </ScrollAreaScrollbar>
          </ScrollArea>
        </BaseSelect.Popup>
      </BaseSelect.Positioner>
    </BaseSelect.Portal>
  );
}

type SelectItemProps = React.ComponentPropsWithoutRef<typeof BaseSelect.Item> &
  Pick<ListItemProps, 'icon' | 'iconPosition' | 'subtext' | 'indicatorPosition'>;

export function SelectItem({ children, className, icon, iconPosition, subtext, indicatorPosition = 'right', ...props }: SelectItemProps) {
  return (
    <BaseSelect.Item className={[styles.Item, className].filter(Boolean).join(' ')} {...props}>
      <ListItem
        label={<BaseSelect.ItemText>{children}</BaseSelect.ItemText>}
        icon={icon}
        iconPosition={iconPosition}
        subtext={subtext}
        indicator={<BaseSelect.ItemIndicator className={styles.ItemIndicator}><TickIcon /></BaseSelect.ItemIndicator>}
        indicatorPosition={indicatorPosition}
      />
    </BaseSelect.Item>
  );
}

export function SelectItemMulti({ children, className, icon, iconPosition, subtext, ...props }: SelectItemProps) {
  return (
    <BaseSelect.Item className={[styles.Item, className].filter(Boolean).join(' ')} {...props}>
      <ListItem
        checkbox
        label={<BaseSelect.ItemText>{children}</BaseSelect.ItemText>}
        icon={icon}
        iconPosition={iconPosition}
        subtext={subtext}
      />
    </BaseSelect.Item>
  );
}

export function SelectGroup(props: React.ComponentPropsWithoutRef<typeof BaseSelect.Group>) {
  return <BaseSelect.Group {...props} />;
}

export function SelectGroupLabel({ className, ...props }: React.ComponentPropsWithoutRef<typeof BaseSelect.GroupLabel>) {
  return <BaseSelect.GroupLabel className={[styles.GroupLabel, className].filter(Boolean).join(' ')} {...props} />;
}

export function SelectSeparator({ className, ...props }: React.ComponentPropsWithoutRef<typeof BaseSelect.Separator>) {
  return <BaseSelect.Separator className={[styles.Separator, className].filter(Boolean).join(' ')} {...props} />;
}
