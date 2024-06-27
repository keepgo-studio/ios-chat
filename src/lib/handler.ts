import ChatManager, { type ListenerCallback, type SendInfo } from "./service";
import { delay } from "./utils";
import { DURATION } from "@/components/Screen";

export async function sendChat(roomId: string, info: SendInfo) {
  if (ChatManager.blocked) return false;

  ChatManager.sendMessage("sender", roomId, info);

  await delay(DURATION + 1);

  return true;
}

export async function answerChat(roomId: string, info: SendInfo) {
  if (ChatManager.blocked) return false;

  ChatManager.sendMessage("receiver", roomId, info);

  await delay(DURATION + 1);

  return true;
}

export function getMessages(roomId: string) {
  return ChatManager.getMessages(roomId);
}

export function addRoomListener(roomId: string, callback: ListenerCallback) {
  ChatManager.listen(roomId, callback);
}

export async function startAnswerLoading(roomId: string) {
  ChatManager.blocked = true;

  ChatManager.rooms[roomId].ref.dispatchEvent(
    new CustomEvent("answer-loading-start")
  );

  await delay(DURATION + 1);
}

export async function endAnswerLoading(roomId: string) {
  ChatManager.blocked = false;

  ChatManager.rooms[roomId].ref.dispatchEvent(
    new CustomEvent("answer-loading-end")
  );

  await delay(DURATION + 1);
}
