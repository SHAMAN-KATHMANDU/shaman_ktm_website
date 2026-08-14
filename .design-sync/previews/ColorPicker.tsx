import { ColorPicker, Field } from "shamanktm-website";

export function BrandMetal() {
  return (
    <Field label="Accent color" hint="Used for highlights and hover states.">
      <ColorPicker value="#a98e52" onChange={() => {}} />
    </Field>
  );
}

export function BrandJade() {
  return (
    <Field label="Success/settled color">
      <ColorPicker value="#5e7d6f" onChange={() => {}} />
    </Field>
  );
}

export function BrandRakta() {
  return (
    <Field label="Attention/error color">
      <ColorPicker value="#9c4136" onChange={() => {}} />
    </Field>
  );
}

export function Empty() {
  return (
    <Field label="Product display tint" hint="Optional — defaults to brand metal.">
      <ColorPicker value="#000000" onChange={() => {}} />
    </Field>
  );
}
