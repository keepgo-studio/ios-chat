import type { ChatMachineActorRef } from "@/app.machine";
import LitComponent from "@/config/component";
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

  @state()
  blocked = false;

  override connected(): void {
    this.actorRef.subscribe(snap => {
      if (snap.matches({ Render: { Attachment: "Disabled" }})) {
        this.disabled = true;
        return;
      }

      if (snap.matches({ Render: { Attachment: "Open" }})) {
        this.isOpen = true;
      } else if (
        snap.matches({ Render: { Attachment: "Closed" }})
      ) {
        this.isOpen = false;
      }

      this.blocked = snap.matches({ Render: { Attachment: "Blocked" }});
    })
  }

  protected override render() {
    if (this.disabled) return;

    return html`
      <div></div>
    `;
  }

  protected static override shadowStyles = css`
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "ios-chat-attachment": Attachment;
  }
}
