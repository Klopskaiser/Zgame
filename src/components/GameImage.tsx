/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { useAssetReady } from '../utils/images';

interface AssetThumbProps {
  src: string;
  alt?: string;
  className?: string;
}

/** Square icon-style thumbnail. Renders nothing until a real (non-placeholder) image exists. */
export function AssetThumb({ src, alt = '', className = '' }: AssetThumbProps) {
  const ready = useAssetReady(src);
  if (!ready) return null;
  return <img src={src} alt={alt} loading="lazy" className={className} />;
}

interface AssetBackgroundProps {
  src: string;
  /** Extra classes on the absolute wrapper (e.g. a z-index like "-z-10"). */
  className?: string;
  /** Dimming overlay classes on top of the image (keep content readable). */
  overlayClassName?: string;
}

/**
 * Absolutely-positioned, dimmed background layer. Renders nothing until a real image exists,
 * so with the default black placeholders the UI looks exactly as before.
 * The nearest positioned ancestor must be `relative` (and provide stacking via `isolate`
 * when using a negative z-index).
 */
export function AssetBackground({ src, className = '', overlayClassName = 'bg-slate-950/80' }: AssetBackgroundProps) {
  const ready = useAssetReady(src);
  if (!ready) return null;
  return (
    <div className={`absolute inset-0 pointer-events-none ${className}`} aria-hidden="true">
      <div className="absolute inset-0 bg-cover bg-center" style={{ backgroundImage: `url("${src}")` }} />
      <div className={`absolute inset-0 ${overlayClassName}`} />
    </div>
  );
}
