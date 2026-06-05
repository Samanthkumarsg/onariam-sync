"use client";

import { ChevronLeft, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState, useTransition } from "react";

import {
  AvatarPicker,
  DEFAULT_AVATAR_ID,
} from "@/components/avatar-picker";
import { JoinSessionProfile } from "@/components/join-session-profile";
import { OnariamLogo } from "@/components/onariam-logo";
import { LobbyEmojiFlow } from "@/components/lobby-emoji-flow";
import { LobbyNameInput } from "@/components/lobby-name-input";
import { Button } from "@/components/ui/button";
import { useDeviceId } from "@/hooks/use-device-id";
import type { AvatarId } from "@/lib/avatars";
import { getAvatarEmoji } from "@/lib/avatars";
import { meetPath } from "@/lib/meet-code";
import { createMeeting, type MeetingMembership } from "@/lib/meetings";
import { saveRoomSession } from "@/lib/room-session";
import { panel } from "@/lib/ui";
import { cn } from "@/lib/utils";

const LOBBY_DRAFT_KEY = "onariam-lobby-draft";
const START_STEPS = 2;
const LAUNCH_SWOOSH_MS = 550;
const LAUNCH_MAGNET_SETTLE_MS = 420;
/** Magnet pull milestones while creating the room */
const LAUNCH_PROGRESS_CAP = 0.68;
const LAUNCH_PROGRESS_API = 0.82;
const LAUNCH_PROGRESS_PREFETCH = 0.9;
const LAUNCH_PROGRESS_NAV = 0.97;
const LAUNCH_PROGRESS_DONE = 1;

function sleep(ms: number) {
  return new Promise<void>((resolve) => setTimeout(resolve, ms));
}

const homeCtaHover = cn(
  "motion-safe:transition-[transform,box-shadow,border-color,background-color] motion-safe:duration-300",
  "motion-safe:ease-[cubic-bezier(0.22,1,0.36,1)]",
  "motion-safe:hover:scale-[1.045] motion-safe:hover:-translate-y-0.5",
  "motion-safe:active:scale-[0.98] motion-safe:active:translate-y-0"
);

type View = "home" | "start" | "join";

function loadDraft(): { name: string; avatarId: AvatarId } | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(LOBBY_DRAFT_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { name?: string; avatarId?: AvatarId };
    return {
      name: parsed.name ?? "",
      avatarId: parsed.avatarId ?? DEFAULT_AVATAR_ID,
    };
  } catch {
    return null;
  }
}

function StepProgress({ step }: { step: number }) {
  return (
    <div
      className="flex gap-1.5"
      role="progressbar"
      aria-valuenow={step}
      aria-valuemin={1}
      aria-valuemax={START_STEPS}
      aria-label={`Step ${step} of ${START_STEPS}`}
    >
      {Array.from({ length: START_STEPS }, (_, i) => (
        <span
          key={i}
          className={cn(
            "h-1 flex-1 rounded-full transition-all duration-500 ease-out",
            i < step ? "bg-primary" : "bg-border/60"
          )}
        />
      ))}
    </div>
  );
}

function WizardBack({
  onClick,
  disabled,
}: {
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label="Go back"
      className={cn(
        "flex size-10 shrink-0 items-center justify-center rounded-full",
        "border border-border/80 bg-muted/90 text-foreground/80 shadow-sm",
        "transition-[color,transform,background-color,border-color] duration-200 ease-out",
        "hover:border-border hover:bg-muted hover:text-foreground",
        "motion-safe:active:scale-90",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50",
        "disabled:pointer-events-none disabled:opacity-30"
      )}
    >
      <ChevronLeft className="size-5" strokeWidth={2} aria-hidden />
    </button>
  );
}

function WizardHeader({
  step,
  onBack,
  backDisabled,
}: {
  step: number;
  onBack: () => void;
  backDisabled?: boolean;
}) {
  return (
    <div className="flex items-center gap-2">
      <WizardBack onClick={onBack} disabled={backDisabled} />
      <div className="min-w-0 flex-1">
        <StepProgress step={step} />
      </div>
    </div>
  );
}

export function RoomLobby() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const { deviceId, ready } = useDeviceId();

  const [view, setView] = useState<View>("home");
  const [startStep, setStartStep] = useState(1);
  const [stepDir, setStepDir] = useState<"fwd" | "back">("fwd");

  const [name, setName] = useState("");
  const [avatarId, setAvatarId] = useState<AvatarId>(DEFAULT_AVATAR_ID);

  const [launching, setLaunching] = useState(false);
  const [swoosh, setSwoosh] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [shake, setShake] = useState(false);
  const [nameFieldReset, setNameFieldReset] = useState(0);
  const [homeCtaHovering, setHomeCtaHovering] = useState(false);
  const [launchPull, setLaunchPull] = useState<number | null>(null);
  const nameInputRef = useRef<HTMLInputElement>(null);
  const submitLock = useRef(false);

  useEffect(() => {
    const draft = loadDraft();
    if (draft) {
      setName(draft.name);
      setAvatarId(draft.avatarId);
    }
  }, []);

  useEffect(() => {
    localStorage.setItem(
      LOBBY_DRAFT_KEY,
      JSON.stringify({ name, avatarId })
    );
  }, [name, avatarId]);

  const showError = useCallback((message: string) => {
    setError(message);
    setShake(true);
    const t = setTimeout(() => setShake(false), 500);
    return () => clearTimeout(t);
  }, []);

  const goStep = (next: number, dir: "fwd" | "back") => {
    setStepDir(dir);
    setStartStep(next);
    setError(null);
    if (next === 1) setNameFieldReset((n) => n + 1);
  };

  const persistAndGo = useCallback(
    (membership: MeetingMembership, chosenAvatarId: AvatarId) => {
      saveRoomSession({
        topic: membership.topic,
        title: membership.title,
        displayName: membership.display_name,
        deviceFingerprint: membership.device_fingerprint,
        avatarId: chosenAvatarId,
        isHost: membership.is_host,
        memberStatus: membership.member_status,
      });
      startTransition(() => {
        router.push(meetPath(membership.topic));
      });
    },
    [router]
  );

  const resetLaunch = useCallback(() => {
    setLaunching(false);
    setLaunchPull(null);
    setSwoosh(false);
    submitLock.current = false;
  }, []);

  useEffect(() => {
    if (!launching || !isPending) return;

    setLaunchPull((p) =>
      p === null ? null : Math.max(p, LAUNCH_PROGRESS_NAV)
    );

    const ramp = window.setInterval(() => {
      setLaunchPull((p) => {
        if (p === null) return null;
        return Math.min(LAUNCH_PROGRESS_DONE, p + 0.04);
      });
    }, 50);

    return () => window.clearInterval(ramp);
  }, [isPending, launching]);

  const handleStart = async () => {
    if (!deviceId || submitLock.current) return;
    submitLock.current = true;
    setError(null);
    setLaunching(true);
    setLaunchPull(0);

    const reduced = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;

    let loadRamp: ReturnType<typeof setInterval> | undefined;

    if (!reduced) {
      loadRamp = setInterval(() => {
        setLaunchPull((p) => {
          if (p === null) return null;
          return Math.min(LAUNCH_PROGRESS_CAP, p + 0.02);
        });
      }, 45);
    }

    try {
      const membership = await createMeeting(
        deviceId,
        name.trim() || undefined,
        avatarId
      );

      if (loadRamp) clearInterval(loadRamp);
      setLaunchPull(LAUNCH_PROGRESS_API);

      const path = meetPath(membership.topic);
      router.prefetch(path);
      setLaunchPull(LAUNCH_PROGRESS_PREFETCH);

      if (!reduced) {
        await sleep(100);
        setLaunchPull(LAUNCH_PROGRESS_NAV);
        await sleep(LAUNCH_MAGNET_SETTLE_MS);
        setLaunchPull(LAUNCH_PROGRESS_DONE);
        await sleep(180);
        setSwoosh(true);
        await sleep(LAUNCH_SWOOSH_MS);
      }

      persistAndGo(membership, avatarId);
    } catch (e) {
      if (loadRamp) clearInterval(loadRamp);
      showError(e instanceof Error ? e.message : "Could not start");
      resetLaunch();
    }
  };

  const handleJoinProfile = async ({
    code: joinCode,
    name: joinName,
    avatarId: joinAvatarId,
  }: {
    code: string;
    name: string;
    avatarId: AvatarId;
  }) => {
    if (!deviceId || submitLock.current) return;

    submitLock.current = true;
    setError(null);

    const displayName = joinName.trim() || `Guest ${deviceId.slice(-4)}`;

    saveRoomSession({
      topic: joinCode,
      title: "Session",
      displayName,
      deviceFingerprint: deviceId,
      avatarId: joinAvatarId,
      isHost: false,
      memberStatus: "approved",
    });

    startTransition(() => {
      router.push(meetPath(joinCode));
    });
  };

  const busy = launching || isPending || !ready || !deviceId;

  const stepAnim =
    stepDir === "fwd" ? "animate-lobby-step-in" : "animate-lobby-step-back";

  const nameReady = name.trim().length > 0;

  return (
    <main className="relative flex min-h-dvh min-w-0 items-center justify-center overflow-x-hidden p-4 sm:p-6 md:p-8">
      <LobbyEmojiFlow
        ctaHovering={view === "home" && homeCtaHovering}
        launchPull={launchPull}
      />
      <div
        className={cn(
          "relative z-10 w-full min-w-0 max-w-md animate-lobby-pop space-y-6 motion-safe:transition-opacity motion-safe:duration-500",
          launchPull !== null && "opacity-20"
        )}
      >
        <header className="flex flex-col items-center gap-2 text-center">
          <OnariamLogo href={null} />
          {view === "home" && (
            <p className="text-sm text-muted-foreground">
              Paste from phone to browser — peer-to-peer.
            </p>
          )}
        </header>

        <div
          className={cn(
            "relative overflow-hidden",
            shake && "animate-lobby-shake",
            swoosh && "animate-lobby-swoosh-out"
          )}
        >
          {swoosh && (
            <div
              className="pointer-events-none absolute inset-0 z-20 overflow-hidden"
              aria-hidden
            >
              <div className="animate-lobby-swoosh-streak absolute inset-y-0 -left-1/4 h-full w-2/3 bg-gradient-to-r from-transparent via-primary/50 to-transparent" />
            </div>
          )}

          {view === "home" && (
            <div
              className={cn(
                panel,
                "flex flex-col gap-4 p-5 motion-safe:[perspective:900px] sm:p-6"
              )}
              style={{ transformStyle: "preserve-3d" }}
              onMouseEnter={() => setHomeCtaHovering(true)}
              onMouseLeave={() => setHomeCtaHovering(false)}
            >
              <div className="space-y-1 text-center">
                <h1 className="text-lg font-medium text-foreground">
                  Sync clipboard across devices
                </h1>
                <p className="text-sm leading-relaxed text-muted-foreground">
                  Host a session or join with a code. Phone to browser,
                  peer-to-peer.
                </p>
              </div>
              <Button
                type="button"
                disabled={!ready || !deviceId}
                onClick={() => {
                  setView("start");
                  setStartStep(1);
                  setStepDir("fwd");
                  setNameFieldReset((n) => n + 1);
                  setError(null);
                }}
                className={cn(homeCtaHover, "h-12 w-full text-base")}
                size="lg"
              >
                Start sync
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setView("join");
                  setError(null);
                }}
                className={cn(homeCtaHover, "h-11 w-full")}
                size="lg"
              >
                Join with code
              </Button>
            </div>
          )}

          {view === "start" && (
            <div className="space-y-4">
              <WizardHeader
                step={startStep}
                backDisabled={launching}
                onBack={() => {
                  if (startStep === 1) {
                    setView("home");
                    setError(null);
                  } else {
                    goStep(startStep - 1, "back");
                  }
                }}
              />

              {startStep === 1 && (
                <div key="name" className={cn("space-y-5", stepAnim)}>
                  <LobbyNameInput
                    resetKey={nameFieldReset}
                    value={name}
                    onChange={setName}
                    inputRef={nameInputRef}
                    onEnter={() => {
                      if (nameReady) goStep(2, "fwd");
                    }}
                  />
                  {nameReady && (
                    <Button
                      type="button"
                      className="animate-lobby-reveal w-full motion-safe:active:scale-[0.98]"
                      size="lg"
                      onClick={() => goStep(2, "fwd")}
                    >
                      Next
                    </Button>
                  )}
                </div>
              )}

              {startStep === 2 && (
                <div key="avatar" className={cn("space-y-4", stepAnim)}>
                  <div className="space-y-1 text-center">
                    <p className="text-4xl leading-none" aria-hidden>
                      {getAvatarEmoji(avatarId)}
                    </p>
                    <p className="text-lg font-semibold tracking-tight text-foreground">
                      Pick your emoji
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Shown in the session header.
                    </p>
                  </div>
                  <AvatarPicker
                    value={avatarId}
                    onChange={setAvatarId}
                    compact
                  />
                  <Button
                    type="button"
                    className="w-full motion-safe:active:scale-[0.98]"
                    size="lg"
                    disabled={busy}
                    onClick={() => void handleStart()}
                  >
                    Start sync
                  </Button>
                </div>
              )}

            </div>
          )}

          {view === "join" && (
            <JoinSessionProfile
              title="Join with code"
              subtitle="Enter the code, your name, and an icon for the session."
              submitLabel="Continue to session"
              busy={busy}
              error={error}
              onBack={() => {
                setView("home");
                setError(null);
                submitLock.current = false;
              }}
              onSubmit={handleJoinProfile}
            />
          )}

          {error && (
            <p
              className="mt-3 animate-lobby-pop text-center text-sm text-destructive"
              role="alert"
            >
              {error}
            </p>
          )}
        </div>
      </div>
    </main>
  );
}

