import { MoneyInput, Field } from "shamanktm-website";

export function ProductPrice() {
  return (
    <Field label="Selling price" hint="Whole NPR rupees.">
      <MoneyInput value={12500} onChange={() => {}} />
    </Field>
  );
}

export function CostInput() {
  return (
    <Field label="Cost of goods" hint="Used to compute margin reports.">
      <MoneyInput value={4200} onChange={() => {}} placeholder="0" />
    </Field>
  );
}

export function Empty() {
  return (
    <Field label="Discount amount" hint="Optional — leave blank for no discount.">
      <MoneyInput value={null} onChange={() => {}} placeholder="0" />
    </Field>
  );
}

export function Disabled() {
  return (
    <Field label="Total after tax" hint="Read-only calculated value.">
      <MoneyInput value={13750} onChange={() => {}} disabled />
    </Field>
  );
}
