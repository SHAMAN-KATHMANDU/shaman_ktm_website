import Link from "next/link";
import { Mail, MapPin } from "lucide-react";
import { showrooms } from "@/data/showrooms";
import { EMAIL, PHONE_DISPLAY, WA_LINK } from "@/lib/contact";
import { Logo } from "./logo";
import { T } from "../i18n/t";
import { FacebookIcon, InstagramIcon, TikTokIcon, WaIcon } from "../icons";
import { LangToggle } from "../i18n/lang-toggle";

export function Footer() {
  return (
    <footer className="sk-footer">
      <div className="sk-wrap">
        <div className="sk-footer-grid">
          <div className="sk-footer-brand">
            <Logo variant="light" />
            <p className="sk-footer-tagline">
              <T
                en="Bringing Nepal's finest handcrafted goods to the world — one piece, one story at a time."
                np="नेपालका उत्कृष्ट हस्तनिर्मित सामानहरू विश्वमा पुर्‍याउँदै।"
              />
            </p>
            <p className="sk-footer-tagline-np">
              हातले बनाइएको, मनले महसुस गरिएको
            </p>
            <div className="sk-social-icons">
              <a
                href="https://www.instagram.com/shamankathmandu"
                className="sk-social-icon"
                aria-label="Instagram"
                target="_blank"
                rel="noopener noreferrer"
              >
                <InstagramIcon size={16} />
              </a>
              <a
                href="#"
                className="sk-social-icon"
                aria-label="Facebook"
              >
                <FacebookIcon size={16} />
              </a>
              <a
                href="#"
                className="sk-social-icon"
                aria-label="TikTok"
              >
                <TikTokIcon size={16} />
              </a>
              <a
                href={WA_LINK}
                className="sk-social-icon"
                aria-label="WhatsApp"
                target="_blank"
                rel="noopener noreferrer"
              >
                <WaIcon size={16} />
              </a>
            </div>
          </div>

          <div className="sk-footer-col">
            <h5>
              <T en="Shop" np="पसल" />
            </h5>
            <ul>
              <li><Link href="/shop?category=jewelry"><T en="Jewelry" np="गहना" /></Link></li>
              <li><Link href="/shop?category=spiritual"><T en="Spiritual" np="आध्यात्मिक" /></Link></li>
              <li><Link href="/shop?category=statues"><T en="Statues" np="मूर्ति" /></Link></li>
              <li><Link href="/shop?category=home-decor"><T en="Home Decor" np="घर सजावट" /></Link></li>
              <li><Link href="/shop?category=furniture"><T en="Furniture" np="फर्निचर" /></Link></li>
              <li><Link href="/shop?category=gifts"><T en="Gifts" np="उपहार" /></Link></li>
              <li><Link href="/shop"><T en="All Products" np="सबै उत्पादन" /></Link></li>
            </ul>
          </div>

          <div className="sk-footer-col">
            <h5>
              <T en="Company" np="कम्पनी" />
            </h5>
            <ul>
              <li><a href="#story"><T en="Our Story" np="हाम्रो कथा" /></a></li>
              <li><a href="#howto"><T en="How-To Guides" np="गाइड" /></a></li>
              <li><a href="#"><T en="Influencers" np="इन्फ्लुएन्सर" /></a></li>
              <li><a href={`mailto:${EMAIL}`}><T en="Contact Us" np="सम्पर्क" /></a></li>
            </ul>
          </div>

          <div className="sk-footer-col">
            <h5>
              <T en="Showrooms" np="शोरूम" />
            </h5>
            {showrooms.map((room) => (
              <div className="sk-showroom-item" key={room.key}>
                <strong>{room.name}</strong>
                <span>{room.address}</span>
                <a href={room.mapUrl} target="_blank" rel="noopener noreferrer">
                  <MapPin size={12} strokeWidth={2} />{" "}
                  <T en="Directions" np="दिशा" />
                </a>
              </div>
            ))}
          </div>

          <div className="sk-footer-col">
            <h5>
              <T en="Connect" np="सम्पर्क" />
            </h5>
            <ul>
              <li>
                <a
                  href="https://www.instagram.com/shamankathmandu"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <InstagramIcon size={14} /> Instagram
                </a>
              </li>
              <li>
                <a href="#">
                  <FacebookIcon size={14} /> Facebook
                </a>
              </li>
              <li>
                <a href={`mailto:${EMAIL}`}>
                  <Mail size={14} strokeWidth={2} />{" "}
                  <T en="Email Us" np="इमेल" />
                </a>
              </li>
            </ul>
            <div className="sk-wa-box">
              <p>
                <T en="Order via WhatsApp" np="वाट्सएपमा अर्डर" />
              </p>
              <a href={WA_LINK} target="_blank" rel="noopener noreferrer">
                <WaIcon size={14} /> {PHONE_DISPLAY} →
              </a>
            </div>
          </div>
        </div>

        <div className="sk-footer-bottom">
          <span>
            © {new Date().getFullYear()} Shaman Kathmandu ·{" "}
            <T en="All rights reserved" np="सर्वाधिकार सुरक्षित" />
          </span>
          <div className="sk-footer-bottom-links">
            <a href="#"><T en="Privacy" np="गोपनीयता" /></a>
            <a href="#"><T en="Terms" np="सर्तहरू" /></a>
            <LangToggle />
          </div>
        </div>
      </div>
    </footer>
  );
}
