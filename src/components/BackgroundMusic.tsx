import { setAudioModeAsync, useAudioPlayer, useAudioPlayerStatus } from 'expo-audio';
import { useEffect, useState } from 'react';
import { AppState, type AppStateStatus } from 'react-native';

import { MUSIC_VOLUME_VALUES, useMusicStore } from '@/state/musicStore';

const HOME_TEAM = require('../../assets/audio/home-team-loop.mp3');

/**
 * Owns Hearth's ambient loop for the lifetime of the app. Playback respects
 * the device-local preference and pauses whenever Hearth is not active.
 */
export function BackgroundMusic() {
  const player = useAudioPlayer(HOME_TEAM, { downloadFirst: true, updateInterval: 1000 });
  const playerStatus = useAudioPlayerStatus(player);
  const [appState, setAppState] = useState<AppStateStatus>(AppState.currentState);
  const [audioReady, setAudioReady] = useState(false);
  const enabled = useMusicStore((state) => state.enabled);
  const volume = useMusicStore((state) => state.volume);
  const hydrated = useMusicStore((state) => state.hydrated);
  const hydrate = useMusicStore((state) => state.hydrate);
  const retryToken = useMusicStore((state) => state.retryToken);
  const setPlaybackStatus = useMusicStore((state) => state.setPlaybackStatus);

  useEffect(() => {
    let mounted = true;
    void hydrate();
    void setAudioModeAsync({
      playsInSilentMode: true,
      shouldPlayInBackground: false,
      interruptionMode: 'mixWithOthers',
    })
      .catch(() => {
        // Still attempt playback if a device cannot customize its audio session.
      })
      .finally(() => {
        if (mounted) setAudioReady(true);
      });

    return () => {
      mounted = false;
    };
  }, [hydrate]);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', setAppState);
    return () => subscription.remove();
  }, []);

  useEffect(() => {
    // expo-audio intentionally exposes these player controls as mutable properties.
    // eslint-disable-next-line react-hooks/immutability
    player.loop = true;
    player.volume = MUSIC_VOLUME_VALUES[volume];

    if (audioReady && playerStatus.isLoaded && hydrated && enabled && appState === 'active') {
      player.play();
    } else {
      player.pause();
    }
  }, [
    appState,
    audioReady,
    enabled,
    hydrated,
    player,
    playerStatus.isLoaded,
    retryToken,
    volume,
  ]);

  useEffect(() => {
    if (!enabled) {
      setPlaybackStatus('off');
    } else if (playerStatus.error) {
      setPlaybackStatus('error', playerStatus.error);
    } else if (playerStatus.playing) {
      setPlaybackStatus('playing');
    } else if (!audioReady || !playerStatus.isLoaded || playerStatus.isBuffering) {
      setPlaybackStatus('loading');
    } else {
      setPlaybackStatus('waiting', playerStatus.reasonForWaitingToPlay || null);
    }
  }, [
    audioReady,
    enabled,
    playerStatus.error,
    playerStatus.isBuffering,
    playerStatus.isLoaded,
    playerStatus.playing,
    playerStatus.reasonForWaitingToPlay,
    setPlaybackStatus,
  ]);

  return null;
}
