import { globalStyles } from "@/lib/core";
import { attachKineticScroll, cancelMoving, delay, moveTo } from "@/lib/utils";
import { LitElement, PropertyValueMap, css, html } from "lit";
import { customElement, property, query } from "lit/decorators.js";
import { repeat } from "lit/directives/repeat.js";

@customElement("ios-chat-screen")
class Screen extends LitElement {
  static override styles = [
    globalStyles,
    css`
      ul {
        font-size: var(--font-size);
        width: 100%;
        height: 100%;
        display: flex;
        flex-direction: column;
        gap: 2px;
        padding: 10px 12px calc(2.4em + 20px) 16px;
        overflow-y: scroll;
      }
      ul::-webkit-scrollbar {
        display: none;
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
      }
      p {
        padding: 0.6em 1em;
        line-height: 1.2em;
        width: fit-content;
        white-space: pre-line;
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
        background: #26262a;
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
  private _y = 0;

  @property({ type: Array })
  data: ChatMessage[] = [];

  @query("ul")
  ul!: HTMLElement;

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
    }
  }

  scrollToBottom(mode: "instant" | "smooth" = "smooth") {
    cancelMoving(this.ul);

    // [ ] moveTo를 써야할거 같음
    this.ul.scrollTo({
      top: this.ul.scrollHeight,
      behavior: mode,
    });
    
    this._y = this.ul.scrollHeight;
  }

  async renderRecent() {
    const recent = this.data[this.data.length - 1];
    const recentElem = this.shadowRoot!.getElementById(recent.id)!;
    const p = recentElem!.querySelector("p, audio, img") as HTMLElement;
    const width = p.offsetWidth;
    const ulHeight = this.ul.offsetHeight;
    const ulWidth = this.ul.offsetWidth;

    // init style
    recentElem.style.background = "var(--input-bg)";
    recentElem.style.zIndex = "100";
    recentElem.style.top = "10px";
    recentElem.style.width = `${this._inputWidth}px`;
    
    await delay(1);
    
    recentElem.style.transition = 'width ease 200ms, background ease 500ms';
    recentElem.style.width = `${Math.min(width + 1, ulWidth * 0.75)}px`;
    recentElem.style.background = "var(--blue)";

    await Promise.all([
      moveTo(
        this.ul,
        {
          from: this._y - ulHeight,
          dest: this.ul.scrollHeight - ulHeight,
          duration: 300,
        }
      ),
      moveTo(
        recentElem,
        {
          from: 10,
          dest: 0,
          duration: 150,
          styleAttr: "top"
        }
      ),
    ]);

    await delay(300);

    recentElem.style.zIndex = '0';
    this._animateRecent = false;
  }

  protected override firstUpdated(_changedProperties: PropertyValueMap<any>): void {
    attachKineticScroll(this.ul, this);
  }

  protected override updated(_changedProperties: PropertyValueMap<any>): void {
    const n = this.data.length;

    for (let idx = 0; idx < n; idx++) {
      const elem = this.shadowRoot?.getElementById(this.data[idx].id);

      elem!.classList.remove("with-tail");

      if (idx === n - 1 || this.data[idx].role !== this.data[idx + 1].role) {
        elem?.classList.add("with-tail");
      }
    }

    if (this._animateRecent) {
      this.renderRecent();
    } else {
      this.scrollToBottom("instant");
    }
  }

  protected override render() {
    return html`
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
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ios-chat-screen": Screen;
  }
}
