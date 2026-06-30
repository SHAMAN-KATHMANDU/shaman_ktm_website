// Shape of the static UI-string catalog. en.json and ne.json must both satisfy
// this type, and the i18n-parity check (scripts/i18n-parity.ts) enforces that
// their keys stay in lockstep.

export interface Messages {
  common: {
    new: string;
    showroomOnly: string;
    inStock: string;
    outOfStock: string;
    sku: string;
    loading: string;
    viewAll: string;
  };
  product: {
    enquireOnWhatsapp: string;
    priceOnEnquiry: string;
    showroomOnlyNote: string;
    addToCart: string;
    aboutTab: string;
    howToUseTab: string;
    elementStoryTab: string;
    frequentlyBoughtWith: string;
    oftenTogether: string;
  };
  search: {
    title: string;
    placeholder: string;
    browsePrompt: string;
    results: string;
    noMatches: string;
  };
  contact: {
    email: string;
    phone: string;
    address: string;
    showroomUpdating: string;
    whatsappShowroom: string;
  };
  nav: {
    search: string;
    wishlist: string;
    account: string;
    openMenu: string;
    close: string;
  };
  whatsapp: {
    enquire: string;
    defaultMessage: string;
  };
  errors: {
    title: string;
    subtitle: string;
    body: string;
    retry: string;
    backHome: string;
    notFoundTitle: string;
    notFoundBody: string;
  };
}
