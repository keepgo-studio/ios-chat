// initChat

import ChatController from "./controller/chat";
import type { ChatRoomId } from "./lib/data-structure";
import type { ChatMessage } from "./models/chat-room";

export function initChat(roomId: string, messages: ChatMessage[]) {
  ChatController.initRoom(roomId as ChatRoomId, messages);
}

// ChatManager= []

// addChatRoomListener()

// blockChatRoom() -> e.g sign in user can only type chat

// unblockChatRoom()

// answerChatRoom()

// promiseAnswerChatRoom()