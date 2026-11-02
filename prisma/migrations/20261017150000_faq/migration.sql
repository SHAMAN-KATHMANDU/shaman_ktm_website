-- CreateTable
CREATE TABLE "Faq" (
    "id" TEXT NOT NULL,
    "question" TEXT NOT NULL,
    "questionNe" TEXT,
    "answer" TEXT NOT NULL,
    "answerNe" TEXT,
    "topic" TEXT NOT NULL DEFAULT 'general',
    "categoryId" TEXT,
    "showOnHome" BOOLEAN NOT NULL DEFAULT false,
    "published" BOOLEAN NOT NULL DEFAULT true,
    "position" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Faq_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Faq_categoryId_idx" ON "Faq"("categoryId");

-- AddForeignKey
ALTER TABLE "Faq" ADD CONSTRAINT "Faq_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE SET NULL ON UPDATE CASCADE;


-- Seed the table with the questions that were live on the "faq" CMS page.
INSERT INTO "Faq" ("id", "question", "questionNe", "answer", "answerNe", "topic", "showOnHome", "position", "updatedAt") VALUES
  ('faq-what-is-shaman-kathmandu', 'What is Shaman Kathmandu?', 'शमन काठमाडौं के हो?', 'Shaman Kathmandu is a small group of showrooms in the Kathmandu Valley. We curate handcrafted objects — singing bowls, statues, jewellery, dreamcatchers, wind chimes, wall and table decor — and sound healing services, organised around six elements: Metal, Earth, Wood, Plant, Water and Air. Curated in Kathmandu, from the world, for the world.', 'शमन काठमाडौं काठमाडौं उपत्यकामा रहेका केही शोरुमहरूको समूह हो। हामी हस्तनिर्मित सामानहरू — गायनकटोरा, मूर्ति, गहना, ड्रिमक्याचर, विन्ड चाइम, भित्ता र टेबल सजावट — तथा साउन्ड हिलिङ सेवाहरू छ तत्त्व (धातु, पृथ्वी, काठ, वनस्पति, जल र वायु) अनुसार छानेर प्रस्तुत गर्छौं।', 'general', true, 10, CURRENT_TIMESTAMP),
  ('faq-place-order-online', 'How do I place an order online?', 'अनलाइन अर्डर कसरी गर्ने?', 'Add items to your cart and check out on the website. You''ll get an order confirmation, and we email you each time your order moves forward — confirmed, shipped and delivered. If you prefer to talk first, tap **Enquire on WhatsApp** on any product, service or bundle.', 'सामान कार्टमा राख्नुहोस् र वेबसाइटमै चेकआउट गर्नुहोस्। अर्डर पुष्टि भएपछि र अर्डर पठाइँदा तथा डेलिभर हुँदा हामी इमेल गर्छौं। पहिले कुरा गर्न चाहनुहुन्छ भने कुनै पनि सामान, सेवा वा बन्डलमा **WhatsApp मार्फत सोध्नुहोस्** थिच्नुहोस्।', 'ordering', true, 20, CURRENT_TIMESTAMP),
  ('faq-payment-methods', 'What payment methods do you accept?', 'कुन भुक्तानी विधि स्वीकार गर्नुहुन्छ?', 'Cash on delivery is available at checkout. Where it is shown at checkout, you can also pay online by scanning a Fonepay QR code with your mobile banking or wallet app. All prices are listed in Nepali rupees (NPR).', 'चेकआउटमा क्यास अन डेलिभरी उपलब्ध छ। चेकआउटमा देखिएको अवस्थामा मोबाइल बैंकिङ वा वालेटबाट Fonepay QR स्क्यान गरेर अनलाइन भुक्तानी पनि गर्न सकिन्छ। सबै मूल्य नेपाली रुपैयाँ (रु.) मा छन्।', 'ordering', true, 30, CURRENT_TIMESTAMP),
  ('faq-delivery-kathmandu-valley', 'Do you deliver inside Kathmandu Valley?', 'काठमाडौं उपत्यकाभित्र डेलिभरी गर्नुहुन्छ?', 'Yes. At checkout, choose the delivery zone closest to you — Thamel, Jhamsikhel or Gongabu — and we deliver from that showroom.', 'गर्छौं। चेकआउटमा आफूनजिकको डेलिभरी क्षेत्र — ठमेल, झम्सिखेल वा गोंगबु — छान्नुहोस्, हामी सोही शोरुमबाट डेलिभरी गर्छौं।', 'delivery', true, 40, CURRENT_TIMESTAMP),
  ('faq-shipping-outside-kathmandu', 'Do you ship outside Kathmandu?', 'काठमाडौं बाहिर पठाउनुहुन्छ?', 'Yes. Choose **Shipping (outside Kathmandu)** at checkout and we send your order by courier anywhere in Nepal. Delivery time depends on the courier and your location.', 'पठाउँछौं। चेकआउटमा **ढुवानी (काठमाडौं बाहिर)** छान्नुहोस्, हामी कुरियरमार्फत नेपालभर जहाँ पनि पठाउँछौं। डेलिभरी समय कुरियर र तपाईंको स्थानमा भर पर्छ।', 'delivery', true, 50, CURRENT_TIMESTAMP),
  ('faq-international-shipping', 'Do you ship internationally?', 'विदेशमा पठाउनुहुन्छ?', 'Yes — by request, on a per-order basis. [WhatsApp us](https://wa.me/9779820151135) with the items and your destination country and we''ll confirm availability and a shipping quote before you pay.', 'पठाउँछौं — अनुरोधअनुसार, प्रत्येक अर्डरका लागि छुट्टै। सामान र गन्तव्य देश लेखेर [WhatsApp गर्नुहोस्](https://wa.me/9779820151135), भुक्तानीअघि हामी उपलब्धता र ढुवानी शुल्क पुष्टि गर्छौं।', 'delivery', true, 60, CURRENT_TIMESTAMP),
  ('faq-track-order', 'How do I track my order?', 'मेरो अर्डर कहाँ पुग्यो, कसरी हेर्ने?', 'Sign in to your account and open **Orders** to see the current status of every order. We also email you whenever the status changes.', 'आफ्नो खातामा लगइन गरी **अर्डरहरू** खोल्नुहोस्, त्यहाँ हरेक अर्डरको अवस्था देखिन्छ। अवस्था बदलिँदा हामी इमेल पनि गर्छौं।', 'ordering', false, 70, CURRENT_TIMESTAMP),
  ('faq-cancel-order', 'Can I cancel my order?', 'अर्डर रद्द गर्न सकिन्छ?', 'An order can be cancelled until it has been shipped. Contact us on WhatsApp as soon as possible with your order number.', 'अर्डर नपठाइँदासम्म रद्द गर्न सकिन्छ। अर्डर नम्बरसहित सकेसम्म चाँडो WhatsApp मा सम्पर्क गर्नुहोस्।', 'ordering', false, 80, CURRENT_TIMESTAMP),
  ('faq-return-exchange-policy', 'What is your return and exchange policy?', 'फिर्ता र साटफेर नीति के हो?', 'All purchases are final — we don''t offer returns or refunds for change of mind. If your item arrives physically damaged, we''ll exchange it: report the damage within 3 days (72 hours) of delivery with your order number and clear photos or video of the product, the original packaging and the shipping label. See our full [Exchange Policy](/pages/exchange).', 'सबै खरिद अन्तिम हुन् — मन परिवर्तन भएमा फिर्ता वा रकम फिर्ता हुँदैन। सामान डेलिभरीमा भौतिक रूपमा क्षतिग्रस्त भएर आएमा हामी साटिदिन्छौं: डेलिभरी भएको ३ दिन (७२ घण्टा) भित्र अर्डर नम्बर र सामान, मूल प्याकेजिङ तथा ढुवानी लेबलको स्पष्ट फोटो वा भिडियोसहित जानकारी दिनुहोस्। पूरा [साटफेर नीति](/pages/exchange) हेर्नुहोस्।', 'returns', false, 90, CURRENT_TIMESTAMP),
  ('faq-handmade-variation', 'Why does my item look slightly different from the photo?', 'सामान फोटोभन्दा अलि फरक किन देखिन्छ?', 'Most of what we sell is made by hand, so small differences in colour, texture, grain and finish are normal and part of each piece''s character. These minor variations are not considered damage.', 'हाम्रा धेरैजसो सामान हातले बनाइएका हुन्, त्यसैले रङ, बनावट, काठको धर्सा र फिनिसिङमा सानो फरक हुनु स्वाभाविक हो। यस्ता साना भिन्नतालाई क्षति मानिँदैन।', 'products', false, 100, CURRENT_TIMESTAMP),
  ('faq-showroom-locations', 'Where are your showrooms?', 'तपाईंका शोरुम कहाँ छन्?', 'We have four showrooms:

- **Thamel** — Mandala Street, Thamel, Kathmandu
- **Jhamsikhel** — Ruby''s Collection, Jhamsikhel, Lalitpur
- **Gongabu** — Ghalepul, Gongabu, Kathmandu
- **Gatthaghar** — Bling Bling Homes, Gatthaghar, Bhaktapur

WhatsApp us before you head over so we can check that the piece you want is in that showroom. Addresses and maps are on our [contact page](/contact).', 'हाम्रा चार शोरुम छन्:

- **ठमेल** — मण्डला स्ट्रिट, ठमेल, काठमाडौं
- **झम्सिखेल** — रुबीज कलेक्सन, झम्सिखेल, ललितपुर
- **गोंगबु** — घलेपुल, गोंगबु, काठमाडौं
- **गठ्ठाघर** — ब्लिङ ब्लिङ होम्स, गठ्ठाघर, भक्तपुर

तपाईंले खोजेको सामान त्यो शोरुममा छ कि छैन भनेर जाँच्न जानुअघि WhatsApp गर्नुहोस्। ठेगाना र नक्सा [सम्पर्क पृष्ठ](/contact) मा छन्।', 'showrooms', false, 110, CURRENT_TIMESTAMP),
  ('faq-see-in-person', 'Can I see a product in person before buying?', 'किन्नुअघि सामान आफैं हेर्न सकिन्छ?', 'Yes. Stock is spread across our showrooms, so send us the product name or link on WhatsApp and we''ll tell you which showroom has it.', 'सकिन्छ। सामान विभिन्न शोरुममा छन्, त्यसैले सामानको नाम वा लिंक WhatsApp मा पठाउनुहोस्, कुन शोरुममा छ हामी बताउँछौं।', 'showrooms', false, 120, CURRENT_TIMESTAMP),
  ('faq-singing-bowls-handmade', 'Are your singing bowls handmade?', 'तपाईंका गायनकटोरा हस्तनिर्मित हुन्?', 'Yes. Each bowl is hand-tuned by ear by the smiths who make it, so every bowl sounds a little different. Notes are approximate; we list a primary tone where we can hear one cleanly. Browse our [singing bowls](/categories/singing-bowls).', 'हुन्। प्रत्येक कटोरा बनाउने कालिगडले कानले सुनेर ट्युन गर्छन्, त्यसैले हरेक कटोराको आवाज अलि फरक हुन्छ। स्वर अनुमानित हुन्छन्; स्पष्ट सुनिने मुख्य स्वर हामी उल्लेख गर्छौं। हाम्रा [गायनकटोरा](/categories/singing-bowls) हेर्नुहोस्।', 'products', false, 130, CURRENT_TIMESTAMP),
  ('faq-how-to-play-singing-bowl', 'How do I play a singing bowl?', 'गायनकटोरा कसरी बजाउने?', 'Rest the bowl on a cushion or your flat palm. To make it "sing", press the mallet against the outer rim and circle it slowly and steadily until the tone builds. To strike it, tap the side gently with the padded end of the mallet and let the sound fade on its own. If you''re unsure, ask us at a showroom and we''ll show you.', 'कटोरालाई कुसन वा सिधा हत्केलामा राख्नुहोस्। "गाउन" लगाउन लट्ठीलाई बाहिरी किनारमा थिचेर बिस्तारै र एकनासले घुमाउनुहोस्, स्वर आफैं बढ्दै जान्छ। ठोक्न, लट्ठीको नरम भागले छेउमा हल्का हिर्काउनुहोस् र आवाज आफैं हराउन दिनुहोस्। निश्चित हुनुहुन्न भने शोरुममा सोध्नुहोस्, हामी देखाइदिन्छौं।', 'products', false, 140, CURRENT_TIMESTAMP),
  ('faq-sound-healing-sessions', 'Do you offer sound healing sessions?', 'साउन्ड हिलिङ सेसन उपलब्ध छ?', 'Yes. We offer private sound healing sessions with Himalayan singing bowls in Kathmandu, including a session held at a stupa and a Tibetan bowl therapy sound bath. Sessions run 45–60 minutes and start from NPR 2,500. See all [services](/energy) and book on WhatsApp.', 'छ। हामी काठमाडौंमा हिमाली गायनकटोरासहित व्यक्तिगत साउन्ड हिलिङ सेसन सञ्चालन गर्छौं, जसमा स्तूपमा हुने सेसन र तिब्बती बाउल थेरापी साउन्ड बाथ पनि छन्। सेसन ४५–६० मिनेटका हुन्छन् र रु. २,५०० देखि सुरु हुन्छन्। सबै [सेवाहरू](/energy) हेर्नुहोस् र WhatsApp मार्फत बुक गर्नुहोस्।', 'services', false, 150, CURRENT_TIMESTAMP),
  ('faq-custom-bulk-orders', 'Do you take custom or bulk orders?', 'कस्टम वा थोक अर्डर लिनुहुन्छ?', 'Yes. For custom pieces, or for larger quantities for hotels, spas, interior studios and retailers, message us on WhatsApp with what you need and we''ll come back with options and a quote.', 'लिन्छौं। कस्टम सामान, वा होटल, स्पा, इन्टेरियर स्टुडियो र खुद्रा पसलका लागि धेरै परिमाण चाहिएमा आवश्यकता लेखेर WhatsApp गर्नुहोस्, हामी विकल्प र मूल्य पठाउँछौं।', 'ordering', false, 160, CURRENT_TIMESTAMP),
  ('faq-gift-orders', 'Can I buy a gift for someone else?', 'अरू कसैलाई उपहार पठाउन सकिन्छ?', 'Yes. Enter the recipient''s name, phone number and address as the delivery details at checkout. Our curated [bundles](/bundles) make easy gifts.', 'सकिन्छ। चेकआउटमा डेलिभरी विवरणमा उपहार पाउनेको नाम, फोन नम्बर र ठेगाना लेख्नुहोस्। हाम्रा [बन्डलहरू](/bundles) उपहारका लागि सजिला विकल्प हुन्।', 'ordering', false, 170, CURRENT_TIMESTAMP),
  ('faq-contact', 'How can I contact you?', 'तपाईंलाई कसरी सम्पर्क गर्ने?', 'The fastest way is WhatsApp at [+977 982-015-1135](https://wa.me/9779820151135) — most enquiries are answered the same day. You can also visit any of our showrooms or use our [contact page](/contact).', 'सबैभन्दा छिटो WhatsApp [+977 982-015-1135](https://wa.me/9779820151135) मा — धेरैजसो सोधपुछको जवाफ सोही दिन दिन्छौं। हाम्रा कुनै पनि शोरुममा आउन वा [सम्पर्क पृष्ठ](/contact) प्रयोग गर्न पनि सक्नुहुन्छ।', 'general', false, 180, CURRENT_TIMESTAMP)
ON CONFLICT ("id") DO NOTHING;

-- The "faq" CMS page is superseded: /pages/faq now renders the Faq table
-- (a static route that wins over /pages/[slug]). Keep its markdown as a
-- noindexed backup under a new slug so editing it can't silently do nothing.
UPDATE "Page" SET "slug" = 'faq-legacy', "noindex" = true
WHERE "slug" = 'faq'
  AND NOT EXISTS (SELECT 1 FROM "Page" WHERE "slug" = 'faq-legacy');
