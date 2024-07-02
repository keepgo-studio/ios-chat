import { debounce, delay, pxToNumber, urlToBlob } from "@/lib/utils";
import { LitElement, PropertyValueMap, css, html } from "lit";
import { customElement, property, query, state } from "lit/decorators.js";
import { AudioManager } from "@/lib/service";

import nullSvg from "../assets/questionmark.folder.fill.svg";
import playSvg from "../assets/play.fill.svg";
import pauseSvg from "../assets/pause.fill.svg";

@customElement("ios-chat-audio-message")
class AudioMessage extends LitElement {
  static override styles = css`
    section {
      width: 100%;
      height: 3.6em;
      display: flex;
      align-items: center;
      border-radius: var(--border-radius);
      justify-content: center;
    }

    ios-chat-spinner {
      display: block;
      width: 50px;
      height: 40px;
      padding: 0.2em 1em;
    }

    ios-chat-svg {
      width: var(--font-size);
    }

    .error {
      display: flex;
      font-size: 12px;
      flex-direction: column;
      justify-content: center;
      align-items: center;
      gap: 0.5em;
    }

    .controls,
    ios-chat-spinner,
    .error {
      display: none;
    }

    section.loading ios-chat-spinner {
      display: block;
    }
    section.failed .error {
      display: flex;
    }
    section.fulfilled .controls {
      display: flex;
    }

    .controls {
      align-items: center;
      width: 100%;
      height: 100%;
      padding: 0 0.8em;
      gap: .5em;
    }
    button {
      background-color: #fff;
      border: none;
      width: 1.8em;
      aspect-ratio: 1 / 1;
      border-radius: 50%;
      fill: inherit;
      cursor: pointer;
      transition: ease 500ms, filter 0ms;
      position: relative;
    }
    button ios-chat-svg {
      position: absolute;
      top: 50%;
      left: 50%;
      width: 0.7em;
      display: flex;
      transform: translate(-50%, -50%);
    }
    button .pause-icon {
      display: none;
    }
    button.playing .pause-icon {
      display: flex;
    }
    button.playing .play-icon {
      display: none;
    }
    ios-chat-wave {
      flex: 1;
      cursor: pointer;
    }

    .time {
      border-radius: 999px;
      background-color: var(--chat-input-bg);
      font-size: 12px;
      padding: 4px 6px;
      text-align: center;
    }
  `;

  _lifeCycle = false;

  @state()
  _fulfilled = false;

  @state()
  _loading = false;

  @state()
  _playing = false;

  @property()
  src = "";

  @query("ios-chat-wave")
  wave!: HTMLElement;

  @query("audio")
  audio!: HTMLAudioElement;

  @query("button")
  playBtn!: HTMLButtonElement;

  @query(".time")
  timeElem!: HTMLElement;

  override render() {
    const rootClassName = this._loading
      ? "loading"
      : this._fulfilled
      ? "fulfilled"
      : "failed";

    return html`
      <audio src="${this.src ? this.src : ""}"></audio>

      <section class="${rootClassName}">
        <ios-chat-spinner></ios-chat-spinner>

        <div class="controls">
          <button
            class="${this._playing ? "playing" : ""}"
            @click=${() => {
              if (this.audio.paused) {
                AudioManager.play(this.audio);
              } else {
                this.audio.pause();
              }
            }}
          >
            <ios-chat-svg class="play-icon" .data=${playSvg}></ios-chat-svg>
            <ios-chat-svg class="pause-icon" .data=${pauseSvg}></ios-chat-svg>
          </button>

          <ios-chat-wave></ios-chat-wave>

          <div class="time">00:00</div>
        </div>

        <div class="error">
          <span>error audio</span>
          <ios-chat-svg .data=${nullSvg}></ios-chat-svg>
        </div>
      </section>
    `;
  }

  async loadData() {
    try {
      this._loading = true;

      const audioCtx = new AudioContext();
      const arrayBuffer = await urlToBlob(this.src).then(res => res.arrayBuffer());
      const audioBuffer = await audioCtx.decodeAudioData(arrayBuffer);
      const rawData = audioBuffer?.getChannelData(0);

      this.wave.dispatchEvent(new CustomEvent("wave-rawdata", {
        detail: {
          rawData,
          audioRef: this.audio,
          duration: this.audio.duration
        }
      }));
      
      this._fulfilled = true;
    } catch {
      this._fulfilled = false;
    } finally {
      this.dispatchEvent(
        new CustomEvent("loaded", {
          bubbles: true,
          composed: true,
          detail: this._fulfilled,
        })
      );

      this._loading = false;
    }
  }

  async drawTime() {
    if (!this._lifeCycle) return;

    let t = 0;
    const isPlaying = !this.audio.paused;
    
    if (this.audio.duration !== Infinity) {
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

    this.timeElem.style.width = "3em";

    if (hour) {
      str = `${padZero(2, hour)}:` + str;
      this.timeElem.style.width = "5em";
    }

    this.timeElem.textContent = str;

    await delay(100);

    requestAnimationFrame(this.drawTime.bind(this));
  }

  syncCanvasSize() {
    const waveCs = window.getComputedStyle(this.wave);

    this.wave.setAttribute("width", pxToNumber(waveCs.width).toString());
    this.wave.setAttribute("height", pxToNumber(waveCs.height).toString());
  }

  resizeHandler = debounce(() => this.syncCanvasSize(), 500);

  protected override firstUpdated() {
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
      const cs = this.wave.getBoundingClientRect();
      const ratio = Math.max(0, (e.clientX - cs.x) / cs.width);

      const duration = this.audio.duration !== Infinity ? this.audio.duration : 0;

      this.audio.currentTime = duration * ratio;
    });

    this.audio.addEventListener("play", () => {
      this._playing = true;
    })
    this.audio.addEventListener("pause", () => {
      this._playing = false;
    })

    this.audio.volume = 0.2;

    AudioManager.append(this.audio);
  }

  protected override updated(
    _changedProperties: PropertyValueMap<any> | Map<PropertyKey, unknown>
  ): void {
    if (_changedProperties.has("src")) {
      this.loadData();
    }

    this.syncCanvasSize();
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ios-chat-audio-message": AudioMessage;
  }
}
