import type LitComponent from "@/config/component";
import { AppError } from "@/config/error";
import { Stack } from "@/lib/data-structure";

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
  img: { base64: string; mimeType: string; } | { src: string; };
  audio: { base64: string; mimeType: string; duration?: number } | { src: string };
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

  constructor(public readonly id: string, readonly ref: LitComponent) {
    if (!id || typeof id !== "string") {
      throw new AppError(
        "CHAT_ROOM_ID_INVALID",
        "ChatRoom id must be a non-empty string"
      );
    }

    if (!(ref instanceof HTMLElement)) {
      throw new AppError(
        "CHAT_REF_INVALID",
        "ChatRoom ref must be a valid HTMLElement"
      );
    }
  }

  addMessage(msg: ChatMessage) {
    this._messages.append(msg);
    this._notify(msg);
  }

  setMessages(msgs: ChatMessage[]) {
    this._messages.clear();
    msgs.forEach(msg => this._messages.append(msg));
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

  attachListener(callback: ChatRoomCallback) {
    this._callbacks.push(callback);
  }

  removeListener(callback: ChatRoomCallback) {
    this._callbacks = this._callbacks.filter(
      (listener) => listener !== callback
    );
  }
}
