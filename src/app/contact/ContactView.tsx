"use client";

import { useRef, useState, type FormEvent } from "react";
import SiteHeader from "../../views/HomePageV2/SiteHeader";
import SiteFooter from "../../views/HomePageV2/SiteFooter";
import { useSiteChrome } from "../../views/HomePageV2/useSiteChrome";
import "../../views/HomePageV2/HomePage.css";

// Contact page ported from the designer's HTML, pixel-perfect. Form uses
// mailto: exactly like the designer — opens the visitor's email app addressed
// to hello@epochlag.com with the subject and body pre-filled. Field underlines
// animate in sequentially (250ms / 450ms / 650ms) via the .draw-lines class
// when the form scrolls into view; the Send button fades up at 850ms.

const CONTACT_EMAIL = "hello@epochlag.com";

export default function ContactView() {
  const rootRef = useRef<HTMLDivElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [invalid, setInvalid] = useState<{
    name?: boolean;
    email?: boolean;
    message?: boolean;
  }>({});

  useSiteChrome(rootRef);

  function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const nameEl = form.elements.namedItem("name") as HTMLInputElement;
    const emailEl = form.elements.namedItem("email") as HTMLInputElement;
    const msgEl = form.elements.namedItem("message") as HTMLTextAreaElement;

    const name = nameEl.value.trim();
    const email = emailEl.value.trim();
    const message = msgEl.value.trim();

    const next: typeof invalid = {};
    const problems: string[] = [];
    if (!name) {
      problems.push("your name");
      next.name = true;
    }
    if (!email || !emailEl.checkValidity()) {
      problems.push("a valid email");
      next.email = true;
    }
    if (!message) {
      problems.push("a message");
      next.message = true;
    }

    setInvalid(next);

    if (problems.length) {
      const joined = problems.join(", ").replace(/, ([^,]*)$/, " and $1");
      setError(`Please add ${joined}.`);
      setStatus(null);
      const first =
        (next.name && nameEl) ||
        (next.email && emailEl) ||
        (next.message && msgEl) ||
        null;
      first?.focus();
      return;
    }

    setError(null);
    const subject = `Message from ${name}`;
    const body = `${message}\n\n— ${name} (${email})`;
    window.location.href = `mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    setStatus(
      `Thanks, ${name}. Your email app should open with your message ready to send. If it doesn’t, email us at ${CONTACT_EMAIL}.`,
    );
  }

  return (
    <div ref={rootRef} className="hp2" id="top">
      <SiteHeader />

      <main>
        <section className="contact">
          <div className="container contact-grid">
            <div className="contact-intro">
              <h1>Contact Us</h1>
              <p>
                Have a question or need help? Contact us anytime, we’re here
                for you.
              </p>
            </div>

            <form
              className="contact-form draw-lines"
              onSubmit={onSubmit}
              noValidate
            >
              <div className="field">
                <label className="visually-hidden" htmlFor="c-name">
                  Name
                </label>
                <input
                  id="c-name"
                  name="name"
                  type="text"
                  placeholder="Name"
                  autoComplete="name"
                  required
                  aria-invalid={invalid.name ? "true" : undefined}
                />
              </div>
              <div className="field">
                <label className="visually-hidden" htmlFor="c-email">
                  Email
                </label>
                <input
                  id="c-email"
                  name="email"
                  type="email"
                  placeholder="Email"
                  autoComplete="email"
                  required
                  aria-invalid={invalid.email ? "true" : undefined}
                />
              </div>
              <div className="field field--message">
                <label htmlFor="c-message">Message</label>
                <textarea
                  id="c-message"
                  name="message"
                  rows={8}
                  required
                  aria-invalid={invalid.message ? "true" : undefined}
                />
              </div>
              <p className="form-error" role="alert" hidden={!error}>
                {error}
              </p>
              <button className="btn" type="submit">
                Send
              </button>
              <p
                className="form-status"
                role="status"
                aria-live="polite"
                hidden={!status}
              >
                {status}
              </p>
            </form>

            <div className="contact-art" aria-hidden="true">
              <div className="contact-art-inner">
                <span className="contact-circle" />
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  className="ca-pol ca-pol--family"
                  src="/home/contact-polaroid-family.webp"
                  alt=""
                />
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  className="ca-pol ca-pol--baby"
                  src="/home/contact-polaroid-baby.webp"
                  alt=""
                />
              </div>
            </div>
          </div>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}
