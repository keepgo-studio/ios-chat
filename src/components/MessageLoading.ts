import LitComponent from "@/config/component";
import { html } from "lit";
import { customElement } from "lit/decorators.js";

const TAG_NAME = "ios-chat-message-loading";

@customElement(TAG_NAME)
class MessageLoading extends LitComponent {
  protected override render() {
    return html`
      <div class="message"></div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    [TAG_NAME]: MessageLoading;
  }
}
