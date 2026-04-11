import { createFileRoute, Link, notFound } from '@tanstack/react-router';
import { ArrowLeft } from 'lucide-react';
import { useEffect, useMemo } from 'react';
import { getBlogPostBySlug } from '@/content/blog-posts';
import { InlineEmphasis, useDocumentSeo } from '@/lib/seo/use-document-seo';
import { Button } from '@/components/ui/button';
import { KubeezCutLogo } from '@/components/brand/kubeez-cut-logo';

export const Route = createFileRoute('/blog/$slug')({
  component: BlogPostPage,
});

function BlogPostPage() {
  const { slug } = Route.useParams();
  const post = getBlogPostBySlug(slug);

  if (!post) {
    throw notFound();
  }

  const origin = useMemo(() => {
    const env = import.meta.env.VITE_PUBLIC_SITE_URL as string | undefined;
    if (env && /^https?:\/\//i.test(env)) return env.replace(/\/+$/, '');
    if (typeof window !== 'undefined') return window.location.origin;
    return '';
  }, []);

  useDocumentSeo({
    title: post.title,
    description: post.description,
    path: `/blog/${post.slug}`,
    ogType: 'article',
    keywords: post.keywords.join(', '),
    publishedTime: `${post.datePublished}T12:00:00.000Z`,
    modifiedTime: `${post.dateModified}T12:00:00.000Z`,
  });

  useEffect(() => {
    const id = 'kubeezcut-jsonld-blog-post';
    const existing = document.getElementById(id);
    if (existing) existing.remove();

    const script = document.createElement('script');
    script.id = id;
    script.type = 'application/ld+json';
    const url = `${origin}/blog/${post.slug}`;
    script.textContent = JSON.stringify({
      '@context': 'https://schema.org',
      '@type': 'BlogPosting',
      headline: post.title,
      description: post.description,
      datePublished: `${post.datePublished}T12:00:00.000Z`,
      dateModified: `${post.dateModified}T12:00:00.000Z`,
      author: {
        '@type': 'Organization',
        name: 'KubeezCut',
        url: origin || undefined,
      },
      publisher: {
        '@type': 'Organization',
        name: 'KubeezCut',
        url: origin || undefined,
      },
      mainEntityOfPage: {
        '@type': 'WebPage',
        '@id': url,
      },
      url,
      keywords: post.keywords.join(', '),
      isPartOf: {
        '@type': 'Blog',
        name: 'KubeezCut Blog',
        url: origin ? `${origin}/blog` : undefined,
      },
    });
    document.head.appendChild(script);
    return () => {
      document.getElementById(id)?.remove();
    };
  }, [origin, post]);

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-foreground">
      <header className="border-b border-white/[0.08] bg-black/50 backdrop-blur-md">
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-4 px-4 py-4 sm:px-6">
          <Link to="/" className="flex items-center gap-2 opacity-95 hover:opacity-100">
            <KubeezCutLogo withWordmark size="sm" wordmarkClassName="text-white" />
          </Link>
          <Button variant="ghost" size="sm" className="text-white/80" asChild>
            <Link to="/blog">
              <ArrowLeft className="mr-1.5 h-4 w-4" />
              All posts
            </Link>
          </Button>
        </div>
      </header>

      <article className="mx-auto max-w-3xl px-4 py-10 sm:px-6 sm:py-14">
        <header className="border-b border-white/[0.08] pb-8">
          <p className="text-xs font-medium uppercase tracking-wider text-white/45">
            {post.datePublished} · {post.readTimeMin} min read
          </p>
          <h1 className="mt-3 text-balance text-2xl font-semibold leading-tight tracking-tight text-white sm:text-3xl md:text-[2rem]">
            {post.title}
          </h1>
          <p className="mt-4 text-pretty text-base leading-relaxed text-white/70">{post.description}</p>
        </header>

        <div className="prose prose-invert prose-p:leading-relaxed mt-10 max-w-none prose-headings:scroll-mt-24 prose-h2:text-lg prose-h2:font-semibold prose-h2:text-white prose-p:text-white/75">
          {post.sections.map((section) => (
            <section key={section.heading} className="mb-10">
              <h2 className="mb-4 text-lg font-semibold text-white">{section.heading}</h2>
              {section.paragraphs.map((p) => (
                <p key={p.slice(0, 48)} className="mb-4 text-[0.95rem] leading-relaxed text-white/72 last:mb-0">
                  <InlineEmphasis text={p} />
                </p>
              ))}
            </section>
          ))}
        </div>

        <footer className="mt-14 border-t border-white/[0.08] pt-8">
          <p className="text-sm text-white/55">
            Edit video in{' '}
            <Link to="/projects" className="font-medium text-primary underline underline-offset-2 hover:text-primary/90">
              KubeezCut
            </Link>
            . Optional AI from{' '}
            <a
              href="https://kubeez.com/"
              className="font-medium text-primary underline underline-offset-2 hover:text-primary/90"
              target="_blank"
              rel="noopener noreferrer"
            >
              Kubeez.com
            </a>
            .
          </p>
        </footer>
      </article>
    </div>
  );
}
