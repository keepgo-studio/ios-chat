import LitComponent from "@/config/component";
import { debounce, fixedToDecimal } from "@/lib/utils";
import { css, html, type PropertyValues } from "lit";
import { customElement, property, query, state } from "lit/decorators.js";
import { styleMap } from "lit/directives/style-map.js";

const TAG_NAME = "ios-chat-scrollbar";

@customElement(TAG_NAME)
class Scrollbar extends LitComponent {
  @property({ attribute: false })
  scrollElemRef?: LitComponent;

  @state()
  _thumbHeightRatio = 0;

  @state()
  _yPercent = 0;

  @state()
  _show = false;

  @query(".bar")
  barElem!: HTMLElement;

  @query(".thumb")
  thumbElem!: HTMLElement;

  private _startDrag = false;
  private _barHeight = 0;
  private _wrapperHeight = 0;
  private _resizeObserver?: ResizeObserver;
  private _scrollingListener?: () => void;

  protected override updated(_changedProperties: PropertyValues): void {
    if (_changedProperties.has("scrollElemRef") && this.scrollElemRef) {
      const wrapper = this.scrollElemRef.shadowRoot!.querySelector(
        ".wrapper"
      ) as HTMLElement;

      // clear listeners
      this._resizeObserver?.disconnect();
      if (this._scrollingListener) {
        this._scrollingListener();
      }

      this._resizeObserver = new ResizeObserver((entries) => {
        entries.forEach((entry) => {
          const h = entry.contentRect.height;

          if (entry.target.className === "bar") {
            this._barHeight = h;
          }

          if (entry.target.className === "wrapper") {
            this._wrapperHeight = h;
          }

          const ratio = this._barHeight / this._wrapperHeight;
          this._thumbHeightRatio = ratio > 1 ? -1 : ratio;
        });
      });

      this._resizeObserver.observe(this.barElem);
      this._resizeObserver.observe(wrapper);

      this._scrollingListener = this.scrollElemRef.listenEvent("scrolling", (y) => {
          const ratio = fixedToDecimal(y / this._wrapperHeight);
          // _yRatio = x, _thumbHeightRatio = t, _wrapperHeight = w
          // 100 : x = t : y / w
          // x = 100 * (y / w) / t
          this._yPercent = (100 * ratio) / this._thumbHeightRatio;
          this._show = true;
          this.hideThumb();
        }
      );
    }
  }

  hideThumb = debounce(() => {
    this._show = false;
  }, 250);

  syncScroll(e: MouseEvent) {
    const ratio = e.layerY / this._barHeight;
    this.scrollElemRef?.fireEvent("scroll-to", {
      y: ratio * this._wrapperHeight
    });
  }

  mousedownHandler(e: MouseEvent) {
    e.stopPropagation();
    this._startDrag = true;
    this.syncScroll(e);
  }

  mousemoveHandler(e: MouseEvent) {
    e.stopPropagation();
    if (!this._startDrag) return;
    this.syncScroll(e);
  }
  
  mouseDetachHandler(e: Event) {
    e.stopPropagation();
    this._startDrag = false;
  }

  protected override render(): unknown {
    const isDisabled = this._thumbHeightRatio === -1;

    return html`
      <div 
        class="bar"
        style=${styleMap({
          opacity: isDisabled ? "0" : "",
          pointerEvents: isDisabled ? "none": ""
        })}
        @mousedown=${this.mousedownHandler}
        @mousemove=${this.mousemoveHandler}
        @mouseup=${this.mouseDetachHandler}
        @mouseleave=${this.mouseDetachHandler}
      >
        <div
          class="thumb"
          style=${styleMap(isDisabled ? {} : {
            height: `${this._thumbHeightRatio * 100}%`,
            opacity: this._show ? "1" : "0",
            transform: `translateY(${this._yPercent}%)`,
            transitionDuration: this._show ? "200ms" : "800ms",
          })}
        >
        </div>
      </div>
    `;
  }

  protected static override shadowStyles = css`
    .bar {
      position: relative;
      z-index: 3;
      height: 100%;
      border-radius: 999px;
      padding: 0 0.3em 0 0.15em;
      overflow-y: hidden;
      cursor: pointer;
    }

    .thumb {
      position: relative;
      width: 0.25em;
      transition: ease opacity;
      border-radius: 999px;
      background-color: var(--scrollbar);
    }
  `;

  protected override disconnected(): void {
    this._resizeObserver?.disconnect();
  }
}

declare global {
  interface HTMLElementTagNameMap {
    [TAG_NAME]: Scrollbar;
  }
}
