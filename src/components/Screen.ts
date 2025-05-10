import type { ChatMachineActorRef } from "@/chat.machine";
import LitComponent from "@/config/core";
import type { ChatMessage } from "@/models/chat-room";
import { css, html, type PropertyValues } from "lit";
import { customElement, property, state } from "lit/decorators.js";
import { repeat } from "lit/directives/repeat.js";

// 1개씩만 추가되도록 구조를 설계함
// 그래서 length 비교해서, *sender인 경우에만* 애니메이션을 사용하자
@customElement("ios-chat-screen")
class Screen extends LitComponent {
  @property({ attribute: false })
  actorRef!: ChatMachineActorRef;

  @property({ attribute: false })
  messages: ChatMessage[] = [];

  override connectedCallback(): void {
    super.connectedCallback();
  }

  protected override render(): unknown {
    return html`
      <ul>
        ${repeat(
          this.messages,
          (message) => message.id,
          (message, idx) => html`
            <li>
              <ios-chat-message 
                .message=${message}
                .isLast=${idx === this.messages.length - 1}
              ></ios-chat-message>
            </li>
          `
        )}
      </ul>
    `;
  }

  protected static override shadowStyles = css`
    ul {
      font-size: var(--font-size);
      display: flex;
      flex-direction: column;
      gap: 2px;
      padding: 10px 12px calc(2.4em + 20px) 16px;
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "ios-chat-screen": Screen;
  }
}
