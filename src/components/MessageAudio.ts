import LitComponent from "@/config/component";
import type { ChatMessageContentMap } from "@/models/chat-room";
import { css, html, type PropertyValues } from "lit";
import { customElement, property, query, state } from "lit/decorators.js";

import playSvg from "@/assets/play.fill.svg";
import pauseSvg from "@/assets/pause.fill.svg";
import AudioPlayerController from "@/controller/audio-player";

const TAG_NAME = "ios-chat-message-audio";

type AudioModeType = "paused" | "playing";

@customElement(TAG_NAME)
class MessageAudio extends LitComponent {
  @property({ attribute: false })
  val!: ChatMessageContentMap["audio"]["val"];

  @state()
  _mode: AudioModeType = "paused";

  @state()
  _src = "";

  @state()
  _loading = false;

  @state()
  _durationStr = "";
  private _durationSec = 0;

  @state()
  _timeRatio = 0;

  @query("audio")
  audioElem!: HTMLAudioElement;

  @query("ios-chat-wave")
  waveElem!: LitComponent;

  protected override firstUpdated(): void {
    AudioPlayerController.append(this.audioElem);  
  }

  protected override willUpdate(_changedProperties: PropertyValues): void {
    if (_changedProperties.has("val")) {
      URL.revokeObjectURL(this._src);

      this._loading = true;

      if (this.val.type === "raw") {
        const { blob } = this.val;
        this._src = URL.createObjectURL(blob);
      } else if (this.val.type === "url") {
        this._src = this.val.src;
      }
    }
  }

  syncDurationStr() {
    const padZero = (pad: number, n: number) => {
      const r = [...Array(pad)].map(() => "0").join("");
      return (r + n).slice(-pad);
    };

    const format = (t: number) => {
      const secFixedT = Math.floor(t);

      const sec = secFixedT % 60;
      const min = Math.round(secFixedT / 60) % 60;
      const hour = Math.round(secFixedT / 3600);

      const minSec = `${padZero(2, min)}:${padZero(2, sec)}`;

      if (hour) return `${padZero(2, hour)}:` + minSec;
      return minSec;
    };

    switch (this._mode) {
      case "playing":
        this._durationStr = format(this.audioElem.currentTime);
        break;
      case "paused":
        this._durationStr = format(this._durationSec);
        break;
    }
  }

  timerupdateHandler() {
    this._timeRatio = this.audioElem.currentTime / this._durationSec;
    this.syncDurationStr();
  }
  canplaythroughHandler() {
    this._durationSec = this.audioElem.duration;
    this.syncDurationStr();
  }
  playEventHandler() {
    this._mode = "playing";
  }
  pauseEventHandler() {
    this._mode = "paused";
  }
  endedHandler() {
    this._mode = "paused";
  }
  playHandler() {
    AudioPlayerController.play(this.audioElem);
  }
  pauseHandler() {
    AudioPlayerController.pause(this.audioElem);
  }

  private _clicked = false;
  private _clickCoor = {
    x: 0,
    waveWidth: 0,
  };
  mousedownHandler(e: MouseEvent) {
    // this._playerActor.send({ type: "PAUSE_AUDIO" });
    this._clicked = true;
    const { x, width } = this.waveElem.getBoundingClientRect();
    this._clickCoor.x = x;
    this._clickCoor.waveWidth = width;

    const movedTime = (e.clientX - x) / width;

    this.audioElem.currentTime = movedTime * this._durationSec;
  }
  mousemoveHandler(e: MouseEvent) {
    if (!this._clicked) return;

    const { waveWidth, x } = this._clickCoor;
    const movedTime = (e.clientX - x) / waveWidth;
    this.audioElem.currentTime = movedTime * this._durationSec;
  }
  mouseDetachHandler() {
    this._clicked = false;
  }

  protected override render() {
    const isPaused = this._mode === "paused";
    const isPlaying = this._mode === "playing";

    return html`
      <section>
        <audio
          src=${this._src ?? ""}
          @timeupdate=${this.timerupdateHandler}
          @play=${this.playEventHandler}
          @pause=${this.pauseEventHandler}
          @canplaythrough=${this.canplaythroughHandler}
          @ended=${this.endedHandler}
        ></audio>

        <div class="audio-container">
          ${this._loading
            ? html`
                <div class="loading-container">
                  <ios-chat-spinner></ios-chat-spinner>
                </div>
              `
            : undefined}

          <div class="audio-wrapper">
            <div>
              ${isPaused
                ? html`
                    <button @click=${this.playHandler}>
                      <ios-chat-svg .data=${playSvg}></ios-chat-svg>
                    </button>
                  `
                : undefined}
              ${isPlaying
                ? html`
                    <button @click=${this.pauseHandler} class="pause-btn">
                      <ios-chat-svg .data=${pauseSvg}></ios-chat-svg>
                    </button>
                  `
                : undefined}
            </div>

            <ios-chat-wave
              @mousedown=${this.mousedownHandler}
              @mousemove=${this.mousemoveHandler}
              @mouseleave=${this.mouseDetachHandler}
              @mouseup=${this.mouseDetachHandler}
              .mode=${"stopped"}
              .src=${this._src}
              .timeRatio=${this._timeRatio}
              @wave-loaded=${() => (this._loading = false)}
            ></ios-chat-wave>

            <div class="duration-viewer">${this._durationStr}</div>
          </div>
        </div>
      </section>
    `;
  }

  protected static override shadowStyles = css`
    section {
      width: 100%;
      height: 4em;
      display: flex;
      gap: 1em;
      color: var(--theme-color);
    }
    .audio-container {
      position: relative;
      flex: 1;
      overflow: hidden;
      border-radius: 999px;
    }

    .loading-container {
      position: absolute;
      width: 100%;
      height: 100%;
      z-index: 1;
      top: 0;
      left: 0;
      display: flex;
      align-items: center;
      justify-content: center;
      background-color: var(--audio);
      backdrop-filter: blur(10px);
      -webkit-backdrop-filter: blur(10px);
    }
    ios-chat-spinner {
      width: 2em;
      height: 2em;
    }

    .audio-wrapper {
      background-color: var(--audio);
      display: flex;
      align-items: center;
      gap: 6px;
      height: 100%;
      padding: 0 0.8em;
      font-weight: 300;
      transition: ease 500ms;
      position: relative;
    }

    ios-chat-wave {
      flex: 1;
      cursor: pointer;
    }

    .duration-viewer {
      border-radius: 999px;
      background-color: var(--chat-input-bg);
      font-size: 12px;
      padding: 4px 6px;
      cursor: pointer;
      text-align: center;
      width: 5em;
    }
    .duration-viewer:active {
      filter: brightness(0.8);
    }

    button {
      background-color: var(--audio-button);
      border: none;
      width: 2em;
      aspect-ratio: 1 / 1;
      border-radius: 50%;
      cursor: pointer;
      transition: ease 500ms, filter 0ms;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    button:active {
      filter: brightness(0.8);
    }
    button ios-chat-svg {
      fill: var(--audio-icon);
      width: 38%;
    }
    .pause-btn ios-chat-svg {
      width: 28%;
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    [TAG_NAME]: MessageAudio;
  }
}
