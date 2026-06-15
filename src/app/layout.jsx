import Script from "next/script";
import ToastProvider from "../components/ToastProvider/ToastProvider";
import "./globals.css";
import LogoDark from "../assets/images/logo-dark.webp";
import MobileApp from "../assets/images/mobile-app.webp";

export const metadata = {
  metadataBase: new URL("https://www.epochlag.com"),
  title: {
    default: "Epoch Lag - Stories that connect",
    template: "%s | Epoch Lag",
  },
  description:
    "Epoch Lag helps you preserve and share meaningful memories with the people who matter most. Keep your family stories, voices, and memories private, secure, and lasting for generations.",
  icons: {
    icon: [{ url: "/logo.svg", type: "image/svg+xml" }],
  },
  openGraph: {
    type: "website",
    url: "https://www.epochlag.com",
    title: "Epoch Lag - Stories that connect",
    description:
      "Epoch Lag helps you preserve and share meaningful memories with the people who matter most. Keep your family stories, voices, and memories private, secure, and lasting for generations.",
    siteName: "Epoch Lag",
  },
  twitter: {
    card: "summary_large_image",
    title: "Epoch Lag - Stories that connect",
    description:
      "Epoch Lag helps you preserve and share meaningful memories with the people who matter most.",
  },
};

export const viewport = {
  themeColor: "#ffefdb",
  width: "device-width",
  initialScale: 1,
};

const GA_ID = "G-Y24K513FJM";
const META_PIXEL_ID = "822964343811420";

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        <link
          rel="preload"
          href="/fonts/Projekt-Blackbird.otf"
          as="font"
          type="font/otf"
          crossOrigin="anonymous"
        />
        <link
          rel="preload"
          href="/fonts/Montserrat-VariableFont_wght.ttf"
          as="font"
          type="font/truetype"
          crossOrigin="anonymous"
        />
        <link
          rel="preload"
          href={LogoDark.src}
          as="image"
          type="image/webp"
        />
        <link
          rel="preload"
          href={MobileApp.src}
          as="image"
          type="image/webp"
          fetchPriority="high"
        />
      </head>
      <body>
        <Script
          src={`https://www.googletagmanager.com/gtag/js?id=${GA_ID}`}
          strategy="afterInteractive"
        />
        <Script id="gtag-init" strategy="afterInteractive">
          {`
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());
            gtag('config', '${GA_ID}');
          `}
        </Script>
        <Script id="meta-pixel" strategy="afterInteractive">
          {`
            !function(f,b,e,v,n,t,s)
            {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
            n.callMethod.apply(n,arguments):n.queue.push(arguments)};
            if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
            n.queue=[];t=b.createElement(e);t.async=!0;
            t.src=v;s=b.getElementsByTagName(e)[0];
            s.parentNode.insertBefore(t,s)}(window, document,'script',
            'https://connect.facebook.net/en_US/fbevents.js');
            fbq('init', '${META_PIXEL_ID}');
            fbq('track', 'PageView');
          `}
        </Script>
        <noscript>
          <img
            height="1"
            width="1"
            style={{ display: "none" }}
            src={`https://www.facebook.com/tr?id=${META_PIXEL_ID}&ev=PageView&noscript=1`}
            alt=""
          />
        </noscript>
        <ToastProvider />
        {children}
      </body>
    </html>
  );
}
