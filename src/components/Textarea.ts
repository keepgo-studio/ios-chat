import LitComponent from "@/config/component";
import type { ChatMachineActorRef } from "@/app.machine";
import { css, html } from "lit";
import { customElement, property, query, state } from "lit/decorators.js";
import { throttle } from "@/lib/utils";
import type { ChatMessageContentMap } from "@/models/chat-room";
import { styleMap } from "lit/directives/style-map.js";

import arrowSvg from "@/assets/arrow.up.circle.fill.svg";

@customElement("ios-chat-textarea")
class Textarea extends LitComponent {
  @property({ attribute: false })
  actorRef!: ChatMachineActorRef;

  @state()
  blocked = false;

  @state()
  showBtn = false;

  @state()
  imgs: ChatMessageContentMap["img"][] = [];

  @state()
  maxHeight = 0;

  @query("textarea")
  textareaElem!: HTMLTextAreaElement;

  override connected(): void {
    this.actorRef.subscribe((snap) => {
      this.blocked = snap.matches({ Render: { Input: "Blocked" } });

      if (snap.matches({ Render: { Input: { Ready: "TypeMode" } } })) {
        // this.imgs = snap.context.cachedMessageContents.filter(
        //   (message) => message.type === "img"
        // );
      }

      // sync height when App's height is chagned
      if (snap.matches({ Render: { Coor: "Stop" }})) {
        this.maxHeight = snap.context.appCoor.height / 2;
        this.syncTextareaHeight();
      }
    });
  }

  setShowBtn() {
    this.showBtn = this.textareaElem.value.length > 0;
  }

  syncTextareaHeight() {
    const el = this.textareaElem;

    el.style.height = "auto";
    el.style.height = `${el.scrollHeight}px`;
  }

  sendMessage() {
    if (!this.showBtn) return;

    const textContent: ChatMessageContentMap["text"] = {
      type: "text",
      val: this.textareaElem.value
    };

    this.actorRef.send({ 
      type: "TEXT_ENTER",
      textContent,
      width: this.offsetWidth,
      height: this.offsetHeight
    });

    // reset textarea
    this.textareaElem.value = "";    
    this.syncTextareaHeight();
    this.setShowBtn();

    this.actorRef.send({ type: "SEND_MESSAGE" });
    this.textareaElem.focus();
  }
  
  keyHandler(e: KeyboardEvent) {
    if (e.key === "Enter" && !e.shiftKey && !e.ctrlKey) {
      e.preventDefault();
      this.sendMessage();
    }
  }

  focusHandler() {
    this.syncTextareaHeight();
    this.setShowBtn();
  }

  inputHandler = throttle((e: InputEvent) => {
    const value = (e.target as HTMLTextAreaElement).value;
    if (value.length > 0) {
      this.actorRef.send({ type: "TEXT_INPUT" });
    } else {
      this.actorRef.send({ type: "TEXT_RESET" });
    }
    this.syncTextareaHeight();
    this.setShowBtn();
  // duration is same at app.machine's InputCoor 'after duration(=150ms)'
  }, 150);

  protected override render() {
    return html`
      <section>
        <div class="custom-textarea">
          ${this.imgs.length > 0 ? this.imgs.map(
            (img) => html`
              <div class="img-wrapper">
                <img src=${img.val.src} alt=${img.val.alt ?? ""} />
                <button class="close-btn"></button>
              </div>
            `
          ) : ""}

          <div 
            class="typing-area"
            style=${styleMap({
              maxHeight: this.maxHeight > 0 ? `${Math.ceil(this.maxHeight)}px` : "",
            })}
          >
            <textarea
              rows=${1}
              placeholder="Chat"
              ?disabled=${this.blocked}
              @keypress=${this.keyHandler}
              @focus=${this.focusHandler}
              @input=${this.inputHandler}
              autofocus
            ></textarea>
          </div>
        </div>

        <div class="btn-wrapper">
          <button
            style=${styleMap({ 
              display: this.showBtn ? "" : "none"
            })}
            class="submit-btn"
            @click=${this.sendMessage}
          >
            <ios-chat-svg .data=${arrowSvg}></ios-chat-svg>
          </button>
        </div>
      </section>
    `;
  }

  protected static override shadowStyles = css`
    section {
      width: 100%;
      position: relative;
      display: flex;
      align-items: flex-end;
      box-shadow: 0 0 0 2px var(--message-color);
      border-radius: var(--border-radius);
      background-color: var(--textarea);
      overflow: hidden;
    }
    
    .custom-textarea {
      width: 100%;
      flex: 1;
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

    .typing-area {
      overflow-y: auto;
    }
    
    textarea {
      padding: 0.6em 1em;
      display: block;
      overflow: hidden;
      width: 100%;
      font-size: inherit;
      line-height: 1.2em;
      color: var(--theme-color);
      outline: none;
      border: none;
      caret-color: #1588fe;
      resize: none;
    }
    textarea:disabled {
      cursor: not-allowed;
      background-color: var(--disable);
    }
    textarea::placeholder {
      color: var(--scrollbar);
    }

    .btn-wrapper {
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 0.4em;
    }
    .submit-btn {
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
