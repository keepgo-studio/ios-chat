declare global {
  type ChatRoom = {
    id: string;
    ref: HTMLElement;
    profile?: Profile;
    createdDatetime: number;
    messages: Array<ChatMessage>;
  };

  type ChatMessageType = TextType | ImgType | AudioType;
  
  type Role = 'sender' | 'receiver';
  type TextType = 'text';
  type ImgType = 'img';
  type AudioType = 'audio';

  type ChatMessage = {
    type: ChatMessageType;
    role: Role;
    id: string;
    createdDatetime: number;
    content: string;
  };

  type Profile = {
    title: string;
    imgSrc: string;
  };

  
  type SendMessageEventDetail = {
    type: ChatMessageType;
    content: string;
    role: Role;
  };
  interface SendMessageEvent extends CustomEvent {
    detail: SendMessageEventDetail;
  }
  type InputFiredEventDetail = {
    width: number;
  };
  interface InputFiredEvent extends CustomEvent {
    detail: InputFiredEventDetail;
  }
  type InputActiveEventDetail = {
    height: number;
  };
  interface InputActiveEvent extends CustomEvent {
    detail: InputActiveEventDetail;
  }

  interface HTMLElementEventMap {
    "send-message": SendMessageEvent;
    "input-fired": InputFiredEvent;
    "input-active": InputActiveEvent;
  }
}

export {};