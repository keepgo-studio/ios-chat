import { globalStyles } from "@/lib/core";
import { LitElement, PropertyValueMap, css, html } from "lit";
import { customElement, property, query } from "lit/decorators.js";
import { FFT_SIZE, RecordAudio } from "./Audio";

const ACC = 0.1;
const SAMPLE = FFT_SIZE / 2;

@customElement("ios-chat-wave")
class Wave extends LitElement {
  static override styles = [
    globalStyles,
    css`
      :host {
        height: 100%;
      }
      canvas {
        width: 100%;
        height: 100%;
      }
    `,
  ];
  
  private _ctx: CanvasRenderingContext2D | null = null;
  private _offset = 0;
  private _lastIdx = -1;
  private _volumeArr = [...Array(FFT_SIZE)].map(() => ({
    to: 0,
    h: 0
  }));
  private _lifeCycle = false;

  private _recorder?: RecordAudio;
  private _audioRef?: HTMLAudioElement;
  private _blockDecibelArr: number[] = [];
  private _blockCnt = FFT_SIZE;
  private _rawData?: Float32Array;
  private _duration = 0;

  @property()
  mode: "dynamic" | "static"  = "static";

  @property({ type: Number, reflect: true })
  width = 0;
  
  @property({ type: Number, reflect: true })
  height = 0;

  @query("canvas")
  canvas!: HTMLCanvasElement;

  /**
   * 
   * @description "Root Mean Square(RMS)" algorithm
   */
  calculateBlocks() {
    this._blockDecibelArr = [...Array(this._blockCnt)].map(() => 0);

    if (this._rawData === undefined) return;

    const blockSize = Math.floor(this._rawData.length / this._blockCnt);

    for (let i = 0 ; i <  this._blockCnt; i++) {
      let val = 0;

      for (let j = 0 ; j < blockSize ; j++) {
        // val = Math.max(0, Math.abs(this._rawData[i * blockSize + j]));
        val += this._rawData[i * blockSize + j] * this._rawData[i * blockSize + j];
      }
      
      this._blockDecibelArr[i] = Math.sqrt(val / blockSize);
    }
  }

  override connectedCallback() {
    super.connectedCallback();

    this.addEventListener("clear-wave", (e) => {
      delete this._recorder;
      delete this._rawData;
      delete this._audioRef;

      for (let i = 0 ; i < FFT_SIZE ; i ++) {
        this._volumeArr[i].h = 0;
        this._volumeArr[i].to = 0;
      }
      this._offset = 0;
    });

    this.addEventListener("record-instance", (e) => {
      const r: RecordAudio = e.detail;
      r.ctx.resume().then(() => this._recorder = r);
    })

    this.addEventListener("wave-rawdata", (e) => {
      const { rawData, audioRef, duration } = e.detail;

      this._rawData = rawData;
      this._audioRef = audioRef;
      this._duration = duration;

      this.resizeWidthHandler();
      this.calculateBlocks();
    })
  }

  override render() {
    return html`
      <canvas width=${this.width} height=${this.height}></canvas>
    `;
  }

  draw() {
    if (!this._lifeCycle) return;

    const ctx = this._ctx!,
          width = this.canvas.width,
          height = this.canvas.height,
          y = height / 2;

    if (this.mode === "dynamic") {
      ctx.clearRect(0, 0, width, height);
      
      const renderCnt = SAMPLE * 2,
            dotWidth = width / SAMPLE,
            dotSpace = dotWidth / 2,
            gap = dotWidth + dotSpace,
            end = gap * (renderCnt - 1);

      ctx.fillStyle = "rgba(255, 69, 58, 0.8)";

      if (this._recorder && this._lastIdx !== -1) {
        let v = this._recorder.getVolume();
        if (v > 1) v = 1;
        else if (v < 0.05) v = 0;

        this._volumeArr[this._lastIdx].to = Math.max(v * height * 0.7, this._volumeArr[this._lastIdx].to);
        this._lastIdx = -1;
      }

      // render dots
      for (let i = 0 ; i < renderCnt ; i++) {
        const x = gap * i - this._offset;
  
        const h = this._volumeArr[i].h;
        this._volumeArr[i].h = h + (this._volumeArr[i].to - h) * ACC;
        const dotHeight = dotWidth + h;

        ctx.beginPath();
        ctx.roundRect(x, y - dotHeight / 2, dotWidth, dotHeight, 999);
        ctx.fill();
        ctx.closePath();

        if (this._lastIdx === -1 && x >= width - gap) {
          this._lastIdx = i;
        }
      }

      this._offset += 0.5;

      // reassign offset value to first position
      if (width > 0 && this._offset >= end - width) {
        this._offset = width - end % width;
        const showIdx = Math.ceil(width / gap);
        const copyStartIdx = renderCnt - 1 - showIdx;

        for (let i = 0 ; i <= showIdx ; i++) {
          this._volumeArr[i].to = this._volumeArr[copyStartIdx + i].to;
          this._volumeArr[i].h = this._volumeArr[copyStartIdx + i].h;
        }
        for (let i = showIdx + 1 ; i < renderCnt ; i++) {
          this._volumeArr[i].h = 0;
          this._volumeArr[i].to = 0;
        }
      }
    }
    else {
      ctx.clearRect(0, 0, width, height);

      let timeRatio = 0;
      if (this._audioRef) {
        const duration = this._audioRef.duration !== Infinity ? this._audioRef.duration : this._duration;

        timeRatio = this._audioRef.currentTime / duration;
      }

      const widthRatio = width * timeRatio,
            block = width / this._blockCnt,
            dotWidth = block * (2 / 3);

      const fillColor = window.getComputedStyle(this).getPropertyValue("--wave-fill"),
            blankColor = window.getComputedStyle(this).getPropertyValue("--wave-blank");

      for (let i = 0 ; i < this._blockCnt ; i++) {
        const x = block * i;

        const hotHeight = this._blockDecibelArr[i] * height * 0.7 + dotWidth;
        
        ctx.fillStyle = ((x + dotWidth) <= widthRatio) ? fillColor : blankColor;
        ctx.beginPath();
        ctx.roundRect(x, y - hotHeight / 2, dotWidth, hotHeight, 999);
        ctx.fill();

        if (x <= widthRatio && widthRatio <= (x + dotWidth)) {
          const left = widthRatio - x;

          ctx.save();
          ctx.beginPath();
          ctx.rect(x, y - hotHeight / 2, left, hotHeight)
          ctx.clip();
          ctx.fillStyle = fillColor;
    
          ctx.beginPath();
          ctx.roundRect(x, y - hotHeight / 2, dotWidth, hotHeight, 999);
          ctx.fill();
      
          ctx.restore();
        }

        ctx.closePath();
      }
    }

    requestAnimationFrame(this.draw.bind(this));
  }

  override firstUpdated() {
    this._ctx = this.canvas.getContext("2d");

    const io = new IntersectionObserver((entries) => {
      this._lifeCycle = entries[0].isIntersecting;

      if (this._lifeCycle) {
        requestAnimationFrame(this.draw.bind(this));
      }
    })

    io.observe(this);

    requestAnimationFrame(this.draw.bind(this));
  }

  resizeWidthHandler() {
    if (this.width <= 200) {
      this._blockCnt = 32;
    } else if (200 < this.width && this.width <= 500) {
      this._blockCnt = 64;
    } else {
      this._blockCnt = 128;
    }
  }

  protected override updated(_changedProperties: PropertyValueMap<any> | Map<PropertyKey, unknown>): void {
    if (_changedProperties.has("width")) {
      this.resizeWidthHandler();
      this.calculateBlocks();
    }
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ios-chat-wave": Wave;
  }
}
