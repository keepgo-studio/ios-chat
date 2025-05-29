import LitComponent from "@/config/component";
import type { ChatMessageContentMap } from "@/models/chat-room";
import { css, html } from "lit";
import { customElement, property } from "lit/decorators.js";

const TAG_NAME = "ios-chat-message-img";

/**
 * @fires message-img:img-click
 */
@customElement(TAG_NAME)
class MessageImg extends LitComponent {
  @property({ attribute: false })
  val?: ChatMessageContentMap["img"]["val"];

  private _width = 0;
  private _height = 0;
  private _canView = false;
  private _x = 0;
  private _y = 0;

  mousedownHandler(e: MouseEvent) {
    this._x = e.screenX;
    this._y = e.screenY;
  }

  mouseupHandler(e: MouseEvent) {
    const isForImgClick = e.screenX === this._x && e.screenY === this._y;

    if (isForImgClick && this.val && this._canView) {
      this.fireEvent("message-img:img-click", {
        imgContent: this.val,
        success: this._canView,
        width: this._width,
        height: this._height,
        ref: this
      }, {
        bubbles: true,
        composed: true
      });
    }
  }
  

  imgLoadedHandler(e: CustomEventMap["img-loaded"]) {
    this._canView = e.detail.success;
    this._width = e.detail.width;
    this._height = e.detail.height;
  }

  protected override render() {
    return html`
      <div @mousedown=${this.mousedownHandler} @mouseup=${this.mouseupHandler}>
        <ios-chat-img
          @img-loaded=${this.imgLoadedHandler}
          .data=${this.val}
        ></ios-chat-img>
      </div>
    `;
  }
  
  protected static override shadowStyles = css`
    div {
      display: block;
      width: 100%;
      height: 100%;
      cursor: pointer;
      max-height: 20em;
      overflow: hidden;
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    [TAG_NAME]: MessageImg;
  }
}
