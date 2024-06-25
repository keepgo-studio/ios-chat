export function delay(miliSec: number) {
  return new Promise((res) => setTimeout(() => res(true), miliSec));
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
  easeInOutQuad: (x: number) => x < 0.5 ? 2 * x * x : 1 - Math.pow(-2 * x + 2, 2) / 2
}

const movingMap = new WeakMap();

export function cancelMoving(elem: HTMLElement) {
  movingMap.delete(elem);
}

export async function moveTo(
  elem: HTMLElement,
  { from, dest, duration, styleAttr = "scroll", ease = "easeInOutQuad", fromRef }: {
    from: number;
    dest: number;
    duration: number;
    styleAttr?: "scroll" | "top" | "padding-top" | "padding-bottom";
    ease?: keyof typeof Ease;
    fromRef?: Object
  }
) {
  movingMap.set(elem, true);
  const start = Date.now();

  return new Promise(res => {
    function scroll() {
      if (!movingMap.has(elem)) return;

      const currentTime = Date.now(),
            time = Math.min(1, (currentTime - start) / duration),
            easedT = Ease[ease](time),
            dis = roundToThirdDecimal(easedT * (dest - from) + from);
  
      if (styleAttr === "scroll") {
        elem.scrollTop = dis;
      } else if (styleAttr === "top") {
        elem.style.top = `${dis}px`;
      } else if (styleAttr === "padding-top") {
        elem.style.paddingTop = `${dis}px`;
      } else if (styleAttr === "padding-bottom") {
        elem.style.paddingBottom = `${dis}px`;
      }

      if (fromRef) fromRef = dis;
  
      if (time < 1) requestAnimationFrame(scroll);
      else {
        movingMap.delete(elem);
        res(true);
      }
    }

    requestAnimationFrame(scroll);
  })
}

class Velocity {
  y?: number;
  time = 0;

  getV(y: number) {
    let v = 0;
    const newTime = Date.now();

    if (this.y !== undefined) {
      const dy = y - this.y,
            timeElapsed = newTime - this.time;

      v = dy / timeElapsed;
    }

    this.y = y;
    this.time = newTime;

    return v;
  }
}

function pxToNumber(pxStr: string) {
  return Number(pxStr.split("px")[0]);
}

export function attachKineticScroll(elem: HTMLElement, root: HTMLElement) {
  const positionMap = {
    y: 0,
  }
  let from = 0;
  let wheelTimer: number | undefined = undefined;

  elem.addEventListener("wheel", (e: WheelEvent) => {
    cancelMoving(elem);
    clearTimeout(wheelTimer);
    
    wheelTimer = setTimeout(() => {
      from = elem.scrollTop;
      moveTo(elem, {
        from,
        dest: from + e.deltaY,
        duration: 2000,
        ease: "easeOutExpo"
      })
    }, 100);
  }, { passive: true });

// -------------------------------------------------
  const cs = window.getComputedStyle(elem);
  let initPaddingTop = pxToNumber(cs.paddingTop),
      initPaddingBottom = pxToNumber(cs.paddingBottom);
  
  let maxHeight = elem.scrollHeight - elem.offsetHeight;

  window.addEventListener("resize", debounce(() => {
    const newCs = window.getComputedStyle(elem);
    
    initPaddingTop = pxToNumber(newCs.paddingTop),
    initPaddingBottom = pxToNumber(newCs.paddingBottom);

    maxHeight = elem.scrollHeight - elem.offsetHeight;
  }, 500));

// -------------------------------------------------
  const velocity = new Velocity();
  
  let dragStart = false;
  let paddingBottom = 0,
      paddingTop = 0;

  elem.style.position = 'relative';

  function calculateBounce(scrollDest: number) {    
    if (scrollDest >= maxHeight) {
      const distanceBottom = (scrollDest - maxHeight) / 2;

      console.log("diff", paddingBottom, distanceBottom);
      paddingBottom = distanceBottom;
      elem.style.paddingBottom = `${paddingBottom}px`;
    }

    if (scrollDest <= 0) {
      const distanceTop = -scrollDest / 2;

      paddingTop = Math.max(distanceTop, initPaddingTop);
      elem.style.paddingTop = `${paddingTop}px`;
    }
  }

  root.addEventListener("mousedown", (e) => {
    dragStart = true;
    
    cancelMoving(elem);
    
    from = elem.scrollTop;
    // paddingBottom = pxToNumber(elem.style.paddingBottom);
    // paddingTop = pxToNumber(elem.style.paddingTop);
    console.log("down", paddingTop, paddingBottom);
    velocity.getV(e.clientY);
  });
// [ ] 어떻게 해야 scrollPosition을 살릴까
  root.addEventListener("mousemove", (e) => {
    if (!dragStart) return;

    from += -e.movementY;

    elem.scrollTop = from;

    calculateBounce(from);
  });

  const mouseDetachListener = (e: MouseEvent) => {
    if (!dragStart) return;
    
    dragStart = false;

    const dis = Math.abs(velocity.y! - e.clientY),
          v = velocity.getV(e.clientY),
          mav = roundToThirdDecimal(0.3 * -v),
          dest = Math.abs(v) < 0.65 ? from : (from + maxHeight * mav);

    moveTo(elem, {
      from,
      dest,
      duration: 2000,
      styleAttr: "scroll",
      ease: "easeOutExpo",
    });
    
    // calculateBounce(dest);
    console.log("up", from, dest);
    if (paddingBottom > initPaddingBottom) {
      // moveTo(elem, {
      //   from: paddingBottom,
      //   dest: initPaddingBottom,
      //   duration: 2000,
      //   styleAttr: "padding-bottom",
      //   ease: "easeOutExpo"
      // });
    }

    if (paddingTop > initPaddingTop) {
      moveTo(elem, {
        from: paddingTop,
        dest: initPaddingTop,
        duration: 2000,
        styleAttr: "padding-top",
        ease: "easeOutExpo"
      });
    }
  }

  root.addEventListener("mouseup", mouseDetachListener);
  root.addEventListener("mouseleave", mouseDetachListener);
}
