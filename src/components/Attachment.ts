import type { ChatMachineActorRef } from "@/chat.machine";
import LitComponent from "@/config/core";
import { css, html } from "lit";
import { customElement, property, state } from "lit/decorators.js";

@customElement("ios-chat-attachment")
class Attachment extends LitComponent {
  @property({ attribute: false })
  actorRef!: ChatMachineActorRef;

  @state()
  disabled = false;

  @state()
  isOpen = false;

  override connectedCallback(): void {
    super.connectedCallback();

    this.actorRef.subscribe(snap => {
      if (snap.matches({ Render: { Attachment: "Disabled" }})) {
        this.disabled = true;
        return;
      }

      if (snap.matches({ Render: { Attachment: "Open" }})) {
        this.isOpen = true;
      } else if (
        snap.matches({ Render: { Attachment: "Closed" }}) ||
        snap.matches({ Render: { Attachment: "Blocked" }})
      ) {
        this.isOpen = false;
      }
    })
  }

  protected override render() {
    if (this.disabled) return;

    return html`
      <div></div>
    `;
  }

  protected static override shadowStyles = css``;
}

declare global {
  interface HTMLElementTagNameMap {
    "ios-chat-attachment": Attachment;
  }
}
