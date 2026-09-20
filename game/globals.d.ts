import type { SetKey } from './sets';

declare global {
  interface Window {
    INITIAL_SET_KEY?: SetKey;
  }
}

export { };
