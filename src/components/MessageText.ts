import LitComponent from "@/config/component";
import type { ChatMessageContentMap } from "@/models/chat-room";
import { css, CSSResult, html } from "lit";
import { customElement, property } from "lit/decorators.js";

const TAG_NAME = "ios-chat-message-text";

@customElement(TAG_NAME)
class MessageText extends LitComponent {
  @property({ attribute: false })
  val!: ChatMessageContentMap["text"]["val"];

  protected override render() {
    return html`
      <p>${this.val}</p>
    `;
  }

  protected static override shadowStyles: CSSResult = css`
    p {
      padding: 0.6em 1em;
      line-height: 1.2em;
      min-height: 2em;
      width: fit-content;
      white-space: pre-line;
      user-select: text;
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    [TAG_NAME]: MessageText;
  }
}
