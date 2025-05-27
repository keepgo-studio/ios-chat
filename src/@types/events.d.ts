import type { ChatMessage } from "@/models/chat-room";

type AnswerMessage = ChatMessage;

type InitMessage = ChatMessage[];

type FireToggle = boolean;

type Scrolling = number;

type ScrollTo = {
  y?: number;
};

type Recording = undefined;

type WaveLoaded = undefined;
type WaveRender = undefined;
type WaveStopRender = undefined;
declare global {
  interface CustomEventDetailMap {
    "controller:answer-message": AnswerMessage;
    "controller:init-message": InitMessage;
    "fire-toggle": FireToggle;
    "scrolling": Scrolling;
    "scroll-to": ScrollTo;
    "recording": Recording;
    "wave-loaded": WaveLoaded;
    "wave-render": WaveRender;
    "wave-stop-render": WaveStopRender;
  }

  /**
   * event name ↔ type name
   * 
   * kebob case ↔ camel case
   * 
   * @example
   * "add-message" ↔ type AddMessageDetail
   */
  type CustomEventMap = {
    [K in keyof CustomEventDetailMap]: CustomEvent<CustomEventDetailMap[K]>
  }

  interface HTMLElementEventMap extends CustomEventMap {}
}