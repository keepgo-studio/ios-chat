import LitComponent from "@/config/component";
import { html, type PropertyValues } from "lit";
import { customElement, property } from "lit/decorators.js";

@customElement("ios-chat-error")
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
      <div>${this.msg}</div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ios-chat-error": AppError;
  }
}
