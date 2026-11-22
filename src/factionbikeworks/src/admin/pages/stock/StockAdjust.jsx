import { useState } from "react";
import { adminApi } from "../../lib/adminApi";
import { Button, Field, NumberInput, Select, TextInput } from "../../ui/controls";
import { Popover } from "../../ui/overlay";
import { useToast } from "../../../lib/store";

export const ADMIN_REASONS = [
  ["received", "Received delivery"],
  ["damaged", "Damaged or lost"],
  ["count_correction", "Count correction"],
];

/** "Set stock to N" with a reason. If stock moved since it was shown, the admin is told. */
export function StockAdjust({ anchor, variation, onClose, onDone }) {
  const toast = useToast();
  const [expected, setExpected] = useState(variation.stock);
  const [setTo, setSetTo] = useState(variation.stock);
  const [reason, setReason] = useState("received");
  const [note, setNote] = useState("");
  const [error, setError] = useState(null);
  const [pending, setPending] = useState(false);

  const save = async (e) => {
    e.preventDefault();
    setPending(true);
    setError(null);
    try {
      const r = await adminApi.post(`/variations/${variation.id}/stock`, { setTo, expected, reason, note });
      toast(r.changed ? `Stock set to ${r.stockAfter}` : "Stock unchanged");
      onDone?.(r.stockAfter);
      onClose();
    } catch (err) {
      setError(err.errors?.setTo || err.message);
      if (err.body?.code === "stock_changed") {
        setExpected(err.body.stock);
        onDone?.(err.body.stock, { keepOpen: true });
      }
    } finally {
      setPending(false);
    }
  };

  return (
    <Popover anchor={anchor} onClose={onClose} label={`Adjust stock for ${variation.name}`}>
      <form className="adm-stack" onSubmit={save}>
        <p className="adm-h3">
          Adjust stock <span className="mono dim">{variation.sku}</span>
        </p>
        <p className="adm-hint">Now: {expected}</p>
        <Field label="New stock" error={error}>
          <NumberInput min={0} value={setTo} onChange={setSetTo} autoFocus />
        </Field>
        <Field label="Reason">
          <Select value={reason} onChange={setReason} options={ADMIN_REASONS} />
        </Field>
        <Field label="Note (optional)">
          <TextInput value={note} onChange={setNote} maxLength={300} placeholder="PO 1182" />
        </Field>
        <div className="adm-actions">
          <Button variant="ghost" size="sm" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="primary" size="sm" type="submit" loading={pending} disabled={setTo === ""}>
            Save
          </Button>
        </div>
      </form>
    </Popover>
  );
}
