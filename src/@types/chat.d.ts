declare global {
  type ChatRoom = {
    id: string;
    ref: HTMLElement;
    profile?: Profile;
    createdDatetime: number;
    messages: Array<ChatMessage>;
  };

  type ChatMessageType = TextType | ImgType | AudioType | "loading";
  
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
  interface InputFiredEvent extends CustomEvent {
    detail: {
      width: number
    }
  }
  interface InputActiveEvent extends CustomEvent {
    detail: {
      height: number;
    }
  }
  interface ScrollingEvent extends CustomEvent {
    detail: {
      maxHeight: number; 
      y: number;
    };
  }

  interface HTMLElementEventMap {
    "send-message": SendMessageEvent;
    "answer-loading-start": CustomEvent;
    "answer-loading-end": CustomEvent;
    "input-fired": InputFiredEvent;
    "input-active": InputActiveEvent;
    "scrolling": ScrollingEvent;
  }
}

export {};
