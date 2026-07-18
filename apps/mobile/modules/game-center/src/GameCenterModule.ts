import { requireOptionalNativeModule } from 'expo';

import type { PonggersGameCenterModule } from './GameCenter.types';

export default requireOptionalNativeModule<PonggersGameCenterModule>(
  'PonggersGameCenter',
);
