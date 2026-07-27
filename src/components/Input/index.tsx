import React, { useRef, useState } from 'react';
import { Field } from '@base-ui/react/field';
import styles from './index.module.css';
import { CloseIcon, SearchIcon, CalendarIcon } from '../Icon';

export interface InputProps {
  type?: 'text' | 'search' | 'date';
  label?: string;
  description?: string;
  error?: string;
  placeholder?: string;
  value?: string;
  defaultValue?: string;
  disabled?: boolean;
  required?: boolean;
  autoFocus?: boolean;
  id?: string;
  name?: string;
  onChange?: (value: string) => void;
  validate?: (value: unknown) => string | null;
  className?: string;
}

export function Input({
  type = 'text',
  label,
  description,
  error,
  placeholder,
  value,
  defaultValue,
  disabled,
  required,
  autoFocus,
  id,
  name,
  onChange,
  validate,
  className,
}: InputProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const isControlled = value !== undefined;
  const nativeType = type === 'search' ? 'text' : type;
  const hasRightIcons = type === 'search' || type === 'date';

  // Track whether the input has a value so we can show/hide the clear button
  // for both controlled and uncontrolled inputs.
  const [uncontrolledHasValue, setUncontrolledHasValue] = useState(!!defaultValue);
  const showClear = isControlled ? !!value : uncontrolledHasValue;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!isControlled) setUncontrolledHasValue(!!e.target.value);
    onChange?.(e.target.value);
  };

  const handleClear = () => {
    if (!isControlled && inputRef.current) {
      inputRef.current.value = '';
      setUncontrolledHasValue(false);
    }
    onChange?.('');
    inputRef.current?.focus();
  };

  return (
    <Field.Root
      disabled={disabled}
      validate={validate}
      invalid={error ? true : undefined}
      className={[styles.Root, className].filter(Boolean).join(' ')}
      name={name}
    >
      {label && <Field.Label className={styles.Label}>{label}</Field.Label>}

      <div
        className={[styles.Field, error ? styles.error : ''].filter(Boolean).join(' ')}
        onClick={() => inputRef.current?.focus()}
      >
        <Field.Control
          ref={inputRef}
          type={nativeType}
          placeholder={placeholder}
          value={value}
          defaultValue={defaultValue}
          required={required}
          autoFocus={autoFocus}
          id={id}
          onChange={handleChange}
          className={styles.Control}
        />

        {hasRightIcons && (
          <span className={styles.Icons}>
            {(type === 'search' || type === 'date') && (
              <button
                type="button"
                tabIndex={-1}
                className={styles.ClearBtn}
                onClick={handleClear}
                aria-label="Clear"
                style={{ display: showClear ? undefined : 'none' }}
              >
                <CloseIcon />
              </button>
            )}
            {type === 'search' && <span className={styles.IconSlot}><SearchIcon /></span>}
            {type === 'date'   && <span className={styles.IconSlot}><CalendarIcon /></span>}
          </span>
        )}
      </div>

      {description && <Field.Description className={styles.Description}>{description}</Field.Description>}

      {error
        ? <Field.Error className={styles.ErrorText} match={true}>{error}</Field.Error>
        : <Field.Error className={styles.ErrorText} />
      }
    </Field.Root>
  );
}

export default Input;
