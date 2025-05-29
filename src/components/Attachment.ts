import type { ChatMachineActorRef } from "@/machine/app.machine";
import LitComponent from "@/config/component";
import { css, html } from "lit";
import { customElement, property, state } from "lit/decorators.js";

import PhotoSvg from "@/assets/photos.svg";
import RecordSvg from "@/assets/mic.circle.fill.svg";
import AudioSvg from "@/assets/waveform.circle.fill.svg";

type ItemTypes = "image" | "record" | "audio";
type Item = {
  type: ItemTypes;
  title: string;
  icon: string;
};

const items: Item[] = [
  {
    type: "image",
    title: "Photos",
    icon: PhotoSvg,
  },
  {
    type: "record",
    title: "Record",
    icon: RecordSvg,
  },
  {
    type: "audio",
    title: "Audio",
    icon: AudioSvg,
  },
];

@customElement("ios-chat-attachment")
class Attachment extends LitComponent {
  @property({ attribute: false })
  actorRef!: ChatMachineActorRef;

  @state()
  _disabled = false;

  @state()
  _isOpen = false;

  @state()
  _blocked = false;

  override connected(): void {
    const snapshot = this.actorRef.getSnapshot();

    this._disabled = snapshot.matches({ Render: { Attachment: "Disabled" } });

    if (this._disabled) return;

    this.actorRef.subscribe((snap) => {
      if (snap.matches({ Render: { Attachment: "Open" } })) {
        this._isOpen = true;
      } else if (snap.matches({ Render: { Attachment: "Closed" } })) {
        this._isOpen = false;
      }

      this._blocked = snap.matches({ Render: { Attachment: "Blocked" } });
    });
  }

  clickHandler() {
    this.actorRef.send({ type: "CLOSE_ATTACHMENT" });
  }

  async changeHandler(e: InputEvent) {
    const inputElem = e.currentTarget as HTMLInputElement;
    const type = inputElem.dataset.type as ItemTypes;

    if (!inputElem.files) return;

    switch (type) {
      case "image": {
        for (const blob of [...inputElem.files].reverse()) {
          this.actorRef.send({
            type: "ATTACH_IMAGE",
            imgContent: {
              type: "img",
              val: { type: "raw", blob },
            },
          });
        }
        break;
      }
      case "audio": {
        const blob = inputElem.files[0];

        this.actorRef.send({
          type: "ATTACH_AUDIO",
          audioContent: {
            type: "audio",
            val: { type: "raw", blob },
          },
        });
        break;
      }
    }

    // clear input
    inputElem.value = "";
    // close attachment
    this.actorRef.send({ type: "CLOSE_ATTACHMENT" });
  }

  buttonClickHandler() {
    this.actorRef.send({ type: "ATTACH_AUDIO" });
    this.actorRef.send({ type: "CLOSE_ATTACHMENT" });
  }

  protected override render() {
    if (this._disabled) return;

    return html`
      <section class=${this._isOpen ? "open" : ""}>
        <div class="background" @click=${this.clickHandler}></div>
        <ul>
          ${items.map(
            (item, index) => html`
              <li>
                <label for=${index}>
                  <ios-chat-svg .data=${item.icon}></ios-chat-svg>
                  <p>${item.title}</p>
                </label>
                ${item.type === "record"
                  ? html`
                    <button 
                      id=${index}
                      @click=${this.buttonClickHandler}>
                    </button>
                  `
                  : html`
                      <input
                        type="file"
                        ?multiple=${item.type === "image"}
                        data-type=${item.type}
                        id=${index}
                        accept=${`${item.type}/*`}
                        @change=${this.changeHandler}
                      />
                    `}
              </li>
            `
          )}
        </ul>
      </section>
    `;
  }

  protected static override shadowStyles = css`
    section {
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      transition: ease 500ms z-index;
      color: var(--theme-color);
      z-index: -1;
    }
    section.open {
      z-index: 100;
    }

    .background {
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      transition: ease 500ms;
    }
    .open .background {
      background-color: var(--chat-input-bg);
      backdrop-filter: blur(6px);
      -webkit-backdrop-filter: blur(6px);
    }

    ul {
      position: absolute;
      bottom: 1em;
      left: 0.5em;
      display: flex;
      justify-content: flex-end;
      flex-direction: column;
      font-size: 1.5em;
      transition: var(--ease-out-back) 600ms;
      opacity: 0;
      filter: blur(40px);
      transform: translate(-46%, 50%) scale(0);
    }
    .open ul {
      opacity: 1;
      filter: blur(0);
      transform: translate(0, 0) scale(1);
    }

    li {
      width: fit-content;
      transition: ease 300ms transform;
    }
    li:hover {
      transform: scale(1.05);
    }
    li:active {
      transform: scale(0.95);
    }

    label {
      display: flex;
      align-items: center;
      font-weight: 300;
      cursor: pointer;
      padding: 0.5em;
    }
    label ios-chat-svg {
      width: 36px;
      height: 36px;
      border-radius: 999px;
      overflow: hidden;
      box-shadow: 0 0 8px 2px rgba(0, 0, 0, 0.15);
    }
    label p {
      margin-left: 0.8em;
    }

    input, button {
      display: none;
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "ios-chat-attachment": Attachment;
  }
}
