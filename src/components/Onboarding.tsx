/*
THESIS: Opening Hearth feels like entering a shared story, not completing a generic account modal.
OWN-WORLD: A twilight book cover holds one parchment folio with a coral binding, clay actions, sage replies, Fredoka headings, and Nunito prose.
STORY: Understand the promise, choose a familiar name, then create or join one private home.
FIRST VIEWPORT: A small voxel hearth leads one large left-aligned promise; the single primary action rests at the page foot within thumb reach.
FORM: Shared-house field guide, third grounded direction, seed 45488e1d.
FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance
*/
import { useState } from 'react';

import {
  HearthButton,
  HearthNotice,
  HearthScreen,
  HearthTextField,
  StoryActions,
  StoryBody,
  StoryHeading,
  StoryHearthMark,
  StoryProgress,
} from '@/components/ui/HearthPrimitives';
import { readFrontDoorPreview } from '@/components/frontDoorPreview';
import { useAuthStore } from '@/state/authStore';

export function Onboarding() {
  const preview = readFrontDoorPreview();
  const phase = useAuthStore((state) => state.phase);
  const displayName = useAuthStore((state) => state.displayName);
  const busy = useAuthStore((state) => state.busy);
  const error = useAuthStore((state) => state.error);
  const setDisplayName = useAuthStore((state) => state.setDisplayName);
  const clearError = useAuthStore((state) => state.clearError);

  const [step, setStep] = useState<'welcome' | 'name'>(
    preview === 'name' ? 'name' : 'welcome',
  );
  const [name, setName] = useState('');
  const ready = name.trim().length > 0;

  if (preview && preview !== 'welcome' && preview !== 'name') return null;
  if (!preview && (phase !== 'noHome' || displayName)) return null;

  if (step === 'welcome') {
    return (
      <HearthScreen>
        <StoryProgress current={1} total={3} />
        <StoryHearthMark />
        <StoryHeading focusKey="welcome">A home for the moments words don’t fit.</StoryHeading>
        <StoryBody>
          Choose a place in your shared home to say what you need. Your partner
          can answer gently, without scores, pressure, or public activity.
        </StoryBody>
        <HearthNotice message="Hearth is private to the two people who share this home." />
        <StoryActions>
          <HearthButton label="Set up our home" onPress={() => setStep('name')} />
        </StoryActions>
      </HearthScreen>
    );
  }

  return (
    <HearthScreen>
      <StoryProgress current={2} total={3} />
      <StoryHeading focusKey="name">What should your partner call you?</StoryHeading>
      <StoryBody>
        Use a first name or nickname they’ll recognize. You can change it later.
      </StoryBody>
      <HearthTextField
        label="Your name"
        value={name}
        onChangeText={(value) => {
          setName(value);
          if (error) clearError();
        }}
        placeholder="Name or nickname"
        autoCapitalize="words"
        autoCorrect={false}
        autoComplete="name"
        textContentType="name"
        maxLength={24}
        editable={!busy}
        returnKeyType="done"
        onSubmitEditing={() => ready && !preview && void setDisplayName(name)}
        error={error?.message}
      />
      <StoryActions>
        <HearthButton
          label="Continue"
          onPress={() => preview ? undefined : void setDisplayName(name)}
          disabled={!ready}
          busy={busy}
        />
        <HearthButton
          label="Back"
          variant="quiet"
          onPress={() => {
            clearError();
            setStep('welcome');
          }}
          disabled={busy}
        />
      </StoryActions>
    </HearthScreen>
  );
}
