export const ROUTES = {
  HOME: '/',
  ABOUT: '/about',
  CONTACT: '/contact',
  SITE_MAP: '/site-map',
  NOT_FOUND: '*',

  AUTH: {
    ADMIN_LOGIN: '/heena',
  },

  FEATURES: {
    PORTFOLIO: {
      ROOT: '/portfolio',
      CATEGORY: '/portfolio/:category',
    },
    REFERRALS: {
      ROOT: '/referrals',
      CATEGORY: '/referrals/:category',
    },
    
    POV: {
      ROOT: '/pov',
      CATEGORY: '/pov/:category',
    },
  },

  ADMIN: {
    ROOT: '/heena/admin',
    ANALYTICS: '/heena/admin/analytics',
    ANALYTICS_TAB: '/heena/admin/analytics/:tab',
    VISITOR_PROFILES: '/heena/admin/visitor-profiles',
    CONTACTS: '/heena/admin/contacts',
    PORTFOLIO: '/heena/admin/portfolio',
    REFERRALS: '/heena/admin/referrals',
    URL_SHORTENER: '/heena/admin/url-shortener',
    APPS: '/heena/admin/apps',
    SUPPORT_CHAT: '/heena/admin/support-chat',
    CHATBOT_SETTINGS: '/heena/admin/chatbot-settings',
    SETTINGS: '/heena/admin/settings',
    POV: '/heena/admin/pov',
  },

  PERSONAL: {
    ROOT: '/personal',
    DISTROKID: {
      ROOT: '/personal/distrokid',
      ACCOUNTS: '/personal/distrokid/accounts',
      ACCOUNT: '/personal/distrokid/accounts/:id',
      ACCOUNT_SECTION: '/personal/distrokid/accounts/:id/:section',
      ANALYTICS: '/personal/distrokid/analytics',
      EARN: '/personal/distrokid/earn',
    },
  },

  SHORT_URL: '/:code',
} as const;

export const HASH_SECTIONS = {
  HOME: {
    HERO: '#hero',
    HIGHLIGHTS: '#highlights',
    CTA: '#cta',
  },
  ABOUT: {
    PROFILE: '#profile',
    DREAMS: '#dreams',
    INTERESTS: '#interests',
    CONNECT: '#connect',
    JOURNEY: '#journey',
  },
  CONTACT: {
    FORM: '#form',
    EMAIL: '#email',
    WHATSAPP: '#whatsapp',
    SOCIAL: '#social',
    REASONS: '#reasons',
  },
  REFERRALS: {
    CATEGORIES: '#categories',
    APPS: '#apps',
    SUPPORT: '#support',
  },
  PORTFOLIO: {
    FILTERS: '#filters',
    PROJECTS: '#projects',
  },
} as const;

export interface RouteMetadata {
  path: string;
  name: string;
  description: string;
  category: 'main' | 'resources' | 'portfolio' | 'admin' | 'auth' | 'navigation';
  icon?: string;
  isPublic: boolean;
  showInSitemap: boolean;
  hashSections?: string[];
}

export const ROUTE_METADATA: RouteMetadata[] = [
  {
    path: ROUTES.HOME,
    name: 'Home',
    description: 'Main homepage with introduction',
    category: 'main',
    icon: 'Home',
    isPublic: true,
    showInSitemap: true,
    hashSections: ['#hero', '#highlights', '#cta'],
  },
  {
    path: ROUTES.ABOUT,
    name: 'About',
    description: 'Learn more about me',
    category: 'main',
    icon: 'Info',
    isPublic: true,
    showInSitemap: true,
  },
  {
    path: ROUTES.CONTACT,
    name: 'Contact',
    description: 'Get in touch with me',
    category: 'main',
    icon: 'Mail',
    isPublic: true,
    showInSitemap: true,
  },
  {
    path: ROUTES.FEATURES.REFERRALS.ROOT,
    name: 'Referral Links',
    description: 'Exclusive offers and referral programs',
    category: 'resources',
    icon: 'Gift',
    isPublic: true,
    showInSitemap: true,
  },
  {
    path: ROUTES.FEATURES.PORTFOLIO.ROOT,
    name: 'Portfolio',
    description: 'View my projects and work',
    category: 'portfolio',
    icon: 'Briefcase',
    isPublic: true,
    showInSitemap: true,
  },
  {
    path: ROUTES.FEATURES.POV.ROOT,
    name: 'Rahul POV',
    description: 'Unfiltered thoughts & public discussion',
    category: 'main',
    icon: 'Brain',
    isPublic: true,
    showInSitemap: true,
  },
  {
    path: ROUTES.SITE_MAP,
    name: 'Site Map',
    description: 'Complete site map with all pages',
    category: 'navigation',
    icon: 'Map',
    isPublic: true,
    showInSitemap: true,
  },
];

export function buildRoute(path: string, params: Record<string, string>): string {
  let result = path;
  Object.entries(params).forEach(([key, value]) => {
    result = result.replace(`:${key}`, value);
  });
  return result;
}

export function buildRouteWithHash(path: string, hash: string): string {
  return `${path}${hash}`;
}

export function getPublicRoutes(): RouteMetadata[] {
  return ROUTE_METADATA.filter(route => route.isPublic && route.showInSitemap);
}

export function getRoutesByCategory(category: RouteMetadata['category']): RouteMetadata[] {
  return ROUTE_METADATA.filter(route => route.category === category);
}

export const PORTFOLIO_CATEGORIES = {
  ALL: 'all',
  WEBSITES: 'websites',
  APPS: 'apps',
  TOOLS: 'tools',
} as const;

export const REFERRAL_CATEGORIES = {
  ALL: 'all',
  UPI: 'upi',
  SHOPPING: 'shopping',
  FOOD: 'food',
} as const;
