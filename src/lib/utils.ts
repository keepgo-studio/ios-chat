export function isOnlySpaces(str: string) {
  return str.trim().length === 0;
}

export function delay(miliSec: number) {
  return new Promise((res) => setTimeout(() => res(true), miliSec));
}

export function minMax(val: number, min: number, max?: number) {
  if (val < min) return min;
  else if (max && val > max) return max;

  return val;
}

type Procedure = (...args: any[]) => void;

export function throttle(callback: Procedure, delay: number): Procedure {
  let timer: number | undefined = undefined;

  return function(this: any, ...args: any[]): void {
    if (!timer) {
      timer = setTimeout(() => {
        callback.apply(this, args);
        timer = undefined;
      }, delay);
    }
  };
};

export function debounce(callback: Procedure, delay: number): Procedure {
  let timer: number | undefined = undefined;

  return function (this: any, ...args: any[]) {
    clearTimeout(timer);
    timer = setTimeout(() => callback.apply(this, args), delay);
  };
};

export function roundToThirdDecimal(num: number) {
  return Math.round(num * 1000) / 1000;
}

const Ease = {
  easeOutExpo: (x: number) => (x === 1 ? 1 : 1 - Math.pow(2, -10 * x)),
  easeInOutQuad: (x: number) => x < 0.5 ? 2 * x * x : 1 - Math.pow(-2 * x + 2, 2) / 2,
}

const movingMap = new WeakMap();

export function cancelMoving(elem: HTMLElement) {
  movingMap.delete(elem);
}

export async function moveTo(
  elem: HTMLElement,
  { from, dest, duration, styleAttr = "scroll", ease = "easeInOutQuad" }: {
    from: number;
    dest: number;
    duration: number;
    styleAttr?: "scroll" | "paddingBottom" | "paddingTop" | "top" | "bottom";
    ease?: keyof typeof Ease;
  }
) {
  movingMap.set(elem, true);
  const start = Date.now();

  return new Promise(res => {
    function scroll() {
      if (!movingMap.has(elem)) return;

      const currentTime = Date.now(),
            time = Math.min(1, roundToThirdDecimal((currentTime - start) / duration)),
            easedT = Ease[ease](time),
            dis = easedT * (dest - from) + from;

      switch (styleAttr) {
        case "scroll":
          elem.scrollTop = dis;
          break;
        case "paddingBottom": case "paddingTop":
        case "bottom": case "top":
          elem.style[styleAttr] = `${dis}px`;
          break;
      }
  
      if (time < 1) requestAnimationFrame(scroll);
      else {
        movingMap.delete(elem);
        res(true);
      }
    }

    requestAnimationFrame(scroll);
  })
}

export class Velocity {
  private _time = 0;
  x = 0;
  y = 0;

  set(x: number, y: number) {
    this.x = x;
    this.y = y;
    this._time = Date.now();
  }

  get(x: number, y: number, type: 'hor' | 'ver' | 'both') {
    let v = 0;
    const newTime = Date.now(),
          timeElapsed = newTime - this._time,
          dx = x - this.x,
          dy = y - this.y;

    switch(type) {
      case "both": return Math.sqrt(dx * dx + dy * dy) / timeElapsed;
      case "hor": return dx / timeElapsed;
      case "ver": return dy / timeElapsed;
    }
  }
}

export function pxToNumber(pxStr: string) {
  return Number(pxStr.split("px")[0]);
}