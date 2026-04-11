import { createFileRoute, Link } from '@tanstack/react-router';
import { ArrowLeft, BookOpen } from 'lucide-react';
import { blogPosts } from '@/content/blog-posts';
import { useDocumentSeo } from '@/lib/seo/use-document-seo';
import { Button } from '@/components/ui/button';
import { KubeezCutLogo } from '@/components/brand/kubeez-cut-logo';

export const Route = createFileRoute('/blog/')({
  component: BlogIndexPage,
});

function BlogIndexPage() {
  useDocumentSeo({
    title: 'Blog — Guides for KubeezCut & browser video editing',
    description:
      'Articles on KubeezCut: free open-source browser video editor, WebGPU, WebCodecs, local-first editing, and optional AI via Kubeez.com.',
    path: '/blog',
    keywords:
      'KubeezCut blog, browser video editor guide, WebGPU editor, WebCodecs, open source NLE, Kubeez.com AI',
  });

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-foreground">
      <header className="border-b border-white/[0.08] bg-black/50 backdrop-blur-md">
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-4 px-4 py-4 sm:px-6">
          <Link to="/" className="flex items-center gap-2 opacity-95 hover:opacity-100">
            <KubeezCutLogo withWordmark size="sm" wordmarkClassName="text-white" />
          </Link>
          <Button variant="ghost" size="sm" className="text-white/80" asChild>
            <Link to="/">
              <ArrowLeft className="mr-1.5 h-4 w-4" />
              Home
            </Link>
          </Button>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 py-12 sm:px-6 sm:py-16">
        <div className="mb-10 flex items-start gap-3">
          <span className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-white/10 bg-white/[0.04]">
            <BookOpen className="h-5 w-5 text-primary" aria-hidden />
          </span>
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-white sm:text-3xl">KubeezCut blog</h1>
            <p className="mt-2 text-sm leading-relaxed text-white/65">
              Deep dives on our free, open-source browser editor: WebGPU, WebCodecs, local-first workflows, and optional
              AI from Kubeez.com.
            </p>
          </div>
        </div>

        <ul className="space-y-4">
          {blogPosts.map((post) => (
            <li key={post.slug}>
              <Link
                to="/blog/$slug"
                params={{ slug: post.slug }}
                className="group block rounded-xl border border-white/[0.08] bg-white/[0.03] p-5 transition-colors hover:border-white/[0.14] hover:bg-white/[0.05]"
              >
                <h2 className="text-lg font-semibold text-white group-hover:text-primary">{post.title}</h2>
                <p className="mt-2 text-sm leading-relaxed text-white/60">{post.description}</p>
                <p className="mt-3 text-xs text-white/40">
                  {post.datePublished} · {post.readTimeMin} min read
                </p>
              </Link>
            </li>
          ))}
        </ul>
      </main>
    </div>
  );
}
