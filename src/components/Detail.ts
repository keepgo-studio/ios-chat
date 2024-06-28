import { LitElement, css, html } from "lit";
import { customElement, property } from "lit/decorators.js";
import { globalStyles } from "@/lib/core";

import PhotoSvg from "../assets/photos.svg";
import AudioSvg from "../assets/waveform.circle.fill.svg";
import ChatManager from "@/lib/service";

@customElement("ios-chat-detail")
class Detail extends LitElement {
  static override styles = [
    globalStyles,
    css`
      section {
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        color: var(--theme-color);
        transition: ease 500ms;

        z-index: -1;
      }
      section.open {
        z-index: 999;
        background-color: rgba(0, 0, 0, 0.6);
        backdrop-filter: blur(6px);
      }

      ul {
        position: absolute;
        bottom: 0;
        left: 0;
        padding: 32px 0;
        display: flex;
        justify-content: flex-end;
        flex-direction: column;
        font-size: 20px;
        gap: 0.5em;
        transition: var(--ease-out-back) 600ms;
        filter: blur(40px);
        transform: translate(-30%, 36%) scale(0);
      }
      .open ul {
        filter: blur(0px);
        transform: translate(16px, 10px) scale(1);
      }
      li {
        display: block;
        width: fit-content;
        transition: ease 300ms;
      }
      label {
        display: flex;
        align-items: center;
        font-weight: 300;
        cursor: pointer;
        padding: 0.5em;
      }
      li:hover {
        transform: scale(1.05);
      }
      li:active {
        transform: scale(0.95);
      }
      ul ios-chat-svg {
        width: 36px;
        overflow: hidden;
        border-radius: 999px;
        aspect-ratio: 1/1;
      }
      p {
        margin-left: 1em;
      }
    `,
  ];

  @property()
  roomId: string | null = null;

  @property({ type: Boolean })
  open = false;

  override render() {
    return html`
      <section class=${this.open ? "open" : ""}>
          <ul>
            <li @click=${(e: Event) => e.stopPropagation()}>
              <label for="image">
                <ios-chat-svg .data=${PhotoSvg}></ios-chat-svg>
                <p>Photos</p>
              </label>
              <input
                type="file"
                id="image"
                accept="image/*"
                style="display: none;"
                @change=${(e: InputEvent) => {
                  const target = e.target as HTMLInputElement;
                  
                  if (!this.roomId || !target.files) return;
                  
                  const file = target.files[0];
                  
                  ChatManager.sendNonTextInput(this.roomId, {
                    content: URL.createObjectURL(file),
                    type: "img"
                  });

                  this.dispatchEvent(new Event("click"));

                  target.value = '';
                }}
              />
            </li>
            <li @click=${(e: Event) => e.stopPropagation()}>
              <label for="audio">
                <ios-chat-svg .data=${AudioSvg}></ios-chat-svg>
                <p>Audio</p>
              </label>
              <input
                type="file"
                id="audio"
                accept="audio/*"
                style="display: none;"
                @chage=${(e: InputEvent) => {}}
              />
            </li>
          </ul>
      </section>
    `;
  }

  override updated() {
    if (this.open) {
    } else {
    }
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ios-chat-detail": Detail;
  }
}
