export interface PageInfo {
  path: string;
  title: string;
  description: string;
}

export const websitePages: PageInfo[] = [
  {
    path: "/",
    title: "Home",
    description: "Welcome page with overview of Rahul's key projects and resources"
  },
  {
    path: "/about",
    title: "About Rahul Gupta",
    description: "Learn about Rahul Gupta - IIT aspirant from Bihar, web developer, his dreams for Bihar"
  },
  {
    path: "/contact",
    title: "Contact",
    description: "Contact form to reach out to Rahul with questions or feedback"
  },
  {
    path: "/portfolio",
    title: "Portfolio",
    description: "Showcase of websites and apps built by Rahul"
  },
  {
    path: "/class-12th",
    title: "Class 12th Preparation",
    description: "Study resources and preparation materials for Class 12th exams"
  },
  {
    path: "/class-10th-result",
    title: "Class 10th Result",
    description: "Check Bihar Board Class 10th results using roll code"
  },
  {
    path: "/referrals",
    title: "Referral Links",
    description: "Partner referral links for apps and services with special deals"
  },
  {
    path: "/youtube/subscription",
    title: "YouTube Premium Family",
    description: "YouTube Premium Family subscription tracker and payment management"
  },
  {
    path: "/site-map",
    title: "Site Map",
    description: "Complete sitemap with all website pages organized by category"
  }
];

export function getPageInfo(path: string): PageInfo | undefined {
  return websitePages.find(page => page.path === path);
}

export function getPageContext(path: string): { path: string; title: string; description: string } {
  const pageInfo = getPageInfo(path);
  if (pageInfo) {
    return pageInfo;
  }
  
  if (path.startsWith("/heena/admin")) {
    return {
      path,
      title: "Admin Panel",
      description: "Admin dashboard for managing website content"
    };
  }
  
  return {
    path,
    title: "Page",
    description: "Rahul Gupta's personal website"
  };
}
