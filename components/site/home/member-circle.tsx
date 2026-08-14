import { MemberCircleForm } from "./member-circle-form";
import { pickLocalized, type Locale } from "@/lib/i18n/locale";
import type { HomeCopy } from "@/lib/site-content";
import { accentColor, type HomeAccent } from "@/lib/home-accents";

// Member Circle band (homeMemberCircle module): benefits list + join form.
// Leads land in /sysuser/member-leads via /api/public/v1/member-leads.
// `accent` (set in /sysuser/homepage) colours the eyebrow, benefit marks, and
// the decorative rings. Defaults to gold.
export function MemberCircle({
  homeCopy,
  locale,
  accent,
}: {
  homeCopy: HomeCopy;
  locale: Locale;
  accent?: HomeAccent;
}) {
  const benefits = pickLocalized(homeCopy, "memberCircleBenefits", locale) ?? [];
  const accentCss = accentColor(accent);

  return (
    <section
      id="member-circle"
      className="relative overflow-hidden border-t border-line bg-ink text-cream"
    >
      {/* Decorative circles echoing the membership card */}
      <div
        aria-hidden
        className="absolute -top-56 -right-56 w-[560px] h-[560px] rounded-full border"
        style={{ borderColor: accentCss, opacity: 0.15 }}
      />
      <div
        aria-hidden
        className="absolute -bottom-64 -left-52 w-[520px] h-[520px] rounded-full border"
        style={{ borderColor: accentCss, opacity: 0.1 }}
      />
      <div className="relative mx-auto max-w-[1400px] px-6 md:px-10 py-20 md:py-28 grid gap-12 md:grid-cols-[1.05fr_0.95fr]">
        <div>
          <p className="label-eyebrow mb-3" style={{ color: accentCss }}>
            {pickLocalized(homeCopy, "memberCircleEyebrow", locale)}
          </p>
          <h2 className="display-heading font-display text-3xl md:text-5xl text-cream leading-tight mb-5">
            {pickLocalized(homeCopy, "memberCircleHeading", locale)}
          </h2>
          <p className="text-cream leading-relaxed mb-8 max-w-xl">
            {pickLocalized(homeCopy, "memberCircleLede", locale)}
          </p>
          <ul className="grid gap-3 sm:grid-cols-2 sm:gap-x-6">
            {benefits.map((b, i) => (
              <li
                key={i}
                className="flex gap-3 items-start text-sm text-cream"
              >
                <span className="flex-shrink-0" style={{ color: accentCss }}>—</span>
                {b}
              </li>
            ))}
          </ul>
        </div>
        <MemberCircleForm
          formHeading={pickLocalized(homeCopy, "memberCircleFormHeading", locale)}
          formDescription={pickLocalized(homeCopy, "memberCircleFormDescription", locale)}
          nameLabel={pickLocalized(homeCopy, "memberCircleNameLabel", locale)}
          whatsappLabel={pickLocalized(homeCopy, "memberCircleWhatsappLabel", locale)}
          buttonLabel={pickLocalized(homeCopy, "memberCircleButtonLabel", locale)}
          finePrint={pickLocalized(homeCopy, "memberCircleFinePrint", locale)}
          successHeading={pickLocalized(homeCopy, "memberCircleSuccessHeading", locale)}
          successMessage={pickLocalized(homeCopy, "memberCircleSuccessMessage", locale)}
        />
      </div>
    </section>
  );
}
