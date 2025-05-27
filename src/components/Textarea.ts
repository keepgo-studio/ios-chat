import LitComponent from "@/config/component";
import type { ChatMachineActorRef } from "@/machine/app.machine";
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
  _blocked = false;

  @state()
  _showBtn = false;

  @state()
  _imgs: ChatMessageContentMap["img"][] = [];

  @state()
  _maxHeight = 0;

  @state()
  _height = 0;

  @query("textarea")
  textareaElem!: HTMLTextAreaElement;

  override connected(): void {
    this.actorRef.subscribe((snap) => {
      this._blocked = snap.matches({ Render: { Input: "Blocked" } });

      if (snap.matches({ Render: { Input: { Ready: "TypeMode" } } })) {
        this._imgs = snap.context.cachedMessageContents.filter(
          (message) => message.type === "img"
        );
        this.setShowBtn();
      }

      // sync height when App's height is chagned
      if (snap.matches({ Render: { Coor: "Stop" }})) {
        this._maxHeight = snap.context.appCoor.height / 2;
        this.syncTextareaHeight();
      }
    });
  }

  setShowBtn() {
    this._showBtn = this.textareaElem.value.length > 0 || this._imgs.length > 0;
  }

  syncTextareaHeight() {
    const el = this.textareaElem;

    el.style.height = "auto";
    const h = el.scrollHeight;

    el.style.height = `${h}px`;
    this._height = h;
  }

  sendMessage() {
    if (!this._showBtn) return;

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
  }, 100);

  protected override render() {
    return html`
      <section>
        ${this._imgs.length > 0 ? html`
          <div class="attached">
            ${this._imgs.map(
            (img, index) => html`
              <div class="img-wrapper">
                <ios-chat-img .data=${img.val}></ios-chat-img>
                <button
                  class="close-btn" 
                  @click=${() => this.actorRef.send({ type: "DETACH_IMAGE", index })}
                ></button>
              </div>
            `)}
          </div>  
        ` : undefined}

        <ios-chat-scroll
          style=${styleMap(this._maxHeight <= 0 ? {} : {
            maxHeight: this._maxHeight < this._height 
              ? `${Math.ceil(this._maxHeight)}px`
              : `calc(1.2em + ${this._height}px)`,
          })}
          .padding=${{
            top: "0.6em",
            right: "1em",
            bottom: "0.6em",
            left: "1em"
          }}
        >
          <textarea
            rows=${1}
            placeholder="Chat"
            ?disabled=${this._blocked}
            @keypress=${this.keyHandler}
            @focus=${this.focusHandler}
            @input=${this.inputHandler}
            autofocus
          ></textarea>
        </ios-chat-scroll>

        <div class="btn-wrapper">
          <button
            style=${styleMap({ display: this._showBtn ? "" : "none" })}
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
      display:grid;
      grid-template-columns: 1fr auto;
      box-shadow: 0 0 0 2px var(--message-color);
      border-radius: var(--border-radius);
      background-color: var(--textarea);
      overflow: hidden;
    }

    .attached {
      overflow-x: auto;
      padding: 0.5em;
      display: flex;
      gap: 0.25em;
      grid-column: 1/3;
    }
    .attached::-webkit-scrollbar {
      width:  0.6em;
      height: 0.6em;
    }
    .attached::-webkit-scrollbar-thumb {
      background-color: var(--scrollbar);
      border-radius: 999px;
      background-clip: padding-box;
      border: 0.15em solid transparent;
      cursor: pointer;
    }
    .attached::-webkit-scrollbar-track {
      background-color: transparent;
      border-radius: 999px;
    }

    .img-wrapper {
      flex-shrink: 0;
      width: fit-content;
      position: relative;
      border-radius: 1em;
      max-height: 16em;
      overflow: hidden;
    }
    .img-wrapper ios-chat-img {
      user-select: none;
    }
    .img-wrapper .close-btn {
      width: 1.4em;
      aspect-ratio: 1/1;
      position: absolute;
      right: 0.25em;
      top: 0.25em;
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
      font-size: inherit;
      line-height: 1.2em;
      color: var(--theme-color);
      background: none;
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
      align-self: flex-end;
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
