import ChatManager, { type ListenerCallback, type SendInfo } from "./service";

export function sendChat(roomId: string, info: SendInfo) {
  ChatManager.sendMessage("sender", roomId, info);
}

export function answerChat(roomId: string, info: SendInfo) {
  ChatManager.sendMessage("receiver", roomId, info);
}

export function addRoomListener(roomId: string, callback: ListenerCallback) {
  ChatManager.listen(roomId, callback);
}

export function startAnswerLoading() {

}

export function endAnswerLoading() {

}