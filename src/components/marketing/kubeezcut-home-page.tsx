import { Link } from '@tanstack/react-router';
import { ChevronDown, ExternalLink, Film, Github, Globe, KeyRound, Layers, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { KubeezCutLogo } from '@/components/brand/kubeez-cut-logo';
import { KubeezCutHomeCanvas } from '@/components/marketing/kubeezcut-home-canvas';

const GITHUB_REPO = 'https://github.com/MeepCastana/KubeezCut';
const KUBEEZ_COM = 'https://kubeez.com/';

const FEATURES = [
  {
    icon: Layers,
    title: 'Timeline editing',
    body: 'Multi-track timeline, keyframes, and WebCodecs export — entirely in your browser.',
  },
  {
    icon: ShieldCheck,
    title: 'Local-first & private',
    body: 'Your media stays on your device. No upload wall, no account required to start.',
  },
  {
    icon: KeyRound,
    title: 'AI via Kubeez.com',
    body: (
      <>
        Optional: add a Kubeez API key from{' '}
        <a
          href={KUBEEZ_COM}
          className="font-medium text-primary underline underline-offset-2 hover:text-primary/90"
          target="_blank"
          rel="noopener noreferrer"
        >
          kubeez.com
        </a>{' '}
        to generate images, video, music, and speech — then cut it all together here.
      </>
    ),
  },
] as const;

export function KubeezCutHomePage() {
  return (
    <div className="relative min-h-screen overflow-x-hidden bg-[#0a0a0f] text-foreground">
      {/* Full-viewport hero: NLE canvas */}
      <section className="relative min-h-[100dvh]" aria-label="KubeezCut hero">
        <div className="absolute inset-0 min-h-[100dvh]">
          <KubeezCutHomeCanvas />
        </div>
        {/* Edge vignettes — lighter so center scrim carries contrast */}
        <div
          className="pointer-events-none absolute inset-0 bg-gradient-to-br from-black/35 via-transparent to-[#0a0a0f]/75"
          aria-hidden
        />
        <div
          className="pointer-events-none absolute inset-x-0 bottom-0 h-[42%] bg-gradient-to-t from-[#0a0a0f] via-[#0a0a0f]/35 to-transparent"
          aria-hidden
        />
        {/* Stronger center scrim so hero + canvas chrome don’t compete */}
        <div
          className="pointer-events-none absolute inset-0 z-[4] bg-[radial-gradient(ellipse_82%_64%_at_50%_42%,rgba(0,0,0,0.88)_0%,rgba(0,0,0,0.55)_38%,rgba(0,0,0,0.22)_58%,transparent_82%)]"
          aria-hidden
        />
        {/* Extra dim band under where the marketing header sits (above mock UI chrome) */}
        <div
          className="pointer-events-none absolute inset-x-0 top-0 z-[5] h-36 bg-gradient-to-b from-black/70 via-black/35 to-transparent"
          aria-hidden
        />

        <header className="absolute inset-x-0 top-0 z-30 border-b border-white/[0.1] bg-black/72 shadow-[0_8px_32px_rgba(0,0,0,0.45)] backdrop-blur-xl">
          <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4 sm:px-6">
            <Link to="/" className="flex items-center gap-2 opacity-95 transition-opacity hover:opacity-100">
              <KubeezCutLogo withWordmark size="md" wordmarkClassName="text-white" />
            </Link>
            <nav className="flex items-center gap-2 sm:gap-3" aria-label="Primary">
              <Button variant="ghost" size="sm" className="hidden text-white/90 hover:bg-white/10 hover:text-white sm:inline-flex" asChild>
                <a href={GITHUB_REPO} target="_blank" rel="noopener noreferrer">
                  <Github className="mr-1.5 h-4 w-4" />
                  Source
                </a>
              </Button>
              <Button
                size="sm"
                className="bg-primary text-primary-foreground shadow-lg shadow-primary/25 hover:bg-primary/90"
                asChild
              >
                <Link to="/projects">Launch editor</Link>
              </Button>
            </nav>
          </div>
        </header>

        <div className="relative z-10 flex min-h-[100dvh] flex-col">
          <div className="flex flex-1 flex-col items-center justify-center px-4 pb-32 pt-28 sm:px-6 sm:pt-32">
            <div className="w-full max-w-lg rounded-2xl border border-white/[0.18] bg-black/72 px-7 py-8 text-center shadow-[0_16px_56px_rgba(0,0,0,0.65)] backdrop-blur-xl sm:max-w-xl sm:px-10 sm:py-10 ring-1 ring-black/40">
              <p className="mb-4 flex items-center justify-center gap-2 text-[10px] font-medium uppercase tracking-[0.22em] text-white/80">
                <Film className="h-3.5 w-3.5 shrink-0 text-primary" aria-hidden />
                Free · Open source · Browser NLE
              </p>

              <h1 className="text-balance font-sans text-[1.65rem] font-semibold leading-[1.15] tracking-tight text-white [text-shadow:0_1px_2px_rgba(0,0,0,0.5)] sm:text-3xl md:text-[2.15rem]">
                Professional video editing in your browser
              </h1>

              <p className="mx-auto mt-4 max-w-md text-pretty text-sm leading-relaxed text-white/88 sm:text-[0.95rem]">
                <span className="font-medium text-white">KubeezCut</span> — MIT-licensed, multi-track, WebGPU &amp; WebCodecs.
                Optional AI via{' '}
                <a
                  href={KUBEEZ_COM}
                  className="font-medium text-primary underline decoration-primary/45 underline-offset-[3px] hover:decoration-primary"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Kubeez.com
                </a>
                .
              </p>

              <div className="mt-8 flex flex-col items-stretch justify-center gap-2.5 sm:flex-row sm:items-center sm:justify-center sm:gap-3">
                <Button size="default" className="h-10 gap-2 px-5 shadow-md shadow-primary/15" asChild>
                  <Link to="/projects">
                    <Globe className="h-4 w-4" />
                    Launch editor
                  </Link>
                </Button>
                <Button variant="ghost" size="default" className="h-10 text-white/85 hover:bg-white/10 hover:text-white" asChild>
                  <a href={GITHUB_REPO} target="_blank" rel="noopener noreferrer">
                    <Github className="mr-1.5 h-4 w-4" />
                    Source
                  </a>
                </Button>
              </div>
            </div>
          </div>

          <div className="pointer-events-none absolute bottom-6 left-0 right-0 z-10 flex flex-col items-center gap-1 text-white/35">
            <span className="text-[11px] font-medium uppercase tracking-[0.2em]">Scroll to explore</span>
            <ChevronDown className="h-5 w-5 animate-bounce" aria-hidden />
          </div>
        </div>
      </section>

      <main className="relative z-10 bg-[#0a0a0f]">
        <article className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
          <section aria-labelledby="features-heading">
            <h2 id="features-heading" className="sr-only">
              Features
            </h2>
            <ul className="grid gap-10 border-t border-white/[0.08] pt-16 sm:grid-cols-3 sm:gap-8 sm:pt-20">
              {FEATURES.map(({ icon: Icon, title, body }) => (
                <li key={title} className="flex flex-col gap-3 sm:border-l sm:border-white/[0.06] sm:pl-8 first:sm:border-l-0 first:sm:pl-0">
                  <div className="flex items-start gap-3">
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-white/10 bg-white/[0.04]">
                      <Icon className="h-5 w-5 text-primary" aria-hidden />
                    </span>
                    <div>
                      <h3 className="text-base font-semibold text-white">{title}</h3>
                      <div className="mt-2 text-sm leading-relaxed text-white/60">{body}</div>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          </section>

          <section
            className="mx-auto mt-24 max-w-3xl rounded-2xl border border-primary/25 bg-gradient-to-b from-primary/[0.12] to-[#0a0a0f] px-6 py-12 text-center shadow-[0_0_80px_-20px_rgba(139,92,246,0.45)] sm:px-10 sm:py-14"
            aria-labelledby="kubeez-cta-heading"
          >
            <h2 id="kubeez-cta-heading" className="text-2xl font-semibold tracking-tight text-white sm:text-3xl">
              Generate. Edit. Export.
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-sm leading-relaxed text-white/70 sm:text-base">
              Connect your Kubeez API key in KubeezCut Settings to create images, video, music, and speech on{' '}
              <a
                href={KUBEEZ_COM}
                className="font-medium text-primary underline-offset-4 hover:underline"
                target="_blank"
                rel="noopener noreferrer"
              >
                Kubeez.com
              </a>
              — then trim, layer, and finish your cut in the timeline.
            </p>
            <Button className="mt-8 gap-2" size="lg" variant="secondary" asChild>
              <a href={KUBEEZ_COM} target="_blank" rel="noopener noreferrer">
                <ExternalLink className="h-4 w-4" />
                Visit Kubeez.com
              </a>
            </Button>
            <p className="mt-6 text-xs text-white/45">
              KubeezCut is{' '}
              <a
                href={`${GITHUB_REPO}/blob/main/LICENSE`}
                className="underline underline-offset-2 hover:text-white/70"
                target="_blank"
                rel="noopener noreferrer"
              >
                MIT licensed
              </a>
              — fork, self-host, contribute.
            </p>
          </section>
        </article>

        <footer className="border-t border-white/[0.06] py-10 text-center text-xs text-white/45">
          <p>
            © {new Date().getFullYear()} KubeezCut ·{' '}
            <Link to="/blog" className="underline underline-offset-2 hover:text-white/70">
              Blog
            </Link>
            {' · '}
            <Link to="/projects" className="underline underline-offset-2 hover:text-white/70">
              Projects
            </Link>
            {' · '}
            <Link to="/settings" className="underline underline-offset-2 hover:text-white/70">
              Settings
            </Link>
            {' · '}
            <a
              href={KUBEEZ_COM}
              className="underline underline-offset-2 hover:text-white/70"
              target="_blank"
              rel="noopener noreferrer"
            >
              Kubeez.com
            </a>
          </p>
        </footer>
      </main>
    </div>
  );
}
