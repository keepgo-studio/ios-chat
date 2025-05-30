import LitComponent from "@/config/component";
import type { ChatMessage, ChatMessageContent } from "@/models/chat-room";
import { css, html } from "lit";
import { customElement, property } from "lit/decorators.js";

const TAG_NAME = "ios-chat-message";

@customElement(TAG_NAME)
class Message extends LitComponent {
  @property({ attribute: false })
  message?: ChatMessage;

  renderContent({ type, val }: ChatMessageContent) {
    switch (type) {
      case "text":
        return html`<ios-chat-message-text .val=${val}></ios-chat-message-text>`;
      case "audio":
        return html`<ios-chat-message-audio .val=${val}></ios-chat-message-audio>`;
      case "img":
        return html`<ios-chat-message-img .val=${val}></ios-chat-message-img>`;
      case "loading":
        return html`<ios-chat-message-loading></ios-chat-message-loading>`;
    }
  }

  protected override render() {
    if (!this.message) return;

    return html`
      <div class="message">
        <ul>
          ${this.message.contents.map((content) => this.renderContent(content))}
        </ul>
      </div>
    `;
  }

  protected static override shadowStyles = css`
    :host {
      display: block;
      width: fit-content;
      border-radius: inherit;
    }
    .message {
      border-radius: inherit;
      word-break: break-word;
      overflow: hidden;
    }
    ul {
      display: flex;
      flex-direction: column;
      gap: .1em;
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    [TAG_NAME]: Message;
  }
}
