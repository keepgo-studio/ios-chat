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
    }
  `;

  private _dest = 0;
  private _position = 0;
  private _draging = false;

  @property()
  startAt: "top" | "bottom" = "top";

  @query("section")
  container!: HTMLElement;

  override render() {
    return html`<section><slot></slot></section>`;
  }

  protected override firstUpdated() {
    this.addEventListener("scroll", () => {
      this._position = this.scrollTop;
    }, { passive: true });

    if (this.startAt) {
      this.scrollTo(0, this.scrollHeight);
    }

    let scrollLimitPx = 0;

    const init = () => {
      scrollLimitPx = this.scrollHeight;
      scrollLimitPx -= this.offsetHeight;
    }

    init();
    window.addEventListener("resize", debounce(init, 500));
    
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

    const mouseDetachListener = async (e:MouseEvent) => {
      if (!this._draging) return;

      this._draging = false;

      const v = velocity.get(e.clientX, e.clientY, "ver"),
            mav = roundToThirdDecimal(0.2 * -v),
            reserveDest = Math.abs(v) < 0.65 ? this._dest : (this._dest + scrollLimitPx * mav);

      moveTo(this, {
        from: this._dest,
        dest: reserveDest,
        duration: 2000,
        styleAttr: "scroll",
        ease: "easeOutExpo"
      });

      if (this._dest < scrollLimitPx && reserveDest > scrollLimitPx) {
        bottomPadding = (reserveDest - scrollLimitPx) / 2;

        await moveTo(this.container, {
          from: 0,
          dest: bottomPadding,
          duration: 150,
          styleAttr: "padding-bottom",
          ease: "easeOutExpo"
        });
      }

      moveTo(this.container, {
        from: bottomPadding,
        dest: 0,
        duration: 1000,
        styleAttr: "padding-bottom",
        ease: "easeOutExpo"
      });

      if (this._position > 0 && reserveDest < 0) {
        topPadding = -reserveDest / 2;

        await moveTo(this.container, {
            from: 0,
            dest: topPadding,
            duration: 150,
            styleAttr: "padding-top",
            ease: "easeOutExpo"
        });
      }

      moveTo(this.container, {
        from: topPadding,
        dest: 0,
        duration: 1000,
        styleAttr: "padding-top",
        ease: "easeOutExpo"
      });
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
      const cs = window.getComputedStyle(this.container);

      const pt = pxToNumber(cs.paddingTop);
      const currentPosition = pt > 0 ? -pt : this._position;

      if (prevDest !== currentPosition) {
        this.dispatchEvent(new CustomEvent("scrolling", {
          detail: {
            maxHeight: pxToNumber(cs.height),
            y: currentPosition
          }
        }));
      }
      prevDest = currentPosition;

      await delay(10);

      requestAnimationFrame(fireEvent);  
    }
    requestAnimationFrame(fireEvent);
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ios-chat-scroll": KineticScroll;
  }
}
