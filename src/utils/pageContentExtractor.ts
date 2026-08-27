/**
 * Enhanced Page Content Extractor for AI Chatbot
 * Extracts comprehensive content from the current page DOM
 */

export function extractPageContent(): string {
  // Elements to exclude from extraction
  const excludeSelectors = [
    'script',
    'style',
    'nav',
    'footer',
    'header',
    '.support-chat',
    '[role="dialog"]',
    '[aria-hidden="true"]',
    'iframe',
    'noscript',
    '.sr-only',
    '.hidden',
    '[data-radix-portal]',
    '.toast',
    '.toaster',
  ];

  // Clone the body to avoid modifying the actual DOM
  const bodyClone = document.body.cloneNode(true) as HTMLElement;

  // Remove excluded elements
  excludeSelectors.forEach(selector => {
    bodyClone.querySelectorAll(selector).forEach(el => el.remove());
  });

  // Get text content
  let text = bodyClone.innerText || bodyClone.textContent || '';

  // Clean up the text
  text = text
    .replace(/\s+/g, ' ') // Multiple spaces to single
    .replace(/\n\s*\n/g, '\n') // Multiple newlines to single
    .replace(/[^\S\n]+/g, ' ') // Normalize whitespace
    .trim();

  // Increased limit for more comprehensive content
  const maxLength = 16000;
  if (text.length > maxLength) {
    text = text.substring(0, maxLength) + '... (content truncated for brevity)';
  }

  return text;
}

/**
 * Extracts all headings with hierarchy
 */
export function extractHeadingsWithHierarchy(): { level: number; text: string }[] {
  const headings: { level: number; text: string }[] = [];
  
  document.querySelectorAll('h1, h2, h3, h4, h5, h6').forEach(h => {
    const text = h.textContent?.trim();
    const level = parseInt(h.tagName[1]);
    if (text && text.length < 200) {
      headings.push({ level, text });
    }
  });
  
  return headings;
}

/**
 * Extracts structured data from the page
 */
export function extractPageMetadata(): {
  title: string;
  headings: string[];
  links: { text: string; href: string }[];
  tables: string[][];
  formFields: string[];
  lists: string[];
  images: { alt: string; src: string }[];
} {
  const title = document.title || '';
  
  // Extract all headings
  const headings: string[] = [];
  document.querySelectorAll('h1, h2, h3, h4').forEach(h => {
    const text = h.textContent?.trim();
    if (text && text.length < 200) headings.push(text);
  });

  // Extract important links
  const links: { text: string; href: string }[] = [];
  const seenHrefs = new Set<string>();
  document.querySelectorAll('main a, article a, .content a, section a, [role="main"] a').forEach(a => {
    const anchor = a as HTMLAnchorElement;
    const text = anchor.textContent?.trim();
    const href = anchor.href;
    
    if (text && href && !seenHrefs.has(href) && links.length < 30) {
      // Filter out javascript: and # only links
      if (!href.startsWith('javascript:') && href !== '#') {
        seenHrefs.add(href);
        links.push({ text: text.substring(0, 100), href });
      }
    }
  });

  // Extract table data
  const tables: string[][] = [];
  document.querySelectorAll('table').forEach(table => {
    const rows: string[] = [];
    table.querySelectorAll('tr').forEach(tr => {
      const cells: string[] = [];
      tr.querySelectorAll('th, td').forEach(cell => {
        const cellText = cell.textContent?.trim() || '';
        if (cellText) cells.push(cellText);
      });
      if (cells.length > 0) {
        rows.push(cells.join(' | '));
      }
    });
    if (rows.length > 0) {
      tables.push(rows);
    }
  });

  // Extract form fields
  const formFields: string[] = [];
  document.querySelectorAll('input, select, textarea').forEach(field => {
    const input = field as HTMLInputElement;
    const label = input.getAttribute('placeholder') || 
                  input.getAttribute('aria-label') || 
                  input.getAttribute('name') ||
                  input.id;
    if (label && !formFields.includes(label)) {
      formFields.push(label);
    }
  });

  // Extract list items
  const lists: string[] = [];
  document.querySelectorAll('ul li, ol li').forEach(li => {
    const text = li.textContent?.trim();
    if (text && text.length < 200 && lists.length < 50) {
      lists.push(text);
    }
  });

  // Extract images with meaningful alt text
  const images: { alt: string; src: string }[] = [];
  document.querySelectorAll('img').forEach(img => {
    const alt = img.getAttribute('alt');
    const src = img.getAttribute('src');
    if (alt && alt.length > 3 && src && images.length < 20) {
      images.push({ alt, src });
    }
  });

  return { title, headings, links, tables, formFields, lists, images };
}

/**
 * Extracts card/component content
 */
export function extractCardContent(): string[] {
  const cards: string[] = [];
  
  // Common card selectors
  const cardSelectors = [
    '[class*="card"]',
    '[class*="Card"]',
    '[role="article"]',
    'article',
    '[class*="item"]',
    '[class*="Item"]',
  ];
  
  cardSelectors.forEach(selector => {
    document.querySelectorAll(selector).forEach(card => {
      const text = card.textContent?.trim();
      if (text && text.length > 20 && text.length < 500 && cards.length < 30) {
        cards.push(text);
      }
    });
  });
  
  return cards;
}

/**
 * Gets comprehensive page context for AI
 */
export function getEnhancedPageContext(): {
  content: string;
  metadata: ReturnType<typeof extractPageMetadata>;
  cards: string[];
  headingsHierarchy: ReturnType<typeof extractHeadingsWithHierarchy>;
} {
  return {
    content: extractPageContent(),
    metadata: extractPageMetadata(),
    cards: extractCardContent(),
    headingsHierarchy: extractHeadingsWithHierarchy(),
  };
}

/**
 * Get a summary of the page for quick context
 */
export function getPageSummary(): string {
  const title = document.title;
  const description = document.querySelector('meta[name="description"]')?.getAttribute('content') || '';
  const h1 = document.querySelector('h1')?.textContent?.trim() || '';
  const path = window.location.pathname;
  
  let summary = `Page: ${title}\nPath: ${path}\n`;
  if (h1) summary += `Main Heading: ${h1}\n`;
  if (description) summary += `Description: ${description}\n`;
  
  return summary;
}
