const CHUNK_INTERVAL = 10;
const FFT_SIZE = 1024;
const AUDIO_MIME_TYPE = "audio/webm; codecs=opus";

type Props = Partial<{
  start: () => void;
  resume: () => void;
  playing: (currentTimeSec: number) => void;
  pause: (blob: Blob, durationSec: number) => void;
  end: (blob: Blob, durationSec: number) => void;
  onerror: () => void;
}>;

export default class AudioRecorder {
  private _ctx: AudioContext;
  private _analyser: AnalyserNode;
  private _mediaRecorder?: MediaRecorder;

  constructor() {
    this._ctx = new AudioContext();
    this._analyser = this._ctx.createAnalyser();
    this._analyser.fftSize = FFT_SIZE;
  }

  async init({ start, resume, playing, pause, end, onerror }: Props) {
    const recordedChunks: Blob[] = [];
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
  
      const source = this._ctx.createMediaStreamSource(stream);
      source.connect(this._analyser);
  
      this._mediaRecorder = new MediaRecorder(stream);
      let intervalId: number = -1;
  
      const clear = () => {
        this._recordLifeCycle = false;
        clearInterval(intervalId);
        recordedChunks.length = 0;
      };
  
      // when start recording
      this._mediaRecorder.onstart = async () => {
        // Some browsers start AudioContext in "suspended" state.
        // If not resumed, getByteTimeDomainData() returns no data.
        // Resume after user interaction to enable audio processing.
        if (this._ctx.state === "suspended") {
          await this._ctx.resume();
        }
  
        this._startTrackDuration();
  
        if (start) start();
      };
  
      // when pause recording
      this._mediaRecorder.onpause = () => {
        this._pauseTrackDuration();
  
        if (pause) {
          pause(this._chunksToBlob(recordedChunks), this._durationSec);
        }
      };
  
      // when resume recording
      this._mediaRecorder.onresume = () => {
        this._startTrackDuration();
  
        if (resume) resume();
      };
  
      this._mediaRecorder.onstop = () => {
        this._pauseTrackDuration();
  
        if (end) {
          end(this._chunksToBlob(recordedChunks), this._durationSec);
        }
  
        clear();
      };
  
      this._mediaRecorder.ondataavailable = (e) => {
        if (playing) playing(this._durationSec);
        
        if (e.data.size > 0) {
          recordedChunks.push(e.data);
        }
      };
  
      intervalId = setInterval(() => {
        if (this._recordLifeCycle && this._mediaRecorder) {
          this._mediaRecorder.requestData();
        }
      }, CHUNK_INTERVAL);
    } catch (err) {
      console.error(err);
      if (onerror) onerror();
    }
  }

  start() {
    this._mediaRecorder?.start();
  }

  stop() {
    this._mediaRecorder?.stop();
  }

  resume() {
    this._mediaRecorder?.resume();
  }

  pause() {
    this._mediaRecorder?.pause();
  }

  private _chunksToBlob(chunks: Blob[]) {
    return new Blob(chunks, { type: AUDIO_MIME_TYPE });
  }

  private _recordLifeCycle = false;
  private _durationSec = 0;
  private _prevTime = 0;
  private _startTrackDuration() {
    this._recordLifeCycle = true;
    this._prevTime = Date.now();
    this._tracking();
  }

  private _tracking() {
    const currentTime = Date.now();

    if (currentTime - this._prevTime >= 0) {
      this._durationSec += (currentTime - this._prevTime) / 1000;
      this._prevTime = currentTime;
    }

    if (!this._recordLifeCycle) return;

    requestAnimationFrame(this._tracking.bind(this));
  }

  private _pauseTrackDuration() {
    this._recordLifeCycle = false;
    return this._durationSec;
  }

  getFrequencyEnergy() {
    const freqData = new Uint8Array(this._analyser.frequencyBinCount);
    this._analyser.getByteFrequencyData(freqData);

    let sum = 0;
    for (let i = 0; i < freqData.length; i++) {
      sum += freqData[i];
    }

    return sum / (freqData.length * 255); // normalize to 0~1
  }

  getFFTSize() {
    return this._analyser.fftSize;
  }
}
