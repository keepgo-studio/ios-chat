import { globalStyles } from "@/lib/core";
import { LitElement, PropertyValueMap, css, html } from "lit";
import { customElement, property, query, state } from "lit/decorators.js";
import { debounce, delay, pxToNumber, urlToBlob } from "@/lib/utils";
import { AudioManager } from "@/lib/service";

import closeSvg from "../assets/multiply.svg";
import playSvg from "../assets/play.fill.svg";
import pauseSvg from "../assets/pause.fill.svg";
import stopSvg from "../assets/stop.fill.svg";
import sendSvg from "../assets/arrow.up.circle.fill.svg";


export const FFT_SIZE = 128;
const CHUNK_TRACK_TIME = 100;
export class RecordAudio {
  initialized = false;
  ctx: AudioContext;
  analyser: AnalyserNode;
  dataArray: Uint8Array;
  recordedChunks: Blob[] = [];
  duration = 0;
  prevTime = 0;
  trackLifeCycle = false;
  url = "";

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

        this.mediaRecorder = new MediaRecorder(stream);

        this.mediaRecorder.ondataavailable = (e) => {
          if (e.data.size > 0) {
            this.recordedChunks.push(e.data);
          }
        };

        this.mediaRecorder.onstart = () => {
          this.initialized = true;
          this.trackLifeCycle = true;
          requestAnimationFrame(this.trackTime.bind(this));

          if (start) start();
        }
        
        this.mediaRecorder.onpause = () => {
          if (!pause) return;

          const blob = new Blob(this.recordedChunks, {
            type: "audio/webm; codecs=opus",
          });
          this.url = URL.createObjectURL(blob);
          this.trackLifeCycle = false;

          pause(this.url);
        }

        this.mediaRecorder.onresume = () => {
          URL.revokeObjectURL(this.url);

          this.trackLifeCycle = true;
          this.prevTime = Date.now();
          requestAnimationFrame(this.trackTime.bind(this));

          if (resume) resume();
        }

        this.mediaRecorder.onstop = () => {
          if (!end) return;

          const blob = new Blob(this.recordedChunks, {
            type: "audio/webm; codecs=opus",
          });
          this.url = URL.createObjectURL(blob);
          this.trackLifeCycle = false;
          end(this.url);
        };
        
        this.prevTime = Date.now();
        this.mediaRecorder.start(CHUNK_TRACK_TIME);
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
        background-color: var(--audio-button);
        border: none;
        width: 2em;
        aspect-ratio: 1 / 1;
        border-radius: 50%;
        fill: var(--audio-icon);
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

      button.play .pause-icon {
        display: none;
      }
      button.playing .pause-icon {
        display: block;
      }
      button.playing .play-icon {
        display: none;
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
        background-color: var(--audio);
        border-radius: 999px;
        display: flex;
        align-items: center;
        gap: 6px;
        height: 100%;
        padding: 0 0.8em;
        font-weight: 300;
        transition: ease 500ms;
        position: relative;
      }

      .time {
        border-radius: 999px;
        background-color: var(--chat-input-bg);
        font-size: 12px;
        padding: 4px 6px;
        cursor: pointer;
        text-align: center;
        width: 5em;
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
        background-color: var(--audio-loading);
        backdrop-filter: blur(10px);
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
  _lifeCycle = false;

  @state()
  _mode: "record" | "file" = "record";

  @state()
  _playing = false;

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
          <button class="cancel" @click=${() => this.endAudioTag()}>
            <ios-chat-svg .data=${closeSvg}></ios-chat-svg>
          </button>
        </div>

        <div class="audio-container">
          <div class="audio-wrapper">
            <button class="play ${this._playing ? "playing" : ""}" @click=${() => {
              if (this.audio.paused) {
                AudioManager.play(this.audio);
              } else {
                this.audio.pause();
              }
            }}>
              <ios-chat-svg class="play-icon" .data=${playSvg}></ios-chat-svg>
              <ios-chat-svg class="pause-icon" .data=${pauseSvg}></ios-chat-svg>
            </button>

            <ios-chat-wave
              .mode=${this._mode === "record" ? "dynamic" : "static"}
            ></ios-chat-wave>

            <div class="time" @click=${() => {
              if (!this.audio.paused) this.audio.pause();

              if (this._record?.mediaRecorder?.state === "paused") {
                this._record?.mediaRecorder?.resume();
              }
            }}></div>

            <button class="send" @click=${() => {
              if (!this.audio.paused) this.audio.pause();

              switch(this._mode) {
                case "record":
                  if (!this._record?.initialized) return;

                  if (this._record?.mediaRecorder?.state === "recording") {
                    this._record?.mediaRecorder?.pause();
                  }
                  break;
                case "file":
                  this._record?.mediaRecorder?.stop();
                  this.endAudioTag(this.src);
                  break;
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

  endAudioTag(url?: string) {
    delete this._record;
    
    this._playing = false;
    
    this.dispatchEvent(new CustomEvent("audio-end", {
      detail: url
    }));
    this.wave.dispatchEvent(new CustomEvent("clear-wave"));
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
    if (!this._lifeCycle) return;

    let t = 0;
    const isPlaying = !this.audio.paused;
    
    if (this._record) {
      t = isPlaying ? this.audio.currentTime : this._record.duration;
    } else if (this.audio.duration) {
      t = isPlaying ? this.audio.currentTime : this.audio.duration;
    } else {
      t = 0;
    }

    t = Math.round(t);

    const sec = t % 60;
    const min = Math.round((t / 60)) % 60;
    const hour = Math.round(t / 3600);
    
    const padZero = (pad: number, n: number) => {
      const r = [...Array(pad)].map(() => '0').join('');
      return (r + n).slice(-pad);
    }

    let str = `${padZero(2, min)}:${padZero(2, sec)}`;
    const isRecording = this._mode === "record";

    if (hour) {
      str = `${padZero(2, hour)}:` + str;
    }

    if (isRecording) str = "+" + str;

    this.timeElem.textContent = str;

    await delay(100);

    requestAnimationFrame(this.drawTime.bind(this));
  }

  resizeHandler = debounce(() => this.syncCanvasSize(), 500);

  override disconnectedCallback(): void {
    window.removeEventListener("resize", this.resizeHandler);  
  }

  override firstUpdated() {
    window.addEventListener("resize", this.resizeHandler);

    const io = new IntersectionObserver((entries) => {
      this._lifeCycle = entries[0].isIntersecting;

      if (this._lifeCycle) {
        requestAnimationFrame(this.drawTime.bind(this));
      }
    })

    io.observe(this);

    requestAnimationFrame(this.drawTime.bind(this));

    this.wave.addEventListener("click", (e: MouseEvent) => {
      if (this._mode === "record") return;

      const cs = this.wave.getBoundingClientRect();
      const ratio = Math.max(0, (e.clientX - cs.x) / cs.width);

      const duration = (this._record ? this._record.duration : this.audio.duration);
      this.audio.currentTime = duration * ratio;
    });

    this.audio.addEventListener("play", () => {
      this._playing = true;
    });
    this.audio.addEventListener("pause", () => {
      this._playing = false;
    });

    this.audio.volume = 0.2;

    AudioManager.append(this.audio);
  }

  protected override updated(
    _changedProperties: PropertyValueMap<any> | Map<PropertyKey, unknown>
  ): void {
    if (_changedProperties.has("_loading") || _changedProperties.has("_playing")) return;

    const validSrc = this.src === "record" || this.src.startsWith("blob:");

    // turn off audio tag
    if (!validSrc) {
      this.root.style.height = "";
      this.root.style.width = "";
      this.root.style.opacity = "";
      return;
    }

    if (_changedProperties.has("src")) {
      delay(100).then(() => {
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
        end: () => {
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
