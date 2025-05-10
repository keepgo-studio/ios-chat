import type LitComponent from "@/config/core";
import { AppError } from "@/config/error";
import { Stack } from "@/lib/data";

type Role = "sender" | "answer";

export type ChatMessageMeta = {
  id: string;
  createdDatetime: number;
};

type ChatMessageBase = {
  role: Role;
  origin?: string;
};

type ContentMap = {
  text: string;
  img: { src: string | File; alt?: string };
  audio: { src: string | File; duration?: number };
  loading: undefined;
};

type ContentType = keyof ContentMap;

export type ChatMessageContentMap = {
  [K in ContentType]: { type: K; val: ContentMap[K] }
}

export type ChatMessageContent = ChatMessageContentMap[ContentType];

export type ChatMessage = ChatMessageMeta & ChatMessageBase & {
  contents: ChatMessageContent[];
}

export type ChatRoomCallback = (msg: ChatMessage) => void;

/**
 * ChatRoom is 1:1 with ios-chat
 */
export default class ChatRoomModel {
  private _messages = new Stack<ChatMessage>();
  private _callbacks: ChatRoomCallback[] = [];

  constructor(public readonly id: string, private readonly _ref: LitComponent) {
    if (!id || typeof id !== "string") {
      throw new AppError(
        "CHAT_ROOM_ID_INVALID",
        "ChatRoom id must be a non-empty string"
      );
    }

    if (!(_ref instanceof HTMLElement)) {
      throw new AppError(
        "CHAT_REF_INVALID",
        "ChatRoom ref must be a valid HTMLElement"
      );
    }
  }

  addMessage(msg: ChatMessage) {
    this._messages.append(msg);
    this._ref.fireEvent("controller:answer-message", msg);
    this._notify(msg);
  }

  private _notify(msg: ChatMessage) {
    this._callbacks.forEach((listener) => listener(msg));
  }

  pop() {
    return this._messages.pop();
  }

  getMessages() {
    return this._messages.toArray();
  }

  addListener(callback: ChatRoomCallback) {
    this._callbacks.push(callback);
  }

  removeListener(callback: ChatRoomCallback) {
    this._callbacks = this._callbacks.filter(
      (listener) => listener !== callback
    );
  }
}
