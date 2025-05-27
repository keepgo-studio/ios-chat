import LitComponent from "@/config/component";
import type { ChatMessageContentMap } from "@/models/chat-room";
import { css, html, type PropertyValues } from "lit";
import { customElement, property, state } from "lit/decorators.js";

import nullSvg from "@/assets/questionmark.folder.fill.svg";

const TAG_NAME = "ios-chat-img";

@customElement(TAG_NAME)
class Img extends LitComponent {
  @property({ attribute: false })
  data?: ChatMessageContentMap["img"]["val"];

  @state()
  _loading = false;

  @state()
  _src: string | null = null;

  protected override willUpdate(_changedProperties: PropertyValues): void {
    if (_changedProperties.has("data") && this.data) {
      if (this._src) {
        URL.revokeObjectURL(this._src);
      }

      let imgSrc = "";

      if (this.data.type === "raw") {
        const { blob } = this.data;
        imgSrc = URL.createObjectURL(blob);
      } else if (this.data.type === "url") {
        imgSrc = this.data.src;
      }

      const setSrc = (s: string) => {
        this._src = s;
        this._loading = false;
      }

      this._loading = true;
      imageSrcResult(imgSrc).then(setSrc).catch(setSrc);
    }
  }

  protected override render() {
    if (this._loading) return html`
      <section>
        <ios-chat-spinner></ios-chat-spinner>
      </section>
    `;

    if (!this._src) {
      return html`
        <section>
          <ios-chat-svg .data=${nullSvg}></ios-chat-svg>
        </section>
      `;
    }

    return html`<img draggable="false" src=${this._src} />`;
  }

  protected static override shadowStyles = css`
    :host {
      display: block;
      width: 100%;
      height: 100%;
    }

    section {
      width: min(10vw, 160px);
      min-width: 60px;
      aspect-ratio: 1 / 1; 
      display: flex;
      align-items: center;
      justify-content: center;
    }
    section:has(ios-chat-svg) {
      background-color: var(--theme-color);
    }
    section ios-chat-spinner {
      width: 2em;
      height: 2em;
    }
    section ios-chat-svg {
      width: var(--font-size);
      fill: var(--theme-bg);
    }

    img {
      display: block;
      width: 100%;
      height: 100%;
      object-fit: cover;
    }
  `;

  protected override disconnected(): void {
    if (this._src) {
      URL.revokeObjectURL(this._src);
    }
  }
}

declare global {
  interface HTMLElementTagNameMap {
    [TAG_NAME]: Img;
  }
}

async function imageSrcResult(src: string) {  
  return new Promise<string>((res, rej) => {
    const img = new Image();
    img.onload = () => res(src);
    img.onerror = () => rej(null);
    img.src = src;
  });
}