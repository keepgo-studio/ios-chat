import LitComponent from "@/config/component";
import type { ChatMachineActorRef } from "@/app.machine";
import { css, html } from "lit";
import { customElement, property, state } from "lit/decorators.js";

@customElement("ios-chat-input")
class Input extends LitComponent {
  @property({ attribute: false })
  actorRef!: ChatMachineActorRef;

  @state()
  _isAttachmentOff = false;

  @state()
  _openAttachment = false;

  @state()
  _appHeight = 0;

  @state()
  _appWidth = 0;

  private _resizeObserver?: ResizeObserver;

  override connected(): void {
    const snapshot = this.actorRef.getSnapshot();
  
    // check is attachment is available at first
    this._isAttachmentOff = snapshot.matches({ Render: { Attachment: "Disabled" } });

    if (!this._isAttachmentOff) {
      this.actorRef.subscribe(snap => {
        // sync open or close
        if (snap.matches({ Render: { Attachment: "Open" }})) {
          this._appWidth = snap.context.appCoor.width;
          this._appHeight = snap.context.appCoor.height;
          this._openAttachment = true;
        } else if (snap.matches({ Render: { Attachment: "Closed" }})) {
          this._openAttachment = false;
        }
      });
    }
  }
  
  protected override firstUpdated(): void {
    // sync input coor
    this._resizeObserver = new ResizeObserver((entries) => {
      const { height } = entries[0].contentRect;
      this.actorRef.send({ type: "RESIZE_INPUT", height });
    });

    this._resizeObserver.observe(this);
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
        ${!this._isAttachmentOff
          ? html`
              <ios-chat-toggle
                .open=${this._openAttachment}
                .appWidth=${this._appWidth}
                .appHeight=${this._appHeight}
                @fire-toggle=${this.toggleHandler}
              ></ios-chat-toggle>
            `
          : undefined
        }

        <ios-chat-textarea 
          class=${this._openAttachment ? "open" : ""}
          .actorRef=${this.actorRef}
        ></ios-chat-textarea>
      </section>
    `;
  }

  protected static override shadowStyles = css`
    section {
      width: 100%;
      display: flex;
      align-items: flex-end;
      justify-content: space-between;
      padding: 0.625em 1em;
      gap: .5em;
      backdrop-filter: blur(12px);
      -webkit-backdrop-filter: blur(12px);
      background-color: var(--chat-input-bg);
    }

    ios-chat-textarea {
      flex: 1;
      transition: var(--ease-out-back) 600ms;
    }
    ios-chat-textarea.open {
      flex: 0.6;
    }
  `;

  protected override disconnected(): void {
    this._resizeObserver?.disconnect();
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ios-chat-input": Input;
  }
}
