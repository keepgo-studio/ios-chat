type ChatErrorCode =
  | "CHAT_ROOM_EXISTS"
  | "CHAT_ROOM_ID_REQUIRED"
  | "CHAT_ROOM_ID_INVALID"
  | "CHAT_REF_INVALID"
  | "CHAT_ROOM_ATTRIBUTE_ERROR"
  | "CHAT_ROOM_NOT_FOUND"
  | "CHAT_ROOM_BLOCKED"
  | "HTML_REF_ERROR"
  | "FILE_ERROR"
  | "AUDIO_PLAYER_NOT_FOUND"
  ;

type SupportErrorCode = ChatErrorCode;

export class AppError<T extends SupportErrorCode> extends Error {
  constructor(
    public readonly code: T,
    message: string
  ) {
    super(`[${code}]: ${message}`);
    this.name = new.target.name; // or this.constructor.name
  }
}
