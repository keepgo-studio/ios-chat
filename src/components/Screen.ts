import { globalStyles } from "@/lib/core";
import { cancelMoving, delay, moveTo, pxToNumber } from "@/lib/utils";
import { LitElement, css, html } from "lit";
import { customElement, property, query } from "lit/decorators.js";
import { repeat } from "lit/directives/repeat.js";

@customElement("ios-chat-screen")
class Screen extends LitElement {
  static override styles = [
    globalStyles,
    css`
      ul {
        font-size: var(--font-size);
        display: flex;
        flex-direction: column;
        gap: 2px;
        padding: 10px 16px calc(2.4em + 20px) 12px;
      }
      ios-chat-scrollbar {
        position: absolute;
        top: 10px;
        right: 6px;
        height: calc(100% - 2.4em - 40px);
      }

      li {
        display: block;
      }
      .message {
        border-radius: var(--border-radius);
        position: relative;
        color: white;
        width: fit-content;
        word-break: break-all;
        align-self: flex-end;
        background: var(--blue);
        max-width: 75%;
      }
      p {
        padding: 0.6em 1em;
        line-height: 1.2em;
        width: fit-content;
        white-space: pre-line;
        user-select: text;
      }
      img {
        border-radius: var(--border-radius);
        width: 100%;
        max-height: 400px;
        object-fit: cover;
        user-select: none;
      }
      ios-chat-spinner {
        display: block;
        width: 50px;
        height: 40px;
        padding: 0.2em 1em;
      }

      .message.with-tail {
        margin-bottom: 6px;
      }
      .message.with-tail .tail {
        display: block;
        background: inherit;
      }
      .message .tail {
        display: none;
      }
      .message.with-tail .tail:before {
        content: "";
        position: absolute;
        z-index: 0;
        bottom: 0;
        right: -9px;
        height: 20px;
        width: 20px;
        background: inherit;
        background-attachment: fixed;
        border-bottom-left-radius: 15px;
      }
      .message.with-tail .tail:after {
        content: "";
        position: absolute;
        z-index: 1;
        bottom: 0;
        right: -10px;
        width: 10px;
        height: 20px;
        background: var(--dark-theme-bg);
        border-bottom-left-radius: 10px;
      }

      .message.answer {
        background: var(--dark-gray);
        align-self: flex-start;
      }
      .message.answer .tail::before {
        background: inherit;
        left: -9px;
        border-radius: 0;
        border-bottom-right-radius: 15px;
      }
      .message.answer .tail::after {
        background: var(--dark-theme-bg);
        left: -10px;
        border-radius: 0;
        border-bottom-right-radius: 10px;
      }
    `,
  ];

  private _animateRecent = false;
  private _inputWidth = 0;

  @property({ type: Array })
  data: ChatMessage[] = [];

  @query("ul")
  ul!: HTMLElement;

  @query("ios-chat-scroll")
  scrollContainer!: HTMLElement;

  @query("ios-chat-scrollbar")
  scrollbar!: HTMLElement;

  constructor() {
    super();

    this.addEventListener("input-fired", (e) => {
      this._inputWidth = e.detail.width;
      this._animateRecent = true;
    });

    this.addEventListener("input-active", (e) => {
      this.ul.style.paddingBottom = `${e.detail.height}px`;
      this.scrollToBottom();
    });
  }

  renderContent(type: ChatMessageType, content: string) {
    switch (type) {
      case "text":
        return html`<p>${content}</p>`;
      case "audio":
        return html`<audio src=${content}></audio>`;
      case "img":
        return html`<img src=${content} />`;
      case "loading":
        return html`<ios-chat-spinner></ios-chat-spinner>`
    }
  }

  scrollToBottom(mode: "instant" | "smooth" = "smooth") {
    cancelMoving(this.scrollContainer);

    this.scrollContainer.scrollTo({
      top: this.scrollContainer.scrollHeight,
      behavior: mode,
    });
  }

  async renderRecent() {
    const recent = this.data[this.data.length - 1];
    const recentElem = this.shadowRoot!.getElementById(recent.id)!;
    const contentElem = recentElem!.querySelector("p, audio, img, ios-chat-spinner") as HTMLElement;
    const width = contentElem.offsetWidth;
    const ulWidth = this.ul.offsetWidth;
    const ulHeight = this.ul.offsetHeight;
    const containerHeight = this.scrollContainer.offsetHeight;
    const containerScrollHeight = this.scrollContainer.scrollHeight;
    const scrollTop = this.scrollContainer.scrollTop;
    
    const cs = window.getComputedStyle(this.ul);
    const pb = pxToNumber(cs.paddingBottom);
    
    const currentTop = ulHeight - pb - recentElem.offsetHeight;
    const limitTop = containerHeight - pb;
    const top = 10 + 6 + ((currentTop < limitTop) ? limitTop - currentTop : 0);

    // init style
    recentElem.style.background = "var(--input-bg)";
    recentElem.style.zIndex = recent.role === "sender" ? "100" : "";
    recentElem.style.top = top + "px";
    recentElem.style.width = `${this._inputWidth}px`;
    recentElem.style.maxWidth = "none";
    
    await delay(1);

    recentElem.style.transition = 'width ease 200ms, background ease 500ms';
    recentElem.style.width = `${Math.min(width + 1, ulWidth * 0.75)}px`;
    recentElem.style.background = recent.role === "sender" ? "var(--blue)" : "var(--dark-gray)";

    await Promise.all([
      moveTo(
        this.scrollContainer,
        {
          from: scrollTop,
          dest: containerScrollHeight - containerHeight,
          duration: 300,
        }
      ),
      moveTo(
        recentElem,
        {
          from: top,
          dest: 0,
          duration: 150,
          styleAttr: "top"
        }
      ),
    ]);
    
    recentElem.style.zIndex = "0";
    this._animateRecent = false;
  }

  protected override updated() {
    const n = this.data.length;

    for (let idx = 0; idx < n; idx++) {
      const elem = this.shadowRoot?.getElementById(this.data[idx].id);

      elem!.style.zIndex = "0";
      elem!.classList.remove("with-tail");

      if (idx === n - 1 || this.data[idx].role !== this.data[idx + 1].role) {
        elem?.classList.add("with-tail");
      }
    }

    if (this._animateRecent) {
      this.renderRecent();
    }
  }

  scrollingHandler(e: ScrollingEvent) {
    const { y, maxHeight } = e.detail;

    this.scrollbar.setAttribute("viewportLength", this.scrollContainer.offsetHeight.toString());
    this.scrollbar.setAttribute("totalLength", maxHeight.toString());
    this.scrollbar.setAttribute("current", y.toString());
  }


  protected override render() {
    return html`
      <ios-chat-scroll .startAt=${"bottom"} @scrolling=${this.scrollingHandler}>
        <ul>
          ${repeat(
            this.data,
            (msg) => msg.id,
            (msg) => html`
              <li
                id=${msg.id}
                class="message ${msg.role === "receiver" ? "answer" : ""}"
              >
                ${this.renderContent(msg.type, msg.content)}
                <div class="tail"></div>
              </li>
            `
          )}
        </ul>
      </ios-chat-scroll>
      
      <ios-chat-scrollbar></ios-chat-scrollbar>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ios-chat-screen": Screen;
  }
}
