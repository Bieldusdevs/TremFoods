import type { ModelViewerElement } from '@google/model-viewer';
import type { DetailedHTMLProps, HTMLAttributes } from 'react';

type MVProps = DetailedHTMLProps<HTMLAttributes<ModelViewerElement>, ModelViewerElement> & {
  class?: string;
  slot?: string;
  src?: string;
  'ios-src'?: string;
  poster?: string;
  alt?: string;
  ar?: boolean;
  'ar-modes'?: string;
  'ar-scale'?: 'auto' | 'fixed';
  'ar-placement'?: 'floor' | 'wall';
  'camera-controls'?: boolean;
  'auto-rotate'?: boolean;
  'auto-rotate-delay'?: number;
  'rotation-per-second'?: string;
  'interaction-prompt'?: string;
  'shadow-intensity'?: string;
  'environment-image'?: string;
  exposure?: string;
  'camera-orbit'?: string;
  'touch-action'?: string;
};

declare module 'react' {
  namespace JSX {
    interface IntrinsicElements {
      'model-viewer': MVProps;
    }
  }
}
