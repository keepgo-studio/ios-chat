import type { ChatMessage } from "@/models/chat-room";

type AnswerMessage = ChatMessage;

type Toggle = boolean;

declare global {
  interface CustomEventDetailMap {
    "controller:answer-message": AnswerMessage;
    "fire-toggle": Toggle;
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