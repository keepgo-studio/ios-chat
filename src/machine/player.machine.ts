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
  shouldSend: boolean;
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
    }),
    sendToChat: assign({
      shouldSend: () => true
    })
  }
}).createMachine({
  /** @xstate-layout N4IgpgJg5mDOIC5QAcA2BDAnmATgWgFt0BjACwEsA7MAYgFEAlBgeQYG0AGAXURQHtY5AC7k+lXiAAeiAIwBODgDoAzADYOcgCwB2bQCYOHbYe0AaEJkR4AHIo6qArDJnbNquTM0cHmvQF8-czQsXEISCmoaBjoAZToAFU4eJBBkAWFRcRTpBFVVRWsZZQc9TWU9OWVrUvNLBDwqxVKOPT0ZasK2koCgjGx8IjIqMEUASQhUWgBBAFUAEVHmAH0AWWY5uiSJNMERMQkcvD1rfM0HVRlW7Q9S-QdaxGK7VWstHW0nTyKe1L7QwYiI3GkyidAAwqw5qt1ptuNt0nssqBDscHIptC8LvoPhVipoHvUZPlrA5Co4OO0dK0fsF+mEhtRFAwwOgIJgaHEAHJQ2YLZhbFI7DL7bJWZQKAqXEoODjKHRuZQEsrKApydwfGVyDzKGQ0v4DcLDJkstk0eKMFajTlTc0C-i7TIHRDaJpylr2BwOSpu1RK86KVR6YoyBzaHVnPQOPUhA0MkbM1mYRQABXQAFdYJAaMmADJTACadtSCMdovqaj0Kg+hmsak0clJsoJelULvFDmU4uMyvr0bpAKNCbZKfTmYgoIhDDmRaFiKdhM7dmqFM9zmMjgJ7Xycm0Ut81kMHGsJL7-0NjKHSeTfSoUGzsziS15ixnJZFyKsxxkiiKpJch5Jaxm1bFQG07HcOB7ORT1jQFjUTY1iD4HAIFve8ZkfaJJ2nOFBTfJEpCsS58icBsWjVD53C1ZtNFsC5zleI8WhKZQYPpOC6BwHBkLNC0rRtWFkntYUCJyIlvxJBRAw0A9rFcP18kDYpZXFY4Wk0AJAhASg+AgOBtn1djhnhB130I+ozlsZRqyPOsGwPRULCIyN0S8VodTkjtPVYrTaTPOMxgmMATJE+c8DkStSnUfQZA0BQaic8tbGaVp2i-Lp-F8wyBwvE06mEucyzwTRYqrGVbNUetG0cuotUUHQpQqAwvR0aw2Jy+M8pHDNIBCwqP3qFsJJcXxjC9SqatkE5FB3Pc1JrNqspjIzcoQ68sFvPrSwGo4LirLU9DDCLaLlAlOxVDRfFohRrIuRbemWjr4OHZkkJQza8NM0TEFsY9DBcdw1JJVpN2m2bI33AD7t+R7zxGeJcAIKh0CEYLPtCor5E0erlPU9Q1RK-FErONFrODbROgpFtVHauHFE47icC2sycgMOQmnkKpZWqF5dD0TdDHqhQ5B51xPReaDNKAA */
  id: "player-machine",

  context: {
    audioData: {
      src: null
    },
    recordData: {
      blob: null,
      duration: 0,
      src: null
    },
    shouldSend: false
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
        SEND_AUDIO: {
          target: "Terminate",
          actions: "sendToChat"
        },

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