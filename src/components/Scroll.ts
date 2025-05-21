import LitComponent from "@/config/component";
import { easeTo, MouseCoor, springTo } from "@/lib/animate";
import type { Padding } from "@/lib/style-utils";
import { clamp, debounce, fixedToDecimal } from "@/lib/utils";
import { css, html } from "lit";
import {
  customElement,
  eventOptions,
  property,
  query,
} from "lit/decorators.js";
import { styleMap } from "lit/directives/style-map.js";

type ScrollPosition = "top" | "bottom";

/**
 * @fires wheel-ratio
 */
@customElement("ios-chat-scroll")
class Scroll extends LitComponent {
  @property({ type: Object })
  padding?: Padding;

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

  private _rootHeight = 0;
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

  protected override connected(): void {
    this.listenEvent("scroll-to", ({ y }) => {
      this.cancelMoving();
      if (y !== undefined) {
        this.rootElem.scrollTop = y;
      }
    });
  }

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

    window.addEventListener("mousemove", this.mousemoveHandler.bind(this));
    window.addEventListener("mouseup", this.mouseDetachHandler.bind(this));
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
        // triggering overflow scroll at the top
        if (y < 0) {
          this.fireEvent("scrolling", y);
        }

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

  @eventOptions({ passive: true })
  wheelHandler(e: WheelEvent) {
    this.cancelMoving();
    const deltaY = e.deltaY;
    
    if (Math.abs(deltaY) > 200) {
      const actualDest = this._currentY + this.wheelDirection * e.deltaY * 5;
      const dest = clamp(actualDest, this._minY, this._maxY);

      this.wheelMove(dest);
    }
  }

  mousedownHandler(e: MouseEvent) {
    this.cancelMoving();

    this._mouseCoor.startDrag(e.screenX, e.screenY);
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

    const canScroll = this._rootHeight < this._wrapperHeight;
    const v = this._mouseCoor.endDragging(e.screenX, e.screenY, "ver");
    const downScaleV = fixedToDecimal(0.5 * v);
    /**
     * This ternary operator for UX improvment
     *
     * - Adjust the "step" value based on velocity.
     * - If the velocity is greater than 6.5, uses 90% of the maximum scroll range.
     * - If the velocity is greater than 1, uses the root element's height for smaller movements.
     * - Otherwise, don't animate
     */
    const step =
      Math.abs(v) > 6.5
        ? this._maxY * 0.9
        : Math.abs(v) > 1
        ? this._rootHeight
        : 0;

    const actualDest = this._mousemoveCachedY + this.dargDirection * step * downScaleV;
    const dest = clamp(actualDest, this._minY, this._maxY);

    this.moveTo(dest, {
      from: this._mousemoveCachedY,
      type: canScroll && (actualDest < this._minY || this._maxY < actualDest)
        // If the destination is out of bounds,
        // use a spring animation for a more elastic effect.
        ? "spring"
        // If the destination is within bounds,
        // Use a standard easing animation.
        : "ease",
    });
  }

  @eventOptions({ passive: true })
  scrollHandler(e: Event) {
    const y = (e.target as Element).scrollTop;
    this._currentY = y;
    this.fireEvent("scrolling", y);
  }

  protected override render(): unknown {
    return html`
      <ios-chat-scrollbar 
        .scrollElemRef=${this}
        style=${styleMap({
          paddingTop: this.padding?.top,
          paddingBottom: this.padding?.bottom
        })}
      ></ios-chat-scrollbar>

      <div
        class="root"
        style=${styleMap({
          paddingTop: this.padding?.top,
          paddingLeft: this.padding?.left,
          paddingRight: this.padding?.right,
          paddingBottom: this.padding?.bottom
        })}
        @mousewheel=${this.wheelHandler}
        @mousedown=${this.mousedownHandler}
        @scroll=${this.scrollHandler}
      >
        <div class="wrapper">
          <slot></slot>
        </div>
      </div>
    `;
  }

  protected static override shadowStyles = css`
    :host {
      position: relative;
    }

    ios-chat-scrollbar {
      position: absolute;
      top: 0;
      right: 0;
      height: 100%;
    }

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
      height: fit-content;
    }
  `;

  protected override disconnected(): void {
    window.removeEventListener("mousemove", this.mousemoveHandler);
    window.removeEventListener("mouseup", this.mouseDetachHandler);
    this._resizeObserver?.disconnect();
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ios-chat-scroll": Scroll;
  }
}
