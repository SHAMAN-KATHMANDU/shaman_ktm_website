import Image from "next/image";
import { practitionersForService } from "@/lib/cms/practitioners";
import { renderMarkdown } from "@/lib/markdown";
import type { Locale } from "@/lib/i18n/locale";
import type { Messages } from "@/lib/i18n/types";

/** "Who leads this session": the published practitioners linked to a service. */
export async function ServicePractitioners({
  serviceSlug,
  locale,
  t,
}: {
  serviceSlug: string;
  locale: Locale;
  t: Messages["services"];
}) {
  const people = await practitionersForService(serviceSlug).catch(() => []);
  if (people.length === 0) return null;
  const pick = (en: string | null, ne: string | null) =>
    locale === "ne" && ne?.trim() ? ne : en;

  return (
    <section className="mt-20 border-t border-line pt-12">
      <h2 className="font-display text-3xl text-ink mb-8">
        {people.length === 1 ? t.practitionerHeading : t.practitionersHeading}
      </h2>
      <div className="space-y-12">
        {people.map((p) => {
          const training = pick(p.training, p.trainingNe);
          const name = pick(p.name, p.nameNe) ?? p.name;
          return (
            <article
              key={p.id}
              className={p.photoUrl ? "grid gap-8 md:grid-cols-[200px_1fr]" : ""}
            >
              {p.photoUrl && (
                <div className="relative aspect-[3/4] w-full max-w-[200px] overflow-hidden bg-cream">
                  <Image
                    src={p.photoUrl}
                    alt={name}
                    fill
                    sizes="200px"
                    className="object-cover"
                  />
                </div>
              )}
              <div className="max-w-2xl">
                <h3 className="font-display text-2xl text-ink">{name}</h3>
                {pick(p.role, p.roleNe) && (
                  <p className="label-eyebrow mt-1 mb-4">{pick(p.role, p.roleNe)}</p>
                )}
                <div
                  className="prose text-ink-soft"
                  dangerouslySetInnerHTML={{
                    __html: renderMarkdown(pick(p.bio, p.bioNe) ?? p.bio),
                  }}
                />
                {training && (
                  <>
                    <p className="label-eyebrow mt-6 mb-2">{t.practitionerTraining}</p>
                    <div
                      className="prose text-ink-soft"
                      dangerouslySetInnerHTML={{ __html: renderMarkdown(training) }}
                    />
                  </>
                )}
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}
