'use client';

import { useEffect, useRef } from 'react';
import type { VideoHTMLAttributes } from 'react';

type Props = VideoHTMLAttributes<HTMLVideoElement> & {
  src: string;
};

export function isHlsUrl(url: string): boolean {
  if (!url) return false;
  const stripped = url.split('?')[0];
  return /\.m3u8($|\/)/i.test(stripped) || /\/hls\//i.test(stripped);
}

// Cloudinary auto-generates a first-frame thumbnail when the HLS suffix is
// swapped for an image format. The `.mp4` is part of the public_id (not just
// an extension), so leave it in place and append `.jpg` after it.
// Also strip the streaming-only `sp_auto` transform — invalid on image delivery.
// Example:
//   /upload/sp_auto/v123/foo.mp4.m3u8  →  /upload/so_0/v123/foo.mp4.jpg
export function videoThumbnailUrl(url: string): string {
  if (!url) return url;
  return url
    .replace(/\/upload\/sp_auto\//, '/upload/so_0/')
    .replace(/\.m3u8(\?.*)?$/i, '.jpg$1');
}

export default function HlsVideo({ src, ...videoProps }: Props) {
  const ref = useRef<HTMLVideoElement | null>(null);

  useEffect(() => {
    const video = ref.current;
    if (!video || !src) return;

    const tag = `[HlsVideo ${src.slice(-40)}]`;
    // eslint-disable-next-line no-console
    console.log(`${tag} mount`, {
      src,
      isHls: isHlsUrl(src),
      canPlayNativeHls: video.canPlayType('application/vnd.apple.mpegurl'),
      canPlayMp4: video.canPlayType('video/mp4'),
    });

    const onError = () => {
      // eslint-disable-next-line no-console
      console.error(`${tag} <video> error`, {
        code: video.error?.code,
        message: video.error?.message,
        networkState: video.networkState,
        readyState: video.readyState,
        currentSrc: video.currentSrc,
      });
    };
    const onLoadedMeta = () => {
      // eslint-disable-next-line no-console
      console.log(`${tag} loadedmetadata`, {
        duration: video.duration,
        videoWidth: video.videoWidth,
        videoHeight: video.videoHeight,
      });
    };
    const onCanPlay = () => {
      // eslint-disable-next-line no-console
      console.log(`${tag} canplay`);
    };
    const onPlay = () => {
      // eslint-disable-next-line no-console
      console.log(`${tag} play`);
    };
    const onStalled = () => {
      // eslint-disable-next-line no-console
      console.warn(`${tag} stalled`, {
        networkState: video.networkState,
        readyState: video.readyState,
      });
    };
    video.addEventListener('error', onError);
    video.addEventListener('loadedmetadata', onLoadedMeta);
    video.addEventListener('canplay', onCanPlay);
    video.addEventListener('play', onPlay);
    video.addEventListener('stalled', onStalled);

    // Non-HLS: plain src is enough
    if (!isHlsUrl(src)) {
      // eslint-disable-next-line no-console
      console.log(`${tag} plain src (non-HLS)`);
      video.src = src;
      return () => {
        video.removeEventListener('error', onError);
        video.removeEventListener('loadedmetadata', onLoadedMeta);
        video.removeEventListener('canplay', onCanPlay);
        video.removeEventListener('play', onPlay);
        video.removeEventListener('stalled', onStalled);
      };
    }

    // HLS: prefer hls.js (works on Chrome/Firefox/Edge/desktop Safari),
    // fall back to native HLS (iOS Safari — MSE not available there).
    let hls: import('hls.js').default | null = null;
    let cancelled = false;

    // eslint-disable-next-line no-console
    console.log(`${tag} HLS detected — importing hls.js`);

    import('hls.js')
      .then(({ default: Hls }) => {
        if (cancelled || !ref.current) {
          // eslint-disable-next-line no-console
          console.log(`${tag} cancelled before hls.js init`);
          return;
        }
        // eslint-disable-next-line no-console
        console.log(`${tag} hls.js imported`, {
          version: Hls.version,
          isSupported: Hls.isSupported(),
        });

        if (Hls.isSupported()) {
          // eslint-disable-next-line no-console
          console.log(`${tag} using hls.js (attach-first pattern)`);
          hls = new Hls({
            enableWorker: true,
            // Be generous — Cloudinary edge can be slow on first fragment fetch.
            fragLoadingTimeOut: 20000,
            manifestLoadingTimeOut: 10000,
            levelLoadingTimeOut: 10000,
            fragLoadingMaxRetry: 4,
          });

          hls.on(Hls.Events.MEDIA_ATTACHED, () => {
            // eslint-disable-next-line no-console
            console.log(`${tag} HLS MEDIA_ATTACHED — now loading source`);
            hls?.loadSource(src);
          });
          hls.on(Hls.Events.MANIFEST_LOADED, (_, data) => {
            // eslint-disable-next-line no-console
            console.log(`${tag} HLS MANIFEST_LOADED`, {
              levels: data.levels?.length,
            });
          });
          hls.on(Hls.Events.MANIFEST_PARSED, (_, data) => {
            // eslint-disable-next-line no-console
            console.log(`${tag} HLS MANIFEST_PARSED`, { levels: data.levels.length });
          });
          hls.on(Hls.Events.LEVEL_LOADED, (_, data) => {
            // eslint-disable-next-line no-console
            console.log(`${tag} HLS LEVEL_LOADED`, {
              level: data.level,
              duration: data.details.totalduration,
              fragments: data.details.fragments.length,
              firstFragUrl: data.details.fragments[0]?.url,
            });
          });
          hls.on(Hls.Events.FRAG_LOADING, (_, data) => {
            // eslint-disable-next-line no-console
            console.log(`${tag} HLS FRAG_LOADING`, {
              sn: data.frag.sn,
              url: data.frag.url,
            });
          });
          hls.on(Hls.Events.FRAG_LOADED, (_, data) => {
            // eslint-disable-next-line no-console
            console.log(`${tag} HLS FRAG_LOADED`, {
              sn: data.frag.sn,
              level: data.frag.level,
            });
          });
          hls.on(Hls.Events.BUFFER_CODECS, (_, data) => {
            // eslint-disable-next-line no-console
            console.log(`${tag} HLS BUFFER_CODECS`, data);
          });
          hls.on(Hls.Events.BUFFER_APPENDED, (_, data) => {
            // eslint-disable-next-line no-console
            console.log(`${tag} HLS BUFFER_APPENDED`, { type: data.type });
          });
          hls.on(Hls.Events.ERROR, (_, data) => {
            // eslint-disable-next-line no-console
            console.error(`${tag} HLS ERROR`, {
              type: data.type,
              details: data.details,
              fatal: data.fatal,
              reason: data.reason,
              error: data.error?.message,
              response: data.response,
            });
          });

          // Attach-first: hls.js will load source once MEDIA_ATTACHED fires
          hls.attachMedia(ref.current);
          return;
        }

        if (ref.current.canPlayType('application/vnd.apple.mpegurl')) {
          // eslint-disable-next-line no-console
          console.log(`${tag} hls.js unsupported — falling back to native HLS`);
          ref.current.src = src;
          return;
        }

        // eslint-disable-next-line no-console
        console.error(`${tag} no HLS support available in this browser`);
      })
      .catch((err) => {
        // eslint-disable-next-line no-console
        console.error(`${tag} failed to import hls.js`, err);
      });

    return () => {
      cancelled = true;
      video.removeEventListener('error', onError);
      video.removeEventListener('loadedmetadata', onLoadedMeta);
      video.removeEventListener('canplay', onCanPlay);
      video.removeEventListener('play', onPlay);
      video.removeEventListener('stalled', onStalled);
      if (hls) {
        // eslint-disable-next-line no-console
        console.log(`${tag} destroying hls instance`);
        hls.destroy();
        hls = null;
      }
    };
  }, [src]);

  return <video ref={ref} {...videoProps} />;
}
