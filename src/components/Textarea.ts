import LitComponent from "@/config/core";
import type { ChatMachineActorRef } from "@/chat.machine";
import { css, html } from "lit";
import { customElement, property, query, state } from "lit/decorators.js";
import { throttle } from "@/lib/utils";
import type { ChatMessageContentMap } from "@/models/chat-room";

import arrowSvg from "@/assets/arrow.up.circle.fill.svg";

@customElement("ios-chat-textarea")
class Textarea extends LitComponent {
  @property({ attribute: false })
  actorRef!: ChatMachineActorRef;

  @state()
  blocked = false;

  @state()
  showBtn = false;

  setShowBtn() {
    this.showBtn = this.elemTextarea.value.length > 0;
  }

  @state()
  imgs: ChatMessageContentMap["img"][] = [];

  override connectedCallback(): void {
    super.connectedCallback();

    this.actorRef.subscribe((snap) => {
      this.blocked = snap.matches({ Render: { Input: "Blocked" } });

      if (snap.matches({ Render: { Input: { Textarea: "TypeMode" } } })) {
        this.imgs = snap.context.cachedMessageContents.filter(
          (message) => message.type === "img"
        );

        
      }
    });
  }

  @query("textarea")
  elemTextarea!: HTMLTextAreaElement;

  syncTextareaHeight() {
    const el = this.elemTextarea;
    el.style.height = "auto";
    el.style.height = `${el.scrollHeight}px`;
  }

  sendMessage() {
    if (!this.showBtn) return;

    this.actorRef.send({ type: "SEND_MESSAGE" });

    this.elemTextarea.value = "";
    
    this.syncTextareaHeight();
    this.setShowBtn();
  }
  
  keyHandler(e: KeyboardEvent) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      
      const textContent: ChatMessageContentMap["text"] = {
        type: "text",
        val: this.elemTextarea.value
      };
      
      this.actorRef.send({ type: "TEXT_ENTER", textContent });

      this.sendMessage();
    }
  }

  focusHandler() {
    this.syncTextareaHeight();
    this.setShowBtn();
  }

  inputHandler = throttle(() => {
    this.syncTextareaHeight();
    this.setShowBtn();
  }, 200);

  protected override render() {
    return html`
      <section>
        <div class="textarea-wrapper">
          ${this.imgs.map(
            (img) => html`
              <div class="img-wrapper">
                <img src=${img.val.src} alt=${img.val.alt ?? ""} />
                <button class="close-btn"></button>
              </div>
            `
          )}

          <textarea
            rows=${1}
            placeholder="Chat"
            ?disabled=${this.blocked}
            @keypress=${this.keyHandler}
            @focus=${this.focusHandler}
            @input=${this.inputHandler}
          ></textarea>
        </div>

        ${this.showBtn
          ? html`
              <button class="submit-btn" @click=${this.sendMessage}>
                <ios-chat-svg .data=${arrowSvg}></ios-chat-svg>
              </button>
            `
          : undefined}
      </section>
    `;
  }

  protected static override shadowStyles = css`
    section {
      width: 100%;
      padding-left: 0.5em;
      position: relative;
      display: flex;
      align-items: center;
    }

    .textarea-wrapper {
      width: 100%;
      box-shadow: 0 0 0 2px var(--message-color);
      border-radius: var(--border-radius);
    }

    .img-wrapper {
      padding: 0.5em;
      width: fit-content;
      position: relative;
    }
    .img-wrapper img {
      border-radius: 1em;
      width: 8em;
      user-select: none;
    }
    .img-wrapper .close-btn {
      width: 1.4em;
      aspect-ratio: 1/1;
      position: absolute;
      right: 0.8em;
      top: 0.8em;
      background-color: #7c7d7f;
      border: #fff 2px solid;
      border-radius: 999px;
      cursor: pointer;
      transition: ease 500ms;
    }
    .img-wrapper .close-btn:active {
      transform: scale(0.9);
    }
    .img-wrapper .close-btn::before {
      content: "";
      width: 2px;
      height: 60%;
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%) rotate(-45deg);
      border-radius: 999px;
      background-color: #fff;
    }
    .img-wrapper .close-btn::after {
      content: "";
      width: 2px;
      height: 60%;
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%) rotate(45deg);
      border-radius: 999px;
      background-color: #fff;
    }

    textarea {
      display: block;
      width: 100%;
      height: 2.4em;
      font-size: inherit;
      border-radius: var(--border-radius);
      padding: 0.6em 2.5em 0.6em 1em;
      line-height: 1.2em;
      color: var(--theme-color);
      outline: none;
      border: none;
      background-color: var(--textarea);
      caret-color: #1588fe;
      resize: none;
    }
    textarea:disabled {
      cursor: not-allowed;
      background-color: var(--disable);
    }
    textarea::-webkit-scrollbar {
      display: none;
    }
    textarea::placeholder {
      color: var(--scrollbar);
    }

    .submit-btn {
      position: absolute;
      bottom: 0.4em;
      right: 0.4em;
      width: 1.6em;
      aspect-ratio: 1 / 1;
      fill: var(--blue);
      cursor: pointer;
    }
    .submit-btn:active {
      filter: brightness(0.8);
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "ios-chat-textarea": Textarea;
  }
}
