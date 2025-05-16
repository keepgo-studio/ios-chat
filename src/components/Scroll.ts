import LitComponent from "@/config/component";
import { easeTo, MouseCoor, springTo } from "@/lib/animate";
import { clamp, debounce, fixedToThirdDecimal } from "@/lib/utils";
import { css, html } from "lit";
import { customElement, property, query, state } from "lit/decorators.js";
import { styleMap } from "lit/directives/style-map.js";

type ScrollPosition = "top" | "bottom";

@customElement("ios-chat-scroll")
class Scroll extends LitComponent {
  @property({ type: Number })
  wheelDirection = 1;
  
  @property({ type: Number })
  dargDirection = -1;

  @property({ type: Boolean })
  blockAutoScroll = false;

  @property()
  scrollBehavior: "auto" | "smooth" = "auto";

  @query(".root")
  rootElem!: HTMLElement;

  @query(".wrapper")
  wrapperElem!: HTMLElement;

  @query("slot")
  slotElem!: HTMLSlotElement;

  @state()
  _rootHeight = 0;
  
  private _wrapperHeight = 0;
  private _resizeObserver?: ResizeObserver;
  private _currentY = 0;
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
  private _cancelMovingRef: (() => void) | null = null;
  private _mouseCoor: MouseCoor = new MouseCoor();

  protected override firstUpdated(): void {
    const movePosition = (pos: ScrollPosition, smooth?: boolean) => {
      const ease = smooth ? "ease" : undefined;

      switch (pos) {
        case "top":
          return this.moveTo(this._minY, ease);
        case "bottom":
          return this.moveTo(this._maxY, ease);
      }
    }

    const setYMinMax = () => {
      this._minY = this._rootHeight;
      this._maxY = this._rootHeight > this._wrapperHeight ? this._rootHeight : this._wrapperHeight;
      if (this.blockAutoScroll) return;
      movePosition("bottom", this.scrollBehavior === "smooth");
    }

    this._resizeObserver = new ResizeObserver((entries) => {
      entries.forEach(entry => {
        const target = entry.target;

        if (target.className === "root") {
          this._rootHeight = entry.contentRect.height;
          setYMinMax();
        }

        if (target.className === "wrapper") {
          this._wrapperHeight = entry.contentRect.height;
          setYMinMax();
        }
      });
    });

    this._resizeObserver.observe(this.rootElem);
    this._resizeObserver.observe(this.wrapperElem);

    this._rootHeight = this.rootElem.offsetHeight;
  }

  async moveTo(
    dest: number,
    smoothType?: "ease" | "spring"
  ) {
    const syncY = (y: number) => {
      this._currentY = y;
      this.rootElem.scrollTop = this._currentY;
    }

    if (smoothType === "spring") {
      const { run, cancelMoving } = springTo(
        (t) => {
          syncY(fixedToThirdDecimal(t));
        },
        {
          from: this._currentY,
          dest,
          duration: 1500,
          stiffness: 200,
          damping: 20,
          mass: 1,
        }
      );

      this._cancelMovingRef = cancelMoving;
      await run();
    } else if (smoothType === "ease") {
      const { run, cancelMoving } = easeTo(
        (t) => {
          syncY(fixedToThirdDecimal(t));
        },
        { from: this._currentY, dest, duration: 1000 }
      );

      this._cancelMovingRef = cancelMoving;
      await run();
    } else {
      syncY(dest);
    }
  }

  cancelMoving() {
    if (this._cancelMovingRef) {
      this._cancelMovingRef();
      this._cancelMovingRef = null;
    }
  }

  wheelMove = debounce((dest: number) => {
    this.moveTo(dest, "ease");
  }, 10);

  wheelHandler(e: WheelEvent) {
    e.preventDefault();
    this.cancelMoving();
    const deltaY = e.deltaY;

    if (Math.abs(deltaY) > 200) {
      const actualDest = this._currentY + this.wheelDirection * e.deltaY * 5;
      const dest = clamp(actualDest, this._minY, this._maxY);

      this.wheelMove(dest);
    } else {
      const actualDest = this._currentY + this.wheelDirection * e.deltaY;
      const dest = clamp(actualDest, this._minY, this._maxY);

      this.moveTo(dest);
    }

  }

  mousedownHandler(e: MouseEvent) {
    this.cancelMoving();

    this._mouseCoor.startDrag(e.clientX, e.clientY);
  }

  mousemoveHandler(e: MouseEvent) {
    if (!this._mouseCoor.isDragging()) return;

    this.moveTo(this._currentY + this.dargDirection * e.movementY)
  }

  mouseDetachHandler(e: MouseEvent) {
    if (!this._mouseCoor.isDragging()) return;

    const v = this._mouseCoor.endDragging(e.clientX, e.clientY, "ver");
    const downScaleV = fixedToThirdDecimal(0.5 * v);
    /**
     * This ternary operator for UX improvment
     *
     * - Adjust the "step" value based on velocity.
     * - If the velocity is greater than 5.5, uses 90% of the maximum scroll range.
     * - If the velocity is greater than 1, uses the root element's height for smaller movements.
     * - Otherwise, don't animate
     */
    const step =
      Math.abs(v) > 5.5
        ? this._maxY * 0.9
        : Math.abs(v) > 1
        ? this._rootHeight
        : 0;

    const actualDest = this._currentY + this.dargDirection * step * downScaleV;
    const dest = clamp(actualDest, this._minY, this._maxY);

    // If the destination is out of bounds,
    // use a spring animation for a more elastic effect.
    if (actualDest < this._minY || this._maxY < actualDest) {
      this.moveTo(dest, "spring");
      return;
    }

    // If the destination is within bounds,
    // Use a standard easing animation.
    this.moveTo(dest, "ease");
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
        <div 
          class="wrapper" 
          style=${styleMap({
            padding: `${this._rootHeight}px 0`
          })}
        >
          <slot></slot>
        </div>
      </div>
    `;
  }

  protected static override shadowStyles = css`
    .root {
      width: 100%;
      height: 100%;
      overflow: auto;
      cursor: grab;
      /* hide scrollbar */
      -ms-overflow-style: none;  /* IE and Edge */
      scrollbar-width: none;  /* Firefox */
    }
    /* Hide scrollbar for Chrome, Safari and Opera */
    .root::-webkit-scrollbar {
      display: none;
    }
    .root:active {
      cursor: grabbing;
    }
    .wrapper {
      min-height: 100%;
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
