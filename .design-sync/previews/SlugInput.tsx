import { SlugInput, Field } from "shamanktm-website";

export function AutoLinked() {
  return (
    <Field label="URL slug" hint="Auto-updates from title while linked.">
      <SlugInput
        value="full-moon-singing-bowl-8-inch"
        onChange={() => {}}
        source="Full Moon Singing Bowl 8″"
      />
    </Field>
  );
}

export function ManuallyEdited() {
  return (
    <Field label="URL slug" hint="Now manually edited — unlinked from title.">
      <SlugInput
        value="fm-bowl-8"
        onChange={() => {}}
        source="Full Moon Singing Bowl 8″"
      />
    </Field>
  );
}

export function Empty() {
  return (
    <Field label="URL slug" hint="Will auto-generate from title.">
      <SlugInput
        value=""
        onChange={() => {}}
        source="Himalayan Juniper Incense 24-pack"
      />
    </Field>
  );
}
