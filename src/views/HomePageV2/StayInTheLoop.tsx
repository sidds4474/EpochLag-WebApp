"use client";

import { useState, type FormEvent } from "react";
import { subscribeToNewsletter } from "../../lib/newsletter/api";

// Reusable "Stay in the loop" signup band used by the newsletter archive
// index and each individual issue. Wraps subscribeToNewsletter (the shared
// landing-form helper, no extra fields on the wire). The variant="archive"
// drops the "View our Newsletter" arrow link because the surrounding page
// is already a newsletter view.

type Props = {
  variant?: "default" | "archive";
  source?: string;
};

export default function StayInTheLoop({
  variant = "archive",
  source = "newsletter-archive",
}: Props) {
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const input = e.currentTarget.elements.namedItem(
      "email",
    ) as HTMLInputElement | null;
    const email = (input?.value ?? "").trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setMsg("Please enter a valid email.");
      input?.focus();
      return;
    }
    setBusy(true);
    const res = await subscribeToNewsletter({ email, source });
    setBusy(false);
    if (res.ok) {
      setMsg("Thanks — we’ll keep you in the loop.");
      if (input) input.value = "";
    } else {
      setMsg(res.message);
    }
  }

  return (
    <section
      className={variant === "archive" ? "loop loop--archive" : "loop"}
      id="newsletter"
    >
      <div className="container">
        <div>
          <h2>Stay in the loop</h2>
          <p>
            Get our latest updates and ideas delivered now and then. No spam,
            unsubscribe anytime.
          </p>
        </div>
        <form className="signup" onSubmit={onSubmit} noValidate>
          <label className="visually-hidden" htmlFor="sitl-email">
            Email address
          </label>
          <input
            id="sitl-email"
            name="email"
            type="email"
            placeholder="Email Address"
            autoComplete="email"
            required
            disabled={busy}
          />
          <button className="btn" type="submit" disabled={busy}>
            {busy ? "Subscribing…" : "Subscribe"}
          </button>
        </form>
        {msg && (
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
            {msg}
          </p>
        )}
      </div>
    </section>
  );
}
