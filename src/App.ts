import LitComponent from "./config/component";
import {
  appMachine,
  checkAppValid,
  type ChatMachineActorRef,
} from "@/machine/app.machine";
import { css, html } from "lit";
import { customElement, query, state } from "lit/decorators.js";
import { createActor } from "xstate";
import { appStyleVars } from "./config/style";
import { parseFontSizeStr, parsePaddingStr, type Padding } from "./lib/style-utils";
import { styleMap } from "lit/directives/style-map.js";

export type AppAttributeKey = "room-id" | "padding" | "mode" | "font-size";

/**
 * 모든 ChatRoomController 코드는 machone(chat.machine.ts)에 넣었음
 */
@customElement("ios-chat")
class App extends LitComponent {
  @state()
  _errorMsg: string | null = null;

  @state()
  _fontSize: string | null = null;

  private _customFontSize: string | null = null

  @state()
  _customScreenPadding: Padding = {
    top: "0.625em",
    left: "0.75em",
    right: "0.75em",
    bottom: "0.625em",
  };

  @query("ios-chat-screen")
  screenElem!: LitComponent;

  @query("ios-chat-input")
  inputElem!: LitComponent;

  private _actor = createActor(appMachine) as ChatMachineActorRef;

  private _resizeObserver?: ResizeObserver;

  protected override connected(): void {
    // init listeners
    this.listenEvent("controller:init-message", () => {
      this._actor.send({ type: "SYNC_MESSAGE" });
    });

    this.listenEvent("controller:answer-message", () => {
      this._actor.send({ type: "ANSWER_MESSAGE" });
    });

    this._actor.start();

    try {
      // check chat room valid
      const info = checkAppValid(this);

      const screenPadding = this.getAttr<AppAttributeKey>("padding");
      if (screenPadding) {
        this._customScreenPadding = parsePaddingStr(screenPadding);
      }

      const fontSize = this.getAttr<AppAttributeKey>("font-size");
      if (fontSize) {
        this._customFontSize = parseFontSizeStr(fontSize);
      }

      this._actor.subscribe(snap => {
        if (snap.matches({ Render: { Coor: "Stop" }})) {
          this.setFont();
        }
      });

      this._actor.send({ type: "CREATE_ROOM", info });
    } catch (err) {
      this._errorMsg = err instanceof Error ? err.message : "Chat crashed!";
    }
  }

  protected override firstUpdated(): void {
    this._resizeObserver = new ResizeObserver((entries) => {
      const { width, height } = entries[0].contentRect;
      this._actor.send({ type: "RESIZE_APP", width, height });
    });

    this._resizeObserver.observe(this);
  }

  setFont() {
    if (this._customFontSize === null) {
      // 360 / 22.5 = 16px, based width is 360px;
      this._fontSize = `${this._actor.getSnapshot().context.appCoor.width / 22.5}px`;
    } else {
      this._fontSize = this._customFontSize;
    }
  }

  protected override render() {
    return this._errorMsg
      ? html` <ios-chat-error .msg=${this._errorMsg}></ios-chat-error>`
      : html`
          <div class="root" style=${styleMap({ fontSize: this._fontSize })}>
            <ios-chat-attachment .actorRef=${this._actor}></ios-chat-attachment>
            <ios-chat-screen
              .padding=${this._customScreenPadding}
              .actorRef=${this._actor}
            ></ios-chat-screen>
            <ios-chat-input .actorRef=${this._actor}></ios-chat-input>
          </div>
        `;
  }

  protected static override shadowStyles = css`
    ${appStyleVars}
    :host {
      display: block;
      width: 100%;
      height: 100%;
      background-color: var(--theme-bg);
    }
    .root {
      width: 100%;
      height: 100%;
      display: flex;
      position: relative;
      overflow: hidden;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Oxygen,
        Ubuntu, Cantarell, "Open Sans", "Helvetica Neue", sans-serif;
    }
    ios-chat-screen {
      flex: 1;
    }
    ios-chat-input {
      position: absolute;
      left: 0;
      right: 0;
      bottom: 0;
      z-index: 3;
    }
  `;

  override disconnected(): void {
    this._resizeObserver?.disconnect();
    this._actor.send({ type: "TERMINATE" });
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ios-chat": App;
  }
}
