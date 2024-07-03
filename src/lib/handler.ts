import ChatManager, { type ListenerCallback, type SendInfo } from "./service";
import { delay } from "./utils";
import { DURATION } from "@/components/Screen";

export async function initChat(roomId: string, messages: ChatMessage[]) {
  ChatManager.rooms[roomId].messages = [...messages];
}

export function getMessages(roomId: string) {
  return ChatManager.getMessages(roomId);
}

export function addRoomListener(roomId: string, callback: ListenerCallback) {
  const listenerId = ChatManager.listen(roomId, callback);

  return listenerId;
}

export function removeRoomListener(roomId: string, listenerId: string) {
  ChatManager.unsubscribe(roomId, listenerId);
}

export async function sendChat(roomId: string, info: SendInfo) {
  if (ChatManager.blocked) {
    throw new Error(`chat room [id: ${roomId}] is currently blocked!`);
  }

  ChatManager.sendMessage("sender", roomId, info);

  await delay(DURATION + 1);

  return true;
}

export async function answerChat(roomId: string, info: SendInfo) {
  if (ChatManager.blocked) {
    throw new Error(`chat room [id: ${roomId}] is currently blocked!`);
  }

  ChatManager.sendMessage("receiver", roomId, info);

  await delay(DURATION + 1);

  return true;
}

export function startAnswerLoading(roomId: string) {
  if (ChatManager.blocked) {
    throw new Error(`chat room [id: ${roomId}] is currently blocked!`);
  }

  ChatManager.blocked = true;

  ChatManager.rooms[roomId].ref.dispatchEvent(
    new CustomEvent("answer-loading-start")
  );
}

export async function endAnswerLoading(roomId: string) {
  ChatManager.blocked = false;

  ChatManager.rooms[roomId].ref.dispatchEvent(
    new CustomEvent("answer-loading-end")
  );

  await delay(DURATION * 2 + 1);
}