import LitComponent from "@/config/component";
import { css, html, type PropertyValues } from "lit";
import { customElement, property } from "lit/decorators.js";

const TAG_NAME = "ios-chat-error";
@customElement(TAG_NAME)
class AppError extends LitComponent {
  @property()
  msg: string | null = null;

  protected override updated(_changedProperties: PropertyValues): void {
    if (_changedProperties.has("msg")) {
      console.error(this.msg);
    }
  }

  protected override render() {
    if (!this.msg) return;

    return html`
      <div>
        <p>Error</p>
        <span>${this.msg}</span>
      </div>
    `;
  }

  protected static override shadowStyles = css`
    div {
      width: 100%;
      height: 100%;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      color: #ff5f57;
    }
    p {
      font-size: 1.5em;
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    [TAG_NAME]: AppError;
  }
}
