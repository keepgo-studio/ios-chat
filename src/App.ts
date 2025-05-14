import LitComponent from "./config/component";
import {
  appMachine,
  checkAppValid,
  type ChatMachineActorRef,
} from "@/app.machine";
import { css, html } from "lit";
import { customElement, query, state } from "lit/decorators.js";
import { createActor } from "xstate";
import { appStyleVars } from "./config/style";
import { parsePaddingStr, type Padding } from "./lib/style-utils";

export type AppAttributeKey = "room-id" | "padding" | "mode" | "width";

/**
 * 모든 ChatController 코드는 machone(chat.machine.ts)에 넣었음
 */
@customElement("ios-chat")
class App extends LitComponent {
  @state()
  errorMsg: string | null = null;

  @state()
  screenPadding: Padding = {
    top: "10px",
    left: "12px",
    right: "12px",
    bottom: "10px",
  };

  @query("ios-chat-screen")
  elemScreen!: LitComponent;

  @query("ios-chat-input")
  elemInput!: LitComponent;

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
        this.screenPadding = parsePaddingStr(screenPadding);
      }

      this._resizeObserver = new ResizeObserver((entries) => {
        const { width, height } = entries[0].contentRect;
        this._actor.send({ type: "RESIZE_APP", width, height });
      });

      this._resizeObserver.observe(this);

      this._actor.send({ type: "CREATE_ROOM", info });
    } catch (err) {
      this.errorMsg = err instanceof Error ? err.message : "Chat crashed!";
    }
  }

  protected override render() {
    return this.errorMsg
      ? html` <ios-chat-error .msg=${this.errorMsg}></ios-chat-error> `
      : html`
          <div class="root">
            <ios-chat-attachment .actorRef=${this._actor}></ios-chat-attachment>
            <ios-chat-screen
              .padding=${this.screenPadding}
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
      font-size: var(--font-size);
    }
    ios-chat-attachment {
      position: absolute;
    }
    ios-chat-screen {
      position: relative;
      flex: 1;
    }
    ios-chat-input {
      position: absolute;
      left: 0;
      right: 0;
      bottom: 0;
      z-index: 1; /* related with screen message z index */
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
