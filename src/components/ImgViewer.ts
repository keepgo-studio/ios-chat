import LitComponent from "@/config/component";
import { cancelableDelay, debounce } from "@/lib/utils";
import type { ChatMessageContentMap } from "@/models/chat-room";
import { css, html, type PropertyValues } from "lit";
import { customElement, query, state } from "lit/decorators.js";
import { styleMap } from "lit/directives/style-map.js";

const TAG_NAME = "ios-chat-img-viewer";

@customElement(TAG_NAME)
class ImgViewer extends LitComponent {
  @state()
  _content?: ChatMessageContentMap["img"]["val"];

  @state()
  _zoom = false;

  @state()
  _src = "";

  @query("img")
  elem!: HTMLImageElement;

  private _targetRef?: LitComponent;
  private _rect?: DOMRect;

  private _toWidth = 0;
  private _toHeight = 0;

  protected override connected(): void {
    this.listenEvent("message-img:img-click", (e) => {
      this._content = { ...e.imgContent };
      this._zoom = e.success;
      this._targetRef = e.ref;
      this._toWidth = e.width;
      this._toHeight = e.height;
    });

    window.addEventListener("resize", this.trackRect.bind(this));
  }

  protected override updated(_changedProperties: PropertyValues): void {
    if (_changedProperties.has("_content") && this._content) {
      // set url
      if (this._content.type === "raw") {
        this._src = URL.createObjectURL(this._content.blob);
      } else {
        this._src = this._content.src;
      }
    }

    if (this._targetRef && _changedProperties.has("_zoom")) {
      this._rect = this._targetRef.getBoundingClientRect();
      this.elem.style.aspectRatio = `${this._toWidth}/${this._toHeight}`;

      switch (this._zoom) {
        case true:
          this.show();
          break;
        case false:
          this.hide();
          URL.revokeObjectURL(this._src);
          break;
      }
    }

  }

  trackRect = debounce(() => {
    if (this._targetRef) {
      this._rect = this._targetRef.getBoundingClientRect();
    }
  }, 250);

  private _delay = cancelableDelay() ;

  show() {
    this._delay.cancel();

    const {
      width: fromWidth,
      height: fromHeight,
      top: fromTop,
      left: fromLeft
    } = this._rect!;

    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const ratio = this._toWidth / this._toHeight;

    // 기준 크기: 최대 80% viewport
    const maxW = vw * 0.8;
    const maxH = vh * 0.8;

    let finalW = maxW;
    let finalH = maxW / ratio;

    // 높이 기준 초과 시 다시 보정
    if (finalH > maxH) {
      finalH = maxH;
      finalW = maxH * ratio;
    }

    this.elem.style.display = "block";
    this.elem.style.transition = "";
    this.elem.style.width = `${fromWidth}px`;
    this.elem.style.height = `${fromHeight}px`;
    this.elem.style.top = `${fromTop}px`;
    this.elem.style.left = `${fromLeft}px`;

    this._delay.run(1).then(() => {
      this.elem.style.top = `50%`;
      this.elem.style.left = `50%`;
      this.elem.style.transform = `translate(-50%, -50%)`;
      this.elem.style.width = `${finalW}px`;
      this.elem.style.height = `${finalH}px`;
      this.elem.style.transition = "ease 800ms";
    });
  }

  hide() {
    this._delay.cancel();

    const {
      width: fromWidth,
      height: fromHeight,
      top: fromTop,
      left: fromLeft
    } = this._rect!;

    this.elem.style.transform = "";
    this.elem.style.width = `${fromWidth}px`;
    this.elem.style.height = `${fromHeight}px`;
    this.elem.style.top = `${fromTop}px`;
    this.elem.style.left = `${fromLeft}px`;

    this._delay.run(800).then(() => {
      this.elem.style.display = "none";
    });
  }

  clickHandler() {
    this._zoom = false;
  }

  protected override render() {
    return html`
      <section style=${styleMap({ zIndex: this._zoom ? "999" : "-1" })}>
      <div
          @click=${this.clickHandler}
          class="background"
          style=${styleMap({ opacity: this._zoom ? "1" : "0" })}
        ></div>

        <img src=${this._src} />
      </section>
      <slot></slot>
    `;
  }

  protected static override shadowStyles = css`
    section {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      transition: ease 800ms;
    }

    .background {
      cursor: pointer;
      width: 100%;
      height: 100%;
      background-color: rgba(0, 0, 0, 0.7);
      backdrop-filter: blur(10px);
      transition: inherit
    }

    img {
      display: block;
      position: absolute;
      object-fit: cover;
      object-position: center top;
      border-radius: clamp(20px, 2vw, 32px);
    }
  `;

  protected override disconnected(): void {
    window.removeEventListener("resize", this.trackRect);
  }
}

declare global {
  interface HTMLElementTagNameMap {
    [TAG_NAME]: ImgViewer;
  }
}
