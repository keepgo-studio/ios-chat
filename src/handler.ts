// initChat

import ChatRoomController, { type MessagePayload } from "./controller/chat-room";
import type { ChatRoomId } from "./lib/data-structure";
import type { ChatMessage, ChatRoomCallback } from "./models/chat-room";

export function initChat(roomId: string, messages: ChatMessage[]) {
  ChatRoomController.initRoom(roomId as ChatRoomId, messages);
}

// ChatManager= []

export function subscribeRoom(roomId: string, callbackRef: ChatRoomCallback) {
  ChatRoomController.subscribe(roomId as ChatRoomId, callbackRef);
}

export function unsubscribeRoom(roomId: string, callbackRef: ChatRoomCallback) {
  ChatRoomController.unsubscribe(roomId as ChatRoomId, callbackRef);
}

// blockChatRoom() -> e.g sign in user can only type chat

// unblockChatRoom()

export function answerChatRoom(roomId: string, contents: MessagePayload["contents"]) {
  ChatRoomController.answerMessage(roomId as ChatRoomId, {
    contents,
    origin: "package"
  });
}

// promiseAnswerChatRoom()