import { Gift, Sparkles, Tag, Truck } from "lucide-react";
import { T } from "../i18n/t";

const benefits: { icon: React.ReactNode; en: string; np: string }[] = [
  {
    icon: <Truck size={16} strokeWidth={1.6} />,
    en: "Free shipping on all orders",
    np: "सबै अर्डरमा निःशुल्क ढुवानी",
  },
  {
    icon: <Sparkles size={16} strokeWidth={1.6} />,
    en: "Early access to new arrivals",
    np: "नयाँ आगमनमा पहुँच",
  },
  {
    icon: <Tag size={16} strokeWidth={1.6} />,
    en: "Exclusive member pricing",
    np: "सदस्य मूल्य",
  },
  {
    icon: <Gift size={16} strokeWidth={1.6} />,
    en: "Birthday surprise gift",
    np: "जन्मदिन उपहार",
  },
];

export function MemberBanner() {
  return (
    <section className="sk-member-banner">
      <div className="sk-wrap">
        <div className="sk-member-inner">
          <div>
            <h2 className="sk-member-h">
              <T
                en={<>Join the <em>Shaman Family</em></>}
                np={<><em>शामान परिवार</em>मा सामेल</>}
              />
            </h2>
            <div className="sk-benefits-row">
              {benefits.map((b, i) => (
                <div className="sk-benefit-item" key={i}>
                  <span className="sk-benefit-icon" aria-hidden>
                    {b.icon}
                  </span>
                  <T en={b.en} np={b.np} />
                </div>
              ))}
            </div>
          </div>
          <div className="sk-member-ctas">
            <a href="#" className="sk-btn sk-btn-white">
              <T en="Create Free Account" np="खाता खोल्नुहोस्" />
            </a>
            <a href="#" className="sk-btn sk-btn-ghost">
              <T en="Already a member? Login" np="पहिले नै सदस्य? लगइन" />
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}
