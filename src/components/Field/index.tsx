import { useId } from 'react';
import { Label, type LabelSize } from '../Label';
import { Input, type InputProps } from '../Input';
import styles from './index.module.css';

export interface FieldProps extends Omit<InputProps, 'label' | 'id'> {
  label: React.ReactNode;
  labelSize?: LabelSize;
  id?: string;
  className?: string;
  style?: React.CSSProperties;
  labelClassName?: string;
  controlClassName?: string;
}

export function Field({
  label,
  labelSize = 'md',
  required,
  id,
  className,
  style,
  labelClassName,
  controlClassName,
  ...inputProps
}: FieldProps) {
  const generatedId = useId();
  const inputId = id ?? generatedId;

  return (
    <div className={[styles.Field, className].filter(Boolean).join(' ')} style={style}>
      <Label htmlFor={inputId} size={labelSize} required={required} className={labelClassName}>
        {label}
      </Label>
      <div className={[styles.Control, controlClassName].filter(Boolean).join(' ')}>
        <Input id={inputId} required={required} {...inputProps} />
      </div>
    </div>
  );
}

export default Field;
