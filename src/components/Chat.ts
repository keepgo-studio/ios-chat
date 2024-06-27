import { globalStyles } from "@/lib/core";
import ChatManager from "@/lib/service";
import { LitElement, css, html } from "lit";
import { customElement, query, state } from "lit/decorators.js";
import { isOnlySpaces } from "@/lib/utils";

import plusSvg from "../assets/plus.svg";
import arrowSvg from "../assets/arrow.up.circle.fill.svg";

@customElement("ios-chat")
class Chat extends LitElement {
  static override styles = [
    globalStyles,
    css`
      :host {
        --dark-theme-bg: #000;
        --light-theme-bg: #fff;
        --font-size: clamp(16px, 1.5vw, 22px);
        --border-radius: clamp(20px, 2vw, 32px);
        --input-bg: rgba(10, 10, 10, 0.75);
        --blue: #39a7fc;
        --dark-gray: #26262a;

        display: block;
        width: 100%;
        height: 100%;
        background-color: #000;
      }

      .root {
        display: flex;
        flex-direction: column;
        height: 100%;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif;
        position: relative;        
      }

      ios-chat-screen {
        padding: 0 6px;
        flex: 1;
        display: block;
      }

      .chat-input {
        position: absolute;
        bottom: 0;
        left: 0;
        z-index: 99;
        width: 100%;
        display: flex;
        align-items: flex-end;
        padding: 10px 16px;
        backdrop-filter: blur(12px);
        background-color: rgba(0, 0, 0, 0.6);
        font-size: var(--font-size);
      }

      .btn-container {
        height: 2.4em;
        width: 2.4em;
        padding: .3em;
        flex-shrink: 0;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: ease 300ms;
      }
      .btn-container:active {
        transform: scale(0.8);
        width: 1.9em;
      }
      button {
        height: 100%;
        aspect-ratio: 1 / 1;
        display: flex;
        align-items: center;
        justify-content: center;
        background-color: var(--dark-gray);
        border-radius: 999px;
        border: none;
        cursor: pointer;
      }
      button ios-chat-svg {
        fill: #a2a2a4;
        width: 42%;
        height: 42%;
      }

      .textarea-container {
        width: 100%;
        padding-left: 0.5em;
        position: relative;
        display: flex;
        align-items: center;
      }
      textarea {
        width: 100%;
        height: 2.4em;
        font-size: inherit;
        border-radius: var(--border-radius);
        padding: 0.6em 2.5em 0.6em 1em;
        line-height: 1.2em;
        color: #fff;
        outline: none;
        border: none;
        box-shadow: inset 0 0 0 1px var(--dark-gray);
        background-color: var(--input-bg);
        caret-color: #1588fe;
        resize: none;
      }
      textarea:disabled {
        cursor: not-allowed;
        filter: brightness(0.5);
      }
      textarea::-webkit-scrollbar {
        display: none;
      }
      textarea::placeholder {
        color: #444447;
      }

      .textarea-container ios-chat-svg {
        position: absolute;
        bottom: .4em;
        right: .4em;
        width: 1.6em;
        aspect-ratio: 1 / 1;
        fill: var(--blue);
        cursor: pointer;
        display: none;
      }
      .textarea-container ios-chat-svg:active {
        filter: brightness(0.8);
      }
    `,
  ];

  @state()
  _messageList: ChatMessage[] = [];

  @state()
  _id: string = this.getAttribute("room-id") ?? "";

  @state()
  _textDisabled = false;

  @query("ios-chat-screen")
  screen!: HTMLElement;
  
  @query(".chat-input")
  chatInput!: HTMLElement;

  @query("textarea")
  textArea!: HTMLTextAreaElement;

  @query(".textarea-container ios-chat-svg")
  sendBtn!: HTMLElement;

  constructor() {
    super();

    if (!this._id) {
      throw new Error("<ios-chat> tag need roomId attribute");
    }

    ChatManager.roomCreated(this._id, this, () => {
      this._messageList = [...ChatManager.getMessages(this._id)];

      if (!this.screen) return;
      
      this.screen.dispatchEvent(
        new CustomEvent("input-fired", {
          detail: {
            width: this.textArea.offsetWidth,
          },
        })
      )
    });

    this.addEventListener("answer-loading-start", () => {
      ChatManager.sendMessage("receiver", this._id, {
        type: "loading",
        content: "",
      });

      this._textDisabled = true;
    })

    this.addEventListener("answer-loading-end", () => {
      ChatManager.popMessage(this._id);

      this.screen.dispatchEvent(new CustomEvent("pop"));
      this._textDisabled = false;
    })

    window.addEventListener("resize", () => this.inputFocusHandler());
  }

  protected override render() {
    return html`
      <div class="root">
        <ios-chat-screen .data=${this._messageList}></ios-chat-screen>

        <section class="chat-input">
          <div class="btn-container">
            <button>
              <ios-chat-svg .data=${plusSvg}></ios-chat-svg>
            </button>
          </div>

          <div class="textarea-container">
            <textarea
              placeholder="Chat"
              ?disabled=${this._textDisabled}
              @keypress=${this.keyHandler}
              @click=${this.inputFocusHandler}
              @input=${this.inputFocusHandler}
            ></textarea>

            <ios-chat-svg 
              .data=${arrowSvg}
              @click=${this.sendBtnHandler}
            >
            </ios-chat-svg>
          </div>
        </section>
      </div>
    `;
  }
  
  send() {
    const content = this.textArea.value;

    if (isOnlySpaces(content)) return;

    ChatManager.sendMessage("sender", this._id, {
      type: "text",
      content,
    });

    this.textArea.value = "";
    this.textArea.style.height = '';
    this.sendBtn.style.display = "none";
    this.syncScroll();
  }

  syncScroll() {
    this.screen.dispatchEvent(new CustomEvent("input-active", {
      detail: {
        height: this.chatInput.offsetHeight
      }
    }));
  }

  keyHandler(e: KeyboardEvent) {
    if (e.key !== 'Enter' || e.shiftKey) return;

    e.preventDefault();

    this.send();
  }

  inputFocusHandler() {
    this.textArea.style.height = '';
    this.textArea.style.height = `${this.textArea.scrollHeight}px`;
    this.sendBtn.style.display = this.textArea.value ? "flex" : "none";

    this.syncScroll();
  }

  sendBtnHandler() {
    this.send();
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ios-chat": Chat;
  }
}
