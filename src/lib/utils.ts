import { html } from "lit";

export function isOnlySpaces(str: string) {
  return str.trim().length === 0;
}

export function delay(miliSec: number) {
  return new Promise((res) => setTimeout(() => res(true), miliSec));
}

export function clamp(val: number, min: number, max?: number): number {
  if (typeof val !== "number" || typeof min !== "number" || (max !== undefined && typeof max !== "number")) {
    throw new TypeError("All arguments must be numbers.");
  }

  if (max !== undefined && min > max) {
    throw new RangeError("The 'min' value cannot be greater than the 'max' value.");
  }

  if (max !== undefined) {
    return Math.min(Math.max(val, min), max);
  }

  return Math.max(val, min);
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Procedure = (...args: any[]) => void;

export function throttle<T extends Procedure>(callback: T, delay = 100): T {
  let lastCall = 0;

  return ((...args: Parameters<T>) => {
    const now = Date.now();
    if (now - lastCall >= delay) {
      lastCall = now;
      callback(...args);
    }
  }) as T;
}

export function debounce(callback: Procedure, delay: number): Procedure {
  let timer: number | undefined = undefined;

  return (...args: unknown[]) => {
    clearTimeout(timer);
    timer = setTimeout(() => callback(...args), delay);
  };
};

export function fixedToThirdDecimal(num: number) {
  return Math.round(num * 1000) / 1000;
}

export function pxToNumber(pxStr: string) {
  return Number(pxStr.split("px")[0]);
}

export async function urlToBlob(blobUrl: string) {
  const res = await fetch(blobUrl);
  return await res.blob();
}

export function linkify(text: string) {
  const urlPattern = /(\b(https?|ftp|file):\/\/[-A-Z0-9+&@#/%?=~_|!:,.;]*[-A-Z0-9+&@#/%=~_|])/ig;  
  const parts = text.split(urlPattern);
  const htmlArr = [];

  for (let i = 0 ; i < parts.length ; i++) {
    const part = parts[i];

    if (urlPattern.test(part)) {
      htmlArr.push(html`<a href="${part}" target="_blank">${part}</a>`);
      i++;
    } else {
      htmlArr.push(html`${part}`);
    }
  }

  return htmlArr;
}