import LitComponent from "@/config/component";
import { clamp, debounce, fixedToDecimal, range } from "@/lib/utils";
import type AudioRecorder from "@/models/audio-recorder";
import { css, html, type PropertyValues } from "lit";
import { customElement, property, query, state } from "lit/decorators.js";

const TAG_NAME = "ios-chat-wave";

/**
 * accelerator value
 */
const ACC = 0.1;
/**
 * step size for x horizon
 */
const STEP = 1.5;

const HEIGHT_SCALE = 0.8;

type DotCoor = {
  heightTo: number;
  currentHeight: number;
};

/**
 * @fires wave-loaded
 */
@customElement(TAG_NAME)
class Wave extends LitComponent {
  @property()
  mode: "running" | "stopped" = "running";

  @property()
  src: string | null = null;

  // only useful when ios-chat-input-player is recording mode
  @property({ attribute: false })
  recorderRef?: AudioRecorder;

  @property({ type: Number })
  timeRatio = 0;

  @state()
  _width = 0;

  @state()
  _height = 0;

  @query("canvas")
  canvas!: HTMLCanvasElement;

  /**
   * actual dot counts which will be rendered at screen = DOT_COUNT / 2
   * should be even integer
   */
  private _recordDotCnt = 128;
  private _resizeObserver?: ResizeObserver;
  private _viewObserver?: IntersectionObserver;
  private _ctx: CanvasRenderingContext2D | null = null;
  private _recordDotCoor: DotCoor[] = [];
  private _channelMonoData: Float32Array = new Float32Array(0);
  private _audioDotHeight: number[] = [];
  private _frameRef = -1;
  /**
   * using app's css variables; check appStyleVars from App.ts
   * this varaible is for supporting dark mode.
   */
  private _colorMap = {
    fill: "",
    blank: "",
  };
  private _lastDotIdx: null | number = null;

  protected override firstUpdated(): void {
    this._colorMap = {
      fill: window.getComputedStyle(this).getPropertyValue("--wave-fill"),
      blank: window.getComputedStyle(this).getPropertyValue("--wave-blank"),
    };

    const debouncedCallback = debounce((entries: ResizeObserverEntry[]) => {
      const { width, height } = entries[0].contentRect;
      this._width = width;
      this._height = height;

      if (this.mode === "stopped") {
        this._audioDotHeight = downsampleRMS(this._channelMonoData, width * 0.18);
      }
    }, 500);

    this._resizeObserver = new ResizeObserver(debouncedCallback);
    this._resizeObserver.observe(this);

    this._viewObserver = new IntersectionObserver((entries) => {
      const shouldDraw = entries[0].isIntersecting;

      if (shouldDraw) this.draw();
      else cancelAnimationFrame(this._frameRef);
    });
    this._viewObserver.observe(this);

    this._ctx = this.canvas.getContext("2d");

    this.listenEvent("recording", () => {
      if (this.recorderRef && this._lastDotIdx !== null) {
        const v = fixedToDecimal(this.recorderRef.getFrequencyEnergy());
        const scaleV = this.getAdaptivelyNormalizedEnergy(v);

        this._recordDotCoor[this._lastDotIdx].heightTo = scaleV * (this._height * HEIGHT_SCALE);
        this._lastDotIdx = null;
      }
    });

    this.listenEvent("wave-render", () => {
      cancelAnimationFrame(this._frameRef);
      this.draw();
    });
    this.listenEvent("wave-stop-render", () => {
      cancelAnimationFrame(this._frameRef);
    })
  }

  protected override updated(_changedProperties: PropertyValues): void {
    if (_changedProperties.has("recorderRef") && this.recorderRef) {
      this._recordDotCoor = range(this._recordDotCnt, { heightTo: 0, currentHeight: 0 });
    }

    if (_changedProperties.has("src") && this.mode === "stopped" && this.src) {
      urlToArrayBuffer(this.src)
        .then(async (buffer) => {
          if (!buffer) return;

          const audioCtx = new AudioContext();
          const audioBuffer = await audioCtx.decodeAudioData(buffer);
          const left = audioBuffer.getChannelData(0);
          const right =
            audioBuffer.numberOfChannels > 1
              ? audioBuffer.getChannelData(1)
              : null;

          this._channelMonoData = right ? left.map((v, i) => (v + right[i]) / 2) : left;
          this._audioDotHeight = downsampleRMS(this._channelMonoData, this.offsetWidth * 0.18);
        })
        .catch(() => {
          this._audioDotHeight.length = 0;
        })
        .finally(() => {
          this.fireEvent("wave-loaded");
        });
    }
    if (!this.src) {
      this._audioDotHeight.length = 0;
    }
  }

  /**
   * Returns a normalized audio energy value between 0 and 1,
   * automatically adjusted based on recent peak energy levels.
   *
   * This function tracks the peak frequency-domain energy over time,
   * applying a decay factor to gradually reduce the peak value if
   * no louder audio is detected. This allows the visualization to adapt
   * dynamically to changing volume conditions.
   *
   * - `peakEnergy`: the decaying maximum observed energy
   * - `decayFactor`: how quickly the peak energy fades over time
   * - `visualScale`: output multiplier to control visual intensity
   *
   * @param {number} currentEnergy - The current audio energy in the range [0, 1]
   * @returns {number} A normalized and scaled value in the range [0, 1]
   */
  private _peakEnergy = 0.01;
  private _decayFactor = 0.98;
  private _visualScale = 0.65;

  getAdaptivelyNormalizedEnergy(currentEnergy: number): number {
    if (currentEnergy > this._peakEnergy) {
      this._peakEnergy = currentEnergy;
    } else {
      this._peakEnergy *= this._decayFactor;
    }

    const relativeEnergy = currentEnergy / this._peakEnergy;
    return clamp(relativeEnergy * this._visualScale, 0, 1);
  }

  private _xPosition = 0;
  private _prevTime = 0;

  async draw() {
    const drawCanvasByMode = () => {
      const ctx = this._ctx!;
      const width = this.canvas.width;
      const height = this.canvas.height;
      const scaleHeight = height * HEIGHT_SCALE;
      const y = height / 2; // center of canvas

      const minDotH = scaleHeight * 0.05;

      ctx.clearRect(0, 0, width, height);

      switch (this.mode) {
        case "running": {
          if (!this.recorderRef) return;

          const halfDotCnt = this._recordDotCnt / 2;
          const dotContainer = width / halfDotCnt;
          const dotWidth = (dotContainer / 3) * 2;
          // const dotSpace = dotContainer / 3;

          ctx.fillStyle = "rgba(255, 69, 58, 0.8)";

          range(this._recordDotCnt).forEach((_, idx) => {
            const x = dotContainer * idx - this._xPosition;
            const { currentHeight, heightTo } = this._recordDotCoor[idx];
            const deltaH = heightTo - currentHeight;
            const nextH = currentHeight + deltaH * ACC;

            const boundedNextH = Math.max(nextH, minDotH);
            const halfH = boundedNextH / 2;

            ctx.beginPath();
            ctx.roundRect(x, y - halfH, dotWidth, boundedNextH, 999);
            ctx.fill();
            ctx.closePath();

            this._recordDotCoor[idx].currentHeight = nextH;

            if (this._lastDotIdx === null && (width - dotWidth) <= x) {
              this._lastDotIdx = idx;
            }
          });

          this._xPosition += STEP;

          // reset xPosition to starting point
          if (this._xPosition >= width) {
            this._xPosition -= width;

            range(halfDotCnt).forEach((_, idx) => {
              const cloneRef = this._recordDotCoor[idx];
              const originRef = this._recordDotCoor[idx + halfDotCnt];

              cloneRef.heightTo = originRef.heightTo;
              cloneRef.currentHeight = originRef.currentHeight;
              originRef.heightTo = 0;
              originRef.currentHeight = 0;
            });
          }
          return;
        }
        case "stopped": {
          if (this._audioDotHeight.length === 0) return;

          const fillWidth = width * this.timeRatio;
          const n = this._audioDotHeight.length;
          const dotContainer = width / n;
          const dotWidth = (dotContainer / 3) * 2;
          // const dotSpace = dotContainer / 3;

          range(n).forEach((_, idx) => {
            const x = dotContainer * idx;
            const h = this._audioDotHeight[idx] * scaleHeight;
            const boundedH = Math.max(h, minDotH);
            const halfH = boundedH / 2;

            ctx.fillStyle =
              x + dotWidth <= fillWidth
                ? this._colorMap.fill
                : this._colorMap.blank;
            ctx.beginPath();
            ctx.roundRect(x, y - halfH, dotWidth, boundedH, 999);
            ctx.fill();

            if (x <= fillWidth && fillWidth <= (x + dotWidth)) {
              const partialFillWidth = fillWidth - x;

              ctx.save();
              ctx.beginPath();
              ctx.rect(x, y - halfH, partialFillWidth, boundedH)
              ctx.clip();
              ctx.fillStyle = this._colorMap.fill;
        
              ctx.beginPath();
              ctx.roundRect(x, y - halfH, dotWidth, boundedH, 999);
              ctx.fill();
          
              ctx.restore();
            }
          });
          return;
        }
      }
    };

    const currentTime = Date.now();
    if (currentTime - this._prevTime >= 30) {
      drawCanvasByMode();
      this._prevTime = currentTime;
    }

    this._frameRef = requestAnimationFrame(this.draw.bind(this));
  }

  protected override render() {
    return html`
      <canvas width=${this._width} height=${this._height}></canvas>
    `;
  }

  protected static override shadowStyles = css`
    :host {
      height: 100%;
    }
    canvas {
      width: 100%;
      height: 100%;
    }
  `;

  protected override disconnected(): void {
    this._resizeObserver?.disconnect();
    this._viewObserver?.disconnect();
  }
}

declare global {
  interface HTMLElementTagNameMap {
    [TAG_NAME]: Wave;
  }
}

async function urlToArrayBuffer(url: string) {
  try {
    return await fetch(url)
      .then((r) => r.blob())
      .then((r) => r.arrayBuffer());
  } catch (err) {
    console.error(err);
  }
}

function downsampleRMS(data: Float32Array, resolution = 128, scale = 2.5): number[] {
  const blockSize = Math.floor(data.length / resolution);
  const result: number[] = [];

  range(resolution).forEach((_, i) => {
    let sumSq = 0;

    range(blockSize).forEach((_, j) => {
      const index = i * blockSize + j;
      const sample = data[index];
      sumSq += sample * sample;
    });
    const rms = Math.sqrt(sumSq / blockSize);
    result.push(clamp(rms * scale, 0, 1));
  })

  return result;
}
