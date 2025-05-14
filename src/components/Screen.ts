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

  @state()
  messages: ChatMessage[] = [];

  @state()
  padding?: Padding;

  @state()
  inputHeight = 0;

  @state()
  senderLastIdx = -1;

  @state()
  answerLastIdx = -1;

  @state()
  animateOn = false;

  @query("ios-chat-scroll")
  scrollElem!: LitComponent;

  @query("ul")
  ulElem!: HTMLUListElement;

  @query("ul li:last-child")
  lastMessageElem?: HTMLLIElement;

  override connected(): void {
    this.actorRef.subscribe((snap) => {
      if (snap.matches({ Render: { Screen: "Sync" }})) {
        this.animateOn = false;
        this.messages = snap.context.messages;
      }
      
      if (snap.matches({ Render: { Screen: "Animate" }})) {
        this.animateOn = true;
        this.messages = snap.context.messages;
      }

      // Update input height after 'ios-chat-input' tag's resizing is complete
      if (snap.matches({ Render: { InputCoor: "Stop" }})) {
        this.inputHeight = snap.context.inputCoor.height;
      }
    });
  }

  protected override willUpdate(_changedProperties: PropertyValues): void {
    if (_changedProperties.has("messages")) {
      this.senderLastIdx = -1;
      this.answerLastIdx = -1;

      const n = this.messages.length;

      for (let idx = n - 1; idx >= 0; idx--) {
        const message = this.messages[idx];

        if (this.senderLastIdx === -1 && message.role === "sender") {
          this.senderLastIdx = idx;
        }

        if (this.answerLastIdx === -1 && message.role === "answer") {
          this.answerLastIdx = idx;
        }

        if (this.senderLastIdx !== -1 && this.answerLastIdx !== -1) {
          break;
        }
      }
    }
  }

  scrollToBottom(smooth?: boolean) {
    this.scrollElem.fireEvent("scroll-to", {
      to: "bottom",
      smooth
    });
  }

  async renderRecent() {
    if (!this.lastMessageElem) return;

    const { textareaCoor, inputCoor } = this.actorRef.getSnapshot().context;
    const recentMessage = this.messages[this.messages.length - 1];
    const li = this.lastMessageElem;
    const isSender = recentMessage.role === "sender";
    const messageElem = li.querySelector("ios-chat-message")!;
    const ulCStyle = window.getComputedStyle(this.ulElem);
    // style variables
    const duration = 400;
    const actualScreenHeight = this.offsetHeight - inputCoor.height;
    const gapBetweenInputTopFromLi = actualScreenHeight - li.offsetTop;
    const inputPaddingY = inputCoor.height - textareaCoor.height;
    const messageMaxWidth = pxToNumber(ulCStyle.width) - pxToNumber(ulCStyle.paddingLeft) - pxToNumber(ulCStyle.paddingRight);

    const top = Math.max(gapBetweenInputTopFromLi, 0) + inputPaddingY / 2;

    // before painting list of ios-chat-message
    const beforeAnimate = () => {
      li.style.maxWidth = "none";
      li.style.zIndex = "10";
      li.style.background = "var(--textarea)";
      li.style.width = isSender ? `${textareaCoor.width}px` : "";
      li.style.top = `${top}px`;
    }

    // ⭐️ after painting list of ios-chat-message
    // animate li and scroll to bottom
    const animate = () => {
      // style variables
      const actualMessageWidth = messageElem.offsetWidth + 1; // +1px for prevent breaking line
      const messageWidth = Math.min(actualMessageWidth, messageMaxWidth * MESSAGE_WIDTH_RATIO);
      li.style.transition = `var(--ease-out-quart) ${duration}ms, background ease 500ms`;

      li.style.background = isSender ? "var(--blue)" : "var(--message-color)";
      li.style.width = `${messageWidth}px`;
      li.style.top = `0px`;

      this.scrollToBottom(true);
    }

    // after animation
    const afterAnimate = () => {
      li.style.maxWidth = "";
      li.style.zIndex = "";
      li.style.background = "";
      li.style.width = "";
      li.style.top = "";
    }

    beforeAnimate();
    await delay(1);
    animate();
    await delay(duration);
    afterAnimate();
  }

  protected override updated(_changedProperties: PropertyValues): void {
    // don't aniamte at first render
    if (this.animateOn && _changedProperties.has("messages")) {
      this.renderRecent();
    }

    // scroll to bottom only if inputHeight acutal changed
    if (_changedProperties.has("inputHeight") && this.inputHeight > 0) {
      this.scrollToBottom(this.animateOn);
    }
  }

  protected override render() {
    const isLast = (idx: number) => {
      return this.senderLastIdx === idx || this.answerLastIdx === idx;
    };

    return html`
      <ios-chat-scroll>
        <ul 
          style=${styleMap({
            opacity: this.inputHeight > 0 ? "1" : "0",
            paddingTop: this.padding?.top,
            paddingLeft: this.padding?.left,
            paddingRight: this.padding?.right,
            paddingBottom: `calc(${this.padding?.bottom} + ${this.inputHeight}px)`
          })}
        >
          ${repeat(
            this.messages,
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
      transition: ease 250ms opacity;
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
