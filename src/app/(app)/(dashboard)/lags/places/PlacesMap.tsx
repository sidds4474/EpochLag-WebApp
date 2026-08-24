"use client";

import { APIProvider, Map as GMap, useMap } from "@vis.gl/react-google-maps";
import { useEffect, useRef } from "react";

export type MapPin = {
  key: string;
  lat: number;
  lng: number;
  count: number;
  placeId: string | null;
  formattedAddress: string;
};

type PlacesMapProps = {
  pins: MapPin[];
  activeKey: string | null;
  onPinTap: (pin: MapPin) => void;
  onMapClick: () => void;
};

// Grayscale style: hides all POI/transit/labels/admin geometry so only
// coastlines + very muted country outlines remain. Land #e5e5e5, water #fff.
// Applied via `styles` prop — requires the Map component to NOT have a
// mapId (Google ignores inline styles when mapId is set).
const GRAYSCALE_STYLE: google.maps.MapTypeStyle[] = [
  { elementType: "geometry", stylers: [{ color: "#e5e5e5" }] },
  { elementType: "labels", stylers: [{ visibility: "off" }] },
  { featureType: "administrative", stylers: [{ visibility: "off" }] },
  {
    featureType: "administrative.country",
    elementType: "geometry.stroke",
    stylers: [{ visibility: "on" }, { color: "#cfcfcf" }],
  },
  { featureType: "poi", stylers: [{ visibility: "off" }] },
  { featureType: "transit", stylers: [{ visibility: "off" }] },
  { featureType: "road", stylers: [{ visibility: "off" }] },
  {
    featureType: "landscape",
    elementType: "geometry",
    stylers: [{ color: "#e5e5e5" }],
  },
  {
    featureType: "water",
    elementType: "geometry",
    stylers: [{ color: "#ffffff" }],
  },
];

const DEFAULT_CENTER = { lat: 39.5, lng: -98.35 };
const DEFAULT_ZOOM = 4;

// Base64-encoded SVG for the map pin marker. Renders a white pill above an
// orange drop pin, with dynamic count text. Total height 58px: pill 4-30,
// gap 4px, pin 34-58 (24x24). Marker anchor is set to (width/2, 56) — the
// pin's rendered tip sits at y=56 (pin path bottom = 22 within its 24px
// box + 34px translate).
function pinSvg(count: number, active: boolean): string {
  const label = `${count} ${count === 1 ? "story" : "stories"}`;
  const pillWidth = Math.max(78, 44 + label.length * 6.5);
  const pillFill = active ? "#0F1A2E" : "#ffffff";
  const textFill = active ? "#ffffff" : "#0F1A2E";
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${pillWidth}" height="58" viewBox="0 0 ${pillWidth} 58">
    <filter id="s" x="-30%" y="-30%" width="160%" height="160%">
      <feDropShadow dx="0" dy="1.5" stdDeviation="1.5" flood-color="#000" flood-opacity="0.18"/>
    </filter>
    <g filter="url(#s)">
      <rect x="0" y="4" width="${pillWidth}" height="26" rx="13" fill="${pillFill}"/>
    </g>
    <g transform="translate(10, 10.5) scale(0.68)">
      <path d="M2.18066 0.0617483C3.2546 0.124758 4.52491 0.248761 5.5 0.494366C6.65407 0.785075 8.02565 1.40488 9.11035 1.95237C9.44807 2.12281 9.80727 2.24119 10.1748 2.30784V18.2453C9.84155 18.1752 9.516 18.0617 9.20898 17.9055C8.10967 17.3462 6.68941 16.6973 5.5 16.3977C4.53564 16.1548 3.28216 16.0307 2.21582 15.967C0.996302 15.894 0 14.9498 0 13.7834V2.0803C0.000245482 0.927438 0.97512 -0.00896956 2.18066 0.0617483ZM19.8896 0.00120146C21.0685 -0.0379926 21.9999 0.886962 22 2.01292V13.7834C22 14.9499 21.0029 15.8942 19.7832 15.967C18.717 16.0307 17.4643 16.1548 16.5 16.3977C15.3104 16.6973 13.8894 17.3461 12.79 17.9055C12.4832 18.0616 12.1582 18.1742 11.8252 18.2444V2.26585C12.1778 2.18339 12.5204 2.05318 12.8408 1.8762C13.7884 1.35272 14.9518 0.77966 15.9502 0.494366C17.1017 0.165421 18.6485 0.0424792 19.8896 0.00120146ZM19.5 10.2922C19.3894 9.87046 18.9419 9.61362 18.5 9.71898L14.0996 10.7688C13.6578 10.8743 13.3897 11.3021 13.5 11.7239C13.6106 12.1456 14.0581 12.4025 14.5 12.2971L18.9004 11.2463C19.342 11.1407 19.6102 10.7139 19.5 10.2922ZM19.5 6.09202C19.3894 5.67028 18.9419 5.41346 18.5 5.51878L14.0996 6.56858C13.6578 6.67412 13.3897 7.10185 13.5 7.52366C13.6105 7.94558 14.058 8.20235 14.5 8.0969L18.9004 7.0471C19.3422 6.94149 19.6104 6.5138 19.5 6.09202Z" fill="${textFill}"/>
      <rect width="6.16522" height="1.59241" rx="0.796204" transform="matrix(-0.971526 -0.236931 -0.245264 0.969456 8.58274 6.76514)" fill="${pillFill}"/>
      <rect width="6.19655" height="1.57462" rx="0.78731" transform="matrix(-0.971526 -0.236931 -0.245264 0.969456 8.60618 10.9873)" fill="${pillFill}"/>
      <rect width="6.16522" height="1.59241" rx="0.796204" transform="matrix(0.971526 -0.236931 0.245264 0.969456 13.303 6.76514)" fill="${pillFill}"/>
      <rect width="6.19655" height="1.57462" rx="0.78731" transform="matrix(0.971526 -0.236931 0.245264 0.969456 13.2749 10.9873)" fill="${pillFill}"/>
    </g>
    <text x="${pillWidth / 2 + 8}" y="22" fill="${textFill}" font-family="-apple-system, system-ui, sans-serif" font-size="12" font-weight="500" text-anchor="middle">${label}</text>
    <g transform="translate(${pillWidth / 2 - 12}, 34)">
      <path fill-rule="evenodd" clip-rule="evenodd" d="M12 2C7.58172 2 4 6.00258 4 10.5C4 14.9622 6.55332 19.8124 10.5371 21.6744C11.4657 22.1085 12.5343 22.1085 13.4629 21.6744C17.4467 19.8124 20 14.9622 20 10.5C20 6.00258 16.4183 2 12 2ZM12 12C13.1046 12 14 11.1046 14 10C14 8.89543 13.1046 8 12 8C10.8954 8 10 8.89543 10 10C10 11.1046 10.8954 12 12 12Z" fill="#D95F3B"/>
    </g>
  </svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

// Renders classic Google Marker instances imperatively (vis.gl's <Marker>
// component would work but declaring 30 of them re-mounts more often than
// updating position on a shared instance; imperative is simpler here).
function MarkersLayer({
  pins,
  activeKey,
  onPinTap,
}: {
  pins: MapPin[];
  activeKey: string | null;
  onPinTap: (pin: MapPin) => void;
}) {
  const map = useMap();
  const markersRef = useRef<Map<string, google.maps.Marker>>(new window.Map());

  useEffect(() => {
    if (!map) return;
    const store = markersRef.current;
    const seen = new Set<string>();

    for (const pin of pins) {
      seen.add(pin.key);
      const isActive = pin.key === activeKey;
      const iconSvg = pinSvg(pin.count, isActive);
      let m = store.get(pin.key);
      if (!m) {
        m = new google.maps.Marker({
          map,
          position: { lat: pin.lat, lng: pin.lng },
          icon: {
            url: iconSvg,
            anchor: new google.maps.Point(
              Math.max(78, 44 + `${pin.count} stories`.length * 6.5) / 2,
              56
            ),
          },
        });
        m.addListener("click", () => onPinTap(pin));
        store.set(pin.key, m);
      } else {
        m.setPosition({ lat: pin.lat, lng: pin.lng });
        m.setIcon({
          url: iconSvg,
          anchor: new google.maps.Point(
            Math.max(78, 44 + `${pin.count} stories`.length * 6.5) / 2,
            72
          ),
        });
      }
    }

    // Remove markers no longer in the list.
    for (const [key, marker] of store.entries()) {
      if (!seen.has(key)) {
        marker.setMap(null);
        store.delete(key);
      }
    }

    return () => {
      /* keep markers across renders; cleanup on unmount below */
    };
  }, [map, pins, activeKey, onPinTap]);

  // Full cleanup on unmount.
  useEffect(() => {
    const store = markersRef.current;
    return () => {
      for (const marker of store.values()) marker.setMap(null);
      store.clear();
    };
  }, []);

  return null;
}

// Web-mercator Y in [0,1] — matches Google's projection.
function mercY(lat: number): number {
  const rad = (lat * Math.PI) / 180;
  const y = Math.log(Math.tan(Math.PI / 4 + rad / 2));
  return 0.5 - y / (2 * Math.PI);
}

// Cover-fits pins to viewport once, on the first non-empty pins load.
// Subsequent pin-array changes (from lazy coord resolution) do not refit
// so the user's manual pan is preserved.
function InitialCoverFit({ pins }: { pins: MapPin[] }) {
  const map = useMap();
  const fittedRef = useRef(false);
  useEffect(() => {
    if (!map || pins.length === 0 || fittedRef.current) return;
    fittedRef.current = true;

    if (pins.length === 1) {
      const p = pins[0];
      map.setCenter({ lat: p.lat, lng: p.lng });
      map.setZoom(10);
      return;
    }

    const div = map.getDiv() as HTMLElement | null;
    if (!div) return;
    const viewW = div.clientWidth - 80;
    const viewH = div.clientHeight - 80;
    if (viewW <= 0 || viewH <= 0) return;

    let latN = -90;
    let latS = 90;
    let lngE = -180;
    let lngW = 180;
    for (const p of pins) {
      if (p.lat > latN) latN = p.lat;
      if (p.lat < latS) latS = p.lat;
      if (p.lng > lngE) lngE = p.lng;
      if (p.lng < lngW) lngW = p.lng;
    }

    const yN = mercY(latN);
    const yS = mercY(latS);
    const latFrac = Math.max(yS - yN, 1e-6);
    const lngFrac = Math.max((lngE - lngW) / 360, 1e-6);

    const zLat = Math.log2(viewH / (256 * latFrac));
    const zLng = Math.log2(viewW / (256 * lngFrac));
    const zoom = Math.min(Math.max(Math.max(zLat, zLng), 2), 18);

    const mMid = (yN + yS) / 2;
    const yMid = (0.5 - mMid) * 2 * Math.PI;
    const centerLat =
      ((2 * Math.atan(Math.exp(yMid)) - Math.PI / 2) * 180) / Math.PI;
    const centerLng = (lngW + lngE) / 2;

    map.setCenter({ lat: centerLat, lng: centerLng });
    map.setZoom(zoom);
  }, [map, pins]);
  return null;
}

// Focuses the tapped pin: pans to it and bumps zoom to at least 8 for
// context. The map div is a flex sibling of the panel — its own width
// already excludes the panel, so panTo centers the pin in the visible area.
function FocusActivePin({
  pins,
  activeKey,
}: {
  pins: MapPin[];
  activeKey: string | null;
}) {
  const map = useMap();
  useEffect(() => {
    if (!map || !activeKey) return;
    const pin = pins.find((p) => p.key === activeKey);
    if (!pin) return;

    const currentZoom = map.getZoom() ?? 4;
    const targetZoom = Math.max(currentZoom, 8);
    if (targetZoom !== currentZoom) map.setZoom(targetZoom);
    map.panTo({ lat: pin.lat, lng: pin.lng });
  }, [map, activeKey, pins]);
  return null;
}

// Wires the map's empty-area click to close the active panel.
function MapClickCloser({ onMapClick }: { onMapClick: () => void }) {
  const map = useMap();
  useEffect(() => {
    if (!map) return;
    const listener = map.addListener("click", () => onMapClick());
    return () => google.maps.event.removeListener(listener);
  }, [map, onMapClick]);
  return null;
}

export default function PlacesMap({
  pins,
  activeKey,
  onPinTap,
  onMapClick,
}: PlacesMapProps) {
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
  if (!apiKey) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-[#e5e5e5]">
        <p className="font-montserrat text-primary-blue/60 text-[14px]">
          Google Maps API key not configured.
        </p>
      </div>
    );
  }

  return (
    <APIProvider apiKey={apiKey} libraries={["places"]}>
      <GMap
        defaultCenter={DEFAULT_CENTER}
        defaultZoom={DEFAULT_ZOOM}
        disableDefaultUI
        clickableIcons={false}
        gestureHandling="greedy"
        styles={GRAYSCALE_STYLE}
        className="w-full h-full"
      >
        <InitialCoverFit pins={pins} />
        <FocusActivePin pins={pins} activeKey={activeKey} />
        <MapClickCloser onMapClick={onMapClick} />
        <MarkersLayer pins={pins} activeKey={activeKey} onPinTap={onPinTap} />
      </GMap>
    </APIProvider>
  );
}
