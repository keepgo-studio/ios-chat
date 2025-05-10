import LitComponent from "@/config/core";
import type { ChatMessage, ChatMessageContent } from "@/models/chat-room";
import { css, html } from "lit";
import { customElement, property } from "lit/decorators.js";

@customElement("ios-chat-message")
class Message extends LitComponent {
  @property({ type: Boolean })
  isLast = false;

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
          ${this.message.contents.map(content => this.renderContent(content))}
        </ul>
        ${this.isLast ? html`<div class="tail"></div>` : undefined}
      </div>
    `;
  }

  protected static override shadowStyles = css`
  
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "ios-chat-message": Message;
  }
}
