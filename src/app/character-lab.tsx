import { Redirect } from 'expo-router';

import { CharacterLab } from '@/character/CharacterLab';

export default function CharacterLabRoute() {
  if (!__DEV__) return <Redirect href="/" />;
  return <CharacterLab />;
}
