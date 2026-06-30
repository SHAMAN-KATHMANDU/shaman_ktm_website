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
    object: string;
    objects: string;
    all: string;
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
    productsPlaceholder: string;
  };
  breadcrumbs: {
    home: string;
    ourProducts: string;
    bundles: string;
    nature: string;
    energy: string;
    contact: string;
    catalog: string;
  };
  collections: {
    eyebrow: string;
  };
  emptyStates: {
    noBundlesPublished: string;
    noItemsInCollection: string;
    noProductsInCategory: string;
    noProductsMatchFilters: string;
    noStoriesInCategory: string;
  };
  filters: {
    allCategories: string;
    anyPrice: string;
    sortNewest: string;
    sortPriceAsc: string;
    sortPriceDesc: string;
  };
  pagination: {
    previous: string;
    page: string;
    of: string;
    next: string;
  };
  services: {
    perSession: string;
    bookOnWhatsapp: string;
    confirmationNote: string;
    whatToExpect: string;
    fromSameElement: string;
    objectsYouMightLike: string;
    spotlight: string;
  };
  pages: {
    featured: string;
    pieces: string;
    bundle: string;
    featuredInStory: string;
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
