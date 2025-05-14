import ChatRoomModel, {
  type ChatMessage,
  type ChatMessageMeta,
  type ChatRoomCallback,
} from "@/models/chat-room";
import { AppError } from "@/config/error";
import type LitComponent from "@/config/component";
import type { ChatRoomId } from "@/lib/data-structure";

export type MessagePayload = Omit<ChatMessage, keyof ChatMessageMeta | "role">;

export type SupportChatMode = "text-only" | "normal";

/**
 * ChatController는 다중 ChatRoom 인스턴스를 관리하는 싱글턴 클래스입니다.
 * 
 * 이 클래스는 ChatRoom의 생성, 제거, 메시지 추가, 구독 등의 주요 기능을 제공합니다.
 * ⭐️ 채팅 앱(App.ts)과 내부 핸들러(handler.ts)의 중간 계층으로 작동합니다.
 * 
 * @example
 * // ChatRoom 생성
 * ChatController.createRoom("room-123", elementRef);
 * 
 * // 메시지 추가
 * ChatController.addMessage("room-123", {
 *   type: "text",
 *   role: "sender",
 *   content: "안녕하세요!"
 * });
 * 
 * // 메시지 구독
 * ChatController.subscribe("room-123", (msg) => {
 *   console.log("New message:", msg);
 * });
 */
export default class ChatController {
  private static _rooms: Map<ChatRoomId, ChatRoomModel> = new Map();

  static createRoom(roomId: ChatRoomId, roomRef: LitComponent) {
    if (this._rooms.has(roomId)) {
      throw new AppError(
        "CHAT_ROOM_EXISTS",
        `Chat room with id ${roomId} already exists`
      );
    }

    const room = new ChatRoomModel(roomId, roomRef);
    this._rooms.set(roomId, room);
  }

  static initRoom(roomId: ChatRoomId, messages: ChatMessage[]) {
    const room = this._getRoom(roomId);
    
    room.setMessages(messages);
    room.ref.fireEvent("controller:init-message", messages);
  }

  static removeRoom(roomId: ChatRoomId) {
    if (!this._rooms.has(roomId)) {
      throw new AppError(
        "CHAT_ROOM_NOT_FOUND",
        `Chat room with id ${roomId} not found`
      );
    }

    this._rooms.delete(roomId);
  }

  private static _getRoom(roomId: ChatRoomId) {
    const room = this._rooms.get(roomId);

    if (!room) {
      throw new AppError(
        "CHAT_ROOM_NOT_FOUND",
        `Chat room with id ${roomId} not found`
      );
    }

    return room;
  }

  static getMessages(roomId: ChatRoomId) {
    return this._getRoom(roomId).getMessages();
  }

  static subscribe(roomId: ChatRoomId, callback: ChatRoomCallback) {
    this._getRoom(roomId).attachListener(callback);
  }

  static unsubscribe(roomId: ChatRoomId, callback: ChatRoomCallback) {
    this._getRoom(roomId).removeListener(callback);
  }

  static sendMessage(roomId: ChatRoomId, payload: MessagePayload) {
    const room = this._getRoom(roomId);

    const msg: ChatMessage = {
      id: crypto.randomUUID(),
      role: "sender",
      createdDatetime: Date.now(),
      ...payload
    };
  
    room.addMessage(msg);
  }

  static answerMessage(roomId: ChatRoomId, payload: MessagePayload) {
    const room = this._getRoom(roomId);

    const msg: ChatMessage = {
      id: crypto.randomUUID(),
      role: "answer",
      createdDatetime: Date.now(),
      ...payload
    };

    room.addMessage(msg);
    room.ref.fireEvent("controller:answer-message", msg);
  }
}
