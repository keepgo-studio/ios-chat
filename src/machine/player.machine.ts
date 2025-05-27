import { assign, setup } from "xstate";

interface Context {
  audioData: {
    src: string | null;
  };
  recordData: {
    blob: Blob | null;
    duration: number;
    src: string | null;
  };
}

type Events = 
  | { type: "RESET" }
  | { type: "AUDIO_MODE"; src: string; }
  | { type: "RECORD_MODE" }
  | { type: "PLAY" }
  | { type: "PAUSE_AUDIO" }
  | { type: "RECORD" }
  | { type: "PAUSE_RECORD"; blob: Blob; duration: number; src: string }
  | { type: "SEND_AUDIO" }
  | { type: "ERROR" }
  | { type: "TERMINATE" }
  ;

export const playerMachine = setup({
  types: {
    context: {} as Context,
    events: {} as Events,
  },
  actions: {
    assignAudioData: assign({
      audioData: (_, params: { src: string }) => ({ src: params.src })
    }),
    assignRecordData: assign({
      recordData: (_, params: { blob: Blob; duration: number; src: string }) => params
    })
  }
}).createMachine({
  /** @xstate-layout N4IgpgJg5mDOIC5QAcA2BDAnmATgWgFt0BjACwEsA7MAYgFEAlBgeQYG0AGAXURQHtY5AC7k+lXiAAeiAIwBODgDoAzADYOcgCwB2bQCYOHbYe0AaEJkR4AHIo6qArDJnbNquTM0cHmvQF8-czQsXEISCmpFAEkIVFoAQQBVABEo5gB9AFlmZLpOHiQQZAFhUXFC6QQ8PWtVRU0HVRk9PW0PPR09B3NLBGUHO1VrLR1tJ08ZZQCgjGx8IjIqMGjY2gY6AGFWZKycvO4JYsERMQlK6usB7SGm-TG9OX7NHqsZOsvrN4cOGWtO-0CRVmoQWEWWDDA6AgmBoAGU6AA5HZJVLMfKHEoncqgc5qOSKBzWDh6ZTGMaaZR6VQvBANOqqEmjZRyBwdGqaaZAkLzcJLRQQqEwgAqjEyUQR8RF6MKR1KpwqiG0ikZxPsDgcj2UXmpFkQdMUDP6Mgc2mUnlZDk5wTmYUWkQF0MUAAV0ABXWCQGhOgAy8QAmtL+McymcrGo9CoxoZrGpNCyicoaVSlcyHMpmcYKVq5FbgTy7eDIY6Xe7PestgxkoGipiQwqqpNlHZrAZjeNjI4ab86nJtM0fDVDBxrJdc9zbWD+UXMM7ZlQoF6kvD0ii0tXZVjQ1UajJFJNCS4hx8k6oUyz072OFm42ObaC+Q6ZxDiHwcBB54vEsvy9t17X5TirxUgS8jfA8p6NHIUFJpothNI0wzDsSrJTIC1ogrykR0DgOCvjQIoMGKEpSgcMr-tiUiyE0iiXAoDIaES1iuDS+qGt8F6Dh0t4YQWNDrPCQp-sGAGUQgqjvPuHSUo8LbPLqVTKLYHTEnovw7qprIBIClB8BAcCHHmE5LBiwkUecDS2KS3zDrG8YcIm8l4P2iiuMSMgaG48jONx+aTjEcQmXKZlWHIEYdOo+juVBxJyb0eCKcqXgtGpnwaQCMzjve9rToFm71ngmjuZG1kxqocaEvZNJQfUfYkvZLYaGVlpoYZWWFoKzpuh6EC5XWgHbtRnyuK03hyGVDm9N2ii9v2vhEtG1g+UZ2UdU6c6UFAvUiecVK7qSUGtMyHQxrFiDpk2HnHQopJNItLWZZh7WOs+r7vhtW3BQgtgjoYLjuIOlwtF2tTTbVA7zcOd0ZXej2KEKuAEFQ6BCGAH1bk5Wj1P0hjhY1hWnbS6qRka2ipT8VKqEtbWKNhuE4Gj9YGPiqkyfVVJMfoXaGPUChyC2p4NAhOZaUAA */
  id: "player-machine",

  context: {
    audioData: {
      src: null
    },
    recordData: {
      blob: null,
      duration: 0,
      src: null
    }
  },

  states: {
    Idle: {
      on: {
        AUDIO_MODE: {
          target: "Ready.Paused",
          actions: {
            type: "assignAudioData",
            params: ({ event }) => ({ src: event.src })
          }
        },
        RECORD_MODE: {
          target: "Ready.Paused",
          reenter: true
        }
      }
    },

    Ready: {
      states: {
        Paused: {
          on: {
            PLAY: "Playing",
            RECORD: "Recording"
          }
        },

        Playing: {
          on: {
            PAUSE_AUDIO: "Paused"
          }
        },

        Recording: {
          on: {
            PAUSE_RECORD: {
              target: "Paused",
              actions: {
                type: "assignRecordData",
                params: ({ event }) => ({ ...event })
              }
            }
          }
        }
      },

      initial: "Paused",

      on: {
        SEND_AUDIO: "Terminate",

        TERMINATE: {
          target: "Terminate",
          reenter: true
        }
      }
    },

    Terminate: {
      type: "final"
    },

    Error: {
      on: {
        TERMINATE: "Terminate"
      }
    }
  },

  initial: "Idle",

  on: {
    ERROR: ".Error",
    RESET: ".Idle"
  }
})