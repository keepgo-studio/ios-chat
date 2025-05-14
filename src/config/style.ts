import { css } from "lit";

export const globalStyles = css`
  * {
    padding: 0;
    margin: 0;
    box-sizing: border-box;
    font: inherit;
  }

  button {
    background: none;
    border: none;
  }

  li {
    display: block;
  }
`;

export const appStyleVars = css`
  :host {
    --ease-out-back: cubic-bezier(0.34, 1.36, 0.44, 1);
    --ease-out-quart: cubic-bezier(0.25, 1, 0.5, 1);

    --font-size: clamp(6px, 3.2vw, 15px);
    --border-radius: 20px;
    --input-bg: rgba(10, 10, 10, 0.75);
    --red: rgba(255, 69, 58);
    --blue: #39a7fc;

    --theme-bg: #fff;
    --theme-color: #000;
    --message-color: #e9e9eb;
    --chat-input-bg: rgba(255, 255, 255, 0.7);
    --disable: #d5d5d5;
    --textarea: rgba(255, 255, 255, 0.9);
    --scrollbar: #a5a5a5;
    --wave-fill: #000;
    --wave-blank: rgba(0, 0, 0, 0.3);
    --audio: rgba(200, 200, 200, 0.1);
    --audio-button: #edeaee;
    --audio-icon: rgba(0, 0, 0, 0.5);
    --audio-loading: rgba(222, 222, 222, 0.7);
  }

  :host([dark=true]) {
    --theme-bg: #000;
    --theme-color: #fff;
    --message-color: #26262a;
    --chat-input-bg: rgba(0, 0, 0, 0.6);
    --disable: #5c5c5c;
    --textarea: rgba(0, 0, 0, 0.5);
    --scrollbar: rgb(116 116 116);
    --wave-fill: #fff;
    --wave-blank: rgba(255, 255, 255, 0.5);
    --audio: rgba(255, 255, 255, 0.1);
    --audio-button: #313133;
    --audio-icon: rgba(255, 255, 255, 0.5);
    --audio-loading: rgba(0, 0, 0, 0.7);
  }

  @media (min-width: 480px) {
    :host {
      --font-size: 15px;
    }
  }

  @media (min-width: 768px) {
    :host {
      --font-size: 16px;
    }
  }

  @media (min-width: 1024px) {
    :host {
      --font-size: 18px;
    }
  }

  @media (min-width: 1440px) {
    :host {
      --font-size: 20px;
    }
  }
`;