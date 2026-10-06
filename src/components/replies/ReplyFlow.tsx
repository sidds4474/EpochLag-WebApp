'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  openReply,
  submitReply,
  replyErrorCode,
} from '@/lib/replies/publicReplies';
import {
  setPendingReplyResume,
  consumePendingReplyResume,
} from '@/lib/replies/pendingReplyResume';
import { apiSaveAnonDraft } from '@/lib/onboarding/api/anonEndpoints';
import type { ReplyTargetType, ReplyAs, ReplySubmitSuccess } from '@/lib/replies/publicReplies';
import type { Platform } from '@/types/story';
import type { LocationValue, MusicValue } from '@/app/(app)/(dashboard)/new-story/pickers';

import { StepRecord } from '@/components/replies/steps/StepRecord';
import { StepCompose } from '@/components/replies/steps/StepCompose';
import { StepVerify } from '@/components/replies/steps/StepVerify';
import { StepComplete } from '@/components/replies/steps/StepComplete';
import { MomentUnavailable } from '@/components/replies/errors/MomentUnavailable';
import { LinkNotFound } from '@/components/replies/errors/LinkNotFound';
import { ReplyShell } from '@/components/replies/ReplyShell';

type Step = 'loading' | 'record' | 'compose' | 'verify' | 'complete' | 'error';
type VerifyTrigger = 'VERIFY_REQUIRED' | 'LOGIN_REQUIRED';

type PickerKind = 'date' | 'music' | 'location' | 'image' | 'video';

type RecordingResult = {
  audioBlob?: Blob;
  transcript?: string;
  // When set, StepCompose auto-opens this picker on mount so users don't have
  // to tap the same pill twice after advancing from StepRecord. For 'image'
  // and 'video' this opens the UploadMediaModal (capture-or-upload chooser).
  openPicker?: PickerKind;
};

type ErrorKind = 'LINK_NOT_FOUND' | 'REPLY_NOT_ALLOWED' | 'OTHER';

type Props = {
  targetType: ReplyTargetType;
  code: string;
  platform: Platform;
  replyAs?: ReplyAs;
  senderName: string;
  promptText: string;
};

export default function ReplyFlow({
  targetType,
  code,
  platform,
  replyAs,
  senderName,
}: Props) {
  const router = useRouter();

  const [step, setStep] = useState<Step>('loading');
  const [errorKind, setErrorKind] = useState<ErrorKind | null>(null);

  // draftToken lives only in memory — never URL or storage.
  const [draftToken, setDraftToken] = useState<string | null>(null);

  // Cached recording result between StepRecord and StepCompose
  const [recordingResult, setRecordingResult] = useState<RecordingResult>({});

  // Verify state
  const [verifyTrigger, setVerifyTrigger] = useState<VerifyTrigger | null>(null);

  // Submit result
  const [submitResult, setSubmitResult] = useState<ReplySubmitSuccess | null>(null);

  // Inline error surfaced back to StepCompose (e.g. REPLY_ALREADY_SENT)
  const [composeError, setComposeError] = useState<string | null>(null);

  // Picker state — shared between StepRecord and StepCompose so a date/music/
  // location chosen on the record screen persists after advancing to compose.
  // Each setter writes through to the anon draft so the backend has them on
  // submit without needing a separate "save" step.
  const [dateOfStory, setDateOfStory] = useState<string | null>(null);
  const [location, setLocation] = useState<LocationValue | null>(null);
  const [music, setMusic] = useState<MusicValue | null>(null);

  const handleDateChange = (next: string | null) => {
    setDateOfStory(next);
    if (!draftToken) return;
    apiSaveAnonDraft({ dateOfStory: next }, draftToken).catch((err) => {
      // eslint-disable-next-line no-console
      console.warn('[ReplyFlow] date save failed', err);
    });
  };
  const handleLocationChange = (next: LocationValue | null) => {
    setLocation(next);
    if (!draftToken) return;
    // Map the picker's LocationValue to the backend's LagLocation shape.
    const location = next
      ? {
          city: next.city,
          country: null,
          formattedAddress: next.formattedAddress,
          placeId: next.placeId,
        }
      : null;
    apiSaveAnonDraft({ location }, draftToken).catch((err) => {
      // eslint-disable-next-line no-console
      console.warn('[ReplyFlow] location save failed', err);
    });
  };
  const handleMusicChange = (next: MusicValue | null) => {
    setMusic(next);
    if (!draftToken) return;
    apiSaveAnonDraft({ music: next }, draftToken).catch((err) => {
      // eslint-disable-next-line no-console
      console.warn('[ReplyFlow] music save failed', err);
    });
  };

  // Open reply session on mount
  useEffect(() => {
    let cancelled = false;

    // Resume path: if we routed out to /login after a LOGIN_REQUIRED on
    // submit, we stashed the previous draftToken + replyAs. On return (now
    // with a JWT in localStorage via applyAuth), skip openReply, reuse the
    // same draftToken (which still has the user's composed content on the
    // backend), and re-attempt the submit with auth attached. The user never
    // sees StepRecord — they go straight to StepComplete on success.
    const resume = consumePendingReplyResume({ targetType, code });
    if (resume) {
      // eslint-disable-next-line no-console
      console.log('[ReplyFlow] resuming after login', {
        draftToken: resume.draftToken.slice(0, 10) + '…',
        hasReplyAs: !!resume.replyAs,
      });
      setDraftToken(resume.draftToken);
      // Jump into loading while we re-submit — avoids a flash of StepRecord
      setStep('loading');
      void attemptSubmit(resume.draftToken, 3, resume.replyAs);
      return () => {
        cancelled = true;
      };
    }

    openReply(targetType, code)
      .then(({ draftToken: token }) => {
        if (cancelled) return;
        setDraftToken(token);
        setStep('record');
      })
      .catch((err) => {
        if (cancelled) return;
        const code = replyErrorCode(err);
        if (code === 'LINK_NOT_FOUND' || code === 'LINK_REVOKED') {
          setErrorKind('LINK_NOT_FOUND');
        } else if (code === 'REPLY_NOT_ALLOWED') {
          setErrorKind('REPLY_NOT_ALLOWED');
        } else {
          setErrorKind('OTHER');
        }
        setStep('error');
      });

    return () => {
      cancelled = true;
    };
  }, [targetType, code]);

  // Called by StepRecord when user hits Next
  const handleRecordNext = (result: RecordingResult) => {
    setRecordingResult(result);
    setStep('compose');
  };

  // Called by StepCompose when user taps "Reply"
  const handleComposeSumbit = async () => {
    if (!draftToken) return;
    setComposeError(null);
    await attemptSubmit(draftToken);
  };

  const attemptSubmit = async (
    token: string,
    attemptsLeft = 3,
    replyAsOverride?: ReplyAs
  ): Promise<void> => {
    const effectiveReplyAs = replyAsOverride ?? replyAs;
    try {
      // eslint-disable-next-line no-console
      console.log(
        '[ReplyFlow] submitReply payload',
        'draftToken=', token?.slice(0, 8) + '…',
        'targetType=', targetType,
        'code=', code,
        'replyAs.name=', effectiveReplyAs?.name ?? '(none)',
        'replyAs.phone=', effectiveReplyAs?.phone ?? '(none)',
        'replyAs.countryCode=', effectiveReplyAs?.countryCode ?? '(none)',
        'replyAs.email=', effectiveReplyAs?.email ?? '(none)',
      );
      const result = await submitReply({ draftToken: token, replyAs: effectiveReplyAs });
      setSubmitResult(result);
      setStep('complete');
    } catch (err) {
      const errCode = replyErrorCode(err);
      // eslint-disable-next-line no-console
      console.error('[ReplyFlow] submitReply failed', {
        errCode,
        err,
        rawMessage: err instanceof Error ? err.message : String(err),
      });

      if (errCode === 'VERIFY_REQUIRED') {
        setVerifyTrigger('VERIFY_REQUIRED');
        setStep('verify');
      } else if (errCode === 'LOGIN_REQUIRED') {
        // Loop guard: if we already have a JWT in storage (user DID log in but
        // backend still says LOGIN_REQUIRED), don't bounce them to /login
        // again — surface the error instead.
        const hasJwt =
          typeof window !== 'undefined' &&
          !!window.localStorage.getItem('epochlag.token');
        if (hasJwt) {
          setComposeError(
            'Login succeeded but reply still rejected. Please try again.'
          );
          setStep('compose');
        } else {
          // Stash the draftToken + identity so the composer can resume on
          // return — the composed content stays on the server tied to this
          // draftToken, we just need to re-attempt the submit with the JWT
          // once the user logs in.
          setPendingReplyResume({
            draftToken: token,
            targetType,
            code,
            replyAs: effectiveReplyAs,
          });
          if (typeof window !== 'undefined') {
            const returnTo = window.location.pathname + window.location.search;
            const params = new URLSearchParams({ returnTo });
            if (effectiveReplyAs?.email) {
              params.set('prefillEmail', effectiveReplyAs.email);
            } else if (effectiveReplyAs?.phone) {
              params.set('prefillPhone', effectiveReplyAs.phone);
              if (effectiveReplyAs.countryCode) params.set('prefillCc', effectiveReplyAs.countryCode);
            }
            router.push(`/login?${params.toString()}`);
          }
        }
      } else if (errCode === 'REPLY_ALREADY_SENT') {
        setComposeError('Your reply has already been sent.');
      } else if (errCode === 'LINK_REVOKED') {
        setErrorKind('LINK_NOT_FOUND');
        setStep('error');
      } else if (errCode === 'REPLY_MERGE_FAILED' && attemptsLeft > 1) {
        await new Promise((r) => setTimeout(r, 1500));
        return attemptSubmit(token, attemptsLeft - 1);
      } else if (errCode === 'REPLY_IN_PROGRESS' && attemptsLeft > 1) {
        await new Promise((r) => setTimeout(r, 2000));
        return attemptSubmit(token, attemptsLeft - 1);
      } else {
        console.error('Reply submit failed:', err);
        setComposeError('Something went wrong. Please try again.');
      }
    }
  };

  // Called by StepVerify when auth completes
  const handleVerified = async (token: string) => {
    if (!draftToken) return;
    // Store the freshly obtained token so the api client picks it up on
    // the re-submit request (client.ts reads from localStorage).
    if (typeof window !== 'undefined') {
      window.localStorage.setItem('epochlag.token', token);
    }
    setComposeError(null);
    setStep('compose');
    await attemptSubmit(draftToken);
  };

  const handleBack = () => {
    if (step === 'record') {
      router.back();
    } else if (step === 'compose') {
      setStep('record');
    } else if (step === 'verify') {
      setStep('compose');
    }
  };

  // Loading
  if (step === 'loading') {
    return (
      <ReplyShell>
        <div className="flex-1 flex flex-col items-center justify-center gap-6">
          {/* Concentric circles — breathing, staggered scales. Same color palette
              as the record screen so the brand carries through the handoff. */}
          <div className="relative w-[88px] h-[88px] flex items-center justify-center">
            <div
              className="absolute inset-0 rounded-full bg-[#FCD6A5]"
              style={{ animation: 'reply-pulse 2.4s ease-in-out infinite' }}
            />
            <div
              className="absolute w-[60px] h-[60px] rounded-full bg-[#EF9849]"
              style={{ animation: 'reply-pulse 2.4s ease-in-out infinite 0.2s' }}
            />
            <div
              className="absolute w-[34px] h-[34px] rounded-full bg-[#D95F3B]"
              style={{ animation: 'reply-pulse 2.4s ease-in-out infinite 0.4s' }}
            />
          </div>
          <p className="font-lora text-[18px] text-[#151515]">
            Preparing your reply…
          </p>
          <style>{`
            @keyframes reply-pulse {
              0%, 100% { transform: scale(1); opacity: 0.9; }
              50%      { transform: scale(1.08); opacity: 1; }
            }
          `}</style>
        </div>
      </ReplyShell>
    );
  }

  // Error states
  if (step === 'error') {
    if (errorKind === 'LINK_NOT_FOUND') {
      return <LinkNotFound />;
    }
    if (errorKind === 'REPLY_NOT_ALLOWED') {
      return <MomentUnavailable />;
    }
    // Generic error
    return <MomentUnavailable />;
  }

  // Steps
  if (step === 'record') {
    return (
      <StepRecord
        senderName={senderName}
        targetType={targetType}
        draftToken={draftToken!}
        onNext={handleRecordNext}
        onBack={handleBack}
        dateOfStory={dateOfStory}
        location={location}
        music={music}
        onDateChange={handleDateChange}
        onLocationChange={handleLocationChange}
        onMusicChange={handleMusicChange}
      />
    );
  }

  if (step === 'compose') {
    return (
      <StepCompose
        senderName={senderName}
        draftToken={draftToken!}
        replyAs={replyAs}
        onBack={handleBack}
        onSubmit={handleComposeSumbit}
        audioBlob={recordingResult.audioBlob}
        transcript={recordingResult.transcript}
        openPickerOnMount={recordingResult.openPicker}
        submitError={composeError ?? undefined}
        dateOfStory={dateOfStory}
        location={location}
        music={music}
        onDateChange={handleDateChange}
        onLocationChange={handleLocationChange}
        onMusicChange={handleMusicChange}
      />
    );
  }

  if (step === 'verify' && verifyTrigger) {
    return (
      <StepVerify
        senderName={senderName}
        trigger={verifyTrigger}
        onVerified={handleVerified}
        onBack={handleBack}
      />
    );
  }

  if (step === 'complete') {
    // Build the view URL from targetType + publicCode. Backend also returns
    // a `publicUrl` field but it points at the API endpoint
    // (`/api/public/prompt/<code>`) rather than the frontend route — so we
    // ignore it and construct the frontend path ourselves. The contract says:
    // "after reply lands, same URL shows it" → /prompt/<code> for prompts,
    // /story/<code> for stories.
    const resultTargetType = submitResult?.targetType ?? targetType;
    const resultPublicCode = submitResult?.publicCode ?? code;
    const viewUrl = `/${resultTargetType}/${resultPublicCode}`;

    // eslint-disable-next-line no-console
    console.log('[ReplyFlow] StepComplete viewUrl =', viewUrl, {
      resultTargetType,
      resultPublicCode,
      backendPublicUrl: submitResult?.publicUrl,
    });

    return (
      <StepComplete
        senderName={senderName}
        platform={platform}
        publicCode={resultPublicCode}
        viewUrl={viewUrl}
      />
    );
  }

  return null;
}
