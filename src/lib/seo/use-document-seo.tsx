import { useEffect } from 'react';

function getOrigin(): string {
  const env = import.meta.env.VITE_PUBLIC_SITE_URL as string | undefined;
  if (env && /^https?:\/\//i.test(env)) {
    return env.replace(/\/+$/, '');
  }
  if (typeof window !== 'undefined') {
    return window.location.origin;
  }
  return '';
}

function upsertMeta(attr: 'name' | 'property', key: string, content: string) {
  let el = document.querySelector(`meta[${attr}="${key}"]`);
  if (!el) {
    el = document.createElement('meta');
    el.setAttribute(attr, key);
    document.head.appendChild(el);
  }
  el.setAttribute('content', content);
}

function upsertLink(rel: string, href: string) {
  let el = document.querySelector(`link[rel="${rel}"]`);
  if (!el) {
    el = document.createElement('link');
    el.setAttribute('rel', rel);
    document.head.appendChild(el);
  }
  el.setAttribute('href', href);
}

export type DocumentSeoOptions = {
  /** Shown in tab; "| KubeezCut" appended if not already present */
  title: string;
  description: string;
  path: string;
  ogType?: 'website' | 'article';
  keywords?: string;
  publishedTime?: string;
  modifiedTime?: string;
};

/**
 * Updates document title, meta description, Open Graph, Twitter, and canonical URL.
 */
export function useDocumentSeo(opts: DocumentSeoOptions) {
  useEffect(() => {
    const origin = getOrigin();
    const canonical = `${origin}${opts.path.startsWith('/') ? opts.path : `/${opts.path}`}`;
    const fullTitle = opts.title.includes('KubeezCut') ? opts.title : `${opts.title} | KubeezCut`;

    document.title = fullTitle;
    upsertMeta('name', 'description', opts.description);
    upsertMeta('property', 'og:title', fullTitle);
    upsertMeta('property', 'og:description', opts.description);
    upsertMeta('property', 'og:url', canonical);
    upsertMeta('property', 'og:type', opts.ogType ?? 'website');
    upsertMeta('name', 'twitter:card', 'summary_large_image');
    upsertMeta('name', 'twitter:title', fullTitle);
    upsertMeta('name', 'twitter:description', opts.description);
    if (opts.keywords) {
      upsertMeta('name', 'keywords', opts.keywords);
    }
    if (opts.publishedTime) {
      upsertMeta('property', 'article:published_time', opts.publishedTime);
    }
    if (opts.modifiedTime) {
      upsertMeta('property', 'article:modified_time', opts.modifiedTime);
    }
    upsertLink('canonical', canonical);
  }, [
    opts.title,
    opts.description,
    opts.path,
    opts.ogType,
    opts.keywords,
    opts.publishedTime,
    opts.modifiedTime,
  ]);
}

/** Renders **bold** in plain strings as strong */
export function InlineEmphasis({ text }: { text: string }) {
  const parts = text.split(/(\*\*.+?\*\*)/g);
  return (
    <>
      {parts.map((part, i) => {
        const m = /^\*\*(.+)\*\*$/.exec(part);
        if (m) {
          return (
            <strong key={i} className="font-semibold text-white/95">
              {m[1]}
            </strong>
          );
        }
        return <span key={i}>{part}</span>;
      })}
    </>
  );
}
