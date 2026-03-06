import { useEffect, useMemo, useState } from "react";
import { Globe, PhoneCall } from "lucide-react";

const ENV_BASE = import.meta.env.VITE_API_BASE_URL ?? "";
const API_BASES = (() => {
  const host = typeof window !== "undefined" ? window.location.hostname : "localhost";
  return Array.from(new Set([ENV_BASE, `http://${host}:8001`, "http://localhost:8001", "http://127.0.0.1:8001"]));
})();

type LandingPayload = {
  home: {
    logo_text: string;
    logo_image_path: string | null;
    brand_name: string;
    brand_subtitle: string;
    hero_tagline: string;
    hero_title: string;
    hero_description: string;
    primary_cta_label: string;
    primary_cta_href: string;
    secondary_cta_label: string;
    secondary_cta_href: string;
    spotlight_title: string;
    spotlight_description: string;
    slider_images: string[];
  };
  metrics: Array<{ id: number; label: string; value: string }>;
  plans: Array<{ id: number; name: string; speed: string; description: string; price: string }>;
};

const defaultPayload: LandingPayload = {
  home: {
    logo_text: "BM",
    logo_image_path: null,
    brand_name: "Rajamehar Online",
    brand_subtitle: "Smart broadband operations",
    hero_tagline: "Always-on fiber",
    hero_title: "Home Internet",
    hero_description: "Choose a package that suits your budget.",
    primary_cta_label: "Explore Packages",
    primary_cta_href: "#packages",
    secondary_cta_label: "Coverage Areas",
    secondary_cta_href: "#coverage",
    spotlight_title: "Home Internet",
    spotlight_description: "Fast, stable and always-on broadband for your family.",
    slider_images: [],
  },
  metrics: [
    { id: 1, label: "Latency (avg)", value: "8ms" },
    { id: 2, label: "Packet loss", value: "0.3%" },
    { id: 3, label: "Fiber kilometers", value: "420 km" },
  ],
  plans: [
    { id: 1, name: "General", speed: "30 Mbps", description: "Shared Package, Unlimited BDX Bandwidth, 24/7 Phone and Online Support", price: "630" },
    { id: 2, name: "Special", speed: "50 Mbps", description: "Shared Package, Unlimited BDX Bandwidth, 24/7 Phone and Online Support", price: "840" },
    { id: 3, name: "Fantastic", speed: "60 Mbps", description: "Shared Package, Unlimited BDX Bandwidth, 24/7 Phone and Online Support", price: "1050" },
    { id: 4, name: "Festive", speed: "70 Mbps", description: "Shared Package, Unlimited BDX Bandwidth, 24/7 Phone and Online Support", price: "1260" },
  ],
};

const fallbackFeatures = [
  "Shared Package",
  "Unlimited BDX Bandwidth",
  "4K Youtube and Facebook Stream",
  "Online Payment System",
  "24/7 Phone and Online Support",
  "Optical Fiber GPON Technology",
];

type PlanDetails = {
  subtitle: string;
  features: string[];
  included_title: string;
  button_label: string;
};

const navItems = [
  { label: "Home", href: "#home" },
  { label: "Package", href: "#packages" },
  { label: "Service & Solution", href: "#services" },
  { label: "Blog", href: "#blog" },
  { label: "Contact", href: "#contact" },
];

const normalizePrice = (value: string) => {
  const number = Number.parseFloat(value);
  if (Number.isNaN(number)) return value;
  return number.toFixed(0);
};

const getFeatures = (description: string) => {
  const parsed = description
    .split(/[\n,|]+/)
    .map((line) => line.trim())
    .filter(Boolean);
  return parsed.length ? parsed : fallbackFeatures;
};

const parsePlanDetails = (description: string): PlanDetails => {
  const defaults: PlanDetails = {
    subtitle: "Choose a package and start your internet journey",
    features: getFeatures(description),
    included_title: "What's Included",
    button_label: "Register Now",
  };
  try {
    const parsed = JSON.parse(description) as Partial<PlanDetails> & { features_text?: string };
    const featuresFromArray = Array.isArray(parsed.features) ? parsed.features.filter(Boolean) : [];
    const featuresFromText = parsed.features_text ? getFeatures(parsed.features_text) : [];
    const features = featuresFromArray.length ? featuresFromArray : featuresFromText.length ? featuresFromText : defaults.features;
    return {
      subtitle: parsed.subtitle?.trim() || defaults.subtitle,
      features,
      included_title: parsed.included_title?.trim() || defaults.included_title,
      button_label: parsed.button_label?.trim() || defaults.button_label,
    };
  } catch {
    return defaults;
  }
};

const LandingPage = () => {
  const [content, setContent] = useState<LandingPayload>(defaultPayload);
  const [apiBase, setApiBase] = useState<string>(() => API_BASES.find((base) => base.includes(":8001")) ?? API_BASES.find((base) => base) ?? "");
  const [activeSlide, setActiveSlide] = useState(0);
  const [logoLoadError, setLogoLoadError] = useState(false);
  const [landingLoaded, setLandingLoaded] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      for (const base of API_BASES) {
        if (!base) continue;
        try {
          const response = await fetch(`${base}/api/configuration/items/public/landing`, { cache: "no-store" });
          if (!response.ok) continue;
          const payload = (await response.json()) as LandingPayload;
          if (!cancelled) {
            setContent(payload);
            setApiBase(base);
            setLandingLoaded(true);
          }
          return;
        } catch {
          // try next base
        }
      }
      if (!cancelled) {
        setLandingLoaded(true);
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  const home = content.home;
  const metrics = content.metrics.slice(0, 3);
  const sliderImages = Array.isArray(home.slider_images) ? home.slider_images.filter(Boolean) : [];
  const plans = useMemo(() => {
    if (!content.plans.length) return defaultPayload.plans;
    return content.plans;
  }, [content.plans]);

  useEffect(() => {
    if (sliderImages.length <= 1) return;
    const timer = window.setInterval(() => {
      setActiveSlide((prev) => (prev + 1) % sliderImages.length);
    }, 4500);
    return () => window.clearInterval(timer);
  }, [sliderImages.length]);

  useEffect(() => {
    if (activeSlide >= sliderImages.length) {
      setActiveSlide(0);
    }
  }, [activeSlide, sliderImages.length]);

  const resolveAssetUrl = (path: string) => {
    if (!path) return "";
    if (path.startsWith("http://") || path.startsWith("https://")) return path;
    return `${apiBase}${path}`;
  };

  const normalizedLogoPath =
    typeof home.logo_image_path === "string" &&
    home.logo_image_path.trim() &&
    home.logo_image_path.trim().toLowerCase() !== "null" &&
    home.logo_image_path.trim().toLowerCase() !== "none"
      ? home.logo_image_path.trim()
      : "";
  const showLogoImage = Boolean(normalizedLogoPath) && !logoLoadError;
  const hasBrandName = Boolean((home.brand_name || "").trim());
  const welcomeBrand = (home.brand_name || "").trim() || (home.logo_text || "").trim() || "Our ISP";

  useEffect(() => {
    setLogoLoadError(false);
  }, [normalizedLogoPath]);

  return (
    <div className="mesh-page relative min-h-screen overflow-hidden text-slate-900">
      <div className="mesh-blob-a" />
      <div className="mesh-blob-b" />
      {/* <div className="bg-[#0b1233] text-white">
        <div className="mx-auto flex w-full max-w-[1600px] items-center justify-between px-4 py-2 text-[11px] sm:px-8">
          <div className="flex flex-wrap items-center gap-4">
            <span>Welcome To {welcomeBrand}</span>
            <span className="inline-flex items-center gap-1 text-cyan-200"><PhoneCall className="h-3 w-3" />01303120098</span>
            <span className="text-cyan-200">rajameharonline@gmail.com</span>
          </div>
          <div className="hidden items-center gap-4 sm:flex">
            <span className="rounded-full bg-[#19d3df] px-2 py-0.5 text-[10px] text-[#07203b]">Self Care</span>
            <span>BTRC Approved Tariff</span>
          </div>
        </div>
      </div> */}

      <header className="min-h-[110px] border-b border-[#d0dfe4] bg-[#f4fafb]/95 shadow-sm backdrop-blur">
        <div className="mx-auto flex w-full max-w-[1600px] items-center justify-between px-4 py-2 sm:px-8">
          <div className="flex h-20 w-72 shrink-0 items-center justify-start rounded-md bg-white p-1 text-cyan-200">
            {showLogoImage ? (
              <img
                src={resolveAssetUrl(normalizedLogoPath)}
                alt="Brand logo"
                className="block h-auto max-h-full w-auto max-w-full object-contain"
                onError={() => setLogoLoadError(true)}
              />
            ) : landingLoaded && hasBrandName ? (
              <span className="px-1 text-center text-sm font-bold leading-tight text-[#1f4e6e]">
                {home.brand_name}
              </span>
            ) : (
              <span className="px-1 text-center text-[10px] font-bold leading-tight text-[#1f4e6e]">
                {home.logo_text || "BM"}
              </span>
            )}
          </div>
          <nav className="hidden items-center gap-6 text-sm font-medium text-[#153554] lg:flex">
            {navItems.map((item) => (
              <a key={item.label} href={item.href} className="hover:text-[#12b6c6]" title={item.label}>
                {item.label}
              </a>
            ))}
          </nav>
          <a
            className="rounded-full border border-[#12b6c6] px-4 py-1.5 text-sm font-semibold text-[#14334f] transition hover:bg-[#12b6c6] hover:text-white"
            href="/login"
          >
            Client Login
          </a>
        </div>
      </header>

      <main id="home">
        {sliderImages.length ? (
          <section className="relative h-[260px] w-full overflow-hidden border-b border-slate-200 bg-slate-100 sm:h-[360px] lg:h-[460px]">
            <img
              src={resolveAssetUrl(sliderImages[activeSlide])}
              alt={`Slide ${activeSlide + 1}`}
              className="h-full w-full object-cover"
            />
          </section>
        ) : null}

        {/* <section id="coverage" className="mesh-hero relative overflow-hidden">
          <div className="pointer-events-none absolute inset-0 opacity-20 [background:radial-gradient(circle_at_15%_20%,#20d9dd_0%,transparent_35%),radial-gradient(circle_at_80%_70%,#4a63ff_0%,transparent_40%)]" />
          <div className="mx-auto grid w-full max-w-[1600px] gap-8 px-4 py-10 sm:px-8 lg:grid-cols-[1.1fr_0.9fr] lg:py-16">
            <div className="flex items-end justify-center">
              <div className="w-full rounded-2xl border border-cyan-100/20 bg-[linear-gradient(145deg,rgba(7,22,48,0.82)_0%,rgba(6,44,83,0.7)_50%,rgba(5,56,92,0.68)_100%)] p-6 shadow-[0_20px_50px_rgba(4,15,32,0.45)] backdrop-blur-sm">
                <p className="text-xs font-semibold uppercase tracking-[0.35em] text-[#56e0e7]">{home.hero_tagline}</p>
                <h1 className="mt-3 text-4xl font-bold leading-tight text-white sm:text-6xl">{home.hero_title}</h1>
                <p className="mt-4 max-w-xl text-base text-[#d2e7ed]">{home.hero_description}</p>
                <div className="mt-6 flex flex-wrap gap-3">
                  <a href={home.primary_cta_href || "#packages"} className="rounded bg-[#12b6c6] px-5 py-2 text-sm font-semibold text-white">
                    {home.primary_cta_label}
                  </a>
                  <a href={home.secondary_cta_href || "#coverage"} className="rounded border border-[#89dbe3] px-5 py-2 text-sm font-semibold text-[#d8f3f6]">
                    {home.secondary_cta_label}
                  </a>
                </div>
              </div>
            </div>

            <div className="rounded-3xl border border-cyan-100/20 bg-[linear-gradient(155deg,rgba(6,22,47,0.8)_0%,rgba(6,43,81,0.68)_60%,rgba(8,57,91,0.65)_100%)] p-6 shadow-[0_20px_50px_rgba(4,15,32,0.45)] backdrop-blur-sm">
              <p className="text-xs uppercase tracking-[0.3em] text-[#9edfe5]">Coverage Spotlight</p>
              <h2 className="mt-4 text-4xl font-bold text-white">{home.spotlight_title}</h2>
              <p className="mt-3 text-base text-[#d2e7ed]">{home.spotlight_description}</p>
              <div className="mt-6 grid gap-3 text-sm text-[#d2e7ed]">
                {metrics.map((metric) => (
                  <div key={`${metric.id}-${metric.label}`} className="flex items-center justify-between rounded bg-white/10 px-3 py-2">
                    <span>{metric.label}</span>
                    <span className="font-semibold text-[#56e0e7]">{metric.value}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section> */}

        <section id="packages" className="mx-auto w-full max-w-[1600px] px-4 py-10 sm:px-8">
          <h2 className="text-center text-6xl font-semibold text-[#11456b]">Home Internet Package</h2>
          <p className="mt-1 text-center text-xl text-[#4f6780]">Choose a package that suits your budget.</p>

          <div className="mt-8 grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
            {plans.map((plan) => {
              return (
                <article
                  key={`${plan.id}-${plan.name}`}
                  className="overflow-hidden rounded-xl border border-[#c2dce8] bg-[linear-gradient(160deg,rgba(245,254,255,0.98)_0%,rgba(237,249,253,0.95)_100%)] shadow-[0_14px_30px_rgba(7,31,64,0.1)] transition duration-300 hover:-translate-y-1 hover:shadow-[0_20px_42px_rgba(9,33,70,0.16)]"
                >
                  {(() => {
                    const details = parsePlanDetails(plan.description);
                    const features = details.features;
                    return (
                      <>
                        <div className="bg-[linear-gradient(155deg,#eaf8fb_0%,#d9edf6_55%,#dce7f7_100%)] px-6 py-6">
                          <div className="flex items-center gap-3 text-[36px] font-semibold text-black">
                            <Globe className="h-5 w-5 text-[#1f9de2]" />
                            <span>{plan.name}</span>
                          </div>
                          <p className="mt-2 text-[15px] text-[#58677d]">{details.subtitle}</p>

                          <div className="mt-6 inline-block rounded-2xl bg-[#58afe4] px-4 py-1.5 text-[24px] font-semibold text-white shadow">
                            {plan.speed}
                          </div>
                          <p className="mt-6 text-[48px] font-bold leading-none text-black">
                            TK {normalizePrice(plan.price)} <span className="text-[16px] font-normal text-[#58677d]">/ Month</span>
                          </p>
                        </div>

                        <div className="bg-white/80 px-6 py-5 backdrop-blur-[1px]">
                          <p className="text-[14px] font-bold uppercase tracking-[0.12em] text-black">{details.included_title}</p>
                          <ul className="mt-4 space-y-2 text-[15px] text-[#6a7280]">
                            {features.slice(0, 6).map((feature, index) => (
                              <li key={`${plan.id}-${index}`} className="flex items-start gap-3" title={feature}>
                                <span className="mt-2 h-1.5 w-1.5 shrink-0 bg-[#7e8084]" />
                                <span>{feature}</span>
                              </li>
                            ))}
                          </ul>
                          <button className="mt-7 w-full rounded-xl bg-[#0b1a36] px-3 py-3 text-[18px] font-semibold text-white transition hover:bg-[#153a62]">
                            {details.button_label}
                          </button>
                        </div>
                      </>
                    );
                  })()}
                </article>
              );
            })}
          </div>
        </section>

        <section id="services" className="mx-auto w-full max-w-[1600px] px-4 py-10 sm:px-8">
          <h2 className="text-center text-4xl font-semibold text-[#1f4e6e]">Service & Solution</h2>
          <div className="mt-6 grid gap-4 md:grid-cols-3">
            {["Internet & Data Connectivity", "Infrastructure & Cloud Solutions", "Managed IT Services"].map((service) => (
              <div key={service} className="rounded-xl border border-[#cfe0e5] bg-white/95 p-5 shadow-[0_8px_20px_rgba(15,23,42,0.08)] transition hover:-translate-y-0.5 hover:shadow-[0_14px_28px_rgba(15,23,42,0.12)]">
                <h3 className="text-lg font-semibold text-slate-800">{service}</h3>
                <p className="mt-2 text-sm text-slate-600">Professional deployment and support tailored for ISP operations.</p>
              </div>
            ))}
          </div>
        </section>

        {/* <section id="hosting" className="mx-auto w-full max-w-[1600px] px-4 py-10 sm:px-8">
          <h2 className="text-center text-4xl font-semibold text-[#1f4e6e]">Hosting</h2>
          <div className="mt-6 grid gap-4 md:grid-cols-3">
            {[
              { name: "Shared Hosting", price: "TK 350/mo" },
              { name: "Business VPS", price: "TK 1800/mo" },
              { name: "Dedicated Node", price: "TK 6500/mo" },
            ].map((item) => (
              <div key={item.name} className="rounded-xl border border-[#cfe0e5] bg-white/95 p-5 shadow-[0_8px_20px_rgba(15,23,42,0.08)] transition hover:-translate-y-0.5 hover:shadow-[0_14px_28px_rgba(15,23,42,0.12)]">
                <h3 className="text-lg font-semibold text-slate-800">{item.name}</h3>
                <p className="mt-2 text-sm text-slate-600">{item.price}</p>
                <a href="/login" className="mt-4 inline-block rounded-lg bg-[#0f2850] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#144a7a]">
                  Order Now
                </a>
              </div>
            ))}
          </div>
        </section> */}

        <section id="blog" className="mx-auto w-full max-w-[1600px] px-4 py-10 sm:px-8">
          <h2 className="text-center text-4xl font-semibold text-[#1f4e6e]">Blog</h2>
          <div className="mt-6 grid gap-4 md:grid-cols-3">
            {[
              "How to choose the right package for your family",
              "Reducing latency in fiber networks",
              "Why proactive monitoring matters for ISPs",
            ].map((title) => (
              <article key={title} className="rounded-xl border border-[#cfe0e5] bg-white/95 p-5 shadow-[0_8px_20px_rgba(15,23,42,0.08)] transition hover:-translate-y-0.5 hover:shadow-[0_14px_28px_rgba(15,23,42,0.12)]">
                <h3 className="text-lg font-semibold text-slate-800">{title}</h3>
                <p className="mt-2 text-sm text-slate-600">Read practical tips and updates from our network operations team.</p>
                <button className="mt-4 text-sm font-semibold text-[#1f9de2]">Read More</button>
              </article>
            ))}
          </div>
        </section>

        <footer id="contact" className="border-t border-[#d9dfe6] bg-[linear-gradient(140deg,#ddebf1_0%,#d6e5ec_100%)]">
          <div className="mx-auto grid w-full max-w-[1600px] gap-6 px-4 py-8 text-sm text-slate-600 sm:px-8 lg:grid-cols-4">
            <div>
              <h3 className="text-2xl font-semibold text-[#1f4e6e]">Contact</h3>
              <p className="mt-2">Molla Super Market, Rajamehar Bazar, Debidwer, Cumilla.</p>
              <p>Mobille: 01303120098</p>
              <p>Email: rajameharonline@gmail.com</p>
            </div>
            {/* <div>
              <h3 className="text-2xl font-semibold text-[#1f4e6e]">Services</h3>
              <ul className="mt-2 space-y-1">
                <li>Internet & Data Connectivity</li>
                <li>Infrastructure & Cloud Solutions</li>
                <li>Managed IT Services</li>
              </ul>
            </div>
            <div>
              <h3 className="text-2xl font-semibold text-[#1f4e6e]">Quick Links</h3>
              <ul className="mt-2 space-y-1">
                <li>About Us</li>
                <li>Contact Us</li>
                <li>Terms & Condition</li>
                <li>Privacy Policy</li>
              </ul>
            </div>
            <div>
              <h3 className="text-2xl font-semibold text-[#1f4e6e]">Quick Links</h3>
              <ul className="mt-2 space-y-1">
                <li>Home Package</li>
                <li>Coverage Area</li>
                <li>Blog</li>
              </ul>
            </div> */}
          </div>
        </footer>
      </main>
    </div>
  );
};

export default LandingPage;
