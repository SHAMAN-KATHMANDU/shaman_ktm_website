// Shape of the static UI-string catalog. en.json and ne.json must both satisfy
// this type, and the i18n-parity check (scripts/i18n-parity.ts) enforces that
// their keys stay in lockstep.

export interface Messages {
  common: {
    all: string;
    inStock: string;
    /** "In stock ({n})" — {n} is replaced with the count. */
    inStockCount: string;
    loading: string;
    networkError: string;
    new: string;
    object: string;
    objects: string;
    /** "Only {n} left" — low-stock warning; {n} is replaced with the count. */
    onlyNLeft: string;
    outOfStock: string;
    /** Hero scroll-down indicator, e.g. "Scroll ↓". */
    scrollDown: string;
    showroomOnly: string;
    sku: string;
    viewAll: string;
  };
  product: {
    enquireOnWhatsapp: string;
    priceOnEnquiry: string;
    /** Prefix before the computed member price on offer cards. */
    members: string;
    showroomOnlyNote: string;
    addToCart: string;
    aboutTab: string;
    howToUseTab: string;
    elementStoryTab: string;
    frequentlyBoughtWith: string;
    oftenTogether: string;
    dimensionsHeading: string;
    dimLength: string;
    dimWidth: string;
    dimHeight: string;
    dimDiameter: string;
    dimWeight: string;
  };
  account: {
    login: {
      email: string;
      failed: string;
      forgotPassword: string;
      noAccount: string;
      password: string;
      register: string;
      requiredFields: string;
      submit: string;
      success: string;
      subtitle: string;
      title: string;
    };
    register: {
      confirmPassword: string;
      email: string;
      failed: string;
      haveAccount: string;
      login: string;
      name: string;
      password: string;
      passwordMismatch: string;
      passwordTooShort: string;
      phone: string;
      requiredFields: string;
      submit: string;
      success: string;
      subtitle: string;
      title: string;
    };
    forgot: {
      backToLogin: string;
      checkEmail: string;
      email: string;
      emailRequired: string;
      failed: string;
      sent: string;
      submit: string;
      subtitle: string;
      title: string;
    };
    reset: {
      backToLogin: string;
      confirmPassword: string;
      failed: string;
      invalidLink: string;
      password: string;
      passwordMismatch: string;
      passwordRequired: string;
      passwordTooShort: string;
      submit: string;
      success: string;
      successMessage: string;
      subtitle: string;
      title: string;
    };
    dashboard: {
      browseProducts: string;
      changePassword: string;
      confirmPassword: string;
      currentPassword: string;
      email: string;
      greeting: string;
      loadFailed: string;
      logout: string;
      newPassword: string;
      noOrders: string;
      orderDate: string;
      orderItems: string;
      orderStatus: string;
      orderTotal: string;
      paymentMethod: string;
      phone: string;
      profile: string;
      title: string;
      update: string;
      yourOrders: string;
    };
    orders: {
      askAboutOrder: string;
      backToDashboard: string;
      deliveryDetails: string;
      enquireMessage: string;
      items: string;
      loadFailed: string;
      notFound: string;
      notFoundMessage: string;
      orderNumber: string;
      orderSummary: string;
      paymentCompleted: string;
      paymentDetails: string;
      paymentPending: string;
      placedOn: string;
      statusTimeline: string;
      subtotal: string;
      title: string;
      total: string;
    };
    orderStatuses: {
      pending: string;
      confirmed: string;
      shipped: string;
      delivered: string;
      cancelled: string;
    };
    deliveryZones: {
      thamel: string;
      jhamsikhel: string;
      gongabu: string;
      shipping: string;
    };
  };
  cart: {
    addedToCart: string;
    addFailed: string;
    checkout: string;
    continueShopping: string;
    emptyMessage: string;
    item: string;
    items: string;
    keepShopping: string;
    perUnit: string;
    price: string;
    quantity: string;
    remove: string;
    subtotal: string;
    summary: string;
    title: string;
    updateCart: string;
    variation: string;
  };
  checkout: {
    address: string;
    cod: string;
    deliveryInfo: string;
    failed: string;
    fullName: string;
    invalidPhone: string;
    notes: string;
    orderPlaced: string;
    orderSummary: string;
    paymentMethod: string;
    phone: string;
    placeOrder: string;
    processing: string;
    requiredFields: string;
    selectZone: string;
    subtotal: string;
    summary: string;
    title: string;
    total: string;
    viewOrder: string;
    zone: string;
  };
  search: {
    title: string;
    placeholder: string;
    browsePrompt: string;
    results: string;
    noMatches: string;
    productsPlaceholder: string;
    typeProduct: string;
    typeStory: string;
  };
  breadcrumbs: {
    home: string;
    ourProducts: string;
    bundles: string;
    nature: string;
    energy: string;
    contact: string;
    catalog: string;
    search: string;
    stories: string;
  };
  collections: {
    eyebrow: string;
  };
  elements: {
    /** Element-card CTA — "Explore {name} →"; {name} is the localized element name. */
    explore: string;
  };
  emptyStates: {
    noBundlesPublished: string;
    noItemsInCollection: string;
    noProductsInCategory: string;
    noProductsMatchFilters: string;
    noStoriesInCategory: string;
  };
  filters: {
    browseCategories: string;
    allElements: string;
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
    enquiryFallback: string;
  };
  pages: {
    featured: string;
    pieces: string;
    bundle: string;
    featuredInStory: string;
    bundleInside: string;
    qty: string;
    objectsFrom: string;
    bundleResponseNote: string;
  };
  footer: {
    showrooms: string;
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
    login: string;
    createAccount: string;
    wishlist: string;
    cart: string;
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
  memberCircle: {
    formSuccess: string;
    formError: string;
  };
  blog: {
    minRead: string;
    by: string;
    backToStories: string;
  };
  wholesale: {
    title: string;
    intro: string;
    moqLabel: string; // "Minimum {n} pieces"
    moqUnset: string;
    priceOnEnquiry: string;
    enquire: string;
    enquireAbout: string; // "Enquire about {product}"
    empty: string;
    formHeading: string;
    formDescription: string;
    companyLabel: string;
    contactLabel: string;
    whatsappLabel: string;
    emailLabel: string;
    productLabel: string;
    quantityLabel: string;
    noteLabel: string;
    optional: string;
    submit: string;
    finePrint: string;
    successHeading: string;
    successMessage: string;
    formError: string;
  };
}
