"use client";

import { ChevronLeft, Loader2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import {
  AvatarPicker,
  DEFAULT_AVATAR_ID,
} from "@/components/avatar-picker";
import { LobbyNameInput } from "@/components/lobby-name-input";
import { Button } from "@/components/ui/button";
import type { AvatarId } from "@/lib/avatars";
import { getAvatarEmoji } from "@/lib/avatars";
import {
  loadJoinProfileDraft,
  saveJoinProfileDraft,
  type JoinProfileDraft,
} from "@/lib/join-profile";
import {
  formatMeetCode,
  isValidMeetCode,
  normalizeMeetCodeInput,
} from "@/lib/meet-code";
import { input, panel } from "@/lib/ui";
import { cn } from "@/lib/utils";

export type JoinProfileValues = JoinProfileDraft & {
  code: string;
};

type Props = {
  /** Prefilled session code; when set, code step is skipped. */
  code?: string;
  title?: string;
  subtitle?: string;
  submitLabel?: string;
  busy?: boolean;
  error?: string | null;
  className?: string;
  onBack?: () => void;
  onSubmit: (values: JoinProfileValues) => void | Promise<void>;
};

const JOIN_STEPS_WITH_CODE = 3;
const JOIN_STEPS_NO_CODE = 2;

function StepProgress({
  step,
  total,
}: {
  step: number;
  total: number;
}) {
  return (
    <div
      className="flex gap-1.5"
      role="progressbar"
      aria-valuenow={step}
      aria-valuemin={1}
      aria-valuemax={total}
      aria-label={`Step ${step} of ${total}`}
    >
      {Array.from({ length: total }, (_, i) => (
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

export function JoinSessionProfile({
  code: fixedCode,
  title = "Join session",
  subtitle = "Name and icon for this session.",
  submitLabel = "Enter session",
  busy = false,
  error,
  className,
  onBack,
  onSubmit,
}: Props) {
  const skipCode = Boolean(fixedCode && isValidMeetCode(formatMeetCode(fixedCode)));
  const totalSteps = skipCode ? JOIN_STEPS_NO_CODE : JOIN_STEPS_WITH_CODE;

  const [step, setStep] = useState(1);
  const [stepDir, setStepDir] = useState<"fwd" | "back">("fwd");
  const [code, setCode] = useState(fixedCode ?? "");
  const [name, setName] = useState("");
  const [avatarId, setAvatarId] = useState<AvatarId>(DEFAULT_AVATAR_ID);
  const [nameFieldReset, setNameFieldReset] = useState(0);
  const nameInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const draft = loadJoinProfileDraft();
    if (draft) {
      setName(draft.name);
      setAvatarId(draft.avatarId);
    }
    if (fixedCode) setCode(formatMeetCode(fixedCode));
  }, [fixedCode]);

  useEffect(() => {
    saveJoinProfileDraft({ name, avatarId });
  }, [name, avatarId]);

  const codeStep = skipCode ? -1 : 1;
  const nameStep = skipCode ? 1 : 2;
  const avatarStep = skipCode ? 2 : 3;

  const codeReady = isValidMeetCode(normalizeMeetCodeInput(code));
  const nameReady = name.trim().length > 0;

  const goStep = (next: number, dir: "fwd" | "back") => {
    setStepDir(dir);
    setStep(next);
    if (next === nameStep) setNameFieldReset((n) => n + 1);
  };

  const handleFinalSubmit = () => {
    const formatted = formatMeetCode(skipCode ? fixedCode! : code);
    if (!isValidMeetCode(formatted)) return;
    void onSubmit({
      code: formatted,
      name: name.trim(),
      avatarId,
    });
  };

  const stepAnim =
    stepDir === "fwd" ? "animate-lobby-step-in" : "animate-lobby-step-back";

  return (
    <div className={cn(panel, "w-full max-w-md space-y-4 p-4 sm:p-6", className)}>
      <div className="flex items-start gap-2">
        {onBack ? (
          <button
            type="button"
            onClick={onBack}
            disabled={busy}
            aria-label="Go back"
            className="flex size-10 shrink-0 items-center justify-center rounded-full border border-border/80 bg-muted/90 text-foreground/80 hover:bg-muted"
          >
            <ChevronLeft className="size-5" aria-hidden />
          </button>
        ) : (
          <span className="size-10 shrink-0" aria-hidden />
        )}
        <div className="min-w-0 flex-1 space-y-1 text-center">
          <p className="text-lg font-semibold tracking-tight text-foreground">
            {title}
          </p>
          <p className="text-pretty text-sm text-muted-foreground">{subtitle}</p>
        </div>
        <span className="size-10 shrink-0" aria-hidden />
      </div>

      <StepProgress step={step} total={totalSteps} />

      {step === codeStep && (
        <div className={cn("space-y-4", stepAnim)}>
          <input
            className={cn(
              input,
              "h-11 font-mono text-center text-base tracking-[0.14em]",
              codeReady && "border-primary/50 ring-1 ring-primary/25"
            )}
            value={code}
            onChange={(e) => setCode(normalizeMeetCodeInput(e.target.value))}
            placeholder="abc-defg-hijk"
            maxLength={12}
            autoComplete="off"
            autoFocus
            onKeyDown={(e) => {
              if (e.key === "Enter" && codeReady) goStep(nameStep, "fwd");
            }}
          />
          <Button
            type="button"
            className="w-full"
            size="lg"
            disabled={!codeReady || busy}
            onClick={() => goStep(nameStep, "fwd")}
          >
            Next
          </Button>
        </div>
      )}

      {step === nameStep && (
        <div className={cn("space-y-4", stepAnim)}>
          <LobbyNameInput
            resetKey={nameFieldReset}
            value={name}
            onChange={setName}
            inputRef={nameInputRef}
            onEnter={() => {
              if (nameReady) goStep(avatarStep, "fwd");
            }}
          />
          {nameReady && (
            <Button
              type="button"
              className="w-full"
              size="lg"
              disabled={busy}
              onClick={() => goStep(avatarStep, "fwd")}
            >
              Next
            </Button>
          )}
        </div>
      )}

      {step === avatarStep && (
        <div className={cn("space-y-4", stepAnim)}>
          <div className="space-y-1 text-center">
            <p className="text-4xl leading-none" aria-hidden>
              {getAvatarEmoji(avatarId)}
            </p>
            <p className="text-sm font-medium text-foreground">Pick your icon</p>
            <p className="text-xs text-muted-foreground">
              Shown next to your name for everyone in the session.
            </p>
          </div>
          <AvatarPicker value={avatarId} onChange={setAvatarId} compact />
          <Button
            type="button"
            className="w-full"
            size="lg"
            disabled={busy || !nameReady}
            onClick={handleFinalSubmit}
          >
            {busy ? (
              <Loader2 className="size-4 animate-spin" aria-hidden />
            ) : (
              submitLabel
            )}
          </Button>
        </div>
      )}

      {error && (
        <p className="text-center text-sm text-destructive" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
