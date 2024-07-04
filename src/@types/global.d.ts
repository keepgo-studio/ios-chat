declare global {
  type ChatMessageType = TextType | ImgType | AudioType | "loading";
  
  type Role = 'sender' | 'receiver';
  type TextType = 'text';
  type ImgType = 'img';
  type AudioType = 'audio';

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


  interface InputNonText extends CustomEvent {
    detail: {
      type: ImgType | AudioType;
      content: string;
    }
  }

  interface HTMLElementEventMap {
    "init-message": CustomEvent;
    "send-message": SendMessageEvent;
    "answer-loading-start": CustomEvent;
    "answer-loading-end": CustomEvent;
    "input-fired": InputFiredEvent;
    "input-active": InputActiveEvent;
    "scrolling": ScrollingEvent;
    "loaded": CustomEvent;
    "input-non-text": InputNonText;
    "record-instance": CustomEvent;
    "wave-rawdata": CustomEvent;
    "clear-wave": CustomEvent;
  }
}

export {};
