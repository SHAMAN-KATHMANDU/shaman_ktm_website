import { NumberInput, Field } from "shamanktm-website";

export function Quantity() {
  return (
    <Field label="Quantity">
      <NumberInput value={3} onChange={() => {}} />
    </Field>
  );
}

export function Bounded() {
  return (
    <Field label="Days to mature" hint="Between 0 and 365 days.">
      <NumberInput value={180} onChange={() => {}} min={0} max={365} />
    </Field>
  );
}

export function Empty() {
  return (
    <Field label="Stock level" hint="Leave blank to hide from storefront.">
      <NumberInput value={null} onChange={() => {}} />
    </Field>
  );
}

export function Disabled() {
  return (
    <Field label="Total units" hint="Read-only after the sale is locked.">
      <NumberInput value={24} onChange={() => {}} disabled />
    </Field>
  );
}
