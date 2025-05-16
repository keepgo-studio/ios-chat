import type { ChatMachineActorRef } from "@/app.machine";
import LitComponent from "@/config/component";
import { delay, pxToNumber } from "@/lib/utils";
import type { ChatMessage } from "@/models/chat-room";
import { css, html, type PropertyValues } from "lit";
import { customElement, property, query, state } from "lit/decorators.js";
import { repeat } from "lit/directives/repeat.js";
import { styleMap } from "lit/directives/style-map.js";
import type { Padding } from "@/lib/style-utils";

const MESSAGE_WIDTH_RATIO = 0.75;

@customElement("ios-chat-screen")
class Screen extends LitComponent {
  @property({ attribute: false })
  actorRef!: ChatMachineActorRef;

  @property({ type: Object })
  padding?: Padding;

  @state()
  _messages: ChatMessage[] = [];

  @state()
  _inputHeight = 0;

  @state()
  _senderLastIdx = -1;

  @state()
  _answerLastIdx = -1;

  @state()
  _animate = false;

  @state()
  _isTyping = false;

  @state()
  _isBottom = false;

  @query("ios-chat-scroll")
  scrollElem!: LitComponent;

  @query("ul")
  ulElem!: HTMLUListElement;

  @query("ul li:last-child")
  lastMessageElem?: HTMLLIElement;

  @query("ios-chat-scroll > div")
  bottomElem!: HTMLElement;

  private _io?: IntersectionObserver;

  override connected(): void {
    this.actorRef.subscribe((snap) => {
      if (snap.matches({ Render: { Screen: { Ready: "Animating" } }})) {
        this._animate = true;
        this._messages = snap.context.messages;
      }

      if (snap.matches({ Render: { Screen: { Ready: "Painting" } }})) {
        this._animate = false;
        this._messages = snap.context.messages;
      }

      // Update input height after 'ios-chat-input' tag's resizing is complete
      if (snap.matches({ Render: { InputCoor: "Stop" }})) {
        this._inputHeight = snap.context.inputCoor.height;
      }

      if (snap.matches({ Render: { Input: { Ready: { TypeMode: "Typing" }}}})) {
        this._isTyping = true;
      } else if (snap.matches({ Render: { Input: { Ready: { TypeMode: "Idle" }}}})) {
        this._isTyping = false;
      }
    });
  }

  protected override willUpdate(_changedProperties: PropertyValues): void {
    if (_changedProperties.has("_messages")) {
      this._senderLastIdx = -1;
      this._answerLastIdx = -1;

      const n = this._messages.length;

      for (let idx = n - 1; idx >= 0; idx--) {
        const message = this._messages[idx];

        if (this._senderLastIdx === -1 && message.role === "sender") {
          this._senderLastIdx = idx;
        }

        if (this._answerLastIdx === -1 && message.role === "answer") {
          this._answerLastIdx = idx;
        }

        if (this._senderLastIdx !== -1 && this._answerLastIdx !== -1) {
          break;
        }
      }
    }
  }

  protected override firstUpdated(): void {
    this._io = new IntersectionObserver((entries) => {
      this._isBottom = entries[0].isIntersecting;
    }, {
      threshold: 1
    });

    this._io?.observe(this.bottomElem);
  }

  protected override updated(_changedProperties: PropertyValues): void {
    if (
      _changedProperties.has("_messages") && 
      this._messages.length > 0 &&
      this._animate
    ) {
      this.renderRecent();
    }
  }

  async renderRecent() {
    if (!this.lastMessageElem) return;

    const { textareaCoor, inputCoor } = this.actorRef.getSnapshot().context;
    const recentMessage = this._messages[this._messages.length - 1];
    const li = this.lastMessageElem;
    const isSender = recentMessage.role === "sender";
    const messageElem = li.querySelector("ios-chat-message")!;
    const ulCStyle = window.getComputedStyle(this.ulElem);
    // style variables
    const duration = 350;
    const actualScreenHeight = this.offsetHeight - inputCoor.height;
    const gapBetweenInputTopFromLi = actualScreenHeight - li.offsetTop;
    const inputPaddingY = inputCoor.height - textareaCoor.height;
    const messageMaxWidth = pxToNumber(ulCStyle.width) - pxToNumber(ulCStyle.paddingLeft) - pxToNumber(ulCStyle.paddingRight);

    const y = Math.max(gapBetweenInputTopFromLi, 0) + inputPaddingY / 2;

    // before painting recent ios-chat-message
    const beforeAnimate = () => {
      li.style.maxWidth = "none";

      li.style.zIndex = isSender ? "99" : "";
      li.style.color = "var(--theme-color)";
      li.style.background = "var(--textarea)";
      li.style.width = isSender ? `${textareaCoor.width}px` : "";
      li.style.transform = `translateY(${y}px)`;
    }

    // ⭐️ after painting recent ios-chat-message
    // animate li and scroll to bottom
    const animate = () => {
      // style variables
      const actualMessageWidth = messageElem.offsetWidth + 1; // +1px for prevent breaking line
      const messageWidth = Math.min(actualMessageWidth, messageMaxWidth * MESSAGE_WIDTH_RATIO);

      li.style.transition = `var(--ease-out-quart) ${duration}ms`;

      li.style.color = isSender ? "#fff" : "";
      li.style.background = isSender ? "var(--blue)" : "var(--message-color)";
      li.style.width = `${messageWidth}px`;
      li.style.transform = `translateY(0px)`;
    }

    // after animation
    const afterAnimate = () => {
      li.style.maxWidth = "";

      li.style.transition = "";

      li.style.zIndex = "";
      li.style.color = "";
      li.style.background = "";
      li.style.width = "";
      li.style.transform = "";
    }

    beforeAnimate();
    await delay(1);
    animate();
    await delay(duration);
    afterAnimate();
  }

  protected override render() {
    const isLast = (idx: number) => {
      return this._senderLastIdx === idx || this._answerLastIdx === idx;
    };

    return html`
      <ios-chat-scroll
        .blockAutoScroll=${this._isTyping && !this._isBottom}
        .scrollBehavior=${this._animate ? "smooth" : "auto"}
      >
        <ul 
          style=${styleMap({
            paddingTop: this.padding?.top,
            paddingLeft: this.padding?.left,
            paddingRight: this.padding?.right,
            paddingBottom: `calc(${this.padding?.bottom} + ${this._inputHeight}px)`
          })}
        >
          ${repeat(
            this._messages,
            (message) => message.id,
            (message, idx) => html`
              <li class=${message.role}>
                <ios-chat-message .message=${message}></ios-chat-message>
                ${isLast(idx)
                  ? html`<div class="tail ${message.role === "sender" ? "right" : "left"}"></div>`
                  : undefined}
              </li>
            `
          )}
        </ul>
        <div style=${styleMap({ transform: `translateY(${-this._inputHeight}px)`})}></div>
      </ios-chat-scroll>
    `;
  }

  protected static override shadowStyles = css`
    ul {
      font-size: inherit;
      display: flex;
      flex-direction: column;
      gap: .125em;
      height: 100%;
      width: 100%;
    }

    li {
      position: relative;
      width: fit-content;
      max-width: ${MESSAGE_WIDTH_RATIO * 100}%;
      border-radius: var(--border-radius);
    }
    li.sender {
      align-self: flex-end;
      background: var(--blue);
      color: #fff;
    }
    li.answer {
      align-self: flex-start;
      background: var(--message-color);
      color: var(--theme-color);
    }

    .tail {
      background: inherit;
    }
    .tail:before {
      content: "";
      position: absolute;
      z-index: 0;
      bottom: 0;
      height: 20px;
      width: 20px;
      background: inherit;
      background-attachment: fixed;
    }
    .tail:after {
      content: "";
      position: absolute;
      z-index: 1;
      bottom: 0;
      width: 10px;
      height: 20px;
      background: var(--theme-bg);
    }
    .tail.right:before {
      right: -9px;
      border-bottom-left-radius: 15px;
    }
    .tail.right:after {
      right: -10px;
      border-bottom-left-radius: 10px;
    }
    .tail.left:before {
      left: -9px;
      border-bottom-right-radius: 15px;
    }
    .tail.left:after {
      left: -10px;
      border-bottom-right-radius: 10px;
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "ios-chat-screen": Screen;
  }
}
