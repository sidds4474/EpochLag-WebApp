"use client";

import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type FormEvent,
} from "react";
import NewsletterMailFooter from "../../newsletters/NewsletterMailFooter";
import { subscribeToProgram } from "../../../lib/program-signup/api";
import "./page.css";

// Program-page source. Kebab-case, matches the backend list key — see
// Program signups — Frontend guide (Oct 27, 2026). Must stay stable;
// renaming it would split signups across two program lists.
const PROGRAM_SOURCE = "get-to-know-your-mother";

const ASSET = "/program/get-to-know-your-mom";

export default function Page() {
  const rootRef = useRef<HTMLDivElement>(null);
  const [formMsg, setFormMsg] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const input = (e.currentTarget.elements.namedItem(
      "email",
    ) as HTMLInputElement) ?? null;
    const email = (input?.value ?? "").trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setFormMsg("Enter a valid email address.");
      input?.focus();
      return;
    }
    setSubmitting(true);
    const res = await subscribeToProgram({
      email,
      source: PROGRAM_SOURCE,
    });
    setSubmitting(false);
    if (res.ok) {
      setFormMsg(res.message);
      if (input) input.value = "";
    } else {
      setFormMsg(res.message);
    }
  }

  // Use layout effect so DOM mutations (class toggles, baseline opacity:0)
  // land before the browser paints, matching the inline <head> script in the
  // original HTML.
  const useIsoLayoutEffect =
    typeof window !== "undefined" ? useLayoutEffect : useEffect;
  useIsoLayoutEffect(() => {
    const root = rootRef.current;
    if (!root) return;

    const reduceMotionMq = window.matchMedia?.(
      "(prefers-reduced-motion: reduce)",
    );
    const reduceMotion = !!reduceMotionMq?.matches;
    // Classes are already on the wrapper from render; keep this guarded for
    // reduce-motion so the headline splitter still runs (it tolerates no-op
    // transforms via the reduce-motion CSS override).
    root.classList.add("js-reveal");
    root.classList.add("js-lines");

    const cleanups: Array<() => void> = [];

    // ---------- Recording demo: scrolling waveform + timer ----------
    (function recordingDemo() {
      const btn = root.querySelector<HTMLButtonElement>("#rec-btn");
      const t = root.querySelector<HTMLElement>("#rec-time");
      const l = root.querySelector<HTMLElement>("#rec-label");
      const svg = root.querySelector<SVGSVGElement>(".wave-big");
      if (!btn || !t || !l || !svg) return;
      const NS = "http://www.w3.org/2000/svg";
      const STEP = 9,
        W = 291,
        H = 70,
        BAR = 3.6,
        SPEED = 34;
      const SIZES = [13, 13, 13, 47, 47, 47, 69, 69, 30];
      const heights = [
        13, 13, 13, 13, 47, 13, 13, 47, 69, 69, 13, 47, 47, 69, 13, 47, 13, 47,
        69, 47, 13, 47, 47, 69, 47, 13, 13, 13, 47, 69, 13, 13, 47, 13,
      ];
      let last = heights[heights.length - 1];
      function next() {
        let h;
        do {
          h = SIZES[Math.floor(Math.random() * SIZES.length)];
        } while (h === 69 && last === 69 && Math.random() < 0.6);
        last = h;
        return h;
      }
      svg.innerHTML = "";
      svg.setAttribute("viewBox", "0 0 " + W + " " + H);
      const rects = heights.map(() => {
        const r = document.createElementNS(NS, "rect");
        r.setAttribute("width", String(BAR));
        r.setAttribute("rx", String(BAR / 2));
        svg.appendChild(r);
        return r;
      });
      let offset = 0;
      function draw() {
        for (let i = 0; i < rects.length; i++) {
          const h = heights[i];
          rects[i].setAttribute("x", (i * STEP - offset).toFixed(2));
          rects[i].setAttribute("y", ((H - h) / 2).toFixed(1));
          rects[i].setAttribute("height", String(h));
        }
      }
      draw();
      let recording = true,
        visible = false,
        secs = 34,
        acc = 0,
        prev: number | null = null,
        raf: number | null = null;
      const fmt = (n: number) =>
        Math.floor(n / 60) + ":" + String(n % 60).padStart(2, "0");
      function tick(now: number) {
        if (prev === null) prev = now;
        const dt = Math.min((now - prev) / 1000, 0.1);
        prev = now;
        if (!reduceMotion) {
          offset += SPEED * dt;
          while (offset >= STEP) {
            offset -= STEP;
            heights.shift();
            heights.push(next());
          }
          draw();
        }
        acc += dt;
        if (acc >= 1) {
          acc -= 1;
          secs++;
          t!.textContent = fmt(secs);
        }
        raf = requestAnimationFrame(tick);
      }
      function update() {
        const go = recording && visible;
        if (go && !raf) {
          prev = null;
          raf = requestAnimationFrame(tick);
        }
        if (!go && raf) {
          cancelAnimationFrame(raf);
          raf = null;
        }
      }
      const onClick = () => {
        recording = !recording;
        btn.classList.toggle("paused", !recording);
        btn.setAttribute(
          "aria-label",
          recording ? "Pause recording" : "Resume recording",
        );
        l!.textContent = recording ? "Recording" : "Paused";
        update();
      };
      btn.addEventListener("click", onClick);
      const io =
        "IntersectionObserver" in window
          ? new IntersectionObserver(
              (es) => {
                visible = es[0].isIntersecting;
                update();
              },
              { threshold: 0.2 },
            )
          : null;
      if (io) io.observe(svg);
      else {
        visible = true;
        update();
      }
      const onVis = () => {
        if (document.hidden) {
          visible = false;
          update();
        }
      };
      document.addEventListener("visibilitychange", onVis);
      cleanups.push(() => {
        btn.removeEventListener("click", onClick);
        document.removeEventListener("visibilitychange", onVis);
        if (io) io.disconnect();
        if (raf) cancelAnimationFrame(raf);
      });
    })();

    // ---------- Hero video: slower playback, retry autoplay ----------
    (function heroVideo() {
      const v = root.querySelector<HTMLVideoElement>("#hero-video");
      if (!v) return;
      const RATE = 0.8;
      v.defaultPlaybackRate = RATE;
      v.playbackRate = RATE;
      const onMeta = () => {
        v.playbackRate = RATE;
      };
      const onPlay = () => {
        if (v.playbackRate !== RATE) v.playbackRate = RATE;
      };
      v.addEventListener("loadedmetadata", onMeta);
      v.addEventListener("play", onPlay);
      if (reduceMotion) {
        v.removeAttribute("autoplay");
        v.pause();
      } else {
        const p = v.play();
        if (p && (p as Promise<void>).catch) (p as Promise<void>).catch(() => {});
      }
      cleanups.push(() => {
        v.removeEventListener("loadedmetadata", onMeta);
        v.removeEventListener("play", onPlay);
      });
    })();

    // ---------- Scroll reveal + how-it-works gate ----------
    const howGate = (function () {
      let done = false;
      const q: Array<() => void> = [];
      const g: {
        play: null | (() => void);
        open: () => void;
        after: (f: () => void) => void;
      } = {
        play: null,
        open() {
          if (done) return;
          done = true;
          q.splice(0).forEach((f) => f());
        },
        after(f: () => void) {
          if (done) return f();
          q.push(f);
          if (g.play) g.play();
        },
      };
      return g;
    })();

    (function scrollReveal() {
      const groups: Array<[string, number?]> = [
        [".card", 0.12],
        [".kitchen .copy p"],
        [".rec-phone"],
        [".how .pill"],
        [".archive .copy p"],
        [".phone", 0.15],
        [".waitlist .copy p:not(.form-msg)"],
        [".waitlist .form"],
        [".snap.one"],
        [".snap.two", 0.15],
        [".snap-m"],
      ];
      const els: HTMLElement[] = [];
      groups.forEach((g) => {
        root.querySelectorAll<HTMLElement>(g[0]).forEach((el, i) => {
          el.classList.add("rv");
          el.style.setProperty(
            "--d",
            ((g[1] || 0) * i + (/copy p|form/.test(g[0]) ? 0.3 : 0)) + "s",
          );
          els.push(el);
        });
      });
      if (reduceMotion || !("IntersectionObserver" in window)) {
        els.forEach((el) => el.classList.add("in"));
        return;
      }
      const io = new IntersectionObserver(
        (entries) => {
          entries.forEach((e) => {
            if (e.isIntersecting || e.boundingClientRect.top < 0) {
              const t = e.target as HTMLElement;
              io.unobserve(t);
              const go = () => t.classList.add("in");
              if (t.closest(".archive")) howGate.after(go);
              else go();
            }
          });
        },
        { rootMargin: "0px 0px -10% 0px", threshold: 0.12 },
      );
      els.forEach((el) => io.observe(el));
      cleanups.push(() => io.disconnect());
    })();

    // ---------- Kitchen parallax ----------
    (function parallax() {
      const k = root.querySelector<HTMLElement>(".kitchen");
      if (!k) return;
      if (reduceMotion) return;
      let base = "50%",
        ticking = false,
        up = 130,
        down = 130;
      const RATE = 0.34,
        MAX = 130,
        IMG = 2880 / 1664;
      function measure() {
        k!.style.backgroundPositionY = "";
        const cs = getComputedStyle(k!);
        base = cs.backgroundPositionY || "50%";
        const W = k!.clientWidth,
          H = k!.clientHeight,
          size = cs.backgroundSize;
        let rh = Math.max(W / IMG, H);
        const mx = size.match(/max\(100%,\s*([\d.]+)px\)/);
        if (mx) {
          rh = Math.max(W, parseFloat(mx[1])) / IMG;
        } else if (size.indexOf("cover") > -1) {
          rh = Math.max(W / IMG, H);
        } else {
          const m = size.match(/([\d.]+)%\s*$/);
          rh = m ? (H * parseFloat(m[1])) / 100 : Math.max(W / IMG, H);
        }
        const slack = Math.max(0, rh - H),
          f = (parseFloat(base) || 50) / 100;
        up = Math.min(MAX, slack * f - 2);
        down = Math.min(MAX, slack * (1 - f) - 2);
        update();
      }
      function update() {
        ticking = false;
        const r = k!.getBoundingClientRect(),
          vh = window.innerHeight;
        if (r.bottom < -200 || r.top > vh + 200) return;
        let off = (r.top + r.height / 2 - vh / 2) * -RATE;
        off = Math.max(-Math.max(0, down), Math.min(Math.max(0, up), off));
        k!.style.backgroundPositionY =
          "calc(" + base + " + " + off.toFixed(1) + "px)";
      }
      const onScroll = () => {
        if (!ticking) {
          ticking = true;
          requestAnimationFrame(update);
        }
      };
      window.addEventListener("scroll", onScroll, { passive: true });
      window.addEventListener("resize", measure);
      measure();
      cleanups.push(() => {
        window.removeEventListener("scroll", onScroll);
        window.removeEventListener("resize", measure);
      });
    })();

    // ---------- Editorial headline reveal ----------
    (function headlineLines() {
      if (!root.classList.contains("js-lines")) return;
      const heads = Array.from(
        root.querySelectorAll<HTMLElement>(".hero h1, main h2"),
      );
      const heroFollow: Array<[HTMLElement | null, number]> = [
        [root.querySelector<HTMLElement>(".hero .lede"), 0.45],
        [root.querySelector<HTMLElement>(".hero .hero-form"), 0.75],
        [root.querySelector<HTMLElement>(".hero-photo"), 1.15],
      ].filter((x) => x[0]) as Array<[HTMLElement, number]>;
      heroFollow.forEach((x) => {
        x[0]!.classList.add("rv");
        x[0]!.style.setProperty("--d", x[1] + "s");
      });
      const srcMap = new WeakMap<HTMLElement, string>();
      heads.forEach((h) => srcMap.set(h, h.innerHTML));
      function split(h: HTMLElement) {
        h.innerHTML = srcMap.get(h) || "";
        const words: HTMLSpanElement[] = [];
        Array.from(h.childNodes).forEach((n) => {
          if (n.nodeType !== 3) return;
          const frag = document.createDocumentFragment();
          (n.textContent || "").split(/(\s+)/).forEach((part) => {
            if (!part) return;
            if (/^\s+$/.test(part)) {
              frag.appendChild(document.createTextNode(part));
              return;
            }
            const w = document.createElement("span");
            w.textContent = part;
            frag.appendChild(w);
            words.push(w);
          });
          h.replaceChild(frag, n);
        });
        const lines: string[][] = [];
        let top: number | null = null;
        words.forEach((w) => {
          const t = w.offsetTop;
          if (top === null || Math.abs(t - top) > 4) {
            lines.push([]);
            top = t;
          }
          lines[lines.length - 1].push(w.textContent || "");
        });
        h.textContent = "";
        lines.forEach((ws, i) => {
          const ln = document.createElement("span");
          ln.className = "ln";
          const inner = document.createElement("span");
          inner.className = "ln-i";
          inner.textContent = ws.join(" ");
          inner.style.setProperty("--ld", i * 0.09 + "s");
          ln.appendChild(inner);
          h.appendChild(ln);
        });
        h.classList.add("ln-ready");
      }
      function splitAll() {
        heads.forEach(split);
      }
      const ready =
        (document as unknown as { fonts?: { ready: Promise<unknown> } }).fonts
          ?.ready || Promise.resolve();
      let io: IntersectionObserver | null = null;
      let onResize: (() => void) | null = null;
      ready.then(() => {
        splitAll();
        const h1 = root.querySelector<HTMLElement>(".hero h1");
        if (h1)
          requestAnimationFrame(() =>
            requestAnimationFrame(() => {
              h1.classList.add("is-in");
              heroFollow.forEach((x) => x[0]!.classList.add("in"));
            }),
          );
        if ("IntersectionObserver" in window) {
          io = new IntersectionObserver(
            (es) => {
              es.forEach((e) => {
                if (e.isIntersecting || e.boundingClientRect.top < 0) {
                  const t = e.target as HTMLElement;
                  io!.unobserve(t);
                  const go = () => t.classList.add("is-in");
                  if (t.closest(".archive")) howGate.after(go);
                  else go();
                }
              });
            },
            { rootMargin: "0px 0px -12% 0px", threshold: 0.2 },
          );
          heads.forEach((h) => {
            if (h !== h1) io!.observe(h);
          });
        } else heads.forEach((h) => h.classList.add("is-in"));
        let lastW = window.innerWidth;
        let timer: ReturnType<typeof setTimeout> | null = null;
        onResize = () => {
          if (timer) clearTimeout(timer);
          timer = setTimeout(() => {
            if (window.innerWidth !== lastW) {
              lastW = window.innerWidth;
              splitAll();
            }
          }, 150);
        };
        window.addEventListener("resize", onResize);
      });
      cleanups.push(() => {
        if (io) io.disconnect();
        if (onResize) window.removeEventListener("resize", onResize);
      });
    })();

    // ---------- How-it-works sequencer ----------
    (function howSequencer() {
      const howEl = root.querySelector<HTMLElement>(".how");
      if (!howEl) {
        howGate.open();
        return;
      }
      if (reduceMotion) {
        howGate.open();
        return;
      }
      const how: HTMLElement = howEl;
      how.classList.add("seq");
      const steps = Array.from(how.querySelectorAll<HTMLElement>(".step"));
      const T0 = 0.2;
      let played = false;
      function bez(a: number, b: number, c: number, d: number) {
        return (p: number) => {
          let lo = 0,
            hi = 1,
            t = 0,
            x = 0;
          for (let i = 0; i < 30; i++) {
            t = (lo + hi) / 2;
            x =
              3 * a * t * (1 - t) * (1 - t) +
              3 * c * t * t * (1 - t) +
              t * t * t;
            if (x < p) lo = t;
            else hi = t;
          }
          return (
            3 * b * t * (1 - t) * (1 - t) + 3 * d * t * t * (1 - t) + t * t * t
          );
        };
      }
      function timeAt(p: number) {
        let lo = 0,
          hi = 1,
          m = 0;
        const f = bez(0.45, 0.05, 0.35, 1);
        for (let i = 0; i < 30; i++) {
          m = (lo + hi) / 2;
          if (f(m) < p) lo = m;
          else hi = m;
        }
        return m;
      }
      function set(el: HTMLElement, k: string, v: number) {
        el.style.setProperty(k, v.toFixed(3) + "s");
      }
      function schedule() {
        const w = window.innerWidth;
        if (w <= 600) {
          steps.forEach((s, i) => {
            const t = T0 + i * 0.32;
            set(s, "--tdel", t);
            set(s, "--ldel", t + 0.2);
            set(s, "--ldur", 0.45);
            s.style.setProperty("--lease", "cubic-bezier(.45,.05,.35,1)");
          });
        } else if (w <= 1100) {
          const ROW = 0.7;
          [0, 1].forEach((r) => {
            const a = steps[r],
              b = steps[r + 2];
            if (!a || !b) return;
            const ra = a.getBoundingClientRect(),
              rb = b.getBoundingClientRect(),
              L = ra.left,
              W = rb.right - ra.left,
              base = T0 + r * ROW * 0.75;
            [a, b].forEach((s, j) => {
              const rc = s.getBoundingClientRect();
              set(s, "--ldel", base + ((rc.left - L) / W) * ROW);
              set(s, "--ldur", (rc.width / W) * ROW);
              const dotX = rc.left + rc.width * (j ? 0.623 : 0.5),
                t = base + ((dotX - L) / W) * ROW;
              set(s, "--ddel", t);
              set(s, "--tdel", t + 0.08);
            });
          });
        } else {
          const line = how.querySelector<HTMLElement>(".timeline")!;
          const lr = line.getBoundingClientRect(),
            DUR = 0.9;
          set(line, "--del", T0);
          set(line, "--dur", DUR);
          steps.forEach((s) => {
            const r = s.getBoundingClientRect(),
              p = (r.left + r.width / 2 - lr.left) / lr.width,
              t = T0 + DUR * timeAt(Math.max(0, Math.min(1, p)));
            set(s, "--ddel", t);
            set(s, "--tdel", t + 0.08);
          });
        }
      }
      function play() {
        if (played) return;
        played = true;
        schedule();
        const hh = how.querySelector<HTMLElement>("h2"),
          pl = how.querySelector<HTMLElement>(".pill");
        if (hh) hh.classList.add("is-in");
        if (pl) pl.classList.add("in");
        requestAnimationFrame(() => how.classList.add("is-playing"));
        let end = 0;
        steps.forEach((s) => {
          end = Math.max(
            end,
            parseFloat(s.style.getPropertyValue("--tdel")) || 0,
          );
        });
        setTimeout(howGate.open, (end + 0.35) * 1000);
      }
      howGate.play = play;
      if ("IntersectionObserver" in window) {
        const target = how.querySelector<HTMLElement>("h2") || how;
        const io = new IntersectionObserver(
          (es) => {
            es.forEach((e) => {
              if (e.isIntersecting || e.boundingClientRect.top < 0) {
                play();
                io.disconnect();
              }
            });
          },
          { rootMargin: "0px 0px -4% 0px", threshold: 0 },
        );
        io.observe(target);
        cleanups.push(() => io.disconnect());
      } else play();
    })();

    return () => {
      cleanups.forEach((f) => {
        try {
          f();
        } catch {}
      });
    };
  }, []);

  return (
    <>
      <div ref={rootRef} className="program-mom js-reveal js-lines">
        <header className="hero wrap">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            className="logo"
            src={`${ASSET}/logo.svg`}
            alt="Epoch Lag"
            width={213}
            height={37}
          />
          <h1>
            Get to know your Mom, <br />
            one question at a time.
          </h1>
          <p className="lede">
            You send the questions. She answers them. Her stories gather into a
            digital archive you&rsquo;ll keep forever.
          </p>
          <form
            className="form hero-form"
            id="wl-hero"
            noValidate
            onSubmit={onSubmit}
          >
            <label htmlFor="email-hero">Email</label>
            <input
              id="email-hero"
              type="email"
              name="email"
              placeholder="Email"
              autoComplete="email"
              required
              disabled={submitting}
            />
            <button type="submit" disabled={submitting}>
              {submitting ? "Joining…" : "Join the waitlist"}
            </button>
          </form>
          <p className="form-msg" id="wl-msg-hero" role="status">
            {formMsg}
          </p>
          <div className="hero-photo">
            <video
              id="hero-video"
              src={`${ASSET}/hero.mp4`}
              poster={`${ASSET}/hero-poster.jpg`}
              autoPlay
              muted
              loop
              playsInline
              preload="auto"
              aria-label="Looping home-movie footage: a smiling woman with curly auburn hair waves at the camera while holding a dark-haired toddler in front of a white clapboard house."
            />
          </div>
        </header>

        <main>
          <section className="ask wrap" aria-labelledby="ask-title">
            <h2 id="ask-title">
              Ask the questions you <br />
              never thought of asking
            </h2>
            <div className="cards">
              <figure className="card" style={{ margin: 0 }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={`${ASSET}/card-1-van.webp`}
                  alt="Polaroid of a vintage van driving along a winding dirt road through a pine-dotted mountain valley."
                />
                <p>
                  What&rsquo;s the most spontaneous trip or <br />
                  decision you&rsquo;ve ever made?
                </p>
              </figure>
              <figure
                className="card"
                style={{ marginLeft: 0, marginRight: 0, marginBottom: 0 }}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={`${ASSET}/card-2-beach.webp`}
                  alt="Polaroid of a young girl in a sun hat looking back over her shoulder at the beach while a man walks ahead into the water, hands clasped behind his back."
                />
                <p>
                  What&rsquo;s a day from your past you&rsquo;d <br />
                  happily live again?
                </p>
              </figure>
              <figure className="card" style={{ margin: 0 }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={`${ASSET}/card-3-dog.webp`}
                  alt="Polaroid of a laughing teenage girl in a red sweater hugging a big shaggy brown dog beside a window."
                />
                <p>
                  Did you have a pet growing up? <br />
                  What was it like?
                </p>
              </figure>
              <figure className="card" style={{ margin: 0 }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={`${ASSET}/card-4-snow.webp`}
                  alt="Polaroid of a smiling boy in a knit hat and winter jacket sitting on an orange snow sled on a busy ski slope."
                />
                <p>
                  <span className="q-desktop">
                    What did you like doing the most <br />
                    as a kid?
                  </span>
                  <span className="q-mobile">
                    What&rsquo;s a day from your past you&rsquo;d <br />
                    happily live again?
                  </span>
                </p>
              </figure>
            </div>
          </section>

          <section className="kitchen" aria-labelledby="kitchen-title">
            <span
              className="sr-only"
              role="img"
              aria-label="Background: grainy film photo of jagged grey-green mountain peaks under a pale blue sky."
            />
            <div className="wrap" style={{ height: "100%" }}>
              <div className="copy">
                <h2 id="kitchen-title">
                  Just like telling stories <br />
                  at the kitchen table
                </h2>
                <p>
                  She can answer with a voice message, a photo, a video or a
                  few typed words. Whatever feels easiest, one tap away.
                </p>
              </div>
              <div
                className="rec-phone"
                role="img"
                aria-label="App recording screen showing a voice answer being recorded"
              >
                <svg
                  className="wave-big"
                  viewBox="0 0 291 70"
                  aria-hidden="true"
                />
                <p className="rec-label" id="rec-label">
                  Recording
                </p>
                <div className="rec-row">
                  <button
                    className="icon-btn trash"
                    aria-label="Delete recording"
                    tabIndex={-1}
                  >
                    <svg viewBox="0 0 24 24">
                      <path d="M4 6h16M9 6V4h6v2M6 6l1 14h10l1-14M10 10v6M14 10v6" />
                    </svg>
                  </button>
                  <span className="time" id="rec-time">
                    0:34
                  </span>
                  <button
                    className="icon-btn next"
                    aria-label="Send"
                    tabIndex={-1}
                  >
                    <svg viewBox="0 0 32 32">
                      <circle cx="16" cy="16" r="13" />
                      <path d="M10 16h12M17 11l5 5-5 5" />
                    </svg>
                  </button>
                </div>
                <div className="rec-tools">
                  <button className="icon-btn" aria-label="Video" tabIndex={-1}>
                    <svg viewBox="0 0 24 24" style={{ width: "33px" }}>
                      <rect x="2" y="6" width="14" height="12" rx="2" />
                      <path d="M16 10l6-3v10l-6-3" />
                    </svg>
                  </button>
                  <button className="icon-btn" aria-label="Photo" tabIndex={-1}>
                    <svg viewBox="0 0 24 24">
                      <rect x="3" y="3" width="18" height="18" rx="2" />
                      <circle cx="9" cy="9" r="2" />
                      <path d="M21 15l-5-5L5 21" />
                    </svg>
                  </button>
                  <button
                    className="record"
                    id="rec-btn"
                    aria-label="Pause recording"
                  >
                    <span>
                      <i />
                    </span>
                  </button>
                  <button className="icon-btn" aria-label="Text" tabIndex={-1}>
                    <svg viewBox="0 0 24 24">
                      <path d="M5 5h14M12 5v15M9 20h6M5 5v2M19 5v2" />
                    </svg>
                  </button>
                  <button className="icon-btn" aria-label="Music" tabIndex={-1}>
                    <svg viewBox="0 0 24 24">
                      <path d="M9 18V5l11-2v13" />
                      <circle cx="6" cy="18" r="3" />
                      <circle cx="17" cy="16" r="3" />
                    </svg>
                  </button>
                </div>
              </div>
            </div>
          </section>

          <section className="how wrap" aria-labelledby="how-title">
            <span className="pill">HOW IT WORKS</span>
            <h2 id="how-title">
              Four steps. <br className="br-m" />A lifetime of stories.
            </h2>
            <div className="timeline">
              <ol className="steps">
                <li className="step">
                  <div className="num">01</div>
                  <h3>Invite Her</h3>
                  <p>
                    Choose from our selection of <br />
                    inspiration prompts or write your own.
                  </p>
                </li>
                <li className="step">
                  <div className="num">02</div>
                  <h3>Choose Categories</h3>
                  <p>
                    Pick topics like childhood, <br />
                    family, work or travel.
                  </p>
                </li>
                <li className="step">
                  <div className="num">03</div>
                  <h3>Send questions</h3>
                  <p>
                    Start with our suggestions, then <br />
                    add your own.
                  </p>
                </li>
                <li className="step">
                  <div className="num">04</div>
                  <h3>Grow Your Archive</h3>
                  <p>
                    Every answer is saved, and you get <br />a digital archive
                    of her stories.
                  </p>
                </li>
              </ol>
            </div>
          </section>

          <section className="archive wrap" aria-labelledby="archive-title">
            <div className="copy">
              <h2 id="archive-title">
                Build a growing <br />
                archive of her life
              </h2>
              <p>
                Answer with a voice message, a photo, a video or a few typed
                words. Whatever feels easiest, one tap away.
              </p>
            </div>
            <div
              className="phones"
              role="group"
              aria-label="App preview: a list of saved stories, and the story Vancouver 1983 open in detail"
            >
              <div className="phone one">
                <div className="status">
                  <span>9:41</span>
                  <span className="r">
                    <svg viewBox="0 0 18 11">
                      <rect x="0" y="7" width="3" height="4" rx=".7" />
                      <rect x="5" y="5" width="3" height="6" rx=".7" />
                      <rect x="10" y="2.5" width="3" height="8.5" rx=".7" />
                      <rect x="15" y="0" width="3" height="11" rx=".7" />
                    </svg>
                    <svg viewBox="0 0 16 11">
                      <path
                        d="M8 10.5l2.2-2.6a3.3 3.3 0 0 0-4.4 0zM3.4 5.6a7 7 0 0 1 9.2 0l1.4-1.6a9.2 9.2 0 0 0-12 0zM0 2.7a12.2 12.2 0 0 1 16 0"
                        fill="#111"
                      />
                    </svg>
                    <svg viewBox="0 0 26 12">
                      <rect
                        x=".5"
                        y=".5"
                        width="22"
                        height="11"
                        rx="3"
                        fill="none"
                        stroke="#111"
                        opacity=".4"
                      />
                      <rect
                        x="2"
                        y="2"
                        width="19"
                        height="8"
                        rx="2"
                        fill="#111"
                      />
                      <path
                        d="M24 4v4a2 2 0 0 0 0-4z"
                        fill="#111"
                        opacity=".4"
                      />
                    </svg>
                  </span>
                </div>
                <div className="app-head">
                  <span className="round">
                    <svg viewBox="0 0 24 24">
                      <path d="M15 6l-6 6 6 6" />
                    </svg>
                  </span>
                  <h4>Lags</h4>
                  <span className="round sand">
                    <svg viewBox="0 0 24 24">
                      <path d="M12 5v14M5 12h14" />
                    </svg>
                  </span>
                </div>
                <div className="chips">
                  <span className="chip on">All</span>
                  <span className="chip">Timeline</span>
                  <span className="chip">Places</span>
                  <span className="chip">People</span>
                </div>
                <ul className="lags">
                  {[
                    {
                      thumb: "lag-1-ocean.jpg",
                      thumbAlt: "Dark ocean water rippling at night.",
                      title: "The Midnight Swim",
                      date: "Oct 18, 2026",
                      people: "lag-1-people.png",
                      peopleAlt:
                        "Profile photos of the 4 family members this story is shared with.",
                      saved: true,
                    },
                    {
                      thumb: "lag-2-dog.jpg",
                      thumbAlt: "A golden retriever looking out of a car window.",
                      title: "My Childhood dog",
                      date: "Sept 29, 2026",
                      people: "lag-2-people.png",
                      peopleAlt:
                        "Profile photos of the 4 family members this story is shared with.",
                      saved: true,
                    },
                    {
                      thumb: "lag-3-boat.jpg",
                      thumbAlt:
                        "A small red boat crossing a calm blue lake between hills.",
                      title: "Family Camping Trip 1995",
                      date: "Sept 20, 2026",
                      people: "lag-3-people.png",
                      peopleAlt:
                        "Profile photos of the 2 family members this story is shared with.",
                      saved: false,
                    },
                    {
                      thumb: "lag-4-river.jpg",
                      thumbAlt:
                        "A river winding through a green valley, framed by evergreen trees.",
                      title: "Vancouver 1983",
                      date: "Aug 14, 2026",
                      people: "lag-4-people.png",
                      peopleAlt:
                        "Profile photos of the 3 family members this story is shared with.",
                      saved: false,
                    },
                    {
                      thumb: "lag-5-karaoke.jpg",
                      thumbAlt:
                        "A young child in a blue sweater singing into a microphone.",
                      title: "Karaoke Night",
                      date: "Aug 02, 2026",
                      people: "lag-5-people.png",
                      peopleAlt:
                        "Profile photos of the 4 family members this story is shared with.",
                      saved: true,
                    },
                  ].map((l) => (
                    <li className="lag" key={l.title}>
                      <div className="thumb">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={`${ASSET}/${l.thumb}`} alt={l.thumbAlt} />
                      </div>
                      <div>
                        <h5>{l.title}</h5>
                        <time>{l.date}</time>
                      </div>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        className="people"
                        src={`${ASSET}/${l.people}`}
                        alt={l.peopleAlt}
                      />
                      <div className="acts">
                        <svg
                          viewBox="0 0 24 24"
                          role="img"
                          aria-label={l.saved ? "Saved" : "Not saved"}
                          className={l.saved ? "saved" : ""}
                        >
                          <path d="M6 3h12v18l-6-4.5L6 21z" />
                        </svg>
                        <svg viewBox="0 0 24 24">
                          <path d="M21 3L10 14M21 3l-7 18-4-7-7-4z" />
                        </svg>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
              <div className="phone two">
                <div className="status">
                  <span>9:41</span>
                  <span className="r">
                    <svg viewBox="0 0 18 11">
                      <rect x="0" y="7" width="3" height="4" rx=".7" />
                      <rect x="5" y="5" width="3" height="6" rx=".7" />
                      <rect x="10" y="2.5" width="3" height="8.5" rx=".7" />
                      <rect x="15" y="0" width="3" height="11" rx=".7" />
                    </svg>
                    <svg viewBox="0 0 16 11">
                      <path
                        d="M8 10.5l2.2-2.6a3.3 3.3 0 0 0-4.4 0zM3.4 5.6a7 7 0 0 1 9.2 0l1.4-1.6a9.2 9.2 0 0 0-12 0zM0 2.7a12.2 12.2 0 0 1 16 0"
                        fill="#111"
                      />
                    </svg>
                    <svg viewBox="0 0 26 12">
                      <rect
                        x=".5"
                        y=".5"
                        width="22"
                        height="11"
                        rx="3"
                        fill="none"
                        stroke="#111"
                        opacity=".4"
                      />
                      <rect
                        x="2"
                        y="2"
                        width="19"
                        height="8"
                        rx="2"
                        fill="#111"
                      />
                      <path
                        d="M24 4v4a2 2 0 0 0 0-4z"
                        fill="#111"
                        opacity=".4"
                      />
                    </svg>
                  </span>
                </div>
                <div className="app-head">
                  <span className="round">
                    <svg viewBox="0 0 24 24">
                      <path d="M15 6l-6 6 6 6" />
                    </svg>
                  </span>
                  <span className="round help">
                    <svg viewBox="0 0 24 24">
                      <circle cx="12" cy="12" r="9.5" />
                      <path d="M9.6 9.3a2.5 2.5 0 0 1 4.8.9c0 1.7-2.4 2.2-2.4 3.6M12 17h.01" />
                    </svg>
                  </span>
                </div>
                <div className="detail-title">Vancouver 1983</div>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  className="polaroid-main"
                  src={`${ASSET}/detail-polaroid.jpg`}
                  alt="Polaroid of a river winding through a wide valley below forested hills, with an edit button in the corner."
                />
                <div className="byline">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={`${ASSET}/sofia-avatar.jpg`}
                    alt="Profile photo of Sofia Smith, smiling, with long reddish-blonde hair."
                  />
                  <b>Sofia smith</b>
                  <small>11 Sept, 2026</small>
                </div>
                <div className="tags">
                  <span className="tag">
                    <svg viewBox="0 0 24 24">
                      <rect x="3" y="5" width="18" height="16" rx="2" />
                      <path d="M3 10h18M8 3v4M16 3v4M7 14h2M11 14h2M15 14h2M7 17h2M11 17h2" />
                    </svg>
                    1983
                  </span>
                  <span className="tag">
                    <svg viewBox="0 0 24 24">
                      <path d="M12 21s-7-6.2-7-11.5A7 7 0 0 1 19 9.5C19 14.8 12 21 12 21z" />
                      <circle cx="12" cy="9.5" r="2.5" />
                    </svg>
                    Vancouver
                  </span>
                </div>
                <div className="player">
                  <span className="play" />
                  <svg
                    className="wave-small"
                    viewBox="0 0 193 28"
                    preserveAspectRatio="none"
                    aria-hidden="true"
                  >
                    {Array.from({ length: 47 }).map((_, i) => {
                      const heights = [
                        18, 9, 22, 5, 7, 12, 7, 18, 9, 5, 12, 12, 5, 7, 22, 22,
                        7, 12, 7, 12, 22, 5, 9, 7, 12, 9, 5, 9, 9, 22, 5, 12, 5,
                        12, 9, 15, 22, 9, 12, 7, 9, 15, 12, 9, 7, 9,
                      ];
                      const h = heights[i] ?? 9;
                      const y = (28 - h) / 2;
                      return (
                        <rect
                          key={i}
                          x={(i * 4.2).toFixed(1)}
                          y={y.toFixed(1)}
                          width="1.6"
                          height={h}
                          rx=".8"
                        />
                      );
                    })}
                  </svg>
                  <span>1:24</span>
                </div>
                <p className="story">
                  When I was about 16 years old, I went on a 2 week trip to
                  Vancouver with my family. This was one of the best trips of my
                  life and God knows how much I traveled! The landscapes were
                  beautiful, but there was something special about the
                  mountains.
                </p>
                <button className="cta-lag" tabIndex={-1}>
                  Create Lag
                </button>
              </div>
            </div>
          </section>

          <section className="waitlist" aria-labelledby="wait-title">
            <div className="wrap" style={{ height: "100%" }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                className="snap one"
                src={`${ASSET}/waitlist-fishing.webp`}
                alt="Vintage photo of two people fishing from a small white boat on a dark, still lake."
              />
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                className="snap two"
                src={`${ASSET}/waitlist-boys.webp`}
                alt="Vintage photo of two young boys, one dark-haired and one blond, looking up at the camera."
              />

              <div className="copy">
                <h2 id="wait-title">Start with one question.</h2>
                <p>
                  And start building an archive of beautiful memories. <br />
                  Join the waitlist and be first in when the program opens.
                </p>
                <form className="form" id="wl" noValidate onSubmit={onSubmit}>
                  <label htmlFor="email">Email</label>
                  <input
                    id="email"
                    type="email"
                    name="email"
                    placeholder="Email"
                    autoComplete="email"
                    required
                    disabled={submitting}
                  />
                  <button type="submit" disabled={submitting}>
                    {submitting ? "Joining…" : "Join the waitlist"}
                  </button>
                </form>
                <p className="form-msg" id="wl-msg" role="status">
                  {formMsg}
                </p>
              </div>
              <div className="snap-m">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  className="f"
                  src={`${ASSET}/waitlist-fishing.webp`}
                  alt="Vintage photo of two people fishing from a small white boat on a dark, still lake."
                />
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  className="b"
                  src={`${ASSET}/waitlist-boys.webp`}
                  alt="Vintage photo of two young boys, one dark-haired and one blond, looking up at the camera."
                />
              </div>
            </div>
          </section>
        </main>
      </div>
      <NewsletterMailFooter />
    </>
  );
}
