import { Field } from '@base-ui/react/field';
import { NumberField as BaseNumberField } from '@base-ui/react/number-field';
import styles from './index.module.css';
import { PlusIcon, MinusIcon } from '../Icon';

export interface NumberFieldProps {
  description?: string;
  error?: string;
  placeholder?: string;
  value?: number | null;
  defaultValue?: number;
  min?: number;
  max?: number;
  step?: number;
  smallStep?: number;
  largeStep?: number;
  format?: Intl.NumberFormatOptions;
  disabled?: boolean;
  required?: boolean;
  id?: string;
  name?: string;
  onChange?: (value: number | null) => void;
  validate?: (value: unknown) => string | null;
  className?: string;
}

export function NumberField({
  description,
  error,
  placeholder,
  value,
  defaultValue,
  min,
  max,
  step,
  smallStep,
  largeStep,
  format,
  disabled,
  required,
  id,
  name,
  onChange,
  validate,
  className,
}: NumberFieldProps) {
  return (
    <Field.Root
      disabled={disabled}
      validate={validate}
      invalid={error ? true : undefined}
      className={[styles.Root, className].filter(Boolean).join(' ')}
      name={name}
    >
      <BaseNumberField.Root
        id={id}
        value={value}
        defaultValue={defaultValue}
        min={min}
        max={max}
        step={step}
        smallStep={smallStep}
        largeStep={largeStep}
        format={format}
        disabled={disabled}
        required={required}
        onValueChange={next => onChange?.(next)}
      >
        <BaseNumberField.Group className={[styles.Group, error ? styles.error : ''].filter(Boolean).join(' ')}>
          <BaseNumberField.Decrement className={styles.Decrement}>
            <MinusIcon />
          </BaseNumberField.Decrement>
          <BaseNumberField.Input className={styles.Control} placeholder={placeholder} />
          <BaseNumberField.Increment className={styles.Increment}>
            <PlusIcon />
          </BaseNumberField.Increment>
        </BaseNumberField.Group>
      </BaseNumberField.Root>

      {description && <Field.Description className={styles.Description}>{description}</Field.Description>}

      {error
        ? <Field.Error className={styles.ErrorText} match={true}>{error}</Field.Error>
        : <Field.Error className={styles.ErrorText} />
      }
    </Field.Root>
  );
}

export default NumberField;
