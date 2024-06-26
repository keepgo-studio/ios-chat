import { LitElement, PropertyValueMap, css, html } from "lit";
import { customElement, property, query } from "lit/decorators.js";

@customElement("ios-chat-img")
class Image extends LitElement {
  static override styles = css`
    :host {
      display: block;
      width: 100%;
    }
    img {
      border-radius: var(--border-radius);
      width: 100%;
      min-width: 40px;
      height: 100%;
      min-height: 40px;
      max-height: 400px;
      object-fit: cover;
      user-select: none;
      cursor: pointer;
    }
  `;

  @property()
  imgSrc = "";

  @property({ type: Number })
  width = 0;

  @property({ type: Number })
  height = 0;

  @query("img")
  img!: HTMLImageElement;

  override render() {
    return html`
      <img draggable=false src=${this.imgSrc} />
    `;
  }

  protected override updated(_changedProperties: PropertyValueMap<any> | Map<PropertyKey, unknown>): void {
    this.img.onload = () => {
      // console.log("img", this.width, this.height);
    }
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ios-chat-img": Screen;
  }
}
