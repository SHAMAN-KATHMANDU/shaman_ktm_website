import Link from "next/link";
import { WA_LINK } from "@/lib/contact";
import { WaIcon } from "../icons";
import { T } from "../i18n/t";

export function StickyBar() {
  return (
    <div className="sk-sticky-bar">
      <Link
        href="/shop"
        className="sk-add-btn"
        style={{
          flex: 1,
          height: 48,
          fontSize: 13,
          borderRadius: 4,
        }}
      >
        <T en="Shop Now →" np="अहिले किन्नुहोस् →" />
      </Link>
      <a
        href={WA_LINK}
        className="sk-btn sk-btn-wa"
        style={{ flex: 1, height: 48, fontSize: 13, padding: 0, borderRadius: 4 }}
        target="_blank"
        rel="noopener noreferrer"
      >
        <WaIcon size={16} />
        &nbsp;<T en="WhatsApp" np="वाट्सएप" />
      </a>
    </div>
  );
}
