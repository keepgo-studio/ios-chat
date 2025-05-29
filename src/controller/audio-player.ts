import { AppError } from "@/config/error";

export default class AudioPlayerController {
  private static _players: Map<HTMLAudioElement, HTMLAudioElement> = new Map();
  private static _volume = 0.3;
  private static _currentPlayElemRef: HTMLAudioElement | null = null;

  private static _stopAll()  {
    this._players.forEach((_, elem) => elem.pause());
    this._currentPlayElemRef = null;
  }

  private static _getAudio(elemRef: HTMLAudioElement) {
    const audioRef = this._players.get(elemRef);

    if (!audioRef) {
      throw new AppError(
        "AUDIO_PLAYER_NOT_FOUND",
        `Not founded Chat player, check audio element ref been passed`
      );
    }

    return audioRef;
  }

  static append(elemRef: HTMLAudioElement) {
    this._players.set(elemRef, elemRef);
  }
  static remove(elemRef: HTMLAudioElement) {
    this._players.delete(elemRef);
  }

  static play(elemRef: HTMLAudioElement) {
    this._stopAll();
    this._getAudio(elemRef).play();
    this._currentPlayElemRef = elemRef;
  }
  static pause(elemRef: HTMLAudioElement) {
    this._stopAll();
    this._getAudio(elemRef).pause();
  }

  static setVolume(v: number) {
    this._volume = v;
    if (this._currentPlayElemRef) {
      this._currentPlayElemRef.volume = this._volume;
    }
  }
}