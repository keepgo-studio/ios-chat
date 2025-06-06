import { html } from "lit";

export function isOnlySpaces(str: string) {
  return str.trim().length === 0;
}

export function delay(miliSec: number) {
  return new Promise((res) => setTimeout(() => res(true), miliSec));
}

export function cancelableDelay() {
  let timeoutId: ReturnType<typeof setTimeout>;
  let cancelFnRef: undefined | (() => void);

  function run(ms: number): Promise<void> {
    return new Promise((res, rej) => {
      timeoutId = setTimeout(res, ms);
      cancelFnRef = () => {
        clearTimeout(timeoutId);
        rej("cancel delay");
      };
    });
  }

  return {
    run,
    cancel: () => cancelFnRef && cancelFnRef(),
  };
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

export function fixedToDecimal(num: number, precision: number = 3): number {
  if (precision < 0 || !Number.isInteger(precision)) {
    throw new Error("Precision must be a non-negative integer.");
  }

  const factor = Math.pow(10, precision);
  return Math.round(num * factor) / factor;
}
export function pxToNumber(pxStr: string) {
  return Number(pxStr.split("px")[0]);
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

export function range<T = unknown>(length: number, val?: T): T[] {
  return Array.from({ length }).map(() => {
    if (typeof val === "object") return { ...val };
    return val as T;
  });
}