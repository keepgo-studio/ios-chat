import LitComponent from "@/config/component";
import { clamp, debounce, fixedToDecimal } from "@/lib/utils";
import { css, html, type PropertyValues } from "lit";
import { customElement, property, query, state } from "lit/decorators.js";
import { styleMap } from "lit/directives/style-map.js";
import { classMap } from "lit/directives/class-map.js";

const TAG_NAME = "ios-chat-scrollbar";

@customElement(TAG_NAME)
class Scrollbar extends LitComponent {
  @property({ attribute: false })
  scrollElemRef?: LitComponent;

  @state()
  _disabled = false;

  @state()
  _yPercent = 0;

  @state()
  _show = false;

  @query("section")
  barElem!: HTMLElement;

  @query(".thumb")
  thumbElem!: HTMLElement;

  @state()
  _thumbY = 0;

  @state()
  _thumbHeight = 0;

  private _scrollElemCoor = {
    rootHeight: 0,
    wrapperHeight: 0
  };
  private _barHeight = 0;
  private _resizeObserver?: ResizeObserver;
  private _scrollingUnsubscribe?: () => void;
  private _startDrag = false;

  protected override firstUpdated(): void {
    window.addEventListener("mousemove", this.mousemoveHandler.bind(this));
    window.addEventListener("mouseup", this.mouseDetachHandler.bind(this));
  }

  protected override updated(_changedProperties: PropertyValues): void {
    if (_changedProperties.has("scrollElemRef") && this.scrollElemRef) {
      const ref = this.scrollElemRef.shadowRoot!;
      const rootElem = ref.querySelector<HTMLElement>(".root")!;
      const scrollContent = ref.querySelector<HTMLElement>(".wrapper")!;

      // clear listeners
      this._resizeObserver?.disconnect();
      if (this._scrollingUnsubscribe) {
        this._scrollingUnsubscribe();
      }

      this._resizeObserver = new ResizeObserver((entries) => {
        entries.forEach((entry) => {
          const { target } = entry;
          const h = entry.contentRect.height;

          if (target.tagName.toLowerCase() === "section") {
            this._barHeight = h;
          }

          if (target.className === "root") {
            this._scrollElemCoor.rootHeight = h;
          }

          if (target.className === "wrapper") {
            this._scrollElemCoor.wrapperHeight = h;
          }

          this._disabled = this._scrollElemCoor.rootHeight >= this._scrollElemCoor.wrapperHeight;

          if (!this._disabled) {
            const scaleBetweenBarAndWrapper = this._barHeight / this._scrollElemCoor.wrapperHeight;
            const thumbHeightRatio = scaleBetweenBarAndWrapper;
            this._thumbHeight = this._barHeight * thumbHeightRatio;
          }
        });
      });

      this._resizeObserver.observe(this.barElem);
      this._resizeObserver.observe(rootElem);
      this._resizeObserver.observe(scrollContent);

      this._scrollingUnsubscribe = this.scrollElemRef.listenEvent("scrolling", (y) => {
          if (this._disabled) return;

          const totalScrollY = this._scrollElemCoor.wrapperHeight - this._scrollElemCoor.rootHeight;
          const currentYRatio = fixedToDecimal(y / totalScrollY);
          const totalThumbY = this._barHeight - this._thumbHeight;
          this._thumbY = totalThumbY * currentYRatio;
          this._show = true;
          this.hideThumb();
        }
      );
    }
  }

  hideThumb = debounce(() => {
    this._show = false;
  }, 250);

  mousedownHandler(e: MouseEvent) {
    e.preventDefault();
    e.stopPropagation();

    this._startDrag = true;
    const isThumb = (e.target as HTMLElement).className === "thumb";

    // const thumbY = e.layerY - e.offsetY;
    if (!isThumb) {
      const totalThumbY = this._barHeight - this._thumbHeight;
      const totalScrollY = this._scrollElemCoor.wrapperHeight - this._scrollElemCoor.rootHeight;
      const pickThumbY = clamp(e.layerY - this._thumbHeight / 2, 0, totalThumbY);
      
      this.scrollElemRef?.fireEvent("scroll-to", {
        y: totalScrollY * (pickThumbY / totalThumbY)
      });
    }
  }

  mousemoveHandler(e: MouseEvent) {
    if (!this._startDrag) return;

    const totalThumbY = this._barHeight - this._thumbHeight;
    const totalScrollY = this._scrollElemCoor.wrapperHeight - this._scrollElemCoor.rootHeight;
    const scaleY = e.movementY * (window.innerHeight / totalThumbY);

    this.scrollElemRef?.fireEvent("scroll-to", {
      y: totalScrollY * (this._thumbY + scaleY) / totalThumbY
    });
  }

  mouseDetachHandler() {
    this._startDrag = false;
  }

  protected override render(): unknown {
    return html`
      <section 
        class=${classMap({ bar: true, disabled: this._disabled })}
        @mousedown=${this.mousedownHandler}
      >
        <div
          class="thumb"
          style=${styleMap(this._disabled ? {} : {
            height: `${this._thumbHeight}px`,
            opacity: this._show ? "1" : "0",
            transform: `translateY(${this._thumbY}px)`,
            transitionDuration: this._show ? "200ms" : "800ms",
          })}
        >
        </div>
      </section>
    `;
  }

  protected static override shadowStyles = css`
    .bar {
      position: relative;
      z-index: 3;
      height: 100%;
      border-radius: 999px;
      width: 0.6em;
      overflow-y: hidden;
      cursor: pointer;
    }
    .bar.disabled {
      opacity: 0;
      pointer-events: none;
    }

    .thumb {
      /* opacity: 0; */
      position: absolute;
      top: 0;
      right: 0;
      width: 0.6em;
      padding: 0 0.15em;
      transition: ease opacity, height;
    }
    .bar:hover .thumb {
      opacity: 1 !important;
    }
    .thumb::after {
      content: "";
      border-radius: 999px;
      display: block;
      width: 100%;
      height: 100%;
      background-color: var(--scrollbar);
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
    [TAG_NAME]: Scrollbar;
  }
}
