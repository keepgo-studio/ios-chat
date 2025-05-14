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
  currentY = 0;

  private _resizeObserver?: ResizeObserver;
  /**
   * The minimum y value, fixed at 0.
   */
  private _minY = 0;
  /**
   * The maximum y value which is positive number.
   *
   * This value is constrained within the range:
   * @example 0 <= maxY <= (rootHeight - wrapperHeight)
   */
  private _maxY = 0;
  private _rootHeight = 0;
  private _cancelMoving: (() => void) | null = null;
  private _mouseCoor: MouseCoor = new MouseCoor();

  protected override connected(): void {
    this.listenEvent("scroll-at", (detail) => {
      const { to, smooth } = detail;

      this.setMaxYFor("scroll-at");

      switch (to) {
        case "top":
          return this.moveTo(this._minY, smooth);
        case "bottom":
          return this.moveTo(-1 * this._maxY, smooth);
      }
    });
  }

  // sync slot height when specific events fired
  setMaxYFor(eType: "mousedown" | "scroll-at" | "wheel") {
    if (eType === "mousedown" || eType === "scroll-at") {
      this.wrapperElem.style.transition = "";
    }

    this._rootHeight = this.rootElem.offsetHeight;
    this._maxY = Math.max(this.wrapperElem.offsetHeight - this._rootHeight, 0);
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
            this.currentY = fixedToThirdDecimal(t);
          },
          {
            from: this.currentY,
            dest,
            duration: 1500,
            stiffness: 250,
            damping: 20,
            mass: 1,
          }
        );

        this._cancelMoving = cancelMoving;
        run();
      } else {
        const { run, cancelMoving } = easeTo(
          (t) => {
            this.currentY = fixedToThirdDecimal(t);
          },
          { from: this.currentY, dest, duration: 1000 }
        );

        this._cancelMoving = cancelMoving;
        run();
      }
    }

    this.currentY = dest;
  }

  @eventOptions({ passive: true })
  wheelHandler(e: WheelEvent) {
    if (this._cancelMoving) this._cancelMoving();

    // give smooth scrolling for wheel event
    this.wrapperElem.style.transition = "var(--ease-out-quart) 400ms transform";

    const actualDest = this.currentY + this.direction * -e.deltaY;
    const dest = clamp(actualDest, -1 * this._maxY, this._minY);

    this.moveTo(dest);
  }

  mousedownHandler(e: MouseEvent) {
    if (this._cancelMoving) this._cancelMoving();

    this.setMaxYFor("mousedown");

    this._mouseCoor.startDrag(e.clientX, e.clientY);
  }

  mousemoveHandler(e: MouseEvent) {
    if (!this._mouseCoor.isDragging()) return;
    this.currentY += this.direction * e.movementY;
  }

  mouseDetachHandler(e: MouseEvent) {
    if (!this._mouseCoor.isDragging()) return;

    const v = this._mouseCoor.endDragging(e.clientX, e.clientY, "ver");
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
        ? this._maxY * 0.9
        : Math.abs(v) > 1
        ? this._rootHeight
        : 0;

    const actualDest = this.currentY + this.direction * step * downScaleV;
    const dest = clamp(actualDest, -1 * this._maxY, this._minY);

    // If the destination is out of bounds,
    // use a spring animation for a more elastic effect.
    if (actualDest < -this._maxY || this._minY < actualDest) {
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
        <div class="wrapper" style=${styleMap({ transform: `translateY(${this.currentY}px)` })}>
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
