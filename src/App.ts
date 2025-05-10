import LitComponent from "./config/core";
import { chatMachine, type ChatMachineActorRef } from "@/chat.machine";
import { css, html } from "lit";
import { customElement, query, state } from "lit/decorators.js";
import { createActor } from "xstate";
import { appStyleVars } from "./config/style";
import type { ChatMessage } from "./models/chat-room";

@customElement("ios-chat")
class App extends LitComponent {
  @state()
  chatRoomId: string = "";

  @state()
  errorMsg: string | null = null;

  @state()
  chatMessages: ChatMessage[] = [];

  @query("ios-chat-screen")
  elemScreen!: LitComponent;

  @query("ios-chat-input")
  elemInput!: LitComponent;

  private _actor = createActor(
    chatMachine.provide({
      actions: {
        "app:syncMessages": (_, { modelMessages }) => {
          this.chatMessages = modelMessages;
        },
      },
    })
    // type casting for 'ts-lit-plugin' package
  ) as ChatMachineActorRef;

  private _resizeObserver?: ResizeObserver;

  override connectedCallback(): void {
    super.connectedCallback();

    this._actor.subscribe((snap) => {
      this.errorMsg = snap.context.error;
    });

    this.listenEvent("controller:answer-message", () => {
      this._actor.send({ type: "ANSWER_MESSAGE" });
    });

    this._actor.start();
    this._actor.send({ type: "INIT", elemRef: this });

    this._resizeObserver = new ResizeObserver((entries) => {
      const { width, height } = entries[0].contentRect;
      this._actor.send({ type: "RESIZE", width, height });
    });

    this._resizeObserver.observe(this);
  }

  protected override render() {
    return this.errorMsg
      ? html` <ios-chat-error .msg=${this.errorMsg}></ios-chat-error> `
      : html`
          <div class="root">
            <ios-chat-attachment .actorRef=${this._actor}></ios-chat-attachment>
            <ios-chat-screen
              .actorRef=${this._actor} 
              .messages=${this.chatMessages}
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
      position: relative;
      display: grid;
      grid-template-rows: 1fr auto;
      overflow: hidden;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Oxygen,
        Ubuntu, Cantarell, "Open Sans", "Helvetica Neue", sans-serif;
      font-size: var(--font-size);
    }
    .ios-chat-input,
    .ios-chat-screen {
      display: block;
    }
  `;

  override disconnectedCallback(): void {
    super.disconnectedCallback();
    this._actor.send({ type: "TERMINATE" });
    this._resizeObserver?.disconnect();
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ios-chat": App;
  }
}
