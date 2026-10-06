'use client';

import { useEffect, useRef, useState } from 'react';

type Props = {
  isRecording: boolean;
  onToggle: () => void;
  className?: string;
};

// Colors from Epoch Lag design system
const PEACH = '#FCD6A5';
const ORANGE = '#EF9849';
const TERRACOTTA = '#D95F3B';

export function RecordingCircles({ isRecording, onToggle, className }: Props) {
  const [scales, setScales] = useState({ s1: 1, s2: 1, s3: 1 });

  // Animation state kept in a ref — no re-renders from the rAF loop itself,
  // only from the setScales call which drives the visual output.
  const anim = useRef({
    level: 0,
    ring2Lag: 0,
    ring3Lag: 0,
    idlePhase: 0,
    target: 0,
    lastTargetChange: 0,
    lastFrame: 0,
    raf: 0,
  });
  const isRecordingRef = useRef(isRecording);
  isRecordingRef.current = isRecording;

  useEffect(() => {
    const a = anim.current;
    a.lastFrame = performance.now();

    const tick = (now: number) => {
      const dt = Math.min(now - a.lastFrame, 50);
      a.lastFrame = now;

      if (isRecordingRef.current) {
        // Simulate speech: pick a new random amplitude every 120–380 ms.
        // 18 % chance of a near-silence pause for organic feel.
        if (now - a.lastTargetChange > 120 + Math.random() * 260) {
          a.lastTargetChange = now;
          a.target =
            Math.random() < 0.18
              ? Math.random() * 0.12
              : 0.35 + Math.random() * 0.65;
        }
      } else {
        a.target = 0;
      }

      // Exponential smoothing — each ring tracks at a different speed for
      // the staggered organic feel from the design prototype.
      const k1 = 1 - Math.exp(-dt / 90);   // inner: fast
      const k2 = 1 - Math.exp(-dt / 170);  // mid
      const k3 = 1 - Math.exp(-dt / 260);  // outer: slow

      a.level    += (a.target - a.level)    * k1;
      a.ring2Lag += (a.target - a.ring2Lag) * k2;
      a.ring3Lag += (a.target - a.ring3Lag) * k3;
      a.idlePhase += dt * 0.0016;

      const recording = isRecordingRef.current;
      const idle = recording ? 0 : Math.sin(a.idlePhase) * 0.5 + 0.5;

      const l1 = recording ? a.level    : idle * 0.10;
      const l2 = recording ? a.ring2Lag : idle * 0.08;
      const l3 = recording ? a.ring3Lag : idle * 0.06;

      setScales({
        s1: 1 + l1 * 0.22,
        s2: 1 + l2 * 0.20,
        s3: 1 + l3 * 0.16,
      });

      a.raf = requestAnimationFrame(tick);
    };

    a.raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(a.raf);
  }, []);

  const transition = 'transform 60ms linear';

  return (
    <div
      className={className}
      style={{
        position: 'relative',
        width: 200,
        height: 200,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      {/* Outer ring — peach */}
      <div
        style={{
          position: 'absolute',
          width: 180,
          height: 180,
          borderRadius: '50%',
          background: PEACH,
          transform: `scale(${scales.s3})`,
          transition,
          willChange: 'transform',
        }}
      />

      {/* Mid ring — orange */}
      <div
        style={{
          position: 'absolute',
          width: 140,
          height: 140,
          borderRadius: '50%',
          background: ORANGE,
          transform: `scale(${scales.s2})`,
          transition,
          willChange: 'transform',
        }}
      />

      {/* Inner ring — terracotta */}
      <div
        style={{
          position: 'absolute',
          width: 92,
          height: 92,
          borderRadius: '50%',
          background: TERRACOTTA,
          transform: `scale(${scales.s1})`,
          transition,
          willChange: 'transform',
        }}
      />

      {/* Tap target — transparent overlay so the icon stays at fixed size
          while the terracotta ring behind it animates independently */}
      <button
        onClick={onToggle}
        aria-label={isRecording ? 'Stop recording' : 'Start recording'}
        style={{
          position: 'relative',
          zIndex: 1,
          width: 92,
          height: 92,
          borderRadius: '50%',
          background: 'transparent',
          border: 'none',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          padding: 0,
        }}
      >
        {!isRecording && <MicIcon />}
      </button>
    </div>
  );
}

function MicIcon() {
  return (
    <svg
      width={54}
      height={54}
      viewBox="0 0 50 50"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path d="M25.0007 4.16797C18.3847 4.16797 13.0215 9.53122 13.0215 16.1471V22.3971C13.0215 29.013 18.3847 34.3763 25.0007 34.3763C31.087 34.3763 36.1132 29.8373 36.8788 23.9596L27.084 23.9596C26.221 23.9596 25.5215 23.2601 25.5215 22.3971C25.5215 21.5342 26.221 20.8346 27.084 20.8346L36.9798 20.8346V17.7096H27.084C26.221 17.7096 25.5215 17.0101 25.5215 16.1471C25.5215 15.2842 26.221 14.5846 27.084 14.5846H36.8788C36.1132 8.707 31.087 4.16797 25.0007 4.16797Z" fill="white" />
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M8.33398 18.7513C9.19693 18.7513 9.89648 19.4509 9.89648 20.3138V22.3971C9.89648 30.7389 16.6589 37.5013 25.0007 37.5013C33.3425 37.5013 40.1048 30.7389 40.1048 22.3971V20.3138C40.1048 19.4509 40.8044 18.7513 41.6673 18.7513C42.5303 18.7513 43.2298 19.4509 43.2298 20.3138V22.3971C43.2298 31.9385 35.8994 39.7677 26.5632 40.5603V45.3138C26.5632 46.1767 25.8636 46.8763 25.0007 46.8763C24.1377 46.8763 23.4382 46.1767 23.4382 45.3138V40.5603C14.1019 39.7677 6.77148 31.9385 6.77148 22.3971V20.3138C6.77148 19.4509 7.47104 18.7513 8.33398 18.7513Z"
        fill="white"
      />
    </svg>
  );
}

function StopIcon() {
  return (
    <svg
      width={44}
      height={44}
      viewBox="0 0 40 40"
      fill="white"
      xmlns="http://www.w3.org/2000/svg"
    >
      <rect x="10" y="10" width="20" height="20" rx="3" />
    </svg>
  );
}
