/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Asset/image system with automatic placeholder detection.
 *
 * Images live under /public/images and are referenced by stable, key-based file names.
 * Every slot ships with a solid black PNG placeholder. At runtime we detect whether the
 * file at a given URL is a uniform (single-colour) placeholder; if so — or if the file is
 * missing — the UI omits the image and falls back to the plain look. Drop in a real
 * (non-uniform) PNG of the same name and it appears automatically, no code change needed.
 */

import { useEffect, useState } from 'react';
import { Buildings, Research, Ships, Defense } from '../types';

const BASE = '/images';

// --- Path builders (file name === canonical interface key) ---
export const buildingImage = (key: keyof Buildings): string => `${BASE}/buildings/${key}.png`;
export const researchImage = (key: keyof Research): string => `${BASE}/research/${key}.png`;
export const shipImage = (key: keyof Ships): string => `${BASE}/ships/${key}.png`;
export const defenseImage = (key: keyof Defense): string => `${BASE}/defense/${key}.png`;

export type PlanetImageCategory = 'hot' | 'temperate' | 'cold';
export const planetImage = (category: PlanetImageCategory, variant: number): string =>
  `${BASE}/planets/${category}-${variant}.png`;
export const backgroundImage = (view: string): string => `${BASE}/backgrounds/${view}.png`;

// Temperature -> planet image category (thresholds match generateUniverse temperatures).
export function getPlanetImageCategory(temperatureMax: number): PlanetImageCategory {
  if (temperatureMax >= 60) return 'hot';
  if (temperatureMax <= 0) return 'cold';
  return 'temperate';
}

// Deterministic 1..3 variant per planet id -> stable for the planet's lifetime, no state needed.
export function getPlanetImageVariant(planetId: string): number {
  let h = 0;
  for (let i = 0; i < planetId.length; i++) h = (h * 31 + planetId.charCodeAt(i)) >>> 0;
  return (h % 3) + 1;
}

// --- Recommended / allowed resolutions (soft validation, documented in public/images/README.md) ---
type ResoRule = { min: number; max: number; square: boolean };
function resolutionRule(url: string): ResoRule | null {
  if (/\/(buildings|research|ships|defense)\//.test(url)) return { min: 128, max: 512, square: true };
  if (/\/planets\//.test(url)) return { min: 256, max: 2048, square: false };
  if (/\/backgrounds\//.test(url)) return { min: 640, max: 2560, square: false };
  return null;
}

let debugEnabled = false;
export function setAssetDebug(enabled: boolean): void {
  debugEnabled = enabled;
}

// --- Placeholder detection with per-URL caching ---
type ImgStatus = 'real' | 'blank' | 'missing';
const cache = new Map<string, ImgStatus>();
const pending = new Map<string, Promise<ImgStatus>>();
const subscribers = new Map<string, Set<() => void>>();

const warnedResolution = new Set<string>();
function checkResolution(url: string, w: number, h: number): void {
  if (!debugEnabled || warnedResolution.has(url)) return;
  const rule = resolutionRule(url);
  if (!rule) return;
  warnedResolution.add(url);
  const problems: string[] = [];
  if (Math.max(w, h) > rule.max) problems.push(`zu groß (>${rule.max}px)`);
  if (Math.min(w, h) < rule.min) problems.push(`zu klein (<${rule.min}px)`);
  if (rule.square && w !== h) problems.push('nicht quadratisch');
  if (problems.length) {
    // eslint-disable-next-line no-console
    console.warn(`[Asset] ${url} (${w}×${h}): ${problems.join(', ')}`);
  }
}

function detect(url: string): Promise<ImgStatus> {
  const known = cache.get(url);
  if (known) return Promise.resolve(known);
  const inFlight = pending.get(url);
  if (inFlight) return inFlight;

  const p = new Promise<ImgStatus>((resolve) => {
    const img = new Image();
    img.onload = () => {
      try {
        const w = 16, h = 16;
        const canvas = document.createElement('canvas');
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        if (!ctx) return resolve('real');
        ctx.drawImage(img, 0, 0, w, h);
        const data = ctx.getImageData(0, 0, w, h).data;
        const r0 = data[0], g0 = data[1], b0 = data[2], a0 = data[3];
        let uniform = true;
        for (let i = 4; i < data.length; i += 4) {
          if (data[i] !== r0 || data[i + 1] !== g0 || data[i + 2] !== b0 || data[i + 3] !== a0) {
            uniform = false;
            break;
          }
        }
        // Only validate resolution for real images (placeholders are intentionally tiny).
        if (!uniform) checkResolution(url, img.naturalWidth, img.naturalHeight);
        resolve(uniform ? 'blank' : 'real');
      } catch {
        // Canvas read failed (e.g. tainted): assume the image is real so it still shows.
        resolve('real');
      }
    };
    img.onerror = () => resolve('missing');
    img.src = url;
  }).then((status) => {
    cache.set(url, status);
    pending.delete(url);
    const subs = subscribers.get(url);
    if (subs) subs.forEach((fn) => fn());
    return status;
  });

  pending.set(url, p);
  return p;
}

/**
 * Returns true only once the asset at `src` is confirmed to be a real (non-placeholder) image.
 * Triggers a one-time async detection per URL and re-renders the caller when it resolves.
 */
export function useAssetReady(src: string | null | undefined): boolean {
  const [, force] = useState(0);

  useEffect(() => {
    if (!src || cache.has(src)) return;
    let active = true;
    const cb = () => { if (active) force((x) => x + 1); };
    let set = subscribers.get(src);
    if (!set) { set = new Set(); subscribers.set(src, set); }
    set.add(cb);
    detect(src);
    return () => { active = false; set!.delete(cb); };
  }, [src]);

  return !!src && cache.get(src) === 'real';
}
