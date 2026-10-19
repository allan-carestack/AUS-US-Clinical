import Switch from '../Switch';
import { setIcdEnabled, useIcdEnabled } from './icd';
import styles from './IcdToggle.module.css';

/** Prototype-only: shows or hides the ICD field in the tooth selector popover. */
export function IcdToggle() {
  const on = useIcdEnabled();
  return (
    <div className={styles.Root}>
      <Switch checked={on} onCheckedChange={setIcdEnabled}>ICD code field (prototype)</Switch>
    </div>
  );
}
