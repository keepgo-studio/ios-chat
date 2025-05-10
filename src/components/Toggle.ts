import LitComponent from "@/config/core";
import { css, html } from "lit";
import { customElement, property } from "lit/decorators.js";
import {styleMap} from 'lit/directives/style-map.js';

import plusSvg from "@/assets/plus.svg";

@customElement("ios-chat-toggle")
class Toggle extends LitComponent {
  @property({ type: Number })
  appWidth = 0;

  @property({ type: Number })
  appHeight = 0;

  @property({ type: Boolean })
  open = false;

  clickHandler() {
    this.open = !this.open;
    this.fireEvent("fire-toggle", this.open);
  }

  protected override render() {
    return html`
      <div @click=${this.clickHandler}>
        <button class="copy" style=${styleMap({
          left: this.open ? `${this.appWidth / 4}px` : "",
          bottom: this.open ?  `${this.appHeight / 4}px` : "",
          width: this.open ? `${this.appWidth / 2}px` : "",
          filter: this.open ? `blur(${this.appWidth / 5}px)` : "",
          boxShadow: this.open ? `rgba(255, 255, 255, 0.5) 0px 0px 32px 1px` : ""
        })}>
          <ios-chat-svg .data=${plusSvg}></ios-chat-svg>
        </button>

        <button>
          <ios-chat-svg .data=${plusSvg}></ios-chat-svg>
        </button>
      </div>
    `;
  }

  protected static override shadowStyles = css`
    div {
      position: relative;
      height: 2.4em;
      width: 2.4em;
      padding: 0.3em;
      flex-shrink: 0;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: ease 300ms;
      cursor: pointer;
    }
    div:active button {
      width: 1.5em;
    }
    div > button:not(.copy) {
      opacity: 0;
    }
    button {
      width: 100%;
      aspect-ratio: 1 / 1;
      display: flex;
      align-items: center;
      justify-content: center;
      background-color: var(--message-color);
      border-radius: 999px;
      border: none;
      cursor: pointer;
    }
    button ios-chat-svg {
      fill: #a2a2a4;
      width: 42%;
      height: 42%;
    }
    button.copy {
      position: absolute;
      bottom: 50%;
      left: 50%;
      transform: translate(-50%, 50%);
      width: 1.8em;
      transition: var(--ease-out-back) 600ms;
      z-index: 10;
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "ios-chat-toggle": Toggle;
  }
}
