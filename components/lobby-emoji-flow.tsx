"use client";

import { useMemo } from "react";

import { useMagnetPull } from "@/hooks/use-magnet-pull";
import { useMouseParallax } from "@/hooks/use-mouse-parallax";
import { useSmoothedValue } from "@/hooks/use-smoothed-value";
import { AVATARS } from "@/lib/avatars";
import { cn } from "@/lib/utils";

type Particle = {
  emoji: string;
  left: string;
  top: string;
  size: string;
  layer: 0 | 1 | 2;
  anim: "animate-emoji-drift-a" | "animate-emoji-drift-b" | "animate-emoji-drift-c";
  duration: number;
  delay: number;
};

const BACK_LAYER: Particle[] = [
  { emoji: AVATARS[0].emoji, left: "4%", top: "6%", size: "text-5xl", layer: 0, anim: "animate-emoji-drift-a", duration: 22, delay: 0 },
  { emoji: AVATARS[4].emoji, left: "78%", top: "4%", size: "text-4xl", layer: 0, anim: "animate-emoji-drift-b", duration: 24, delay: 3 },
  { emoji: AVATARS[8].emoji, left: "42%", top: "88%", size: "text-5xl", layer: 0, anim: "animate-emoji-drift-c", duration: 26, delay: 1 },
  { emoji: AVATARS[2].emoji, left: "92%", top: "48%", size: "text-4xl", layer: 0, anim: "animate-emoji-drift-a", duration: 20, delay: 5 },
  { emoji: AVATARS[6].emoji, left: "2%", top: "52%", size: "text-4xl", layer: 0, anim: "animate-emoji-drift-b", duration: 23, delay: 2 },
  { emoji: AVATARS[10].emoji, left: "58%", top: "12%", size: "text-5xl", layer: 0, anim: "animate-emoji-drift-c", duration: 21, delay: 4 },
];

const MID_LAYER: Particle[] = [
  { emoji: AVATARS[1].emoji, left: "18%", top: "22%", size: "text-3xl", layer: 1, anim: "animate-emoji-drift-b", duration: 16, delay: 0.5 },
  { emoji: AVATARS[5].emoji, left: "72%", top: "28%", size: "text-3xl", layer: 1, anim: "animate-emoji-drift-c", duration: 17, delay: 2 },
  { emoji: AVATARS[9].emoji, left: "28%", top: "72%", size: "text-2xl", layer: 1, anim: "animate-emoji-drift-a", duration: 15, delay: 1 },
  { emoji: AVATARS[3].emoji, left: "85%", top: "72%", size: "text-3xl", layer: 1, anim: "animate-emoji-drift-b", duration: 18, delay: 3.5 },
  { emoji: AVATARS[7].emoji, left: "8%", top: "78%", size: "text-2xl", layer: 1, anim: "animate-emoji-drift-c", duration: 14, delay: 1.5 },
  { emoji: AVATARS[11].emoji, left: "48%", top: "38%", size: "text-2xl", layer: 1, anim: "animate-emoji-drift-a", duration: 16, delay: 4 },
  { emoji: AVATARS[0].emoji, left: "62%", top: "58%", size: "text-3xl", layer: 1, anim: "animate-emoji-drift-b", duration: 19, delay: 0 },
];

const FRONT_LAYER: Particle[] = [
  { emoji: AVATARS[4].emoji, left: "14%", top: "42%", size: "text-xl", layer: 2, anim: "animate-emoji-drift-c", duration: 11, delay: 0 },
  { emoji: AVATARS[8].emoji, left: "38%", top: "18%", size: "text-lg", layer: 2, anim: "animate-emoji-drift-a", duration: 10, delay: 1.2 },
  { emoji: AVATARS[2].emoji, left: "88%", top: "18%", size: "text-xl", layer: 2, anim: "animate-emoji-drift-b", duration: 12, delay: 2 },
  { emoji: AVATARS[6].emoji, left: "52%", top: "82%", size: "text-lg", layer: 2, anim: "animate-emoji-drift-c", duration: 9, delay: 0.8 },
  { emoji: AVATARS[10].emoji, left: "22%", top: "58%", size: "text-base", layer: 2, anim: "animate-emoji-drift-a", duration: 11, delay: 3 },
  { emoji: AVATARS[1].emoji, left: "76%", top: "62%", size: "text-lg", layer: 2, anim: "animate-emoji-drift-b", duration: 10, delay: 1.5 },
  { emoji: AVATARS[5].emoji, left: "94%", top: "32%", size: "text-base", layer: 2, anim: "animate-emoji-drift-c", duration: 13, delay: 4 },
  { emoji: AVATARS[9].emoji, left: "6%", top: "28%", size: "text-xl", layer: 2, anim: "animate-emoji-drift-a", duration: 12, delay: 2.5 },
];

const LAYER_PARTICLES: Record<0 | 1 | 2, Particle[]> = {
  0: BACK_LAYER,
  1: MID_LAYER,
  2: FRONT_LAYER,
};

const LAYER_CLASS: Record<Particle["layer"], string> = {
  0: "opacity-[0.06] blur-[1px]",
  1: "opacity-[0.1]",
  2: "opacity-[0.16]",
};

/** Focal point — home CTAs sit near here */
const MAGNET_X = 50;
const MAGNET_Y = 48;
/** Fraction of distance to magnet (0–1) at full pull, per depth layer */
const MAGNET_STRENGTH = [0.55, 0.68, 0.82] as const;
const MAGNET_Z_BOOST = [70, 120, 180] as const;
/** vw/vh multipliers — % translate is relative to emoji size, so use viewport units */
const MAGNET_VW = 0.95;
const MAGNET_VH = 0.95;

const LAYER_SHIFT = [14, 28, 48] as const;
const LAYER_Z = [-120, -55, 20] as const;
const LAYER_Z_PULL = [-20, 55, 130] as const;
const TILT_STRENGTH = 4;
const SCENE_PULL_SCALE = 0.14;
const SCENE_PULL_Z = 100;

type Props = {
  fullPage?: boolean;
  /** Home button hover magnet */
  ctaHovering?: boolean;
  /** Launch preloader: 0–1 magnet pull follows page load progress */
  launchPull?: number | null;
};

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

function parsePercent(value: string): number {
  return parseFloat(value);
}

/** Each emoji drifts toward the magnet; farther emojis move more */
function particleMagnetTransform(
  left: string,
  top: string,
  layer: 0 | 1 | 2,
  pull: number
): string {
  if (pull <= 0) return "translate3d(0, 0, 0)";

  const lx = parsePercent(left);
  const ly = parsePercent(top);
  const strength = MAGNET_STRENGTH[layer] * pull;
  const dx = (MAGNET_X - lx) * strength;
  const dy = (MAGNET_Y - ly) * strength;
  const dz = MAGNET_Z_BOOST[layer] * pull;
  const scale = 1 + pull * (0.06 + layer * 0.03);

  return `translate3d(${dx * MAGNET_VW}vw, ${dy * MAGNET_VH}vh, ${dz}px) scale(${scale})`;
}

function layerTransform(
  layer: 0 | 1 | 2,
  x: number,
  y: number,
  pull: number
): string {
  const shift = LAYER_SHIFT[layer] * (1 + pull * 0.25);
  const tx = x * shift;
  const ty = y * shift;
  const z = lerp(LAYER_Z[layer], LAYER_Z_PULL[layer], pull);
  return `translate3d(${tx}px, ${ty}px, ${z}px)`;
}

function EmojiLayer({
  layer,
  particles,
  parallax,
  pull,
}: {
  layer: 0 | 1 | 2;
  particles: Particle[];
  parallax: { x: number; y: number };
  pull: number;
}) {
  return (
    <div
      className="absolute inset-0 motion-safe:[transform-style:preserve-3d]"
      style={{
        transform: layerTransform(layer, parallax.x, parallax.y, pull),
        willChange: "transform",
      }}
    >
      {particles.map((p, i) => (
        <span
          key={`${p.emoji}-${i}`}
          className="absolute motion-safe:[transform-style:preserve-3d]"
          style={{ left: p.left, top: p.top }}
        >
          <span
            className={cn(
              "block leading-none will-change-transform motion-safe:[transform-style:preserve-3d]",
              p.size,
              LAYER_CLASS[p.layer],
              pull > 0.05 && layer === 0 && "opacity-[0.1]",
              pull > 0.05 && layer === 1 && "opacity-[0.16]",
              pull > 0.05 && layer === 2 && "opacity-[0.24]"
            )}
            style={{
              transform: particleMagnetTransform(p.left, p.top, p.layer, pull),
            }}
          >
            <span
              className={cn("inline-block", p.anim)}
              style={{
                animationDuration: `${p.duration}s`,
                animationDelay: `${p.delay}s`,
              }}
            >
              {p.emoji}
            </span>
          </span>
        </span>
      ))}
    </div>
  );
}

export function LobbyEmojiFlow({
  fullPage = true,
  ctaHovering = false,
  launchPull = null,
}: Props) {
  const isLaunching = launchPull !== null;
  const parallax = useMouseParallax(!isLaunching);
  const hoverPull = useMagnetPull(ctaHovering && !isLaunching, false);
  const smoothedLaunch = useSmoothedValue(launchPull ?? 0, 0.11);
  const pull = isLaunching ? smoothedLaunch : hoverPull;

  const sceneTransform = useMemo(() => {
    const rotateY = parallax.x * TILT_STRENGTH;
    const rotateX = -parallax.y * TILT_STRENGTH;
    const base = `rotateX(${rotateX}deg) rotateY(${rotateY}deg)`;
    if (pull <= 0) return base;
    const scale = 1 + pull * SCENE_PULL_SCALE * (isLaunching ? 1.25 : 1);
    const z = pull * SCENE_PULL_Z * (isLaunching ? 1.3 : 1);
    return `${base} scale(${scale}) translateZ(${z}px)`;
  }, [parallax.x, parallax.y, pull, isLaunching]);

  const vignetteOpacity = 1 - pull * 0.55;
  const gradientOpacity = 1 - pull * 0.7;

  return (
    <div
      className={cn(
        "pointer-events-none overflow-hidden",
        fullPage
          ? isLaunching
            ? "fixed inset-0 z-[5]"
            : "fixed inset-0 z-0"
          : "absolute inset-0 rounded-lg"
      )}
      style={{ perspective: "1100px", perspectiveOrigin: "50% 48%" }}
      aria-hidden
    >
      <div
        className="absolute inset-0 bg-[radial-gradient(ellipse_75%_65%_at_50%_48%,transparent_0%,var(--background)_72%)]"
        style={{ opacity: vignetteOpacity }}
      />
      <div
        className="absolute inset-0 bg-gradient-to-b from-background/40 via-transparent to-background/50"
        style={{ opacity: gradientOpacity }}
      />

      <div
        className="absolute inset-0 motion-safe:[transform-style:preserve-3d]"
        style={{
          transformStyle: "preserve-3d",
          transform: sceneTransform,
          willChange: "transform",
        }}
      >
        <EmojiLayer
          layer={0}
          particles={LAYER_PARTICLES[0]}
          parallax={parallax}
          pull={pull}
        />
        <EmojiLayer
          layer={1}
          particles={LAYER_PARTICLES[1]}
          parallax={parallax}
          pull={pull}
        />
        <EmojiLayer
          layer={2}
          particles={LAYER_PARTICLES[2]}
          parallax={parallax}
          pull={pull}
        />
      </div>
    </div>
  );
}
