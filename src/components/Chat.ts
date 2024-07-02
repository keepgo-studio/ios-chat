import { globalStyles } from "@/lib/core";
import ChatManager, { type SendInfo } from "@/lib/service";
import { LitElement, PropertyValueMap, css, html } from "lit";
import { customElement, query, state } from "lit/decorators.js";
import { isOnlySpaces } from "@/lib/utils";

import arrowSvg from "../assets/arrow.up.circle.fill.svg";
import plusSvg from "../assets/plus.svg";


@customElement("ios-chat")
class Chat extends LitElement {
  static override styles = [
    globalStyles,
    css`
      :host {
        --theme-bg: #fff;
        --theme-color: #000;
        --message-color: #e9e9eb;
        --chat-input-bg: rgba(255, 255, 255, 0.7);
        --font-size: 16px;
        --border-radius: 20px;
        --input-bg: rgba(10, 10, 10, 0.75);
        --red: rgba(255, 69, 58);
        --blue: #39a7fc;
        --ease-out-back: cubic-bezier(0.34, 1.36, 0.44, 1);
        --textarea: rgba(255, 255, 255, 0.9);
        --scrollbar: #a5a5a5;
        --wave-fill: #000;
        --wave-blank: rgba(0, 0, 0, 0.3);
        --audio: rgba(200, 200, 200, 0.1);
        --audio-button: #edeaee;
        --audio-icon: rgba(0, 0, 0, 0.5);
        --audio-loading: rgba(222, 222, 222, 0.7);
      }

      :host-context(.dark) {
        --theme-bg: #000;
        --theme-color: #fff;
        --message-color: #26262a;
        --chat-input-bg: rgba(0, 0, 0, 0.6);
        --textarea: rgba(0, 0, 0, 0.5);
        --scrollbar: rgb(116 116 116);
        --wave-fill: #fff;
        --wave-blank: rgba(255, 255, 255, 0.5);
        --audio: rgba(255, 255, 255, 0.1);
        --audio-button: #313133;
        --audio-icon: rgba(255, 255, 255, 0.5);
        --audio-loading: rgba(0, 0, 0, 0.7);
      }

      :host {
        display: block;
        width: 100%;
        height: 100%;
        background-color: var(--theme-bg);
      }

      .root {
        display: flex;
        flex-direction: column;
        height: 100%;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif;
        position: relative;        

        overflow: hidden;
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
        background-color: var(--chat-input-bg);
        font-size: var(--font-size);
      }
      
      ios-chat-audio {
        display: none;
        position: absolute;
        left: 0;
        right: 0;
        bottom: 0;
        z-index: 100;
        height: 4.2em;
        background-color: var(--chat-input-bg);
        backdrop-filter: blur(12px);
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
        cursor: pointer;
        position: relative;
      }
      .btn-container:active {
        transform: scale(0.8);
        width: 1.9em;
      }
      .btn-container > button:not(.copy) {
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
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        width: 1.8em;
        transition: var(--ease-out-back) 600ms;
      }

      .textarea-container {
        width: 100%;
        padding-left: 0.5em;
        position: relative;
        display: flex;
        align-items: center;
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
        filter: brightness(0.5);
      }
      textarea::-webkit-scrollbar {
        display: none;
      }
      textarea::placeholder {
        color: #444447;
      }

      .textarea-wrapper {
        width: 100%;
        box-shadow: 0 0 0 2px var(--message-color);
        border-radius: var(--border-radius);
      }
      .textarea-wrapper .img-wrapper {
        padding: .5em;
        width: fit-content;
        position: relative;
      }
      .textarea-wrapper .img-wrapper img {
        border-radius: 1em;
        width: 8em;
        user-select: none;
      }
      .textarea-wrapper .img-wrapper .close {
        width: 1.4em;
        aspect-ratio: 1/1;
        position: absolute;
        right: .8em;
        top: .8em;
        background-color: #7c7d7f;
        border: #fff 2px solid;
        border-radius: 999px;
        cursor: pointer;
        transition: ease 500ms;
      }
      .textarea-wrapper .img-wrapper .close:active {
        transform: scale(0.9);
      }
      .textarea-wrapper .img-wrapper .close::before {
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
      .textarea-wrapper .img-wrapper .close::after {
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

  private _msgQueue: SendInfo[] = [];

  @state()
  _messageList: ChatMessage[] = [];

  @state()
  _id: string = this.getAttribute("room-id") ?? "";

  @state()
  _textDisabled = false;

  @state()
  _animatePlusBtn = false;

  @query("ios-chat-screen")
  screen!: HTMLElement;
  
  @query(".chat-input")
  chatInput!: HTMLElement;

  @query(".textarea-wrapper")
  textAreaWrapper!: HTMLElement;

  @query("textarea")
  textArea!: HTMLTextAreaElement;

  @query(".textarea-container ios-chat-svg")
  sendBtn!: HTMLElement;

  @query(".copy")
  copyBtn!: HTMLButtonElement;

  @query("ios-chat-audio")
  audioElem!: HTMLElement;

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

    this.addEventListener("input-non-text", (e) => {
      const { type, content } = e.detail;

      if (type === "img") {
        this.sendBtn.style.display = "flex";
        this.textArea.style.borderRadius = '0 0 var(--border-radius) var(--border-radius)';

        const imgWrapper = document.createElement("div");
        imgWrapper.className = "img-wrapper";
        imgWrapper.innerHTML = `
          <img src=${content} />
          <div class="close"></div>
        `;

        imgWrapper.querySelector("div")?.addEventListener("click", () => {
          this.textArea.style.borderRadius = '';
          imgWrapper.remove();
          this._msgQueue.shift();
        });

        this.textAreaWrapper.prepend(imgWrapper);
        this._msgQueue.push(e.detail);
      } else if (type ==="audio") {
        this.audioElem.style.display = "block";
        this.audioElem.setAttribute("src", content);
        this.chatInput.style.display = "none";
      }
    });
  }

  protected override render() {
    return html`
      <div class="root">
        <ios-chat-screen .data=${this._messageList}></ios-chat-screen>

        <ios-chat-detail 
          .roomId=${this._id}
          .open=${this._animatePlusBtn}
          @click=${() => this._animatePlusBtn = false}
        ></ios-chat-detail>

        <ios-chat-audio @audio-end=${(e: CustomEvent) => {
          this.audioElem.setAttribute("src", "");
          this.audioElem.style.display = "none";
          this.chatInput.style.display = "";

          if (e.detail) {
            ChatManager.sendMessage("sender", this._id, {
              type: "audio",
              content: e.detail
            });
          }
        }}></ios-chat-audio>
        
        <section class="chat-input">
          <div class="btn-container" @click=${(e: Event) => this._animatePlusBtn = true}>
            <button>
              <ios-chat-svg .data=${plusSvg}></ios-chat-svg>
            </button>

            <button class="copy">
              <ios-chat-svg .data=${plusSvg}></ios-chat-svg>
            </button>
          </div>

          <div class="textarea-container">
            <div class="textarea-wrapper">
              <textarea
                placeholder="Chat"
                ?disabled=${this._textDisabled}
                @keypress=${this.keyHandler}
                @click=${this.inputFocusHandler}
                @input=${this.inputFocusHandler}
              ></textarea>
            </div>

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

  protected override updated(_changedProperties: PropertyValueMap<any> | Map<PropertyKey, unknown>): void {
    if (_changedProperties.has("_animatePlusBtn")) {
      if (this._animatePlusBtn) {
        this.copyBtn.style.transform = `translate(150%, -${this.offsetHeight / 4}px) scale(5)`;
        this.copyBtn.style.filter = "blur(10px)";
        this.copyBtn.style.boxShadow = "rgba(255, 255, 255, 0.5) 0px 0px 32px 1px";
      } else {
        this.copyBtn.style.transform = "";
        this.copyBtn.style.filter = "";
        this.copyBtn.style.boxShadow = "";
      }
    }
  }

  send() {
    const content = this.textArea.value;

    this._msgQueue.forEach(({ type, content }) => {
      ChatManager.sendMessage("sender", this._id, {
        type, content
      })
    });

    this._msgQueue = [];
    this.textArea.style.borderRadius = '';
    [...this.textAreaWrapper.querySelectorAll(".img-wrapper")].forEach(elem => elem.remove());

    if (!isOnlySpaces(content)) {
      ChatManager.sendMessage("sender", this._id, {
        type: "text",
        content,
      });
    }

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
