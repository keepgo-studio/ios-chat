import { globalStyles } from "@/lib/core";
import { LitElement, PropertyValueMap, css, html } from "lit";
import { customElement, property, query, state } from "lit/decorators.js";
import { debounce, delay, pxToNumber } from "@/lib/utils";

import closeSvg from "../assets/multiply.svg";
import playSvg from "../assets/play.fill.svg";
import stopSvg from "../assets/stop.fill.svg";
import sendSvg from "../assets/arrow.up.circle.fill.svg";

class FileAudio {
  constructor(blobUrl: string) {}
}

class RecordAudio {
  initialized = false;
  ctx: AudioContext;
  analyser: AnalyserNode;
  recordedChunks: Blob[] = [];

  constructor(
    startCallback?: () => void,
    endCallback?: (blobUrl: string) => void
  ) {
    this.ctx = new AudioContext();
    this.analyser = this.ctx.createAnalyser();
    this.analyser.fftSize = 256;

    navigator.mediaDevices
      .getUserMedia({ audio: true })
      .then((stream) => {
        const source = this.ctx.createMediaStreamSource(stream);
        source.connect(this.analyser);

        const mediaRecorder = new MediaRecorder(stream);

        mediaRecorder.ondataavailable = (e) => {
          if (e.data.size > 0) {
            this.recordedChunks.push(e.data);
          }
        };

        mediaRecorder.onstart = () => {
          if (startCallback) startCallback();
        };

        mediaRecorder.onstop = () => {
          if (!endCallback) return;

          const blob = new Blob(this.recordedChunks, {
            type: "audio/webm; codecs=opus",
          });

          const url = URL.createObjectURL(blob);
          endCallback(url);
        };
      })
      .catch((err) => {
        console.error(err);
      });
  }
}

async function urlToBlob(blobUrl: string) {
  const res = await fetch(blobUrl);
  return await res.blob();
}

@customElement("ios-chat-audio")
class Audio extends LitElement {
  static override styles = [
    globalStyles,
    css`
      :host {
        display: block;
        width: 100%;
        height: 3.6em;
        position: relative;
      }

      section {
        width: 90%;
        height: 80%;
        display: flex;
        color: var(--theme-color);
        position: absolute;
        right: 0;
        bottom: 0;
        opacity: 0;
        transition: ease 500ms;
      }

      button {
        background-color: #313133;
        border: none;
        width: 2em;
        aspect-ratio: 1 / 1;
        border-radius: 50%;
        fill: rgba(255, 255, 255, 0.5);
        cursor: pointer;
        transition: ease 500ms;
        position: relative;
      }
      button:active {
        filter: brightness(0.8);
      }
      button ios-chat-svg {
        position: absolute;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
      }
      button:not(.send) ios-chat-svg {
        width: 0.6em;
      }

      button.cancel {
        width: 1.8em;
      }
      button.send {
        fill: var(--blue);
      }

      .cancel-container {
        width: calc(1.8em + 16px);
        opacity: 1;
        justify-content: right;
        display: flex;
        align-items: center;
        transition: ease 500ms;
      }

      .audio-container {
        flex: 1;
        padding: 6px 12px;
      }

      .audio-wrapper {
        background-color: rgba(255, 255, 255, 0.1);
        border-radius: 999px;
        display: flex;
        align-items: center;
        gap: 4px;
        height: 100%;
        padding: 0 0.8em;
        font-weight: 300;
      }

      .time {
        border-radius: 999px;
        background-color: rgba(0, 0, 0, 0.1);
        font-size: 12px;
        padding: 4px 6px;
      }

      ios-chat-wave {
        flex: 1;
      }

      .send .send-icon {
        opacity: 1;
        width: 100%;
      }
      .send .stop-icon {
        opacity: 0;
        user-select: none;
        fill: rgb(255, 69, 58);
        width: 0.8em
      }

      section.record .audio-wrapper {
        background-color: rgba(255, 69, 58, 0.15);
      }
      section.record .play {
        opacity: 0;
        user-select: none;
        width: 0px;
      }
      section.record .cancel-container {
        width: 0px;
        opacity: 0;
      }
      section.record .time {
        color: rgb(255, 69, 58);
      }
      section.record .send {
        background-color: rgba(255, 69, 58, 0.5);
      }
      section.record .send .send-icon {
        opacity: 0;
        user-select: none;
      }
      section.record .send .stop-icon {
        opacity: 1;
      }
    `,
  ];

  @state()
  _mode: "record" | "file" = "record";

  @property({ reflect: true })
  src = ""; // "record" or "blob:"

  @query("audio")
  audio!: HTMLAudioElement;

  @query("section")
  root!: HTMLElement;

  @query("canvas")
  canvas!: HTMLCanvasElement;

  @query("ios-chat-wave")
  wave!: HTMLElement;

  override render() {
    return html`
      <audio src=${this.src}></audio>
      
      <section class="${this._mode}">
        <div class="cancel-container">
          <button class="cancel">
            <ios-chat-svg .data=${closeSvg}></ios-chat-svg>
          </button>
        </div>

        <div class="audio-container">
          <div class="audio-wrapper">
            <button class="play">
              <ios-chat-svg .data=${playSvg}></ios-chat-svg>
            </button>

            <ios-chat-wave></ios-chat-wave>

            <div class="time">00:00</div>

            <button class="send">
              <ios-chat-svg class="send-icon" .data=${sendSvg}></ios-chat-svg>
              <ios-chat-svg class="stop-icon" .data=${stopSvg}></ios-chat-svg>
            </button>
          </div>
        </div>
      </section>
    `;
  }

  syncCanvasSize() {
    const waveCs = window.getComputedStyle(this.wave);

    this.wave.setAttribute("width", pxToNumber(waveCs.width).toString());
    this.wave.setAttribute("height", pxToNumber(waveCs.height).toString());
  }
  
  override firstUpdated() {
    window.addEventListener("resize", debounce(() => this.syncCanvasSize(), 500));
  }

  protected override updated(
    _changedProperties: PropertyValueMap<any> | Map<PropertyKey, unknown>
  ): void {
    if (_changedProperties.has("src") && this.src !== "") {
      delay(1).then(() => {
        this.root.style.height = "100%";
        this.root.style.width = "100%";
        this.root.style.opacity = "1";
      })
    }

    if (this.src === "record") {
      // record mode
      // const record = new RecordAudio();
    } else if (this.src.startsWith("blob:")) {
      // file mode
    }

    // updating wave canvas size
    delay(500).then(() => this.syncCanvasSize())
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ios-chat-audio": Audio;
  }
}
