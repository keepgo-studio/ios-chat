import LitComponent from "@/config/component";
import type { ChatMessageContentMap } from "@/models/chat-room";
import { css, html, type PropertyValues } from "lit";
import { customElement, property, state } from "lit/decorators.js";

import nullSvg from "@/assets/questionmark.folder.fill.svg";

const TAG_NAME = "ios-chat-img";

function base64ToBlob(base64: string, mimeType: string): Blob {
  const binary = atob(base64);
  const length = binary.length;
  const bytes = new Uint8Array(length);

  for (let i = 0; i < length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }

  return new Blob([bytes.buffer], { type: mimeType });
}

async function imageSrcResult(src: string) {  
  return new Promise<string>((res, rej) => {
    const img = new Image();

    img.onload = () => {
      res(src);
    };

    img.onerror = () => {
      rej(null);
    };

    img.src = src;
  });
}

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

      if ("src" in this.data) {
        imgSrc = this.data.src;
      } else {
        const { base64, mimeType } = this.data;
        imgSrc = URL.createObjectURL(base64ToBlob(base64, mimeType));
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
      <div class="wrapper">
        <ios-chat-spinner></ios-chat-spinner>
      </div>
    `;

    if (!this._src) {
      return html`
        <div class="wrapper">
          <ios-chat-svg .data=${nullSvg}></ios-chat-svg>
        </div>
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

    .wrapper {
      width: min(10vw, 160px);
      min-width: 60px;
      aspect-ratio: 1 / 1; 
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .wrapper:has(ios-chat-svg) {
      background-color: var(--theme-color);
    }
    .wrapper ios-chat-spinner {
      width: 2em;
      height: 2em;
    }
    .wrapper ios-chat-svg {
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
