import { LitElement, css, html } from "lit";
import { customElement, property, query } from "lit/decorators.js";
import { globalStyles } from "@/lib/core";
import ChatManager from "@/lib/service";

import PhotoSvg from "../assets/photos.svg";
import AudioSvg from "../assets/waveform.circle.fill.svg";
import RecordSvg from "../assets/mic.circle.fill.svg";
import { pxToNumber } from "@/lib/utils";

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
        background-color: rgba(0, 0, 0, 0.4);
        backdrop-filter: blur(6px);
      }

      ul {
        width: 100%;
        position: absolute;
        bottom: 32px;
        left: 0;
        display: flex;
        justify-content: flex-end;
        flex-direction: column;
        font-size: 20px;
        gap: 0.5em;
        transition: var(--ease-out-back) 600ms;
        filter: blur(40px);
        transform: translate(calc(-50% + 16px), 50%) scale(0);
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

  @query("ul")
  ulElem!: HTMLElement;

  override render() {
    return html`
      <section class=${this.open ? "open" : ""}>
        <ul @click=${this.clickHandler}>
          <ios-chat-scroll>
            <li>
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
                    type: "img",
                  });

                  this.dispatchEvent(new Event("click"));

                  target.value = "";
                }}
              />
            </li>

            <li>
              <label for="record" @click=${() => {
                if (!this.roomId) return;

                ChatManager.sendNonTextInput(this.roomId, {
                  content: "record",
                  type: "audio",
                });
              }}>
                <ios-chat-svg .data=${RecordSvg}></ios-chat-svg>
                <p>Record</p>
              </label>
              <input id="record" style="display: none;"/>
            </li>

            <li>
              <label for="audio">
                <ios-chat-svg .data=${AudioSvg}></ios-chat-svg>
                <p>Audio</p>
              </label>
              <input
                type="file"
                id="audio"
                accept="audio/*"
                style="display: none;"
                @change=${(e: InputEvent) => {
                  const target = e.target as HTMLInputElement;

                  if (!this.roomId || !target.files) return;

                  const file = target.files[0];

                  ChatManager.sendNonTextInput(this.roomId, {
                    content: URL.createObjectURL(file),
                    type: "audio",
                  });

                  this.dispatchEvent(new Event("click"));

                  target.value = "";
                }}
              />
            </li>
          </ios-chat-scroll>
        </ul>
      </section>
    `;
  }

  clickHandler(e: Event) {
    const inputTag = e.target as HTMLInputElement;

    if (inputTag.tagName === "INPUT") return;

    e.stopPropagation();
  }

  override updated() {
    if (!this.open) return;

    const n = this.ulElem.querySelectorAll("li").length;
    const cs = window.getComputedStyle(this.ulElem.querySelector("li")!);

    this.ulElem.style.height = `${pxToNumber(cs.height) * n}px`;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ios-chat-detail": Detail;
  }
}
