import { BilingualField } from "shamanktm-website";

export function Complete() {
  return (
    <BilingualField
      label="Collection name"
      enValue="Sound Healing Bowls"
      neValue="ध्वनि उपचार कटोरी"
      onEnChange={() => {}}
      onNeChange={() => {}}
      placeholder="e.g. Sound Healing Bowls"
      hint="Shown on the storefront navigation."
    />
  );
}

export function NepaliFilled() {
  return (
    <BilingualField
      label="Product title"
      enValue="Full Moon Singing Bowl 8″"
      neValue="पूर्णिमा गायन कचौरा"
      onEnChange={() => {}}
      onNeChange={() => {}}
      placeholder="Product name in English"
    />
  );
}

export function MissingNepali() {
  return (
    <BilingualField
      label="Product title"
      enValue="Rudraksha Mala · 108 beads"
      neValue={null}
      onEnChange={() => {}}
      onNeChange={() => {}}
      placeholder="Product name in English"
      hint="Complete the Nepali translation to be storefront-ready."
    />
  );
}

export function MultilineComplete() {
  return (
    <BilingualField
      label="Description"
      enValue="Hand-carved from sustainably harvested Himalayan juniper. Pure, woody notes perfect for meditation and sleep."
      neValue="टिकाऊ तरिकाले संकलित हिमालयन ज्यूनिपरबाट हात-नक्काशी। ध्यान र निद्राको लागि शुद्ध, लकडी को गंध।"
      onEnChange={() => {}}
      onNeChange={() => {}}
      multiline
      placeholder="Write a brief description"
    />
  );
}

export function MultilineMissingNepali() {
  return (
    <BilingualField
      label="Description"
      enValue="Seven bronze bowls tuned to the body's chakra centers. Traditionally used in Himalayan sound baths."
      neValue={undefined}
      onEnChange={() => {}}
      onNeChange={() => {}}
      multiline
      placeholder="Write a brief description"
    />
  );
}

export function Required() {
  return (
    <BilingualField
      label="Meta title"
      enValue="Meditation Mala | Authentic Rudraksha"
      neValue="ध्यान माला | प्रामाणिक रुद्राक्ष"
      onEnChange={() => {}}
      onNeChange={() => {}}
      required
      placeholder="SEO title"
      hint="Used in search results and social previews."
    />
  );
}
