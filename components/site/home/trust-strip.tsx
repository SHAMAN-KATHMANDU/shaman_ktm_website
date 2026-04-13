import { Leaf, MapPin, MessageCircle, ShieldCheck, Truck } from "lucide-react";
import { T } from "../i18n/t";

const items: { icon: React.ReactNode; en: string; np: string }[] = [
  {
    icon: <ShieldCheck size={16} strokeWidth={2} />,
    en: "100% Handcrafted",
    np: "१००% हस्तनिर्मित",
  },
  {
    icon: <Truck size={16} strokeWidth={2} />,
    en: "Free Shipping above Rs. 2,000",
    np: "रु. २,००० माथि निःशुल्क ढुवानी",
  },
  {
    icon: <MapPin size={16} strokeWidth={2} />,
    en: "3 Showrooms in Kathmandu",
    np: "काठमाडौंमा ३ शोरूम",
  },
  {
    icon: <MessageCircle size={16} strokeWidth={2} />,
    en: "WhatsApp Ordering Available",
    np: "वाट्सएप अर्डरिङ उपलब्ध",
  },
  {
    icon: <Leaf size={16} strokeWidth={2} />,
    en: "Sustainably Sourced",
    np: "वातावरणमैत्री",
  },
];

export function TrustStrip() {
  return (
    <div className="sk-trust-strip">
      <div className="sk-wrap">
        <ul className="sk-trust-list">
          {items.map((item, i) => (
            <li className="sk-trust-item" key={i}>
              <span className="sk-trust-item-icon" aria-hidden>
                {item.icon}
              </span>
              <T en={item.en} np={item.np} />
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
