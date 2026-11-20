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

// Map style: hides all POI/transit/labels/admin geometry so only
// coastlines + very muted country outlines remain. Land white, water
// #E8E6DF. Applied via `styles` prop — requires the Map component to
// NOT have a mapId (Google ignores inline styles when mapId is set).
const GRAYSCALE_STYLE: google.maps.MapTypeStyle[] = [
  { elementType: "geometry", stylers: [{ color: "#ffffff" }] },
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
    stylers: [{ color: "#ffffff" }],
  },
  {
    featureType: "water",
    elementType: "geometry",
    stylers: [{ color: "#E8E6DF" }],
  },
];

const DEFAULT_CENTER = { lat: 39.5, lng: -98.35 };
const DEFAULT_ZOOM = 4;

// Dark circle (orange when active) containing the story count, with a
// short stem pointing down. Total height 44px: circle 0-32 (32px), stem
// 30-44 (14px). Marker anchor is set to (PIN_WIDTH/2, 44) so the stem's
// tip sits exactly on the coordinate.
const PIN_WIDTH = 24;
const PIN_HEIGHT = 34;
function pinSvg(count: number, active: boolean): string {
  const fill = active ? "#EF9849" : "#2C2C2C";
  const label = String(count);
  const fontSize = label.length > 2 ? 9 : 10;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${PIN_WIDTH}" height="${PIN_HEIGHT}" viewBox="0 0 ${PIN_WIDTH} ${PIN_HEIGHT}">
    <filter id="s" x="-30%" y="-30%" width="160%" height="160%">
      <feDropShadow dx="0" dy="1" stdDeviation="1.2" flood-color="#000" flood-opacity="0.22"/>
    </filter>
    <g filter="url(#s)">
      <circle cx="${PIN_WIDTH / 2}" cy="12" r="11" fill="${fill}"/>
      <rect x="${PIN_WIDTH / 2 - 0.75}" y="22" width="1.5" height="12" fill="${fill}"/>
    </g>
    <text x="${PIN_WIDTH / 2}" y="15.5" fill="#ffffff" font-family="-apple-system, system-ui, sans-serif" font-size="${fontSize}" font-weight="600" text-anchor="middle">${label}</text>
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
            anchor: new google.maps.Point(PIN_WIDTH / 2, PIN_HEIGHT),
          },
        });
        m.addListener("click", () => onPinTap(pin));
        store.set(pin.key, m);
      } else {
        m.setPosition({ lat: pin.lat, lng: pin.lng });
        m.setIcon({
          url: iconSvg,
          anchor: new google.maps.Point(PIN_WIDTH / 2, PIN_HEIGHT),
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
      <div className="w-full h-full flex items-center justify-center bg-white">
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
