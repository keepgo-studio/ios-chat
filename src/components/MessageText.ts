import LitComponent from "@/config/core";
import type { ChatMessageContentMap } from "@/models/chat-room";
import { html } from "lit";
import { customElement, property } from "lit/decorators.js";

@customElement("ios-chat-message-text")
class MessageText extends LitComponent {
  @property({ attribute: false })
  val!: ChatMessageContentMap["text"]["val"];

  protected override render() {
    return html`
      <div class="message"></div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ios-chat-message-text": MessageText;
  }
}
