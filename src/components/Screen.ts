import type { ChatMachineActorRef } from "@/machine/app.machine";
import LitComponent from "@/config/component";
import { delay, pxToNumber, range } from "@/lib/utils";
import type { ChatMessage } from "@/models/chat-room";
import { css, html, type PropertyValues } from "lit";
import { customElement, property, query, state } from "lit/decorators.js";
import { repeat } from "lit/directives/repeat.js";
import { styleMap } from "lit/directives/style-map.js";
import type { Padding } from "@/lib/style-utils";
import { classMap } from "lit/directives/class-map.js";

const MESSAGE_WIDTH_RATIO = 0.75;
const ONE_MINUTE = 60 * 1000;

const TAG_NAME = "ios-chat-screen";

@customElement(TAG_NAME)
class Screen extends LitComponent {
  @property({ attribute: false })
  actorRef!: ChatMachineActorRef;

  @property({ attribute: false })
  padding?: Padding;

  @state()
  _messages: ChatMessage[] = [];

  @state()
  _inputHeight = 0;

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
  private _shouldShowTail: boolean[] = [];

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

  protected override willUpdate(_changedProperties: PropertyValues): void {
    if (_changedProperties.has("_messages")) {
      this._shouldShowTail = range(this._messages.length);
      for (let i = 0; i < this._messages.length; i++) {
          const current = this._messages[i];
          const next = this._messages[i + 1];
          const isLast = i === this._messages.length - 1;

          const currentRole = current.role;
          const currentTime = current.createdDatetime;

          const nextRole = next?.role;
          const nextTime = next?.createdDatetime;

          const roleChanged = !next || currentRole !== nextRole;
          const timeGap = !next || (nextTime - currentTime >= ONE_MINUTE);

          // Conditions 1, 2, 3: Add tail if 
          // the next message has a different role, 
          // there's a large time gap,
          // or it's the last message
          if (roleChanged || timeGap || isLast) {
            this._shouldShowTail[i] = true;
          }
      }
    }
  }

  async renderRecent() {
    if (!this.lastMessageElem) return;

    const { textareaCoor, inputCoor } = this.actorRef.getSnapshot().context;
    const recentMessage = this._messages[this._messages.length - 1];
    const li = this.lastMessageElem;
    const isSender = recentMessage.role === "sender";
    const isImgContain = recentMessage.contents.some(c => c.type === "img");
    const isAudioContain = recentMessage.contents.some(c => c.type === "audio");
    const messageElem = li.querySelector("ios-chat-message")!;
    const ulCStyle = window.getComputedStyle(this.ulElem);
    // style variables
    const duration = 500;
    const actualScreenHeight = this.offsetHeight - inputCoor.height;
    const gapBetweenInputTopFromLi = actualScreenHeight - li.offsetTop;
    const inputPaddingY = inputCoor.height - textareaCoor.height;
    const messageMaxWidth = pxToNumber(ulCStyle.width) - pxToNumber(ulCStyle.paddingLeft) - pxToNumber(ulCStyle.paddingRight);

    const y = Math.max(gapBetweenInputTopFromLi, 0) + inputPaddingY / 2;

    // before painting recent ios-chat-message
    const beforeAnimate = () => {
      li.style.maxWidth = !isImgContain ? "none" : "";

      li.style.zIndex = isSender ? "99" : "";
      li.style.color = "var(--theme-color)";
      li.style.background = "var(--textarea)";
      if (isImgContain) {
        li.style.width = "";
      } else if (isAudioContain) {
        li.style.width = isSender ? `${messageMaxWidth}px` : "";
      } else {
        li.style.width = isSender ? `${textareaCoor.width}px` : "";
      }
      li.style.transform = `translateY(${y}px)`;
    }

    // ⭐️ after painting recent ios-chat-message
    // animate li and scroll to bottom
    const animate = () => {
      // style variables
      const maxMessageWidth = messageMaxWidth * MESSAGE_WIDTH_RATIO;
      const actualMessageWidth = messageElem.offsetWidth + 1; // +1px for prevent breaking line
      const messageWidth = Math.min(actualMessageWidth, maxMessageWidth);

      li.style.transition = `var(--ease-out-quart) ${duration}ms`;

      li.style.color = isSender ? "#fff" : "";
      li.style.background = isSender ? "var(--blue)" : "var(--message-color)";
      li.style.width = (isSender && !isImgContain) ? `${messageWidth}px` : "";
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
    let prevMessage: ChatMessage | null = null;

    return html`
      <ios-chat-scroll
        .blockAutoScroll=${this._isTyping && !this._isBottom}
        .scrollBehavior=${this._animate ? "smooth" : "auto"}
        .padding=${this.padding && {
          top: this.padding.top,
          right: this.padding.right,
          bottom: `calc(${this.padding.bottom} + ${this._inputHeight}px)`,
          left: this.padding.left,
        }}
      >
        <ul
          style=${styleMap({ opacity: this._messages.length > 0 ? "1" : "0" })}
        >
          ${repeat(
            this._messages,
            (message) => message.id,
            (message, idx) => {
              // For ios-chat-divider
              const dateStr = new Date(message.createdDatetime).toDateString();
              const shouldShowDate =
                prevMessage === null ||
                new Date(prevMessage.createdDatetime).toDateString() !== dateStr;

              prevMessage = message;

              return html`
                ${shouldShowDate 
                    ? html`<ios-chat-date-divider .datetime=${message.createdDatetime}></ios-chat-date-divider>` 
                    : undefined}
                <li class=${classMap({
                  [message.role]: true,
                  "clickable": message.contents.some(msg => msg.type === "img"),
                  "audio": message.contents.some(msg => msg.type === "audio")
                })}>
                  <ios-chat-message .message=${message}></ios-chat-message>
                  ${this._shouldShowTail[idx]
                    ? html`<div class="tail ${message.role === "sender" ? "right" : "left"}"></div>`
                    : undefined}
                </li>
              `
            }
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
      transition: var(--ease-out-quart) 500ms opacity;
    }

    ios-chat-date-divider {
      padding: 1em 0;
    }
    li {
      position: relative;
      width: fit-content;
      max-width: ${MESSAGE_WIDTH_RATIO * 100}%;
      box-shadow: 0 0 8px 0 var(--message-color);
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
    li.clickable {
      transition: ease 500ms;
    }
    li.clickable:active {
      transform: scale(0.98);
    }
    li.audio {
      width: 100%;
    }
    li.audio ios-chat-message {
      width: 100%;
    }

    ios-chat-message {
      position: relative;
      z-index: 2;
    }
  
    .tail {
      background: inherit;
    }
    .tail:before {
      content: "";
      position: absolute;
      z-index: 0;
      bottom: 0;
      height: 1.25em;
      width: 1.25em;
      background: inherit;
      background-attachment: fixed;
    }
    .tail:after {
      content: "";
      position: absolute;
      z-index: 1;
      bottom: 0;
      width: 0.625em;
      height: 1.25em;
      background: var(--theme-bg);
    }
    .tail.right:before {
      right: -0.5625em;
      border-bottom-left-radius: 0.9375em;
    }
    .tail.right:after {
      right: -0.625em;
      border-bottom-left-radius: 0.625em;
    }
    .tail.left:before {
      left: -0.5625em;
      border-bottom-right-radius: 0.9375em;
    }
    .tail.left:after {
      left: -0.625em;
      border-bottom-right-radius: 0.625em;
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    [TAG_NAME]: Screen;
  }
}
