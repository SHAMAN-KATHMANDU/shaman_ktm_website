import { DateTimeInput, Field } from "shamanktm-website";

export function PublishDate() {
  return (
    <Field label="Publish at" hint="Leave blank to publish immediately on save.">
      <DateTimeInput
        value="2026-08-15T10:30:00.000Z"
        onChange={() => {}}
      />
    </Field>
  );
}

export function SaleStart() {
  return (
    <Field label="Sale starts" hint="Automatically available on this date.">
      <DateTimeInput
        value="2026-09-01T00:00:00.000Z"
        onChange={() => {}}
      />
    </Field>
  );
}

export function Empty() {
  return (
    <Field label="Expires at" hint="Blank = no expiration.">
      <DateTimeInput
        value={null}
        onChange={() => {}}
      />
    </Field>
  );
}
