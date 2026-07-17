import { requireOptionalNativeModule } from 'expo';
import type { GameplaySystemGestureDeferral } from './SystemGestures.types';

export default requireOptionalNativeModule<GameplaySystemGestureDeferral>(
  'SystemGestures',
);
