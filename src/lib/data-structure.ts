export class Stack<T> {
  constructor (private _items: T[] = []) {}

  append(item: T): void {
    this._items.push(item);
  }

  pop(): T | undefined {
    return this._items.pop();
  }

  top(): T | undefined {
    return this._items[this._items.length - 1];
  }

  isEmpty(): boolean {
    return this._items.length === 0;
  }

  size(): number {
    return this._items.length;
  }

  clear(): void {
    this._items = [];
  }

  toArray(): T[] {
    return [...this._items];
  }
}

type Opaque<K, T> = K & { readonly __opaque__: T };

export type ChatRoomId = Opaque<string, "ChatRoomId">;