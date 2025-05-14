import LitComponent from "@/config/component";
import { html } from "lit";
import { customElement } from "lit/decorators.js";

@customElement("ios-chat-message-loading")
class MessageLoading extends LitComponent {
  protected override render() {
    return html`
      <div class="message"></div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ios-chat-message-loading": MessageLoading;
  }
}
