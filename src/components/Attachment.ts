import type { ChatMachineActorRef } from "@/app.machine";
import LitComponent from "@/config/component";
import { css, html } from "lit";
import { customElement, property, state } from "lit/decorators.js";

@customElement("ios-chat-attachment")
class Attachment extends LitComponent {
  @property({ attribute: false })
  actorRef!: ChatMachineActorRef;

  @state()
  _disabled = false;

  @state()
  _isOpen = false;

  @state()
  _blocked = false;

  override connected(): void {
    this.actorRef.subscribe(snap => {
      if (snap.matches({ Render: { Attachment: "Disabled" }})) {
        this._disabled = true;
        return;
      }

      if (snap.matches({ Render: { Attachment: "Open" }})) {
        this._isOpen = true;
      } else if (
        snap.matches({ Render: { Attachment: "Closed" }})
      ) {
        this._isOpen = false;
      }

      this._blocked = snap.matches({ Render: { Attachment: "Blocked" }});
    })
  }

  protected override render() {
    if (this._disabled) return;

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
