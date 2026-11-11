"use client";

import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type FormEvent,
} from "react";
import {
  APP_STORE_URL,
  PLAY_STORE_URL,
  getStoreUrl,
} from "../../utils/storeLinks";
import { subscribeToNewsletter } from "../../lib/newsletter/api";
import "./HomePage.css";

// Full homepage redesign ported from the designer's static HTML. All
// markup, pixel values, and animation choreography (word-split heading
// reveal, scroll-staggered groups, parallax background, hero video with
// poster fade, FAQ height animation, mobile drawer) match the source
// verbatim. CSS is scoped under .hp2 so none of the design tokens
// (--bg, --orange, etc.) bleed into other routes.

const ASSET = "/home";

const FAQS: { q: string; a: React.ReactNode }[] = [
  {
    q: "Is Epoch Lag private? Who can see my stories?",
    a: (
      <p>
        Epoch Lag is private. There is no public or broader feed. Only people
        with whom you share stories or prompts with, are able to view those
        stories or prompts. To ensure that anyone you share a story or prompt
        with can not re-send the story or prompt, you can select to keep it
        locked (toggle the privacy settings).
      </p>
    ),
  },
  {
    q: "How is this different from social media?",
    a: (
      <p>
        Epoch Lag is social media in the sense that you can use Epoch Lag for
        media (storytelling) and to be social (connecting and sharing meaningful
        memories and stories with Friends and Family). You can upload videos,
        audio recordings, photos. And you can share with friends and family. The
        main differences are that Epoch Lag is private, we do not store or
        harvest your data, we are not advertising driven, and we offer a
        subscription model to ensure we maintain an emphasis always on the best
        experience for people using our products.
      </p>
    ),
  },
  {
    q: "How do I get my family on the platform?",
    a: (
      <p>
        Through the Friends &amp; Family tab (the last tab on the right) you can
        connect with family and friends who are members of Epoch Lag. Through
        the tab you can connect with them, and you can invite them to join. You
        can also refer family members and friends, offering them a referral
        bonus that enables them to try the app.
      </p>
    ),
  },
  {
    q: "How do I share a story / create an album?",
    a: (
      <p>
        You can share a story by clicking on the send icon button at the bottom
        of a story, then selecting who you would like to share it with. You can
        always share a story further by clicking on the three dots (“…”) in the
        top right corner of a story. To create an album, you can click the
        three dots (“…”) in the top right of a story and select “Add to album”
        or “Create an album”.
      </p>
    ),
  },
  {
    q: "Can I connect with someone live for a demo of the app to better understand how to use?",
    a: (
      <p>
        Absolutely! We love to connect with people who are using Epoch Lag!
        Please email{" "}
        <a href="mailto:hello@epochlag.com">hello@epochlag.com</a> for a demo
        or to connect with someone live for a discussion about how to use the
        app. We would love to hear from you so don’t hesitate to reach out and
        we will set up time.
      </p>
    ),
  },
  {
    q: "Can I use Epoch Lag with older family members who aren’t as tech savvy?",
    a: (
      <p>
        Epoch Lag is intended to be inter-generational and easy to use. We are
        always more than happy to connect with you or any one of your family
        members or friends who would like a walk-through of the product and how
        to best use. We also welcome feedback and would love to hear suggestions
        or thoughts for how to make it more intuitive or simpler to use. Please
        feel free to email{" "}
        <a href="mailto:hello@epochlag.com">hello@epochlag.com</a> to have a
        call to discuss further, or to share any feedback or suggestions.
      </p>
    ),
  },
  {
    q: "Will I be able to download / export my stories or content from the app?",
    a: <p>Yes — you will always be able to download or export stories from the app.</p>,
  },
  {
    q: "What happens to my stories if I stop using the app?",
    a: (
      <p>
        If you remove or delete your account and stop using the app, your
        stories will be stored for one year. For your own privacy and security,
        after one year we remove your stories.
      </p>
    ),
  },
  {
    q: "What does the name Epoch Lag mean?",
    a: (
      <p>
        Pronounced: ˈe-pək’ lag; or epic lag. Epoch Lag represents the
        intentional pause between eras — not rushing into the next epoch, but
        lingering to absorb lessons, memories, or meaning from the last. It’s
        an acknowledgment that progress doesn’t erase the past, and that
        carrying pieces of an older epoch into the new one brings continuity,
        depth, and meaning.
      </p>
    ),
  },
];

const CHECKLIST = [
  "Send your family questions they’ve never been asked",
  "Let them answer by voice, photo or a few words",
  "Keep every story together in one family archive",
  "Pass their stories down to the next generation",
  "Keep everything completely private",
];

const DAILY_BULLETS = [
  "Tell the story behind a photo from years ago",
  "View the places you’ve been and share what happened there",
  "Capture today’s moments to remember and share.",
  "Send a question to anyone in your family",
];

const REVIEWS = [
  {
    quote:
      "Epoch Lag is a great app for helping you share specific memories with friends and loved ones without having to navigate through the noise of a busy social media feed on Instagram, TikTok, Facebook.",
    author: "– Patrick",
  },
  {
    quote:
      "Unlike most social apps that feel noisy and overwhelming, this one feels calm and intentional. The private nature of the app makes me more comfortable sharing real moments instead of polished content.",
    author: "– Aliyu",
  },
  {
    quote:
      "I value how personal and private it feels. I like that I can choose exactly who sees my stories instead of posting for everyone. The ability to combine photos, short videos, and voice notes in one story is also something I appreciate.",
    author: "– Jordan",
  },
];

function CheckMark() {
  return (
    <svg
      viewBox="0 0 10 10"
      fill="none"
      stroke="#232323"
      strokeWidth={1.4}
      aria-hidden="true"
    >
      <path d="M1 5.2l2.6 2.6L9 2.3" />
    </svg>
  );
}

function Star() {
  return (
    <svg viewBox="0 0 20 20" aria-hidden="true">
      <path
        fill="#EF9849"
        d="M10 1.2l2.7 5.6 6.1.8-4.5 4.3 1.1 6.1L10 15.1 4.6 18l1.1-6.1L1.2 7.6l6.1-.8z"
      />
    </svg>
  );
}

function PlusIcon() {
  return (
    <svg
      viewBox="0 0 15 15"
      fill="none"
      stroke="#4A4A4A"
      strokeWidth={1.3}
      aria-hidden="true"
    >
      <path d="M7.5 0v15M0 7.5h15" />
    </svg>
  );
}

export default function HomePage() {
  const rootRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [newsletterMsg, setNewsletterMsg] = useState("");
  const [newsletterBusy, setNewsletterBusy] = useState(false);

  async function onNewsletterSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const input = e.currentTarget.elements.namedItem(
      "email",
    ) as HTMLInputElement | null;
    const email = (input?.value ?? "").trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setNewsletterMsg("Please enter a valid email.");
      input?.focus();
      return;
    }
    setNewsletterBusy(true);
    const res = await subscribeToNewsletter({ email, source: "homepage" });
    setNewsletterBusy(false);
    if (res.ok) {
      setNewsletterMsg("Thanks — we’ll keep you in the loop.");
      if (input) input.value = "";
    } else {
      setNewsletterMsg(res.message);
    }
  }

  // Store-click handler mirroring the HTML: iPhone/iPad → App Store, Android → Play Store,
  // desktop → whichever badge they clicked (default behavior).
  function handleGetAppClick(e: React.MouseEvent<HTMLAnchorElement>) {
    const url = getStoreUrl();
    if (url) {
      e.preventDefault();
      window.open(url, "_blank", "noopener");
    }
  }

  const useIsoLayoutEffect =
    typeof window !== "undefined" ? useLayoutEffect : useEffect;
  useIsoLayoutEffect(() => {
    const root = rootRef.current;
    if (!root) return;

    const reduceMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    if (!reduceMotion) root.classList.add("motion");

    const cleanups: Array<() => void> = [];

    // ---------- Hero video: play / pause toggle + poster fade ----------
    (function heroVideo() {
      const v = videoRef.current;
      if (!v) return;
      const box = v.closest(".hero-media") as HTMLElement | null;
      const btn = root.querySelector<HTMLButtonElement>(".video-toggle");
      let userPaused = false;
      function setPressed(paused: boolean) {
        if (!btn) return;
        btn.setAttribute("aria-pressed", String(paused));
        btn.setAttribute("aria-label", paused ? "Play video" : "Pause video");
      }
      function tryPlay() {
        v!.muted = true;
        v!.defaultMuted = true;
        const p = v!.play();
        if (p && typeof (p as Promise<void>).catch === "function") {
          (p as Promise<void>).catch(() => {
            setPressed(true);
            const resume = () => {
              if (!userPaused) tryPlay();
              window.removeEventListener("pointerdown", resume);
              window.removeEventListener("touchstart", resume);
              window.removeEventListener("keydown", resume);
            };
            window.addEventListener("pointerdown", resume, { once: true });
            window.addEventListener("touchstart", resume, {
              once: true,
              passive: true,
            });
            window.addEventListener("keydown", resume, { once: true });
          });
        }
      }
      const onTime = () => {
        if (v.currentTime > 0.05 && box) box.classList.add("is-playing");
      };
      const onPlay = () => setPressed(false);
      const onPause = () => setPressed(true);
      const onToggle = (e: MouseEvent) => {
        e.stopPropagation();
        if (v.paused) {
          userPaused = false;
          tryPlay();
        } else {
          userPaused = true;
          v.pause();
        }
      };
      v.addEventListener("timeupdate", onTime);
      v.addEventListener("play", onPlay);
      v.addEventListener("pause", onPause);
      btn?.addEventListener("click", onToggle);
      tryPlay();
      cleanups.push(() => {
        v.removeEventListener("timeupdate", onTime);
        v.removeEventListener("play", onPlay);
        v.removeEventListener("pause", onPause);
        btn?.removeEventListener("click", onToggle);
      });
    })();

    // ---------- Statement background parallax ----------
    (function parallax() {
      if (reduceMotion) return;
      const sec = root.querySelector<HTMLElement>(".statement");
      const bg = sec?.querySelector<HTMLElement>(".statement-bg");
      if (!sec || !bg) return;
      const SPEED = 0.2;
      let ticking = false;
      function update() {
        ticking = false;
        const r = sec!.getBoundingClientRect();
        const vh = window.innerHeight;
        if (r.bottom < -100 || r.top > vh + 100) return;
        const progress = Math.max(
          -1,
          Math.min(
            1,
            (r.top + r.height / 2 - vh / 2) / (vh / 2 + r.height / 2),
          ),
        );
        bg!.style.transform = `translate3d(0,${(-progress * r.height * SPEED).toFixed(1)}px,0)`;
      }
      const onScroll = () => {
        if (!ticking) {
          ticking = true;
          requestAnimationFrame(update);
        }
      };
      window.addEventListener("scroll", onScroll, { passive: true });
      window.addEventListener("resize", onScroll);
      update();
      cleanups.push(() => {
        window.removeEventListener("scroll", onScroll);
        window.removeEventListener("resize", onScroll);
      });
    })();

    if (!reduceMotion) {
      // ---------- Word-split heading reveal ----------
      function split(el: HTMLElement) {
        const nodes = Array.from(el.childNodes);
        el.setAttribute(
          "aria-label",
          (el.textContent || "").replace(/\s+/g, " ").trim(),
        );
        let i = 0;
        nodes.forEach((n) => {
          if (n.nodeType !== 3) return;
          const frag = document.createDocumentFragment();
          (n.textContent || "").split(/(\s+)/).forEach((part) => {
            if (!part) return;
            if (/^\s+$/.test(part)) {
              frag.appendChild(document.createTextNode(" "));
              return;
            }
            const w = document.createElement("span");
            w.className = "w";
            w.setAttribute("aria-hidden", "true");
            const inner = document.createElement("span");
            inner.textContent = part;
            inner.style.setProperty("--i", String(i++));
            w.appendChild(inner);
            frag.appendChild(w);
          });
          el.replaceChild(frag, n);
        });
        el.classList.add("split");
      }
      root
        .querySelectorAll<HTMLElement>(
          "section h1, section h2, .statement p",
        )
        .forEach(split);

      // ---------- Scroll-reveal: mark + stagger inside groups ----------
      const mark = (sel: string, cls = "reveal", step = 0) => {
        root.querySelectorAll<HTMLElement>(sel).forEach((el, idx) => {
          el.classList.add(cls);
          if (step) el.style.setProperty("--d", idx * step + "ms");
        });
      };
      const group = (
        parentSel: string,
        childSel: string,
        step: number,
        base = 0,
      ) => {
        root.querySelectorAll<HTMLElement>(parentSel).forEach((p) => {
          p.querySelectorAll<HTMLElement>(childSel).forEach((el, idx) => {
            el.classList.add("reveal");
            el.style.setProperty("--d", base + idx * step + "ms");
          });
        });
      };
      group(".hero", ".badges, .btn--mobile", 0, 450);
      group(".built-copy", "p, .checklist li", 70, 250);
      mark(".phone-stage");
      group(".how-grid", ".how-item", 140);
      group(".daily-copy", "p, ul, .btn", 90, 250);
      mark(".daily-collage");
      group(".about-body", "p", 90, 150);
      mark(".review-grid");
      group(".faq-intro", "p, .btn", 90, 200);
      group(".faq-list", "details", 45, 150);
      group(".loop", "p, .arrow-link, .signup", 90, 200);
      group(".cta-inner", "p, .badges, .qr, .qr-caption, .btn--mobile", 80, 250);
      mark(".pol", "reveal-fade");
      const ph = root.querySelector<HTMLElement>(".phone-stage");
      if (ph) ph.style.setProperty("--d", "150ms");
      const dc = root.querySelector<HTMLElement>(".daily-collage");
      if (dc) dc.style.setProperty("--d", "200ms");

      // ---------- IntersectionObserver: each element animates once ----------
      const io = new IntersectionObserver(
        (entries) => {
          entries.forEach((e) => {
            if (e.isIntersecting) {
              e.target.classList.add("in");
              io.unobserve(e.target);
            }
          });
        },
        { rootMargin: "0px 0px -8% 0px", threshold: 0 },
      );
      root
        .querySelectorAll<HTMLElement>(
          ".reveal, .reveal-fade, .reveal-soft, .split",
        )
        .forEach((el) => {
          if (el.closest(".hero")) return;
          io.observe(el);
        });

      // Hero animates straight away
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          root
            .querySelectorAll<HTMLElement>(".hero .split, .hero .reveal")
            .forEach((el) => el.classList.add("in"));
        });
      });
      cleanups.push(() => io.disconnect());
    }

    // ---------- FAQ accordion with height animation ----------
    (function faqAccordion() {
      if (reduceMotion) return;
      root
        .querySelectorAll<HTMLDetailsElement>(".faq-list details")
        .forEach((d) => {
          const s = d.querySelector<HTMLElement>("summary");
          const a = d.querySelector<HTMLElement>(".faq-a");
          if (!s || !a || !a.animate) return;
          let anim: Animation | null = null;
          const onClick = (e: Event) => {
            e.preventDefault();
            if (anim) {
              anim.cancel();
              d.classList.remove("closing");
            }
            if (d.open) {
              anim = a.animate(
                [
                  { height: a.offsetHeight + "px", opacity: 1 },
                  { height: "0px", opacity: 0 },
                ],
                { duration: 260, easing: "ease" },
              );
              anim.onfinish = () => {
                d.open = false;
                d.classList.remove("closing");
                anim = null;
              };
              d.classList.add("closing");
            } else {
              d.open = true;
              anim = a.animate(
                [
                  { height: "0px", opacity: 0 },
                  { height: a.offsetHeight + "px", opacity: 1 },
                ],
                { duration: 340, easing: "cubic-bezier(.2,.7,.2,1)" },
              );
              anim.onfinish = () => {
                anim = null;
              };
            }
          };
          s.addEventListener("click", onClick);
          cleanups.push(() => s.removeEventListener("click", onClick));
        });
    })();

    // ---------- Mobile menu: slide-in drawer ----------
    (function mobileMenu() {
      const btn = root.querySelector<HTMLButtonElement>(".menu-toggle");
      const menu = root.querySelector<HTMLElement>("#mobile-menu");
      if (!btn || !menu) return;
      const panel = menu.querySelector<HTMLElement>(".mobile-menu-panel");
      const list = menu.querySelector<HTMLElement>("nav");
      if (!panel || !list) return;
      const animate = root.classList.contains("motion");
      if (animate) {
        list.querySelectorAll<HTMLAnchorElement>("a").forEach((a, i) => {
          const label = (a.textContent || "").trim();
          a.setAttribute("aria-label", label);
          a.innerHTML = `<span class="w" aria-hidden="true"><span>${label}</span></span>`;
          a.style.setProperty("--d", 180 + i * 80 + "ms");
        });
      }
      let timer: ReturnType<typeof setTimeout> | null = null;
      let revealTimer: ReturnType<typeof setTimeout> | null = null;
      function focusables() {
        return Array.from(panel!.querySelectorAll<HTMLElement>("a,button"));
      }
      function open(e?: MouseEvent) {
        const byKeyboard = e?.detail === 0;
        if (timer) clearTimeout(timer);
        menu!.classList.remove("is-closing");
        menu!.hidden = false;
        root!.classList.add("menu-open");
        if (!reduceMotion) {
          menu!.classList.add("is-opening");
          requestAnimationFrame(() => {
            requestAnimationFrame(() => {
              menu!.classList.remove("is-opening");
            });
          });
        }
        btn!.setAttribute("aria-expanded", "true");
        if (byKeyboard) {
          const first = panel!.querySelector<HTMLElement>("nav a");
          if (first) first.focus({ preventScroll: true });
        } else {
          panel!.focus({ preventScroll: true });
        }
        if (animate) {
          if (revealTimer) clearTimeout(revealTimer);
          list!.classList.remove("in");
          void list!.offsetWidth;
          revealTimer = setTimeout(() => list!.classList.add("in"), 20);
        }
      }
      function close(returnFocus: boolean) {
        if (menu!.hidden) return;
        btn!.setAttribute("aria-expanded", "false");
        root!.classList.remove("menu-open");
        if (reduceMotion) {
          menu!.hidden = true;
        } else {
          menu!.classList.add("is-closing");
          timer = setTimeout(() => {
            menu!.hidden = true;
            menu!.classList.remove("is-closing");
            if (animate) list!.classList.remove("in");
          }, 380);
        }
        if (returnFocus) btn!.focus({ preventScroll: true });
      }
      const onBtn = (e: MouseEvent) => open(e);
      btn.addEventListener("click", onBtn);
      const onMenuClick = (e: Event) => {
        const t = e.target as HTMLElement;
        if (t.closest("[data-close]")) close(true);
        else if (t.closest("nav a")) close(false);
      };
      menu.addEventListener("click", onMenuClick);
      const onKey = (e: KeyboardEvent) => {
        if (menu.hidden) return;
        if (e.key === "Escape") {
          close(true);
          return;
        }
        if (e.key === "Tab") {
          const f = focusables();
          const first = f[0];
          const last = f[f.length - 1];
          if (e.shiftKey && document.activeElement === first) {
            e.preventDefault();
            last.focus();
          } else if (!e.shiftKey && document.activeElement === last) {
            e.preventDefault();
            first.focus();
          }
        }
      };
      document.addEventListener("keydown", onKey);
      const mq = window.matchMedia("(min-width:769px)");
      const onMq = (m: MediaQueryListEvent) => {
        if (m.matches) close(false);
      };
      mq.addEventListener("change", onMq);
      cleanups.push(() => {
        btn.removeEventListener("click", onBtn);
        menu.removeEventListener("click", onMenuClick);
        document.removeEventListener("keydown", onKey);
        mq.removeEventListener("change", onMq);
        if (timer) clearTimeout(timer);
        if (revealTimer) clearTimeout(revealTimer);
      });
    })();

    // ---------- Smooth in-page anchor scroll ----------
    (function smoothScroll() {
      if (reduceMotion) return;
      const SCROLL = { base: 900, perPixel: 0.12, max: 1800 };
      function scrollTo(y: number) {
        const start = window.scrollY;
        const dist = y - start;
        if (Math.abs(dist) < 2) {
          window.scrollTo(0, y);
          return;
        }
        const dur = Math.min(
          SCROLL.max,
          SCROLL.base + Math.abs(dist) * SCROLL.perPixel,
        );
        let t0: number | null = null;
        let stop = false;
        const cancel = () => {
          stop = true;
        };
        (["wheel", "touchstart", "keydown"] as const).forEach((ev) =>
          window.addEventListener(ev, cancel, { once: true, passive: true }),
        );
        function ease(p: number) {
          return p < 0.5
            ? 4 * p * p * p
            : 1 - Math.pow(-2 * p + 2, 3) / 2;
        }
        function step(ts: number) {
          if (stop) return;
          if (t0 === null) t0 = ts;
          const p = Math.min(1, (ts - t0) / dur);
          window.scrollTo(0, start + dist * ease(p));
          if (p < 1) requestAnimationFrame(step);
        }
        requestAnimationFrame(step);
      }
      const onClick = (e: MouseEvent) => {
        const a = (e.target as HTMLElement)?.closest?.(
          'a[href^="#"]',
        ) as HTMLAnchorElement | null;
        if (
          !a ||
          e.metaKey ||
          e.ctrlKey ||
          e.shiftKey ||
          a.getAttribute("href") === "#"
        )
          return;
        const href = a.getAttribute("href") || "";
        const id = href.slice(1);
        if (!id) return;
        const el = root.querySelector<HTMLElement>(`#${CSS.escape(id)}`);
        if (!el) return;
        e.preventDefault();
        const y = Math.min(
          el.getBoundingClientRect().top + window.scrollY,
          document.documentElement.scrollHeight - window.innerHeight,
        );
        scrollTo(Math.max(0, y));
        try {
          history.pushState(null, "", "#" + id);
        } catch {
          // ignore
        }
      };
      root.addEventListener("click", onClick);
      cleanups.push(() => root.removeEventListener("click", onClick));
    })();

    return () => {
      cleanups.forEach((f) => {
        try {
          f();
        } catch {
          // ignore
        }
      });
    };
  }, []);

  return (
    <div ref={rootRef} className="hp2" id="top">
      <header className="site-header">
        <div className="container">
          <nav className="nav" aria-label="Main">
            <a className="logo" href="#top">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                className="logo-dark"
                src={`${ASSET}/logo-dark.svg`}
                alt="Epoch Lag"
              />
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                className="logo-light"
                src={`${ASSET}/logo-light.svg`}
                alt="Epoch Lag"
              />
            </a>
            <div className="nav-links">
              <a href="#newsletter">Newsletter</a>
              <a href="/contact">Contact Us</a>
              <a
                className="btn"
                href={APP_STORE_URL}
                onClick={handleGetAppClick}
              >
                Get the app
              </a>
              <a className="account" href="/login" aria-label="Account">
                <svg viewBox="0 0 24 24" fill="#232323">
                  <circle cx="12" cy="7.5" r="4.5" />
                  <path d="M3.5 21c0-4.4 3.8-7.5 8.5-7.5s8.5 3.1 8.5 7.5z" />
                </svg>
              </a>
            </div>
            <button
              className="menu-toggle"
              type="button"
              aria-expanded="false"
              aria-controls="mobile-menu"
              aria-haspopup="dialog"
              aria-label="Open menu"
            >
              <span />
              <span />
              <span />
            </button>
          </nav>
        </div>
        <div className="mobile-menu" id="mobile-menu" hidden>
          <div className="mobile-menu-backdrop" data-close />
          <div
            className="mobile-menu-panel"
            role="dialog"
            aria-modal="true"
            aria-label="Menu"
            tabIndex={-1}
          >
            <button
              className="mobile-menu-close"
              type="button"
              aria-label="Close menu"
              data-close
            >
              <svg viewBox="0 0 12 12" aria-hidden="true">
                <path
                  d="M1.5 1.5l9 9M10.5 1.5l-9 9"
                  stroke="#111"
                  strokeWidth={1.6}
                  strokeLinecap="round"
                />
              </svg>
            </button>
            <nav aria-label="Mobile">
              <a href="/login">Login</a>
              <a href="#newsletter">Newsletter</a>
              <a href="/contact">Contact</a>
            </nav>
          </div>
        </div>
      </header>

      <main>
        {/* Hero */}
        <section className="hero">
          <div className="container">
            <h1>Capture family stories before they are lost.</h1>
            <div className="badges">
              <a
                className="badge"
                href={APP_STORE_URL}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Download on the App Store"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={`${ASSET}/app-store-badge.png`} alt="" />
              </a>
              <a
                className="badge"
                href={PLAY_STORE_URL}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Get it on Google Play"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={`${ASSET}/play-store-badge.png`} alt="" />
              </a>
            </div>
            <a
              className="btn btn--mobile"
              href={APP_STORE_URL}
              onClick={handleGetAppClick}
            >
              Get the app
            </a>
            <div className="hero-media">
              <video
                ref={videoRef}
                src={`${ASSET}/hero.mp4`}
                autoPlay
                muted
                loop
                playsInline
                preload="auto"
                aria-label="Home-movie footage of a young girl smiling at an outdoor family table at dusk"
              />
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                className="hero-poster"
                src={`${ASSET}/hero-poster.jpg`}
                alt=""
                aria-hidden="true"
              />
              <button
                className="video-toggle"
                type="button"
                aria-label="Pause video"
                aria-pressed="false"
              >
                <svg className="i-pause" viewBox="0 0 16 16" aria-hidden="true">
                  <rect x="3.5" y="2.5" width="3" height="11" rx="1" />
                  <rect x="9.5" y="2.5" width="3" height="11" rx="1" />
                </svg>
                <svg className="i-play" viewBox="0 0 16 16" aria-hidden="true">
                  <path d="M4.5 2.6v10.8L13 8z" />
                </svg>
              </button>
            </div>
          </div>
        </section>

        {/* Built for the stories */}
        <section className="built">
          <div className="container">
            <div className="built-copy">
              <h2>Built for the stories behind the photos</h2>
              <p>Photos show what happened. Your family remembers why.</p>
              <ul className="checklist">
                {CHECKLIST.map((item) => (
                  <li key={item}>
                    <CheckMark />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
            <div className="phone-stage">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                className="phone-img"
                src={`${ASSET}/phone-card.webp`}
                alt="App screen: Nathalie Brown asks, “Mom, what was the name of your first pet?”, answered with a photo of a smiling girl hugging a dog"
              />
            </div>
          </div>
        </section>

        {/* Statement */}
        <section className="statement">
          <div className="statement-bg" aria-hidden="true" />
          <p>
            Your family has stories you’ve never heard.
            <br />
            We help you remember.
          </p>
        </section>

        {/* How it works */}
        <section className="how">
          <div className="container how-grid">
            <div className="how-item">
              <div className="how-visual">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  className="vis-inspo"
                  src={`${ASSET}/vis-inspo.webp`}
                  alt="Prompt card: Adventure. What’s the most spontaneous trip you’ve ever made?"
                />
              </div>
              <h3>Ask Questions</h3>
              <p>Pick from inspiration prompts or write your own.</p>
            </div>
            <div className="how-item">
              <div className="how-visual">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  className="vis-rings"
                  src={`${ASSET}/vis-rings.webp`}
                  alt=""
                />
              </div>
              <h3>Collect &amp; Share Stories</h3>
              <p>They answer it their way. A voice note, a photo or a few words.</p>
            </div>
            <div className="how-item">
              <div className="how-visual">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  className="vis-chips"
                  src={`${ASSET}/vis-chips.webp`}
                  alt="Archive filters: Places, Sent, Timeline, Received, All, People"
                />
              </div>
              <h3>Grow Your Family Archive</h3>
              <p>Every answer is kept, sorted and easy to find by people, places or time.</p>
            </div>
          </div>
        </section>

        {/* Daily inspirations */}
        <section className="daily">
          <div className="container">
            <div className="daily-copy">
              <h2>Daily Inspirations</h2>
              <p>
                Every day, the home screen gives you something to tell, or
                something to ask.
              </p>
              <ul>
                {DAILY_BULLETS.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
              <a
                className="btn"
                href={APP_STORE_URL}
                onClick={handleGetAppClick}
              >
                Get the app
              </a>
            </div>
            <div className="daily-collage">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={`${ASSET}/daily-collage.webp`}
                alt="Home screen highlights: a Day in Review photo from 3 years ago, the Daily Lag prompt “What made you laugh today?”, and a map of places you’ve been"
              />
            </div>
            <a
              className="btn btn--mobile"
              href={APP_STORE_URL}
              onClick={handleGetAppClick}
            >
              Get the app
            </a>
          </div>
        </section>

        {/* About */}
        <section className="about">
          <div className="container">
            <div>
              <h2>
                Epoch Lag:
                <br />
                Stories that connect
              </h2>
              <div className="about-body">
                <p className="pron">[Pronounced: ˈe-pək’ lag; or epic lag]</p>
                <p>
                  The intentional pause between eras, not rushing into the next
                  epoch, but lingering to absorb lessons, memories, or meaning
                  from the last.
                </p>
                <p>
                  Epoch Lag is your digital haven to create, connect, and
                  cherish. Whether it’s sharing everyday moments or preserving
                  unforgettable memories, we make it easy to stay close to the
                  people who matter most.
                </p>
                <p>
                  We are and will always be: private, secure. Our mission is
                  simple: to inspire meaningful storytelling and effortless
                  connection, helping you turn life’s moments into lasting
                  memories.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Testimonials */}
        <section className="reviews">
          <div className="container">
            <h2>What people say</h2>
            <div className="review-grid">
              {REVIEWS.map((r) => (
                <figure className="review" key={r.author}>
                  <div
                    className="stars"
                    role="img"
                    aria-label="5 out of 5 stars"
                  >
                    <Star />
                    <Star />
                    <Star />
                    <Star />
                    <Star />
                  </div>
                  <blockquote>{r.quote}</blockquote>
                  <figcaption>{r.author}</figcaption>
                </figure>
              ))}
            </div>
          </div>
        </section>

        {/* FAQ */}
        <section className="faq" id="contact">
          <div className="container">
            <div className="faq-intro">
              <h2>FAQs</h2>
              <p>
                If you have more questions please contact us and we’ll be happy
                to answer them.
              </p>
              <a className="btn" href="/contact">
                Contact
              </a>
            </div>
            <div className="faq-list">
              {FAQS.map((item) => (
                <details key={item.q}>
                  <summary>
                    {item.q}
                    <PlusIcon />
                  </summary>
                  <div className="faq-a">{item.a}</div>
                </details>
              ))}
            </div>
          </div>
        </section>

        {/* Newsletter */}
        <section className="loop" id="newsletter">
          <div className="container">
            <div>
              <h2>Stay in the loop</h2>
              <p>
                Get our latest updates and ideas delivered now and then. No
                spam, unsubscribe anytime.
              </p>
              <a className="arrow-link" href="/newsletters">
                <span>View our Newsletter</span>
                <svg
                  viewBox="0 0 16 12"
                  fill="none"
                  stroke="#232323"
                  strokeWidth={1.4}
                >
                  <path d="M0 6h14.5M10 1.5L14.5 6 10 10.5" />
                </svg>
              </a>
            </div>
            <form className="signup" onSubmit={onNewsletterSubmit} noValidate>
              <label className="visually-hidden" htmlFor="email">
                Email address
              </label>
              <input
                id="email"
                name="email"
                type="email"
                placeholder="Email Address"
                autoComplete="email"
                required
                disabled={newsletterBusy}
              />
              <button className="btn" type="submit" disabled={newsletterBusy}>
                {newsletterBusy ? "Subscribing…" : "Subscribe"}
              </button>
            </form>
            {newsletterMsg && (
              <p
                style={{
                  gridColumn: "1 / -1",
                  marginTop: "12px",
                  fontSize: "14px",
                  color: "var(--ink-soft)",
                  textAlign: "center",
                }}
                role="status"
              >
                {newsletterMsg}
              </p>
            )}
            <a className="arrow-link arrow-link--mobile" href="/newsletters">
              <span>View our Newsletter</span>
              <svg
                viewBox="0 0 16 12"
                fill="none"
                stroke="#232323"
                strokeWidth={1.4}
              >
                <path d="M0 6h14.5M10 1.5L14.5 6 10 10.5" />
              </svg>
            </a>
          </div>
        </section>

        {/* Final CTA */}
        <section className="cta" id="get-app">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            className="pol pol-left"
            src={`${ASSET}/cta-polaroid-left.webp`}
            alt=""
            aria-hidden="true"
          />
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            className="pol pol-right"
            src={`${ASSET}/cta-polaroid-right.webp`}
            alt=""
            aria-hidden="true"
          />
          <div className="container cta-inner">
            <h2>Start with one question</h2>
            <p>Download the app and start discovering your family’s stories.</p>
            <div className="badges">
              <a
                className="badge"
                href={APP_STORE_URL}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Download on the App Store"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={`${ASSET}/app-store-badge.png`} alt="" />
              </a>
              <a
                className="badge"
                href={PLAY_STORE_URL}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Get it on Google Play"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={`${ASSET}/play-store-badge.png`} alt="" />
              </a>
            </div>
            <div className="qr">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={`${ASSET}/qr-code.png`} alt="QR code to download the app" />
            </div>
            <p className="qr-caption">Scan to download the app on mobile</p>
            <a
              className="btn btn--mobile"
              href={APP_STORE_URL}
              onClick={handleGetAppClick}
            >
              Get the app
            </a>
          </div>
        </section>
      </main>

      <footer className="site-footer">
        <div className="container">
          <small>© 2026 Epoch Lag. All rights reserved.</small>
          <div className="socials">
            <a
              href="https://www.facebook.com/profile.php?id=61580265058728"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Epoch Lag on Facebook (opens in a new tab)"
            >
              <svg viewBox="0 0 24 24">
                <path d="M24 12a12 12 0 1 0-13.9 11.9v-8.4H7.1V12h3V9.4c0-3 1.8-4.7 4.5-4.7 1.3 0 2.7.2 2.7.2v3h-1.5c-1.5 0-2 .9-2 1.9V12h3.4l-.5 3.5h-2.9v8.4A12 12 0 0 0 24 12z" />
              </svg>
            </a>
            <a
              href="https://www.instagram.com/epoch_lag"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Epoch Lag on Instagram (opens in a new tab)"
            >
              <svg viewBox="0 0 24 24">
                <path d="M12 2.2c3.2 0 3.6 0 4.9.1 1.2.1 1.8.2 2.3.4a4.6 4.6 0 0 1 1.7 1.1 4.6 4.6 0 0 1 1.1 1.7c.2.5.4 1.1.4 2.3.1 1.3.1 1.7.1 4.9s0 3.6-.1 4.9c-.1 1.2-.2 1.8-.4 2.3a4.6 4.6 0 0 1-1.1 1.7 4.6 4.6 0 0 1-1.7 1.1c-.5.2-1.1.4-2.3.4-1.3.1-1.7.1-4.9.1s-3.6 0-4.9-.1c-1.2-.1-1.8-.2-2.3-.4a4.6 4.6 0 0 1-1.7-1.1 4.6 4.6 0 0 1-1.1-1.7c-.2-.5-.4-1.1-.4-2.3C2.2 15.6 2.2 15.2 2.2 12s0-3.6.1-4.9c.1-1.2.2-1.8.4-2.3a4.6 4.6 0 0 1 1.1-1.7 4.6 4.6 0 0 1 1.7-1.1c.5-.2 1.1-.4 2.3-.4 1.3-.1 1.7-.1 4.9-.1zm0 2c-3.1 0-3.5 0-4.7.1-1.1.1-1.7.2-2 .4-.5.2-.9.4-1.3.8-.4.4-.6.8-.8 1.3-.1.3-.3.9-.4 2-.1 1.2-.1 1.6-.1 4.7s0 3.5.1 4.7c.1 1.1.2 1.7.4 2 .2.5.4.9.8 1.3.4.4.8.6 1.3.8.3.1.9.3 2 .4 1.2.1 1.6.1 4.7.1s3.5 0 4.7-.1c1.1-.1 1.7-.2 2-.4.5-.2.9-.4 1.3-.8.4-.4.6-.8.8-1.3.1-.3.3-.9.4-2 .1-1.2.1-1.6.1-4.7s0-3.5-.1-4.7c-.1-1.1-.2-1.7-.4-2-.2-.5-.4-.9-.8-1.3-.4-.4-.8-.6-1.3-.8-.3-.1-.9-.3-2-.4-1.2-.1-1.6-.1-4.7-.1zm0 3.4a4.4 4.4 0 1 1 0 8.8 4.4 4.4 0 0 1 0-8.8zm0 2a2.4 2.4 0 1 0 0 4.8 2.4 2.4 0 0 0 0-4.8zm5.6-2.2a1 1 0 1 1-2 0 1 1 0 0 1 2 0z" />
              </svg>
            </a>
            <a
              href="https://www.linkedin.com/company/epoch-lag/"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Epoch Lag on LinkedIn (opens in a new tab)"
            >
              <svg viewBox="0 0 24 24">
                <path d="M19 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V5a2 2 0 0 0-2-2M8.339 18.338H5.667v-8.59h2.672zM7.004 8.574a1.548 1.548 0 1 1 0-3.096 1.548 1.548 0 0 1 0 3.096m11.335 9.764H15.67v-4.177c0-.996-.017-2.278-1.387-2.278-1.389 0-1.601 1.086-1.601 2.207v4.248h-2.667v-8.59h2.56v1.174h.037c.355-.675 1.227-1.387 2.524-1.387 2.704 0 3.203 1.778 3.203 4.092z" />
              </svg>
            </a>
          </div>
          <nav className="legal" aria-label="Legal">
            <a href="/privacy-policy">Privacy Policy</a>
            <a href="/terms-of-service">Terms of Service</a>
            <a href="/delete-account">Account deletion</a>
            <a href="/child-safety-policy">Child Safety Policy</a>
          </nav>
        </div>
      </footer>
    </div>
  );
}
