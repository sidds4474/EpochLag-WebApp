"use client";

import { APP_STORE_URL, getStoreUrl } from "../../utils/storeLinks";

// Shared header for the hp2 chrome (home, contact, legal). Presentational only
// — the mobile-drawer interactions and heading-split animations are wired up
// by useSiteChrome, so each page can mount this component without duplicating
// setup code. "Newsletter" points at the dedicated /newsletters archive, not
// the homepage's in-page section, so it works consistently from every route.

export default function SiteHeader() {
  function handleGetAppClick(e: React.MouseEvent<HTMLAnchorElement>) {
    const url = getStoreUrl();
    if (url) {
      e.preventDefault();
      window.open(url, "_blank", "noopener");
    }
  }

  return (
    <header className="site-header">
      <div className="container">
        <nav className="nav" aria-label="Main">
          <a className="logo" href="/">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              className="logo-dark"
              src="/home/logo-dark.svg"
              alt="Epoch Lag"
            />
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              className="logo-light"
              src="/home/logo-light.svg"
              alt="Epoch Lag"
            />
          </a>
          <div className="nav-links">
            <a href="/newsletters">Newsletter</a>
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
            <a href="/newsletters">Newsletter</a>
            <a href="/contact">Contact</a>
          </nav>
        </div>
      </div>
    </header>
  );
}
