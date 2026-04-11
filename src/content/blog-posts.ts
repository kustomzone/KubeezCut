/** Blog posts for /blog — used for listing, detail pages, and sitemap generation. */

export type BlogSection = {
  heading: string;
  paragraphs: string[];
};

export type BlogPost = {
  slug: string;
  title: string;
  description: string;
  /** ISO 8601 */
  datePublished: string;
  dateModified: string;
  keywords: string[];
  readTimeMin: number;
  sections: BlogSection[];
};

export const blogPosts: BlogPost[] = [
  {
    slug: 'free-browser-video-editor-webgpu-webcodecs',
    title: 'Free browser video editor: WebGPU, WebCodecs & why KubeezCut runs locally',
    description:
      'How KubeezCut delivers a free, open-source video editor in the browser using WebGPU compositing and WebCodecs export—no install, files stay on your device.',
    datePublished: '2026-01-15',
    dateModified: '2026-04-11',
    keywords: [
      'free browser video editor',
      'WebGPU video editor',
      'WebCodecs export',
      'online video editor no upload',
      'open source NLE',
      'KubeezCut',
    ],
    readTimeMin: 8,
    sections: [
      {
        heading: 'Why a browser-based NLE in 2026',
        paragraphs: [
          'Creators want professional timelines without a heavy install or a forced cloud upload. A **free browser video editor** that uses modern web APIs can offer multi-track editing, previews, and export while keeping media on disk via the File System Access API and IndexedDB where appropriate.',
          'KubeezCut is built as an **open-source (MIT)** project so you can audit the code, self-host, and extend the pipeline. The goal is simple: edit in the tab you already have open, with optional AI assets when you choose to connect **Kubeez.com**.',
        ],
      },
      {
        heading: 'WebGPU for real-time compositing',
        paragraphs: [
          '**WebGPU** gives KubeezCut a path to GPU-accelerated compositing and effects in supported browsers. That means smoother previews and a responsive canvas when you stack clips, titles, and adjustments—closer to what you expect from a desktop non-linear editor.',
          'Search engines and users often look for “**WebGPU video editor**” when researching next-gen web tools; KubeezCut aligns with that stack by prioritizing GPU-backed workflows where the platform allows.',
        ],
      },
      {
        heading: 'WebCodecs and export without a server',
        paragraphs: [
          '**WebCodecs** enables encoding and decoding in the browser so exports can be produced client-side. For many projects, that means you can render to MP4 or other supported containers without uploading your master timeline to a third party.',
          'Combining WebCodecs with a disciplined media pipeline is how KubeezCut stays **local-first**: your cuts, your files, your machine—unless you explicitly use networked features.',
        ],
      },
      {
        heading: 'Related: AI generation from Kubeez.com',
        paragraphs: [
          'Editing is local; **optional** image, video, music, and speech generation can be enabled with a **Kubeez API key** from kubeez.com in Settings. That workflow keeps generation credentials separate from your editing session while still letting you drag generated assets into the same timeline.',
        ],
      },
    ],
  },
  {
    slug: 'open-source-video-editor-ai-kubeez-com',
    title: 'Open-source video editor plus AI: how KubeezCut works with Kubeez.com',
    description:
      'Use KubeezCut as your MIT-licensed timeline and optionally plug in Kubeez.com for AI-generated media. API keys, privacy boundaries, and editing workflow explained.',
    datePublished: '2026-02-01',
    dateModified: '2026-04-11',
    keywords: [
      'open source video editor',
      'AI video editor browser',
      'Kubeez.com API',
      'generative video workflow',
      'MIT video editor',
    ],
    readTimeMin: 7,
    sections: [
      {
        heading: 'Open source first',
        paragraphs: [
          'KubeezCut is released under the **MIT License**, which matters for teams that need to fork, brand, or ship internal builds. When people search for an **open-source video editor** with a real timeline—not just a trimmer—they are usually comparing codec support, keyframes, and export quality.',
        ],
      },
      {
        heading: 'Where Kubeez.com fits',
        paragraphs: [
          '**Kubeez.com** hosts models and APIs for generating images, video clips, music, and speech. KubeezCut does not require an account to start editing; you add a **Kubeez API key** in Settings when you want those generation features.',
          'From an SEO and product perspective, separating “editing in KubeezCut” from “generation via Kubeez.com” keeps responsibilities clear: the editor remains local-first; generation is opt-in and API-driven.',
        ],
      },
      {
        heading: 'A practical workflow',
        paragraphs: [
          'A common pattern: generate short B-roll or music beds on Kubeez.com, download or pull assets into your library, then cut, mix, and export entirely in the **browser-based editor**. That gives you creative velocity without forcing every byte through a single vendor’s closed suite.',
        ],
      },
    ],
  },
  {
    slug: 'local-first-video-editing-browser-privacy',
    title: 'Local-first video editing in the browser: privacy, speed, and no upload wall',
    description:
      'What “local-first” means for KubeezCut: your media stays on your device, editing runs in the browser, and you avoid mandatory cloud uploads to start a project.',
    datePublished: '2026-03-01',
    dateModified: '2026-04-11',
    keywords: [
      'local first video editor',
      'browser video editor privacy',
      'no upload video editor',
      'offline capable editor',
      'client-side video export',
    ],
    readTimeMin: 6,
    sections: [
      {
        heading: 'Why “local-first” is a search-worthy promise',
        paragraphs: [
          'Editors and enterprises ask whether an **online video editor** will exfiltrate raw camera files. KubeezCut is designed so your **timeline and media library stay oriented around local storage**, using browser capabilities instead of a mandatory upload gate.',
        ],
      },
      {
        heading: 'What still touches the network',
        paragraphs: [
          'If you enable **Kubeez.com** generation, only the requests you initiate (for example, a text-to-speech or image job) cross the network under your API key. Core editing, trimming, and WebCodecs export do not require sending your full project to KubeezCut servers—there is no KubeezCut cloud that must hold your masters.',
        ],
      },
      {
        heading: 'Who this helps',
        paragraphs: [
          'Educators, indie creators, and developers evaluating a **free browser video editor** for sensitive drafts benefit from a tool that does not assume “cloud upload first.” KubeezCut’s README and architecture docs expand on storage and browser APIs for those who need detail.',
        ],
      },
    ],
  },
];

export function getBlogPostBySlug(slug: string): BlogPost | undefined {
  return blogPosts.find((p) => p.slug === slug);
}

export function getAllBlogSlugs(): string[] {
  return blogPosts.map((p) => p.slug);
}

/** Paths for sitemap (leading slash, no trailing). */
export function getBlogSitemapPaths(): string[] {
  return ['/blog', ...blogPosts.map((p) => `/blog/${p.slug}`)];
}
