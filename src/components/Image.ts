import { LitElement, PropertyValueMap, css, html } from "lit";
import { customElement, property, state } from "lit/decorators.js";

import nullSvg from "../assets/questionmark.folder.fill.svg";
import { delay, minMax } from "@/lib/utils";

const DURATION = 600;
@customElement("ios-chat-img")
class CustomImage extends LitElement {
  static override styles = css`
    :host {
      display: block;
      width: 100%;
    }
    img {
      border-radius: var(--border-radius);
      width: 100%;
      height: 100%;
      object-fit: cover;
      user-select: none;
      cursor: pointer;
    }

    ios-chat-spinner {
      display: block;
      width: 50px;
      height: 40px;
      padding: 0.2em 1em;
    }

    .container {
      width: 100%;
      position: relative;
    }

    .null {
      width: min(10vw, 160px);
      min-width: 60px;
      aspect-ratio: 1 / 1; 
      display: flex;
      align-items: center;
      justify-content: center
    }
    .null ios-chat-svg {
      width: var(--font-size);
    }
  `;

  private _width = 0;
  private _height = 0;

  @state()
  _loading = true;

  @property({ type: Boolean, reflect: true })
  success = false;
  
  @property()
  imgSrc = "";

  override render() {
    const renderContent = () => {
      switch (this.success) {
        case true:
          return html`<img
            draggable="false"
            src=${this.imgSrc}
            @click=${this.imgClickHandler}
          />`;
        case false:
          return html`
            <div class="null">
              <ios-chat-svg .data=${nullSvg}></ios-chat-svg>
            </div>
          `;
      }
    };

    return html`
      <div class="container">
        ${this._loading
          ? html`<ios-chat-spinner></ios-chat-spinner>`
          : renderContent()}
      </div>

    `;
  }

  async imgClickHandler(e: Event) {
    if (!this.success) return;

    const focusContainer = document.createElement("section");
    focusContainer.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      z-index: 1000;
      opacity: 0;
    `;

    const img = e.target as HTMLImageElement;

    const cr = img.getBoundingClientRect();

    focusContainer.innerHTML = `
      <div class="frame">
        <img src=${this.imgSrc} />
      </div>
    `;

    const frame = focusContainer.querySelector(".frame")! as HTMLElement;
    const imgCopy = focusContainer.querySelector("img")!;

    frame.style.cssText = `
      position: absolute;
      top: ${cr.top}px;
      left: ${cr.left}px;
      width: ${cr.width}px;
      height: ${cr.height}px;
      transition: ease ${DURATION}ms;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
    `;

    imgCopy.style.cssText = `
      max-width: 100%;
      max-height: 100%;
      object-fit: contain;
      border-radius: clamp(20px, 2vw, 32px);
      transition: ease 300ms;
      user-select: none;
    `;

    document.body.append(focusContainer);

    focusContainer.style.opacity = "1";
    
    await delay(1);

    focusContainer.style.transition = `background ease ${DURATION / 2}ms, backdrop-filter ease ${DURATION}ms`;
    focusContainer.style.backdropFilter = "blur(8px)";
    focusContainer.style.background = "rgba(0, 0, 0, 0.7)";

    const windowWidth = window.innerWidth,
          windowHeight = window.innerHeight;

    frame.style.top = "50%";
    frame.style.left = "50%";
    frame.style.transform = "translate(-50%, -50%)";

    frame.style.width = `${minMax(this._width, 0, windowWidth * 0.7)}px`;
    frame.style.height = `${minMax(this._height, 0, windowHeight * 0.7)}px`;

    await delay(DURATION);

    let shouldClose = false;
    
    imgCopy.addEventListener("mousedown", () => {
      shouldClose = true;
      imgCopy.style.transform = "scale(0.96)";
    });

    imgCopy.addEventListener("mouseup", async () => {
      const cr = img.getBoundingClientRect();
      imgCopy.style.transform = "scale(1)";

      if (!shouldClose) return;

      imgCopy.style.userSelect = "none";

      frame.style.transform = "";
      frame.style.top = `${cr.top}px`;
      frame.style.left = `${cr.left}px`;
      frame.style.width = `${cr.width}px`;
      frame.style.height = `${cr.height}px`;

      focusContainer.style.zIndex = "0";
      focusContainer.style.background = "rgba(0, 0, 0, 0)";
      focusContainer.style.backdropFilter = "blur(0px)";

      await delay(DURATION);

      focusContainer.remove();
    });

    imgCopy.addEventListener("mousemove", () => {
      shouldClose = false;
      imgCopy.style.transform = "scale(1)";
    });
    imgCopy.addEventListener("mouseleave", () => {
      shouldClose = false;
      imgCopy.style.transform = "scale(1)";
    });
  }

  fireLoaded() {
    this.dispatchEvent(new CustomEvent("loaded"));
  }

  protected override updated(
    _changedProperties: PropertyValueMap<any> | Map<PropertyKey, unknown>
  ): void {
    if (_changedProperties.has("imgSrc")) {
      this._loading = true;

      const img = new Image();
      img.onload = () => {
        this._width = img.naturalWidth;
        this._height = img.naturalHeight;
        this._loading = false;
        this.success = true;
        this.fireLoaded();
      };
      img.onerror = (err) => {
        this._loading = false;
        this.success = false;
        this.fireLoaded();
      };
      img.src = this.imgSrc;
    }
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ios-chat-img": CustomImage;
  }
}
