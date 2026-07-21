import { Combobox as BaseCombobox } from '@base-ui/react/combobox';
import styles from './index.module.css';
import { AngleUpIcon, TickIcon, CloseIcon } from '../Icon';
import { ListItem, type ListItemProps } from '../_shared/ListItem';
import { ScrollArea, ScrollAreaViewport, ScrollAreaContent, ScrollAreaScrollbar, ScrollAreaThumb } from '../ScrollArea';
import scrollAreaStyles from '../ScrollArea/index.module.css';

export function Combobox(props: React.ComponentPropsWithoutRef<typeof BaseCombobox.Root>) {
  return <BaseCombobox.Root {...props} />;
}

interface ComboboxInputProps {
  placeholder?: string;
  className?: string;
  value?: string[];
  onClear?: () => void;
  id?: string;
  autoFocus?: boolean;
  onKeyDown?: (e: React.KeyboardEvent) => void;
  'aria-label'?: string;
  'aria-labelledby'?: string;
}

export function ComboboxInput({
  placeholder,
  className,
  value = [],
  onClear,
  id,
  autoFocus,
  onKeyDown,
  'aria-label': ariaLabel,
  'aria-labelledby': ariaLabelledby,
}: ComboboxInputProps) {
  const badgeLabel = value.length === 1 ? value[0] : value.length > 1 ? `${value.length} selected` : null;
  return (
    <BaseCombobox.InputGroup className={[styles.InputGroup, className].filter(Boolean).join(' ')}>
      {badgeLabel !== null && (
        <span className={styles.SelectedBadge}>{badgeLabel}</span>
      )}
      <BaseCombobox.Input
        placeholder={value.length === 0 ? placeholder : ''}
        className={styles.Input}
        id={id}
        autoFocus={autoFocus}
        onKeyDown={onKeyDown}
        aria-label={ariaLabel}
        aria-labelledby={ariaLabelledby}
      />
      {value.length > 0 && (
        <button
          type="button"
          className={styles.ClearButton}
          onClick={e => { e.stopPropagation(); onClear?.(); }}
          aria-label="Clear selection"
        >
          <CloseIcon />
        </button>
      )}
      <BaseCombobox.Trigger className={styles.Trigger}>
        <span className={styles.Icon}><AngleUpIcon /></span>
      </BaseCombobox.Trigger>
    </BaseCombobox.InputGroup>
  );
}

interface ComboboxContentProps {
  children: React.ReactNode;
  className?: string;
}

export function ComboboxContent({ children, className }: ComboboxContentProps) {
  return (
    <BaseCombobox.Portal>
      <BaseCombobox.Positioner sideOffset={4} className={styles.Positioner}>
        <BaseCombobox.Popup className={[styles.Popup, className].filter(Boolean).join(' ')}>
          <ScrollArea className={styles.ListScrollArea}>
            <ScrollAreaViewport>
              <ScrollAreaContent className={scrollAreaStyles.BoundedContent}>
                <BaseCombobox.List className={styles.List}>
                  {children}
                </BaseCombobox.List>
              </ScrollAreaContent>
            </ScrollAreaViewport>
            <ScrollAreaScrollbar>
              <ScrollAreaThumb />
            </ScrollAreaScrollbar>
          </ScrollArea>
        </BaseCombobox.Popup>
      </BaseCombobox.Positioner>
    </BaseCombobox.Portal>
  );
}

type ComboboxItemProps = React.ComponentPropsWithoutRef<typeof BaseCombobox.Item> &
  Pick<ListItemProps, 'icon' | 'iconPosition' | 'subtext' | 'indicatorPosition'> & {
    /** Highlight this row as the current value (design-system selected look). */
    current?: boolean;
  };

export function ComboboxItem({ children, className, icon, iconPosition, subtext, indicatorPosition = 'right', current, ...props }: ComboboxItemProps) {
  return (
    <BaseCombobox.Item className={[styles.Item, current ? styles.ItemCurrent : '', className].filter(Boolean).join(' ')} {...props}>
      <ListItem
        label={children}
        icon={icon}
        iconPosition={iconPosition}
        subtext={subtext}
        indicator={<BaseCombobox.ItemIndicator className={styles.ItemIndicator}><TickIcon /></BaseCombobox.ItemIndicator>}
        indicatorPosition={indicatorPosition}
      />
    </BaseCombobox.Item>
  );
}

export function ComboboxItemMulti({ children, className, icon, iconPosition, subtext, ...props }: ComboboxItemProps) {
  return (
    <BaseCombobox.Item className={[styles.Item, className].filter(Boolean).join(' ')} {...props}>
      <ListItem checkbox label={children} icon={icon} iconPosition={iconPosition} subtext={subtext} />
    </BaseCombobox.Item>
  );
}

export function ComboboxEmpty({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <BaseCombobox.Empty className={[styles.Empty, className].filter(Boolean).join(' ')}>
      {children}
    </BaseCombobox.Empty>
  );
}
