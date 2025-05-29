import { css, LitElement } from "lit";
import { globalStyles } from "./style";

/**
 * @fires fire-toggle
 */
export default class LitComponent extends LitElement {
  protected static shadowStyles = css``;

  static override get styles() {
    return [globalStyles, this.shadowStyles];
  }

  protected connected() {};
  override connectedCallback(): void {
    super.connectedCallback();
    this.connected();
  }

  protected disconnected() {};
  override disconnectedCallback(): void {
    super.disconnectedCallback();
    this.disconnected();
  }

  getAttr<T extends string>(key: T) {
    return this.getAttribute(key);
  }

  fireEvent<K extends keyof CustomEventDetailMap>(
    ...args: CustomEventDetailMap[K] extends undefined
      ? [type: K, options?: EventInit]
      : [type: K, detail: CustomEventDetailMap[K], options?: EventInit]
  ): void {
    const [type, detailOrOptions, maybeOptions] = args as [
      K,
      CustomEventDetailMap[K] | EventInit | undefined,
      EventInit | undefined
    ];

    let detail: CustomEventDetailMap[K] | undefined;
    let options: EventInit | undefined;

    if (maybeOptions !== undefined) {
      detail = detailOrOptions as CustomEventDetailMap[K];
      options = maybeOptions;
    } else {
      const isEventInit =
        typeof detailOrOptions === "object" &&
        detailOrOptions !== null &&
        ("bubbles" in detailOrOptions ||
          "cancelable" in detailOrOptions ||
          "composed" in detailOrOptions);
      if (isEventInit) {
        options = detailOrOptions as EventInit;
      } else {
        detail = detailOrOptions as CustomEventDetailMap[K];
      }
    }
    
    // default option: { composed: true, bubble: false }
    // received on the element that dispatches the event and on the host element containing the shadow root.
    // https://lit.dev/docs/components/events/#shadowdom-composed
    if (!options) {
      options = { composed: true, bubbles: false };
    }

    const event = new CustomEvent(type, { detail, ...options });
    this.dispatchEvent(event);
  }

  listenEvent<K extends keyof CustomEventDetailMap>(
    type: K,
    listener: (detail: CustomEventDetailMap[K]) => void,
    options?: AddEventListenerOptions
  ) {
    const wrapped = (e: Event) =>
      e instanceof CustomEvent && listener(e.detail);

    this.addEventListener(type, wrapped, options);

    const unsubscribe = () => this.removeEventListener(type, wrapped, options);

    return unsubscribe;
  }
}
