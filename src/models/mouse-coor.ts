type MoveDirction = 'hor' | 'ver' | 'both';

class Velocity {
  private _time = 0;
  x = 0;
  y = 0;

  set(x: number, y: number) {
    this.x = x;
    this.y = y;
    this._time = Date.now();
  }

  get(x: number, y: number, type: MoveDirction) {
    const newTime = Date.now(),
          timeElapsed = newTime - this._time,
          dx = x - this.x,
          dy = y - this.y;

    switch(type) {
      case "both": return Math.sqrt(dx * dx + dy * dy) / timeElapsed;
      case "hor": return dx / timeElapsed;
      case "ver": return dy / timeElapsed;
    }
  }
}

export default class MouseCoor {
  private _isDragging = false;
  private _startX = 0;
  private _startY = 0;
  private _v = new Velocity();

  startDrag(currentX: number, currentY: number) {
    this._isDragging = true;
    this._startX = currentX;
    this._startY = currentY;
    this._v.set(this._startX, this._startY);
  }

  endDrag() {
    this._isDragging = false;
  }
  /**
   * End the current dragging operation and return the velocity.
   */
  endDragging(x: number, y: number, type: MoveDirction) {
    this._isDragging = false;
    return this._v.get(x, y, type);
  }

  isDragging() {
    return this._isDragging;
  }
}