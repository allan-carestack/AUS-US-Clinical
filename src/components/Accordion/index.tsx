import { Accordion as BaseAccordion } from '@base-ui/react/accordion';
import styles from './index.module.css';
import { PlusIcon } from '../Icon';

export interface AccordionItem {
  value: string;
  heading: React.ReactNode;
  content: React.ReactNode;
  disabled?: boolean;
}

interface AccordionProps {
  items: AccordionItem[];
  defaultValue?: string[];
  value?: string[];
  onValueChange?: (value: string[]) => void;
  multiple?: boolean;
  disabled?: boolean;
  className?: string;
}

export function Accordion({
  items,
  defaultValue,
  value,
  onValueChange,
  multiple,
  disabled,
  className,
}: AccordionProps) {
  return (
    <BaseAccordion.Root
      className={[styles.Accordion, className].filter(Boolean).join(' ')}
      defaultValue={defaultValue}
      value={value}
      onValueChange={onValueChange}
      multiple={multiple}
      disabled={disabled}
    >
      {items.map((item) => (
        <BaseAccordion.Item key={item.value} value={item.value} disabled={item.disabled} className={styles.Item}>
          <BaseAccordion.Header className={styles.Header}>
            <BaseAccordion.Trigger className={styles.Trigger}>
              {item.heading}
              <PlusIcon className={styles.Icon} />
            </BaseAccordion.Trigger>
          </BaseAccordion.Header>
          <BaseAccordion.Panel className={styles.Panel}>
            <div className={styles.Content}>{item.content}</div>
          </BaseAccordion.Panel>
        </BaseAccordion.Item>
      ))}
    </BaseAccordion.Root>
  );
}

export default Accordion;
