import { minMax } from "@/lib/utils";
import { LitElement, PropertyValueMap, css, html } from "lit";
import { customElement, property, query } from "lit/decorators.js";

@customElement("ios-chat-scrollbar")
class Scrollbar extends LitElement {
  static override styles = css`
    :host {
      position: absolute;
      display: block;
      width: clamp(4px, 0.5vw, 9px);
      height: 100%;
      overflow: hidden;
      top: 0;
      right: 0;
      z-index: 10;
      border-radius: 999px;
    }

    .bar {
      position: absolute;
      top: 0;
      bottom: 0;
      left: 0;
      right: 0;
    }

    .thumb {
      position: relative;
      width: 100%;
      background-color: var(--scrollbar);
      border-radius: 999px;
      transition: ease 100ms;
    }
  `;

  private _stId = 0;

  @property({ type: Number, reflect: true })
  viewportLength = 0;

  @property({ type: Number, reflect: true })
  totalLength = 0;

  @property({ type: Number, reflect: true })
  current = 0;

  @query(".thumb")
  thumb!: HTMLElement;

  override render() {
    return html`
      <section class="bar">
        <div class="thumb"></div>
      </section>
    `;
  }

  
  protected override updated(_changedProperties: PropertyValueMap<any> | Map<PropertyKey, unknown>): void {
    const height = this.offsetHeight;
    const ratio = (this.viewportLength / this.totalLength);
    const thumbSize = (ratio >= 1 ? 0 : ratio) * height;

    if (_changedProperties.has("totalLength") || _changedProperties.has("viewportLength")) {
      this.thumb.style.height = `${thumbSize}px`;
    }

    if (_changedProperties.has("current")) {
      let top = 0;
      
      clearTimeout(this._stId);
      this.thumb.style.opacity = "1";
      this.thumb.style.transition = ""

      if (this.current >= 0) {
        top = (this.current / (this.totalLength - this.viewportLength)) * (height - thumbSize);
      } else {
        top = this.current / 2;
      }
      this.thumb.style.top = `${minMax(top, -thumbSize + 10, height - 10)}px`;

      this._stId = setTimeout(() => {
        this.thumb.style.opacity = "0";
        this.thumb.style.transition = "opacity ease 500ms"
      }, 1000);
    }
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ios-chat-scrollbar": Scrollbar;
  }
}
