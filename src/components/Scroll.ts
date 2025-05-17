import LitComponent from "@/config/component";
import { easeTo, MouseCoor, springTo } from "@/lib/animate";
import { clamp, debounce, fixedToDecimal } from "@/lib/utils";
import { css, html } from "lit";
import {
  customElement,
  eventOptions,
  property,
  query,
  state,
} from "lit/decorators.js";

type ScrollPosition = "top" | "bottom";

/**
 * @fires wheel-ratio
 */
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
  private _mousemoveCachedY = 0;
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
      const ease = smooth
        ? ({ from: this._currentY, type: "ease" } as const)
        : undefined;

      switch (pos) {
        case "top":
          return this.moveTo(this._minY, ease);
        case "bottom":
          return this.moveTo(this._maxY, ease);
      }
    };

    const setYMinMax = () => {
      this._minY = 0;
      this._maxY = Math.max(this._wrapperHeight - this._rootHeight, 0);
      if (this.blockAutoScroll) return;
      movePosition("bottom", this.scrollBehavior === "smooth");
    };

    this._resizeObserver = new ResizeObserver((entries) => {
      entries.forEach((entry) => {
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
    smooth?: {
      from: number;
      type: "ease" | "spring";
    }
  ) {
    const syncY = (y: number) => {
      this.rootElem.scrollTop = y;

      requestAnimationFrame(() => {
        const fixedPt = fixedToDecimal(Math.abs(y > 0 ? 0 : y), 0);
        this.wrapperElem.style.paddingTop = `${fixedPt}px`;

        const fixedPb = fixedToDecimal(y <= this._maxY ? 0 : y - this._maxY, 0);
        this.wrapperElem.style.paddingBottom = `${fixedPb}px`;
      });
    };

    // static move
    if (!smooth) {
      syncY(dest);
      return;
    }

    // animate move
    switch (smooth.type) {
      case "spring":
        {
          const { run, cancelMoving } = springTo(
            (t) => {
              syncY(fixedToDecimal(t));
            },
            {
              from: smooth.from,
              dest,
              duration: 1500,
              stiffness: 200,
              damping: 20,
              mass: 1,
            }
          );

          this._cancelMovingRef = cancelMoving;
          await run();
        }
        break;
      case "ease":
        {
          const { run, cancelMoving } = easeTo(
            (t) => {
              syncY(fixedToDecimal(t));
            },
            { from: smooth.from, dest, duration: 1000 }
          );

          this._cancelMovingRef = cancelMoving;
          await run();
        }
        break;
    }
  }

  cancelMoving() {
    if (this._cancelMovingRef) {
      this._cancelMovingRef();
      this._cancelMovingRef = null;
    }
  }

  wheelMove = debounce((dest: number) => {
    this.moveTo(dest, { from: this._currentY, type: "ease" });
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
    this._mousemoveCachedY = this._currentY;
  }

  mousemoveHandler(e: MouseEvent) {
    if (!this._mouseCoor.isDragging()) return;

    const dest = this.dargDirection * e.movementY;
    this._mousemoveCachedY += dest;
    this.moveTo(this._mousemoveCachedY);
  }

  mouseDetachHandler(e: MouseEvent) {
    if (!this._mouseCoor.isDragging()) return;

    const v = this._mouseCoor.endDragging(e.clientX, e.clientY, "ver");
    const downScaleV = fixedToDecimal(0.5 * v);
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

    const actualDest = this._mousemoveCachedY + this.dargDirection * step * downScaleV;
    const dest = clamp(actualDest, this._minY, this._maxY);

    // If the destination is out of bounds,
    // use a spring animation for a more elastic effect.
    if (actualDest < this._minY || this._maxY < actualDest) {
      this.moveTo(dest, { from: this._mousemoveCachedY, type: "spring" });
      return;
    }

    // If the destination is within bounds,
    // Use a standard easing animation.
    this.moveTo(dest, { from: this._mousemoveCachedY, type: "ease" });
  }

  @eventOptions({ passive: true })
  scrollHandler(e: Event) {
    const y = (e.target as Element).scrollTop;
    this._currentY = y;
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
        @scroll=${this.scrollHandler}
      >
        <div class="wrapper">
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
      -ms-overflow-style: none; /* IE and Edge */
      scrollbar-width: none; /* Firefox */
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
