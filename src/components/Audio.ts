import { globalStyles } from "@/lib/core";
import { LitElement, PropertyValueMap, css, html } from "lit";
import { customElement, property, query, state } from "lit/decorators.js";
import { debounce, delay, pxToNumber } from "@/lib/utils";

import closeSvg from "../assets/multiply.svg";
import playSvg from "../assets/play.fill.svg";
import stopSvg from "../assets/stop.fill.svg";
import sendSvg from "../assets/arrow.up.circle.fill.svg";


export const FFT_SIZE = 128;
export class RecordAudio {
  ctx: AudioContext;
  analyser: AnalyserNode;
  dataArray: Uint8Array;
  recordedChunks: Blob[] = [];
  duration = 0;
  prevTime = 0;
  trackLifeCycle = false;

  mediaRecorder?: MediaRecorder;

  constructor({
    start,
    resume,
    pause,
    end
  }: Partial<{
    start: () => void;
    resume: () => void;
    pause: (blobUrl: string) => void
    end: (blobUrl: string) => void;
  }>) {
    this.ctx = new AudioContext();
    this.analyser = this.ctx.createAnalyser();
    this.analyser.fftSize = FFT_SIZE;
    this.dataArray = new Uint8Array(this.analyser.frequencyBinCount);

    navigator.mediaDevices
      .getUserMedia({ audio: true })
      .then((stream) => {
        const source = this.ctx.createMediaStreamSource(stream);
        source.connect(this.analyser);

        let url = "";
        this.mediaRecorder = new MediaRecorder(stream);

        this.mediaRecorder.ondataavailable = (e) => {
          if (e.data.size > 0) {
            this.recordedChunks.push(e.data);
          }
        };

        this.mediaRecorder.onstart = () => {
          this.trackLifeCycle = true;
          this.prevTime = Date.now();
          requestAnimationFrame(this.trackTime.bind(this));

          if (start) start();
        }
        
        this.mediaRecorder.onpause = () => {
          this.trackLifeCycle = false;

          if (!pause) return;

          const blob = new Blob(this.recordedChunks, {
            type: "audio/webm; codecs=opus",
          });
          url = URL.createObjectURL(blob);
          pause(url);
        }

        this.mediaRecorder.onresume = () => {
          URL.revokeObjectURL(url);

          this.trackLifeCycle = true;
          this.prevTime = Date.now();
          requestAnimationFrame(this.trackTime.bind(this));

          if (resume) resume();
        }

        this.mediaRecorder.onstop = () => {
          this.trackLifeCycle = false;

          if (!end) return;

          const blob = new Blob(this.recordedChunks, {
            type: "audio/webm; codecs=opus",
          });
          url = URL.createObjectURL(blob);
          end(url);
        };

        this.mediaRecorder.start(100);
      })
      .catch((err) => {
        console.error(err);
      });
  }

  trackTime() {
    const current = Date.now();

    if (current - this.prevTime >= 1000) {
      this.duration += (current - this.prevTime) / 1000;
      this.prevTime = current;
    }

    if (!this.trackLifeCycle) return;

    requestAnimationFrame(this.trackTime.bind(this));
  }

  getVolume() {
    this.analyser.getByteTimeDomainData(this.dataArray);

    const normSamples = [...this.dataArray].map(e => e / 128 - 1);

    let sum = 0;
    for (let i = 0 ; i < normSamples.length ; i++) {
      sum += normSamples[i] * normSamples[i];
    }

    return Math.sqrt(sum / normSamples.length);
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
        height: 70%;
        display: flex;
        color: var(--theme-color);
        position: absolute;
        right: 0;
        bottom: 0;
        opacity: 0.5;
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
        transition: ease 500ms, filter 0ms;
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
        transition: ease 500ms;
        position: relative;
      }

      .time {
        border-radius: 999px;
        background-color: rgba(0, 0, 0, 0.1);
        font-size: 12px;
        padding: 4px 6px;
        cursor: pointer;
      }
      .time:active {
        filter: brightness(0.8);
      }

      ios-chat-wave {
        flex: 1;
        cursor: pointer;
      }

      .send .send-icon {
        opacity: 1;
        width: 100%;
      }
      .send .stop-icon {
        opacity: 0;
        user-select: none;
        fill: rgb(255, 69, 58);
        width: 0.8em;
      }

      .loading {
        position: absolute;
        top: 0;
        left :0;
        right: 0;
        bottom: 0;
        display: flex;
        align-items: center;
        justify-content: center;
        border-radius: 999px;
        background-color: rgba(0, 0, 0, 0.7);
      }
      .loading ios-chat-spinner {
        width: 2em;
        aspect-ratio: 1 / 1;
      }

      /* ----------- for record styles ----------- */
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

  _record?: RecordAudio;

  @state()
  _mode: "record" | "file" = "record";

  @state()
  _loading = false;

  @property({ reflect: true })
  src = ""; // "record" or "blob:"

  @query("audio")
  audio!: HTMLAudioElement;

  @query("section")
  root!: HTMLElement;

  @query("ios-chat-wave")
  wave!: HTMLElement;

  @query(".time")
  timeElem!: HTMLElement;

  override render() {
    return html`
      <audio src=${this.src.startsWith("blob:") ? this.src : ""}></audio>

      <section>
        <div class="cancel-container">
          <button class="cancel">
            <ios-chat-svg .data=${closeSvg}></ios-chat-svg>
          </button>
        </div>

        <div class="audio-container">
          <div class="audio-wrapper">
            <button class="play" @click=${() => {
              if (this.audio.paused) {
                this.audio.play();
              } else {
                this.audio.pause();
              }
            }}>
              <ios-chat-svg .data=${playSvg}></ios-chat-svg>
            </button>

            <ios-chat-wave
              .mode=${this._mode === "record" ? "dynamic" : "static"}
            ></ios-chat-wave>

            <div class="time" @click=${() => {
              if (!this.audio.paused) this.audio.pause();

              switch(this._record?.mediaRecorder?.state) {
                case "inactive":
                  this._record?.mediaRecorder?.start(100);
                  break;
                case "paused":
                  this._record?.mediaRecorder?.resume();
                  break;
              }
            }}></div>

            <button class="send" @click=${() => {
              if (!this.audio.paused) this.audio.pause();

              switch(this._mode) {
                case "record":
                  if (this._record?.mediaRecorder?.state === "recording") {
                    this._record?.mediaRecorder?.pause();
                  }
                  break;
                case "file":
                  this._record?.mediaRecorder?.stop();
                  
              }
            }}>
              <ios-chat-svg class="send-icon" .data=${sendSvg}></ios-chat-svg>
              <ios-chat-svg class="stop-icon" .data=${stopSvg}></ios-chat-svg>
            </button>

            ${this._loading ? html`
              <div class="loading">
                <ios-chat-spinner></ios-chat-spinner>
              </div>
            ` : ""}
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

  async syncAudioFileWithWave() {
    this._loading = true;

    const audioCtx = new AudioContext();
    const arrayBuffer = await urlToBlob(this.src).then(res => res.arrayBuffer());
    const audioBuffer = await audioCtx.decodeAudioData(arrayBuffer);
    const rawData = audioBuffer?.getChannelData(0);

    let duration = this.audio.duration;
    
    if (duration === Infinity && this._record) {
      duration = this._record.duration;
    }

    this.wave.dispatchEvent(new CustomEvent("wave-rawdata", {
      detail: {
        rawData,
        audioRef: this.audio,
        duration
      }
    }));
    
    this._loading = false;
  }

  async drawTime() {
    let t = 0;
    const isPlaying = !this.audio.paused;
    
    if (this._record) {
      t = this._record.duration;
    } else if (this.audio.duration) {
      t = isPlaying ? this.audio.currentTime : this.audio.duration;
    }

    const sec = Math.floor(t % 60);
    const min = Math.floor((t / 60)) % 60;
    const hour = Math.floor(t / 3600);
    
    const padZero = (pad: number, n: number) => {
      const r = [...Array(pad)].map(() => '0').join('');
      return (r + n).slice(-pad);
    }

    let str = `${padZero(2, min)}:${padZero(2, sec)}`;
    const isRecording = this._mode === "record";

    if (hour) str = `${hour}:` + str;
    if (isRecording) str = "+" + str;

    this.timeElem.textContent = str;
    this.timeElem.style.width = str.length + "em";

    await delay(100);

    requestAnimationFrame(this.drawTime.bind(this));
  }

  resizeHandler = debounce(() => this.syncCanvasSize(), 500);

  override disconnectedCallback(): void {
    console.log("detach ",this.tagName);
    window.removeEventListener("resize", this.resizeHandler);  
  }

  override firstUpdated() {
    window.addEventListener("resize", this.resizeHandler);

    requestAnimationFrame(this.drawTime.bind(this));

    this.wave.addEventListener("click", (e: MouseEvent) => {
      if (this._mode === "record") return;

      const cs = this.wave.getBoundingClientRect();
      const ratio = Math.max(0, (e.clientX - cs.x) / cs.width);

      const duration = (this._record ? this._record.duration : this.audio.duration);
      this.audio.currentTime = Math.round(duration * ratio);
    });

    this.audio.volume = 0.3;
  }

  protected override updated(
    _changedProperties: PropertyValueMap<any> | Map<PropertyKey, unknown>
  ): void {
    if (_changedProperties.has("_loading")) return;

    const validSrc = this.src === "record" || this.src.startsWith("blob:");

    if (!validSrc) return;

    if (_changedProperties.has("src") && validSrc) {
      delay(1).then(() => {
        this.root.style.height = "100%";
        this.root.style.width = "100%";
        this.root.style.opacity = "1";
      });

      this._mode = this.src === "record" ? "record" : "file";
    }

    this.root.className = this._mode === "record" ? "record" : "";

    // record mode
    if (this._mode === "record" && !this._record) {
      this._record = new RecordAudio({
        start: () => {
          this._mode = "record";

          this.wave.dispatchEvent(
            new CustomEvent("record-instance", {
              detail: this._record,
            })
          );
        },
        resume: () => {
          this._mode = "record";
        },
        pause: (url) => {
          this.src = url;
          this._mode = "file";
        },
        end: (url) => {
          this.src = url;
          this._mode = "file";
        }
      });
    } else if (this._mode === "file") {
      // file mode
      this.syncAudioFileWithWave();
    }

    // updating wave canvas size
    delay(500).then(() => this.syncCanvasSize());
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ios-chat-audio": Audio;
  }
}
