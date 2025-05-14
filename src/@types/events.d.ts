import type { ScrollPosition } from "@/components/Scroll";
import type { ChatMessage } from "@/models/chat-room";

type AnswerMessage = ChatMessage;

type InitMessage = ChatMessage[];

type Toggle = boolean;

type ScrollAt = {
  to: ScrollPosition,
  smooth?: boolean;
};

declare global {
  interface CustomEventDetailMap {
    "controller:answer-message": AnswerMessage;
    "controller:init-message": InitMessage;
    "fire-toggle": Toggle;
    "scroll-at": ScrollAt;
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