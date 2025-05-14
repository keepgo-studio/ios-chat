import LitComponent from "@/config/component";
import type { ChatMessageContentMap } from "@/models/chat-room";
import { html } from "lit";
import { customElement, property } from "lit/decorators.js";

@customElement("ios-chat-message-img")
class MessageImg extends LitComponent {
  @property({ attribute: false })
  val!: ChatMessageContentMap["img"]["val"];

  protected override render() {
    return html`
      <div class="message"></div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ios-chat-message-img": MessageImg;
  }
}
