import { minMax } from "@/lib/utils";
import { LitElement, css, html } from "lit";
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
      background-color: var(--dark-gray);
      border-radius: 999px;
    }
  `;

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

  override updated() {
    const height = this.offsetHeight;
    const thumbSize = (height / this.totalLength) * height;

    this.thumb.style.height = `${thumbSize}px`;

    this.thumb.style.top = `${minMax(
      this.current,
      -thumbSize + 10,
      height - 10
    )}px`;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ios-chat-scrollbar": Scrollbar;
  }
}
