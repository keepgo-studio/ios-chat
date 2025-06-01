import LitComponent from "@/config/component";
import { css, html } from "lit";
import { customElement, property } from "lit/decorators.js";

const TAG_NAME = "ios-chat-date-divider";

@customElement(TAG_NAME)
class MessageLoading extends LitComponent {
  @property({ type: Number })
  datetime = 0;

  protected override render() {
    const dateStr = new Date(this.datetime).toLocaleDateString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
    });

    return html`
      <div>
        <span class="text">${dateStr}</span>
      </div>
    `;
  }

  protected static override shadowStyles = css`
    :host {
      display: block;
      text-align: center;
      font-family: sans-serif;
      color: var(--scrollbar);
    }
    
    div {
      font-size: .7em;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: .5em;
    }

    .text {
      white-space: nowrap;
      padding: 0 4px;
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    [TAG_NAME]: MessageLoading;
  }
}
