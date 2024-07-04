import { Velocity, cancelMoving, debounce, delay, minMax, moveTo, pxToNumber, roundToThirdDecimal } from "@/lib/utils";
import { LitElement, css, html } from "lit";
import { customElement, property, query } from "lit/decorators.js";

@customElement("ios-chat-scroll")
class KineticScroll extends LitElement {
  static override styles = css`
    :host {
      display: block;
      width: 100%;
      height: 100%;
      overflow-y: auto;
      overflow-x: hidden;
      position: relative;
    }
    :host::-webkit-scrollbar {
      display: none;
    }
    section {
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      min-height: 100%;
    }
  `;

  private _dest = 0;
  private _position = 0;
  private _draging = false;

  @property()
  startAt: "top" | "bottom" = "top";

  @query("section")
  container!: HTMLElement;

  @query("slot")
  slotElem!: HTMLSlotElement;

  override render() {
    return html`<section><slot></slot></section>`;
  }

  protected override firstUpdated() {
    let lifeCycle = true;

    this.addEventListener("scroll", () => {
      this._position = this.scrollTop;
    }, { passive: true });

    let scrollLimitPx = 0;

    const child = this.slotElem.assignedElements({ flatten: true })[0] as HTMLElement;

    const trackChildStyle = async () => {
      if (!lifeCycle) return;

      const h = child.scrollHeight - this.offsetHeight;
      
      if (scrollLimitPx !== h) {
        scrollLimitPx = h;
      }

      await delay(500);

      requestAnimationFrame(trackChildStyle);
    }

    requestAnimationFrame(trackChildStyle);

    const velocity = new Velocity();
    let topPadding = 0;
    let bottomPadding = 0;

    const calculateBounce = () => {
      topPadding = -this._dest;
      bottomPadding = (this._dest - scrollLimitPx);

      this.container.style.paddingTop = `${minMax(topPadding, 0)}px`;
      this.container.style.paddingBottom = `${minMax(bottomPadding, 0)}px`
    }

    this.addEventListener("mousedown", (e) => {
      cancelMoving(this);
      cancelMoving(this.container);

      this._draging = true;
      this._dest = this._position;

      const cs = window.getComputedStyle(this.container);      
      const pt = pxToNumber(cs.paddingTop);

      this._dest += -pt;
      calculateBounce();

      velocity.set(e.clientX, e.clientY);
    })

    this.addEventListener("mousemove", (e) => {
      if (!this._draging) return;

      this._dest += -e.movementY;
      this.scrollTop = this._dest;

      calculateBounce();
    })

    const bottomRender = async (dest: number) => {
      if (this._dest < scrollLimitPx && dest > scrollLimitPx) {
        bottomPadding = (dest - scrollLimitPx) / 2;

        await moveTo(this.container, {
          from: 0,
          dest: bottomPadding,
          duration: 150,
          styleAttr: "paddingBottom",
          ease: "easeOutExpo"
        });
      }

      moveTo(this.container, {
        from: bottomPadding,
        dest: 0,
        duration: 1000,
        styleAttr: "paddingBottom",
        ease: "easeOutExpo"
      });
    }

    const topRender = async (dest: number) => {
      if (this._position > 0 && dest < 0) {
        topPadding = -dest / 2;

        await moveTo(this.container, {
            from: 0,
            dest: topPadding,
            duration: 150,
            styleAttr: "paddingTop",
            ease: "easeOutExpo"
        });
      }
      moveTo(this.container, {
        from: topPadding,
        dest: 0,
        duration: 1000,
        styleAttr: "paddingTop",
        ease: "easeOutExpo"
      });
    }

    const mouseDetachListener = async (e:MouseEvent) => {
      if (!this._draging) return;

      this._draging = false;

      const v = velocity.get(e.clientX, e.clientY, "ver"),
            mav = roundToThirdDecimal(0.3 * -v),
            reserveDest = Math.abs(v) < 0.65 ? this._dest : (this._dest + scrollLimitPx * mav);

      moveTo(this, {
        from: this._dest,
        dest: reserveDest,
        duration: 2000,
        ease: "easeOutExpo",
      });

      topRender(reserveDest);
      bottomRender(reserveDest);
    }

    this.addEventListener("mouseup", mouseDetachListener);
    this.addEventListener("mouseleave", mouseDetachListener);

    let wheelTimer: number | undefined = undefined;

    this.addEventListener("wheel", (e: WheelEvent) => {
      cancelMoving(this);
      clearTimeout(wheelTimer);

      wheelTimer = setTimeout(() => {
        const from = this._position;
        moveTo(this, {
          from,
          dest: from + e.deltaY,
          duration: 2000,
          ease: "easeOutExpo"
        })
      }, 50);
    }, { passive: true });

    let prevDest = 0;
    const fireEvent = async () => {
      if (!lifeCycle) return;

      const cs = window.getComputedStyle(this.container);
      const pt = pxToNumber(cs.paddingTop);

      let currentPosition = this._position;

      if ((pt > 0 && this._position < 0.5)) {
        currentPosition = -pt;
      }

      if (prevDest !== currentPosition) {
        this.dispatchEvent(new CustomEvent("scrolling", {
          detail: {
            maxHeight: scrollLimitPx + this.offsetHeight,
            y: currentPosition
          }
        }));
      }
      prevDest = currentPosition;

      await delay(30);

      requestAnimationFrame(fireEvent);  
    }
    requestAnimationFrame(fireEvent);

    if (this.startAt) {
      this.scrollTo(0, this.scrollHeight);
    }

    const io = new IntersectionObserver((entries) => {
      lifeCycle = entries[0].isIntersecting;

      if (lifeCycle) {
        requestAnimationFrame(trackChildStyle);
        requestAnimationFrame(fireEvent);
      }
    })

    io.observe(this);
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ios-chat-scroll": KineticScroll;
  }
}
