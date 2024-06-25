import { LitElement, css } from "lit";
import { customElement, property } from "lit/decorators.js";
import { unsafeHTML } from "lit/directives/unsafe-html.js";

@customElement("ios-chat-svg")
class Svg extends LitElement {
  static override styles = css`
    :host {
      display: flex;
      align-items: center;
      justify-content: center;
    }
    svg {
      fill: inherit !important;
      width: 100% !important;
      height: 100% !important;
    }
  `;

  @property()
  data = '';

  protected override render() {
    return unsafeHTML(this.data);
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ios-chat-svg": Svg;
  }
}
