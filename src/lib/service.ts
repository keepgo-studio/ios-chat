import { v4 as uuidv4 } from "uuid";

export type SendInfo = {
  type: ChatMessageType;
  content: string;
};

export type ListenerCallback = (msg: ChatMessage) => void;

type Listener = {
  id: string;
  callback: ListenerCallback;
};

export default class ChatManager {
  static rooms: { [roomId: string]: ChatRoom } = {};
  static listeners: { [roomId: string]: Listener[] } = {};

  static currentRoomId: string | null = null;

  static roomCreated(
    roomId: string,
    ref: HTMLElement,
    sendCallback: () => void
  ) {
    if (roomId in this.rooms) {
      throw new Error(`${roomId} is already exist`);
    }

    this.listeners[roomId] = []
    this.rooms[roomId] = {
      id: roomId,
      ref,
      createdDatetime: Date.now(),
      messages: [],
    };

    const sendMessageToListeners = (roomId: string, msg: ChatMessage) => {
      this.listeners[roomId].forEach(listener => listener.callback(msg));
    }

    ref.addEventListener("send-message", (e) => {
      const { content, type, role } = e.detail;
      const msg: ChatMessage = {
        id: uuidv4(),
        type,
        role,
        content,
        createdDatetime: Date.now(),
      };

      this.rooms[roomId].messages.push(msg);

      sendCallback();
      sendMessageToListeners(roomId, msg);
    });
  }

  static sendMessage(role: Role, roomId: string, info: SendInfo) {
    this.rooms[roomId].ref.dispatchEvent(
      new CustomEvent<SendMessageEventDetail>("send-message", {
        detail: {
          ...info,
          role,
        },
      })
    );
  }

  static listen(roomId: string, callback: ListenerCallback) {
    const listenerId = uuidv4();

    this.listeners[roomId].push({
      id: listenerId,
      callback
    });
  }

  static getMessages(roomId: string) {
    return this.rooms[roomId].messages;
  }
}