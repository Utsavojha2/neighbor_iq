import { Link } from '@tanstack/react-router'

const categories = [
  {
    id: '01',
    title: 'Crime Safety',
    subtitle: '+1 point if crime-free',
    desc: 'Pulls local crime data for the address and assigns a grade across violent and property incidents.',
    api: 'CrimeGrade + SpotCrime',
    color: 'text-cat-1',
  },
  {
    id: '02',
    title: 'Nearby Amenities',
    subtitle: '+1 point if well-served',
    desc: 'Checks grocery stores, universities, pharmacies, and hospitals within a 1.5 mile radius.',
    api: 'Google Places',
    color: 'text-cat-2',
  },
  {
    id: '03',
    title: 'Natural Disaster Risk',
    subtitle: '+1 point if low risk',
    desc: "Uses FEMA's National Risk Index to evaluate local hazard exposure at tract level.",
    api: 'FEMA',
    color: 'text-cat-3',
  },
  {
    id: '04',
    title: 'Transit & Walkability',
    subtitle: '+1 point if accessible',
    desc: 'Scores walkability and transit access for movers who want daily convenience without car dependency.',
    api: 'Walk Score',
    color: 'text-cat-4',
  },
  {
    id: '05',
    title: 'Cost of Living',
    subtitle: '+1 point if affordable',
    desc: 'Compares local rents and home prices against national benchmarks to estimate affordability.',
    api: 'RentCast',
    color: 'text-cat-5',
  },
  {
    id: '06',
    title: 'Nightlife & Social Scene',
    subtitle: '+1 point if vibrant',
    desc: 'Evaluates quantity and quality of cafes, bars, restaurants, gyms, and local hangout spots.',
    api: 'YELP',
    color: 'text-cat-6',
  },
  {
    id: '07',
    title: 'Community Sentiment',
    subtitle: '+1 point if positive vibe',
    desc: 'Synthesizes neighborhood opinions from Reddit and web discussions into a plain-English vibe summary.',
    api: 'Claude + Reddit',
    color: 'text-cat-7',
  },
]

function LandingPage() {
  return (
    <main className="bg-paper text-ink">
      <section className="grid min-h-screen border-b-2 border-ink lg:grid-cols-2">
        <div className="flex flex-col justify-between border-b-2 border-ink px-8 py-10 lg:border-r-2 lg:border-b-0 lg:px-14 lg:py-14">
          <div>
            <p className="mb-8 inline-block border border-border bg-tag px-3 py-1 text-[11px] tracking-[0.12em] text-muted uppercase">
              Product Innovation Challenge 2025
            </p>
            <h1 className="font-display text-5xl leading-[0.95] font-extrabold tracking-[-0.03em] lg:text-7xl">
              Neighbor<span className="text-accent">IQ</span>
            </h1>
            <p className="mt-6 max-w-md font-serif text-2xl leading-normal text-muted italic">
              Neighborhood scores for international students choosing housing in the US—before you sign a
              lease.
            </p>
            <Link
              to="/"
              className="mt-10 inline-flex items-center border border-ink bg-ink px-5 py-3 text-xs tracking-[0.12em] text-paper uppercase transition hover:bg-accent"
            >
              Get Started Now
            </Link>
          </div>
          <div className="mt-10 flex flex-wrap gap-5 text-[11px] tracking-[0.08em] text-muted uppercase">
            <span className="border-t border-border pt-2.5">7-point scoring</span>
            <span className="border-t border-border pt-2.5">Real-time APIs</span>
            <span className="border-t border-border pt-2.5">AI-powered</span>
            <span className="border-t border-border pt-2.5">Any US address</span>
          </div>
        </div>

        <div className="relative overflow-hidden bg-ink px-8 py-10 text-paper lg:px-12 lg:py-14">
          <div className="pointer-events-none absolute top-8 right-0 font-display text-8xl leading-none font-extrabold tracking-[-0.05em] text-white/10 lg:text-[130px]">
            7
          </div>
          <p className="relative z-10 max-w-md text-[13px] leading-[1.8] text-paper/70">
            Renting from overseas is overwhelming. NeighborIQ aggregates crime, walkability, cost of living,
            and community sentiment into one student-tuned compatibility score per address.
          </p>
          <div className="relative z-10 mt-10 border border-white/15 bg-white/5 px-5 py-4 text-[13px]">
            <span className="text-accent">{'>'} </span>
            I am moving to 12 Richard St, Worcester MA
          </div>
          <p className="relative z-10 mt-3 text-[11px] tracking-[0.06em] text-paper/35 uppercase">
            Analyzing 7 categories across 6 live data sources + AI sentiment
          </p>
        </div>
      </section>

      <section className="border-b-2 border-ink">
        <div className="grid border-b border-border px-8 py-7 lg:grid-cols-[200px_1fr] lg:px-14">
          <p className="text-[11px] tracking-[0.12em] text-muted uppercase">01 - Overview</p>
          <h2 className="mt-2 font-display text-3xl font-bold tracking-[-0.02em] lg:mt-0">
            What is NeighborIQ?
          </h2>
        </div>
        <div className="grid border-t border-border md:grid-cols-3">
          {[
            {
              h: 'The Problem',
              p: "People relocating to unfamiliar cities research across dozens of disconnected tabs and still feel uncertain before signing a lease.",
            },
            {
              h: 'The Solution',
              p: 'One address in, one compatibility score out - powered by live APIs and AI synthesis across seven quality-of-life categories.',
            },
            {
              h: 'The Target User',
              p: 'International students evaluating US housing from abroad—little local context, tight budgets, and high-stakes lease decisions.',
            },
          ].map((item) => (
            <article
              key={item.h}
              className="border-r border-border px-8 py-10 last:border-r-0 lg:px-14"
            >
              <h3 className="font-display text-base font-bold">{item.h}</h3>
              <p className="mt-3 text-[13px] leading-[1.8] text-muted">{item.p}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="border-b-2 border-ink">
        <div className="grid border-b border-border px-8 py-7 lg:grid-cols-[200px_1fr] lg:px-14">
          <p className="text-[11px] tracking-[0.12em] text-muted uppercase">02 - Scoring System</p>
          <h2 className="mt-2 font-display text-3xl font-bold tracking-[-0.02em] lg:mt-0">
            7-Point Compatibility Score
          </h2>
        </div>
        <div className="px-8 lg:px-14">
          {categories.map((cat) => (
            <div
              key={cat.id}
              className="grid gap-5 border-b border-border py-7 lg:grid-cols-[80px_220px_1fr_220px] lg:gap-8"
            >
              <p className={`font-display text-4xl leading-none font-extrabold ${cat.color}`}>{cat.id}</p>
              <div>
                <h3 className="font-display text-lg font-bold">{cat.title}</h3>
                <p className="text-xs tracking-[0.06em] text-muted uppercase">{cat.subtitle}</p>
              </div>
              <p className="text-[13px] leading-[1.8] text-muted">{cat.desc}</p>
              <div>
                <span className="inline-block border border-ink bg-ink px-2.5 py-1 text-[11px] text-paper">
                  {cat.api}
                </span>
              </div>
            </div>
          ))}
        </div>
      </section>

      <footer className="flex flex-col gap-2 border-t-2 border-ink px-8 py-8 lg:flex-row lg:items-center lg:justify-between lg:px-14">
        <p className="font-display text-2xl leading-none font-extrabold tracking-[-0.02em]">
          Neighbor<span className="text-accent">IQ</span>
        </p>
        <p className="text-[11px] tracking-[0.06em] text-muted uppercase">
          Product Innovation Challenge 2025 - College Submission
        </p>
      </footer>
    </main>
  )
}

export default LandingPage
