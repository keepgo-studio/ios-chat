import LitComponent from "@/config/component";
import { easeTo, MouseCoor, springTo } from "@/lib/animate";
import { clamp, fixedToThirdDecimal } from "@/lib/utils";
import { css, html } from "lit";
import { customElement, eventOptions, property, query, state } from "lit/decorators.js";
import { styleMap } from "lit/directives/style-map.js";

export type ScrollPosition = "top" | "bottom";

@customElement("ios-chat-scroll")
class Scroll extends LitComponent {
  @property({ type: Number })
  direction = 1;

  @query(".root")
  rootElem!: HTMLElement;

  @query(".wrapper")
  wrapperElem!: HTMLElement;

  @query("slot")
  slotElem!: HTMLSlotElement;

  @state()
  currentTop = 0;

  private _resizeObserver?: ResizeObserver;
  /**
   * The minimum top value, fixed at 0.
   */
  private _minTop = 0;
  /**
   * The maximum top value which is positive number.
   *
   * This value is constrained within the range:
   * @example 0 <= maxTop <= (rootHeight - wrapperHeight)
   */
  private _maxTop = 0;
  private rootHeight = 0;
  private cancelMoving: (() => void) | null = null;
  private mc: MouseCoor = new MouseCoor();

  protected override connected(): void {
    this.listenEvent("scroll-to", (detail) => {
      const { to, smooth } = detail;

      this.setMaxTopFor("scroll-to");

      switch (to) {
        case "top":
          return this.moveTo(this._minTop, smooth);
        case "bottom":
          return this.moveTo(-1 * this._maxTop, smooth);
      }
    });
  }

  // sync slot height when specific events fired
  setMaxTopFor(eType: "mousedown" | "scroll-to" | "wheel") {
    if (eType === "mousedown" || eType === "scroll-to") {
      this.wrapperElem.style.transition = "";
    }

    this.rootHeight = this.rootElem.offsetHeight;
    this._maxTop = Math.max(this.wrapperElem.offsetHeight - this.rootHeight, 0);
  }

  moveTo(
    dest: number,
    smooth?: boolean,
    smoothType: "ease" | "spring" = "ease"
  ) {
    if (smooth) {
      if (smoothType === "spring") {
        const { run, cancelMoving } = springTo(
          (t) => {
            this.currentTop = fixedToThirdDecimal(t);
          },
          {
            from: this.currentTop,
            dest,
            duration: 1500,
            stiffness: 250,
            damping: 20,
            mass: 1,
          }
        );

        this.cancelMoving = cancelMoving;
        run();
      } else {
        const { run, cancelMoving } = easeTo(
          (t) => {
            this.currentTop = fixedToThirdDecimal(t);
          },
          { from: this.currentTop, dest, duration: 1000 }
        );

        this.cancelMoving = cancelMoving;
        run();
      }
    }

    this.currentTop = dest;
  }

  @eventOptions({ passive: true })
  wheelHandler(e: WheelEvent) {
    if (this.cancelMoving) this.cancelMoving();

    // give smooth scrolling for wheel event
    this.wrapperElem.style.transition = "var(--ease-out-quart) 400ms transform";

    const actualDest = this.currentTop + this.direction * -e.deltaY;
    const dest = clamp(actualDest, -1 * this._maxTop, this._minTop);

    this.moveTo(dest);
  }

  mousedownHandler(e: MouseEvent) {
    if (this.cancelMoving) this.cancelMoving();

    this.setMaxTopFor("mousedown");

    this.mc.startDrag(e.clientX, e.clientY);
  }

  mousemoveHandler(e: MouseEvent) {
    if (!this.mc.isDragging()) return;
    this.currentTop += this.direction * e.movementY;
  }

  mouseDetachHandler(e: MouseEvent) {
    if (!this.mc.isDragging()) return;

    const v = this.mc.endDragging(e.clientX, e.clientY, "ver");
    const downScaleV = fixedToThirdDecimal(0.5 * v);
    /**
     * This ternary operator for UX improvment
     *
     * - Adjust the "step" value based on velocity.
     * - If the velocity is greater than 5, uses 90% of the maximum scroll range.
     * - If the velocity is greater than 1, uses the root element's height for smaller movements.
     * - Otherwise, don't animate
     */
    const step =
      Math.abs(v) > 5
        ? this._maxTop * 0.9
        : Math.abs(v) > 1
        ? this.rootHeight
        : 0;

    const actualDest = this.currentTop + this.direction * step * downScaleV;
    const dest = clamp(actualDest, -1 * this._maxTop, this._minTop);

    // If the destination is out of bounds,
    // use a spring animation for a more elastic effect.
    if (actualDest < -this._maxTop || this._minTop < actualDest) {
      this.moveTo(dest, true, "spring");
      return;
    }

    // If the destination is within bounds,
    // Use a standard easing animation.
    this.moveTo(dest, true);
  }

  protected override render(): unknown {
    return html`
      <div
        class="root"
        @mousewheel=${this.wheelHandler}
        @mousedown=${this.mousedownHandler}
        @mousemove=${this.mousemoveHandler}
        @mouseup=${this.mouseDetachHandler}
        @mouseleave=${this.mouseDetachHandler}
      >
        <div class="wrapper" style=${styleMap({ transform: `translateY(${this.currentTop}px)` })}>
          <slot></slot>
        </div>
      </div>
    `;
  }

  protected static override shadowStyles = css`
    .root {
      width: 100%;
      height: 100%;
      overflow: hidden;
      cursor: grab;
    }
    .root:active {
      cursor: grabbing;
    }
    .wrapper {
      position: relative;
      height: fit-content;
    }
  `;

  protected override disconnected(): void {
    this._resizeObserver?.disconnect();
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ios-chat-scroll": Scroll;
  }
}
