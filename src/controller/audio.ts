export class AudioController {
  static players: Map<HTMLAudioElement, number> = new Map();

  private static _stopAll()  {
    this.players.forEach((_, elem) => elem.pause());
  }

  static play(elem: HTMLAudioElement) {
    this._stopAll();
    elem.play();
  }

  static append(elem: HTMLAudioElement) {
    this.players.set(elem, 0);
  }
  static remove(elem: HTMLAudioElement) {
    this.players.delete(elem);
  }
}