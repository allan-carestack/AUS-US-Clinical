import { useEffect, useId, useState } from 'react';
import Button from '../Button';
import Checkbox from '../Checkbox';
import {
  Dialog,
  DialogBody,
  DialogClose,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../Dialog';
import { Field } from '../Field';
import { Label } from '../Label';
import { Select, SelectContent, SelectItem, SelectTrigger } from '../Select';
import styles from './EditPlanDetailsDialog.module.css';

const LOCATIONS = [
  'MEL: Zenteeth Melbourne',
  'SYD: Zenteeth Sydney',
] as const;

const CONDITIONS = [
  'Caries',
  'Periodontal disease',
  'Missing teeth',
] as const;

const COORDINATORS = [
  'ACHU',
  'Jane Doe',
] as const;

const ALTERNATIVES = [
  'None',
  'All on 4 Tx - ALT',
] as const;

export interface EditPlanDetailsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  planName: string;
  onSave: (planName: string) => void;
}

export function EditPlanDetailsDialog({
  open,
  onOpenChange,
  planName,
  onSave,
}: EditPlanDetailsDialogProps) {
  const planNameId = useId();
  const locationLabelId = useId();
  const conditionsLabelId = useId();
  const coordinatorLabelId = useId();
  const alternativeLabelId = useId();

  const [draftName, setDraftName] = useState(planName);
  const [location, setLocation] = useState<string | null>(LOCATIONS[0]);
  const [condition, setCondition] = useState<string | null>(null);
  const [coordinator, setCoordinator] = useState<string | null>(null);
  const [lockCoordinator, setLockCoordinator] = useState(false);
  const [alternative, setAlternative] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setDraftName(planName);
    setLocation(LOCATIONS[0]);
    setCondition(null);
    setCoordinator(null);
    setLockCoordinator(false);
    setAlternative(null);
  }, [open, planName]);

  const canSave = draftName.trim().length > 0 && location != null;

  const handleSave = () => {
    const trimmed = draftName.trim();
    if (!trimmed || location == null) return;
    onSave(trimmed);
    onOpenChange(false);
  };

  const focusPlanName = () => {
    const input = document.getElementById(planNameId) as HTMLInputElement | null;
    if (!input) return null;
    // Select after focus so typing replaces the current name.
    requestAnimationFrame(() => input.select());
    return input;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent size="md" initialFocus={focusPlanName}>
        <DialogHeader>
          <DialogTitle>Edit treatment plan details</DialogTitle>
          <DialogClose />
        </DialogHeader>

        <form
          onSubmit={(event) => {
            event.preventDefault();
            handleSave();
          }}
        >
          <DialogBody className={styles.Body}>
            <Field
              id={planNameId}
              label="Plan Name"
              labelSize="md"
              required
              autoFocus
              value={draftName}
              onChange={setDraftName}
            />

            <div className={styles.Row}>
              <Label id={locationLabelId} size="md" required>
                Presented Location
              </Label>
              <div className={styles.Control}>
                <Select
                  value={location ?? undefined}
                  onValueChange={(value) => setLocation(String(value))}
                >
                  <SelectTrigger
                    placeholder="Select"
                    aria-labelledby={locationLabelId}
                    className={styles.SelectTrigger}
                  />
                  <SelectContent>
                    {LOCATIONS.map((item) => (
                      <SelectItem key={item} value={item}>
                        {item}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className={styles.Row}>
              <Label id={conditionsLabelId} size="md">
                Diagnosed Conditions
              </Label>
              <div className={styles.Control}>
                <Select
                  value={condition ?? undefined}
                  onValueChange={(value) => setCondition(String(value))}
                >
                  <SelectTrigger
                    placeholder="Select"
                    aria-labelledby={conditionsLabelId}
                    className={styles.SelectTrigger}
                  />
                  <SelectContent>
                    {CONDITIONS.map((item) => (
                      <SelectItem key={item} value={item}>
                        {item}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className={styles.RowStack}>
              <div className={styles.Row}>
                <Label id={coordinatorLabelId} size="md">
                  Coordinator
                </Label>
                <div className={styles.Control}>
                  <Select
                    value={coordinator ?? undefined}
                    onValueChange={(value) => setCoordinator(String(value))}
                  >
                    <SelectTrigger
                      placeholder="Select"
                      aria-labelledby={coordinatorLabelId}
                      className={styles.SelectTrigger}
                    />
                    <SelectContent>
                      {COORDINATORS.map((item) => (
                        <SelectItem key={item} value={item}>
                          {item}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className={styles.CheckboxOffset}>
                <Checkbox
                  checked={lockCoordinator}
                  onCheckedChange={(checked) => setLockCoordinator(checked === true)}
                >
                  Lock Treatment Coordinator
                </Checkbox>
              </div>
            </div>

            <div className={styles.Row}>
              <Label id={alternativeLabelId} size="md">
                Plan Alternative to
              </Label>
              <div className={styles.Control}>
                <Select
                  value={alternative ?? undefined}
                  onValueChange={(value) => setAlternative(String(value))}
                  disabled
                >
                  <SelectTrigger
                    placeholder="Select"
                    aria-labelledby={alternativeLabelId}
                    className={styles.SelectTrigger}
                  />
                  <SelectContent>
                    {ALTERNATIVES.map((item) => (
                      <SelectItem key={item} value={item}>
                        {item}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </DialogBody>

          <DialogFooter className={styles.Footer}>
            <DialogClose>
              <Button type="button" variant="secondary">Cancel</Button>
            </DialogClose>
            <Button type="submit" variant="primary" disabled={!canSave}>
              Save changes
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
