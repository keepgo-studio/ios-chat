import { globalStyles } from "@/lib/core";
import { delay } from "@/lib/utils";
import { LitElement, PropertyValueMap, css, html } from "lit";
import { customElement, property, query } from "lit/decorators.js";

@customElement("ios-chat-wave")
class Wave extends LitElement {
  static override styles = [
    globalStyles,
    css`
      :host {
        height: 100%;
      }
      canvas {
        width: 100%;
        height: 100%;
      }
    `,
  ];
  
  private _ctx: CanvasRenderingContext2D | null = null;

  @property({ type: Number, reflect: true })
  width = 0;
  
  @property({ type: Number, reflect: true })
  height = 0;

  @query("canvas")
  canvas!: HTMLCanvasElement;

  override render() {
    return html`
      <canvas width=${this.width} height=${this.height}></canvas>
    `;
  }

  draw() {
    const ctx = this._ctx!,
          width = this.canvas.width,
          height = this.canvas.height;

    const sample = 64,
          y = height / 2,
          dotWidth = width / sample,
          dotSpace = dotWidth / 2,
          gap = dotWidth + dotSpace;
      
    ctx.clearRect(0, 0, width, height);
    ctx.fillStyle = "rgba(255, 255, 255, 0.5)";

    for (let i = 0 ; i < sample ; i++) {
      const x = gap * i;

      const h = dotWidth;

      ctx.beginPath();
      ctx.roundRect(x, y - h / 2, dotWidth, h, 999);
      ctx.fill();
      ctx.closePath();
    }

    requestAnimationFrame(this.draw.bind(this));
  }

  override firstUpdated() {
    this._ctx = this.canvas.getContext("2d");

    requestAnimationFrame(this.draw.bind(this));
  }

  protected override updated(_changedProperties: PropertyValueMap<any> | Map<PropertyKey, unknown>): void {

  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ios-chat-wave": Wave;
  }
}
