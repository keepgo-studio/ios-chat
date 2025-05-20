import LitComponent from "@/config/component";
import type { ChatMessageContentMap } from "@/models/chat-room";
import { css, html } from "lit";
import { customElement, property } from "lit/decorators.js";

const TAG_NAME = "ios-chat-message-img";

@customElement(TAG_NAME)
class MessageImg extends LitComponent {
  @property({ attribute: false })
  val?: ChatMessageContentMap["img"]["val"];

  protected override render() {
    return html`
      <div>
        <ios-chat-img .data=${this.val}></ios-chat-img>
      </div>
    `;
  }
  
  protected static override shadowStyles = css`
    div {
      display: block;
      width: 100%;
      height: 100%;
      cursor: pointer;
      max-height: 15em;
      overflow: hidden;
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    [TAG_NAME]: MessageImg;
  }
}
