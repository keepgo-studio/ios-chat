import LitComponent from "@/config/core";
import type { ChatMachineActorRef } from "@/chat.machine";
import { css, html } from "lit";
import { customElement, property, state } from "lit/decorators.js";

@customElement("ios-chat-input")
class Input extends LitComponent {
  @property({ attribute: false })
  actorRef!: ChatMachineActorRef;

  @state()
  isAttachmentOn = false;

  @state()
  openAttachment = false;

  @state()
  appHeight = 0;

  @state()
  appWidth = 0;

  override connectedCallback(): void {
    super.connectedCallback();

    const snapshot = this.actorRef.getSnapshot();
  
    this.isAttachmentOn = !snapshot.matches({ Render: { Attachment: "Blocked" } });

    if (snapshot.matches({ Render: { Attachment: "Open" }})) {
      this.openAttachment = true;
    } else if (snapshot.matches({ Render: { Attachment: "Closed" }})) {
      this.openAttachment = false;
    }

    this.actorRef.subscribe(snap => {
      if (snap.matches({ Render: { Attachment: "Open" } })) {
        this.appWidth = snap.context.appCoor.width;
        this.appHeight = snap.context.appCoor.height;
      }
    });
  }

  toggleHandler(e: CustomEventMap["fire-toggle"]) {
    const bool = e.detail;

    if (bool) {
      this.actorRef.send({ type: "OPEN_ATTACHMENT" });
    } else {
      this.actorRef.send({ type: "CLOSE_ATTACHMENT" });
    }
  }

  protected override render(): unknown {
    return html`
      <section>
        ${this.isAttachmentOn
          ? html`
              <ios-chat-toggle
                .open=${this.openAttachment}
                .appWidth=${this.appWidth}
                .appHeight=${this.appHeight}
                @fire-toggle=${this.toggleHandler}
              ></ios-chat-toggle>
            `
          : undefined
        }

        <ios-chat-textarea .actorRef=${this.actorRef}></ios-chat-textarea>
      </section>
    `;
  }

  protected static override shadowStyles = css`
    section {
      width: 100%;
      display: flex;
      align-items: flex-end;
      padding: 10px 16px;
      backdrop-filter: blur(12px);
      -webkit-backdrop-filter: blur(12px);
      background-color: var(--chat-input-bg);
    }

    ios-chat-textarea {
      flex: 1;
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "ios-chat-input": Input;
  }
}
