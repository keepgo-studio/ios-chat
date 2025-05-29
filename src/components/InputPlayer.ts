import type { ChatMachineActorRef } from "@/machine/app.machine";
import LitComponent from "@/config/component";
import type { ChatMessageContentMap } from "@/models/chat-room";
import { css, html, type PropertyValues } from "lit";
import { customElement, property, query, state } from "lit/decorators.js";
import { createActor } from "xstate";
import { playerMachine } from "@/machine/player.machine";
import AudioRecorder from "@/models/audio-recorder";
import AudioPlayerController from "@/controller/audio-player";
import { styleMap } from "lit/directives/style-map.js";

import closeSvg from "@/assets/multiply.svg";
import playSvg from "@/assets/play.fill.svg";
import pauseSvg from "@/assets/pause.fill.svg";
import stopSvg from "@/assets/stop.fill.svg";
import sendSvg from "@/assets/arrow.up.circle.fill.svg";

type PlayerModeType = "paused" | "playing" | "recording";

const TAG_NAME = "ios-chat-input-player";

@customElement(TAG_NAME)
class InputAudio extends LitComponent {
  @property({ attribute: false })
  actorRef!: ChatMachineActorRef;

  // assign null only first time
  @state()
  _data?: ChatMessageContentMap["audio"]["val"] | null = null;

  @state()
  _loading = false;

  @state()
  _playerMode: PlayerModeType = "paused";

  @state()
  _src: string | null = null;

  @state()
  _durationStr = "";

  @state()
  _recorder?: AudioRecorder;

  @state()
  _timeRatio = 0;

  @query("audio")
  audioElem!: HTMLAudioElement;

  @query("ios-chat-wave")
  waveElem!: LitComponent;

  private _playerActor = createActor(playerMachine);
  private _durationSec = 0;

  protected override connected(): void {
    this.actorRef.subscribe((snap) => {
      if (snap.matches({ Render: { Input: { Ready: "AudioPlayerMode" } } })) {
        this._data = snap.context.inputAudio.data?.val;
      }
    });
  }

  protected override firstUpdated(): void {
    AudioPlayerController.append(this.audioElem);

    this._playerActor.subscribe({
      next: async (snap) => {
        this.syncDurationStr();

        if (snap.matches({ Ready: "Paused" })) {
          this._playerMode = "paused";
          const { audioData, recordData } = snap.context;

          this._src = this.isRecordMode(this._data) ? recordData.src : audioData.src;

          AudioPlayerController.pause(this.audioElem);
        } else if (snap.matches({ Ready: "Playing" })) {
          this._playerMode = "playing";
          AudioPlayerController.play(this.audioElem);
        } else if (snap.matches({ Ready: "Recording" })) {
          this._playerMode = "recording";
        }
      },
      complete: () => {
        const { audioData, recordData, shouldSend } = this._playerActor.getSnapshot().context;

        // clean memory for audio mode
        if (audioData.src) {
          URL.revokeObjectURL(audioData.src);
        }
        // clean memory for recorder mode
        if (this._recorder) {
          URL.revokeObjectURL(recordData.src ?? "");
          this._recorder.stop();
        }

        // audio mode
        if (shouldSend && this._data) {
          this.actorRef.send({
            type: "APPEND_AUDIO",
            audioContent: {
              type: "audio",
              val: this._data,
            },
          });
          this.actorRef.send({ type: "SEND_MESSAGE" });
        } 
        // record mode
        else if (shouldSend && recordData.blob) {
          const { blob, duration } = recordData;
          this.actorRef.send({
            type: "APPEND_AUDIO",
            audioContent: {
              type: "audio",
              val: { type: "raw", blob, duration },
            },
          });
          this.actorRef.send({ type: "SEND_MESSAGE" });
        }

        // close input player
        this.actorRef.send({ type: "DETACH_AUDIO" });
      },
    });

    // start machine after clearing and subscring
    this._playerActor.start();
  }

  protected override willUpdate(_changedProperties: PropertyValues): void {
    // handle playerActor when data changed
    if (_changedProperties.has("_data")) {
      // record mode
      if (this.isRecordMode(this._data)) {
        this._loading = true;

        let recordSrc = "";

        // user events (e.g click pause-btn) will effect this._recorder
        this._recorder = new AudioRecorder();

        this._recorder.init({
          start: () => {
            this._playerActor.send({ type: "RECORD" });
            this._loading = false;
          },
          pause: (blob, durationSec) => {
            recordSrc = URL.createObjectURL(blob);

            this._playerActor.send({
              type: "PAUSE_RECORD",
              blob,
              duration: durationSec,
              src: recordSrc,
            });
          },
          resume: () => {
            URL.revokeObjectURL(recordSrc);
            this._playerActor.send({ type: "RECORD" });
          },
          playing: (d) => {
            this.syncDurationStr(d);
            this.waveElem.fireEvent("recording");
          },
          onerror: () => {
            this._playerActor.send({ type: "TERMINATE" });
          },
        })
        .then(() => {
          this._playerActor.send({ type: "RECORD_MODE" });
          this._recorder!.start();
        })
        .catch(() => {
          this._playerActor.send({ type: "TERMINATE" });
        });
      } else if (this._data !== null) {
        let audioSrc = "";

        if (this._data.type === "raw") {
          const { blob } = this._data;
          audioSrc = URL.createObjectURL(blob);
        } else if (this._data.type === "url") {
          audioSrc = this._data.src;
        }

        this._playerActor.send({ type: "AUDIO_MODE", src: audioSrc });
      }
    }

    if (_changedProperties.has("_src") && this._src) {
      this._loading = true;
    }
  }

  // if data is undefined, go to record mode
  isRecordMode(dataRef: typeof this._data): dataRef is undefined {
    return dataRef === undefined;
  }

  syncDurationStr(currentSec?: number) {
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

    switch (this._playerMode) {
      case "playing":
        this._durationStr = format(this.audioElem.currentTime);
        break;
      case "paused":
        this._durationStr = format(this._durationSec);
        break;
      case "recording":
        this._durationStr = "+" + format(currentSec ?? 0);
    }
  }

  canplaythroughHandler() {
    if (this.isRecordMode(this._data)) {
      this._durationSec = this._playerActor.getSnapshot().context.recordData.duration;
    } else {
      this._durationSec = this.audioElem.duration;
    }

    this.syncDurationStr();
  }
  endedHandler() {
    this._playerActor.send({ type: "PAUSE_AUDIO" });
  }
  timerupdateHandler() {
    this._timeRatio = this.audioElem.currentTime / this._durationSec;
    this.syncDurationStr();
  }
  terminateHandler() {
    this._playerActor.send({ type: "TERMINATE" });
  }
  playHandler() {
    this._playerActor.send({ type: "PLAY" });
  }
  pauseAudioHandler() {
    this._playerActor.send({ type: "PAUSE_AUDIO" });
  }
  sendHandler() {
    this._playerActor.send({ type: "SEND_AUDIO" });
  }
  pauseRecordHandler() {
    this._recorder?.pause();
  }
  resumeRecordHandler() {
    this._recorder?.resume();
  }

  private _clicked = false;
  private _clickCoor = {
    x: 0,
    waveWidth: 0
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
    const isPlayerRecordMode = this.isRecordMode(this._data);
    const isRecording = this._playerMode === "recording";
    const isPaused = this._playerMode === "paused";
    const isPlaying = this._playerMode === "playing";

    return html`
      <section>
        <audio
          src=${this._src ?? ""}
          @timeupdate=${this.timerupdateHandler}
          @canplaythrough=${this.canplaythroughHandler}
          @ended=${this.endedHandler}
        ></audio>
        <div class="terminate-container">
          <button @click=${this.terminateHandler} style=${styleMap({
            width: isRecording ? "0" : ""
          })}>
            <ios-chat-svg .data=${closeSvg}></ios-chat-svg>
          </button>
        </div>

        <div class="audio-container">
          ${this._loading ? html`
            <div class="loading-container">
              <ios-chat-spinner></ios-chat-spinner>
            </div>
          `: undefined}

          <div class="audio-wrapper" style=${styleMap({
            backgroundColor: isRecording ? "var(--input-record)" : ""
          })}>
            <div>
              ${isPaused || isRecording ? html`
                  <button @click=${this.playHandler} style=${styleMap({
                    width: isRecording ? "0" : ""
                  })}>
                    <ios-chat-svg .data=${playSvg}></ios-chat-svg>
                  </button>
                  ` : undefined}
              ${isPlaying
                ? html`
                    <button @click=${this.pauseAudioHandler} class="pause-btn">
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
              .mode=${isRecording ? "running" : "stopped"}
              .src=${this._src}
              .timeRatio=${this._timeRatio}
              .recorderRef=${this._recorder}
              @wave-loaded=${() => this._loading = false}
            ></ios-chat-wave>

            <div
              class="duration-viewer"
              @click=${this.resumeRecordHandler}
              style=${styleMap({
                pointerEvents: isPlayerRecordMode ? "" : "none"
              })}
            >
              ${this._durationStr}
            </div>

            ${isPaused || isPlaying
              ? html`
                  <button @click=${this.sendHandler} class="send-btn">
                    <ios-chat-svg .data=${sendSvg}></ios-chat-svg>
                  </button>
                `
              : html`
                  <button @click=${this.pauseRecordHandler}>
                    <ios-chat-svg .data=${stopSvg}></ios-chat-svg>
                  </button>
                `}
          </div>
        </div>
      </section>
    `;
  }

  protected static override shadowStyles = css`
    :host {
      display: block;
      width: 100%;
    }

    section {
      width: 100%;
      height: 3.6em;
      display: flex;
      gap: 1em;
      color: var(--theme-color);
    }

    .terminate-container {
      opacity: 1;
      display: flex;
      align-items: center;
      transition: ease 500ms;
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
    .send-btn ios-chat-svg {
      fill: var(--blue);
      width: 100%;
    }
  `;

  protected override disconnected(): void {
    this._playerActor.stop();
  }
}

declare global {
  interface HTMLElementTagNameMap {
    [TAG_NAME]: InputAudio;
  }
}
