import { assign, setup, type ActorRefFrom, type SnapshotFrom } from "xstate";
import LitComponent from "./config/component";
import type { ChatMessage, ChatMessageContent, ChatMessageContentMap } from "./models/chat-room";
import type { ChatRoomId } from "./lib/data-structure";
import type SupportChatMode from "./controller/chat";
import ChatController from "./controller/chat";
import { AppError } from "./config/error";
import { logPrefix } from "./config/console";
import type { AppAttributeKey } from "./App";

export function checkAppValid(roomRef: LitComponent) {
  // check room-id attribute
  const roomId = roomRef.getAttr<AppAttributeKey>("room-id") as ChatRoomId | null;

  if (!roomId) {
    throw new AppError("CHAT_ROOM_ID_REQUIRED", "room-id is required");
  }

  // check mode attribute
  const rawMode = roomRef.getAttr<AppAttributeKey>("mode");

  if (rawMode !== null && rawMode !== "normal" && rawMode !== "text-only") {
    console.error(logPrefix(`Invalid mode "${rawMode}". — fallback to "normal"`));
  }

  const mode: SupportChatMode = rawMode === "text-only" ? "text-only" : "normal";

  console.info(logPrefix(`Initializing chat room (id: "${roomId}", mode "${mode}")`));

  // create chat room via controller
  ChatController.createRoom(roomId, roomRef);

  return {
    roomId: roomId as ChatRoomId,
    roomRef,
    mode
  };
}

interface Context {
  roomId: ChatRoomId | null;
  roomRef: LitComponent | null;
  mode: SupportChatMode;
  appCoor: {
    width: number;
    height: number;
  };
  textareaCoor: {
    width: number;
    height: number;
  };
  inputCoor: {
    height: number;
  }
  error: string | null;
  cachedMessageContents: ChatMessageContent[];
  messages: ChatMessage[];
}

type Events =
  | { type: "CREATE_ROOM"; info: ReturnType<typeof checkAppValid> }
  | { type: "RESIZE_APP"; width: number; height: number }
  | { type: "OPEN_ATTACHMENT" }
  | { type: "CLOSE_ATTACHMENT" }
  | { type: "RESET_INPUT" }
  | { type: "SEND_MESSAGE" }
  | { type: "ANSWER_MESSAGE" }
  | { type: "SYNC_MESSAGE" }
  | { type: "TEXT_INPUT" }
  | { type: "TEXT_ENTER"; textContent: ChatMessageContentMap["text"]; width: number; height: number }
  | { type: "TEXT_RESET" }
  | { type: "DETACH_IMAGE"; index: number; }
  | { type: "RESIZE_INPUT"; height: number; }
  | { type: "ATTACH_IMAGE"; imgContent: ChatMessageContentMap["img"] }
  | { type: "ATTACH_AUDIO"; audioContent: ChatMessageContentMap["audio"] }
  | { type: "LOADING_START" }
  | { type: "LOADING_END" }
  | { type: "TERMINATE" }
  ;

export const appMachine = setup({
  types: {
    context: {} as Context,
    events: {} as Events,
  },
  actions: {
    assignRoomId: assign({
      roomId: (_, params: { roomId: ChatRoomId }) => params.roomId
    }),
    assignRoomRef: assign({
      roomRef: (_, params: { roomRef: LitComponent }) => params.roomRef
    }),
    assignError: assign({
      error: (_, params: { error: unknown }) => {
        const { error } = params;
        if (typeof error === 'string') return error;
        if (error instanceof Error) return error.message;
        return 'Unknown error';
      },
    }),
    assignMode: assign({
      mode: (_, params: { mode: SupportChatMode }) => params.mode
    }),
    unshiftMessageQueue: assign({
      cachedMessageContents: ({ context }, params: { content: ChatMessageContent }) => ([
        params.content,
        ...context.cachedMessageContents,
      ])
    }),
    ejectMessageQueue: assign({
      cachedMessageContents: ({ context }, params: { index: number }) => ([
        ...context.cachedMessageContents.slice(0, params.index),
        ...context.cachedMessageContents.slice(params.index + 1)
      ])
    }),
    appendMessageQueue: assign({
      cachedMessageContents: ({ context }, params: { content: ChatMessageContent }) => ([
        ...context.cachedMessageContents,
        params.content
      ])
    }),
    resetMessageQueue: assign({
      cachedMessageContents: () => []
    }),
    assignAppCoor: assign({
      appCoor: (_, params: { width: number; height:number }) => ({ ...params })
    }),
    assignTextareaCoor: assign({
      textareaCoor: (_, params: { width: number; height: number }) => ({ ...params })
    }),
    assignInputCoor: assign({
      inputCoor: (_, params: { height: number }) => ({ ...params })
    }),
    assignMessages: assign({
      messages: ({ context }) => ChatController.getMessages(context.roomId!)
    }),
    sendMessage: ({ context }) => {
      const { roomId, cachedMessageContents } = context;

      ChatController.sendMessage(roomId!, {
        origin: "app",
        contents: cachedMessageContents
      });
    },
    removeChatRoom: ({ context }) => {
      const { roomId } = context;
      ChatController.removeRoom(roomId!);
    }
  },
  guards: {
    "is normal mode": ({ context }) => context.mode === "normal",
    "is text only mode": ({ context }) => context.mode === "text-only",
  }
}).createMachine({
  /** @xstate-layout N4IgpgJg5mDOIC5QGMAWBDALgYgCoFEAlAWQEkA5AQQIG0AGAXUVAAcB7WAS007YDtmIAB6IAtAEZxAJgB0ANgCcAdikBmJUoAcdBVN0AaEAE9ESuqpmqpmqXoUBWBdvEBfF4bRYZhMHwhgAJxlSPhYAVxwAGQB5SgARCgBxAH0AZVxKQlx6JiQQdi4efkERBAU5TRlyrT0rLXFHQxMEcSVVABZLcVV7TTl7JX6le3s3DwxMb19-IJDwyZ90CCNsVPxyOOTifFTUykT8HMEC7l4BPNLxcpklcvt+hXa6dq06KSbEcU1pS377cyUV3EijGIE8C2mgWCoQiUyWRhkuCMLDAxDY-mw1AyAGEABLJSgAVQS0SOeRORXOoFKbSUVTe7VU1SZjgUHxamgUChkVy5cm6UjocikDVB4Kmfihc1hi2WiORqPRYGwcXwOPxpGI+0OjGOHFOxQupmsMkFZi0CnE7X+jPZIv5liFA009na7WB1rFEwlM2h8zhcqRKLR-mCEAANsqCAANXDJCgABUJ2V15P1lJKiCkih59lUqnM1nMcjo5jt5m5w36dHEpe6jKkXq8PklsxhEPh8uDSq7nD4UDw+FjyXWBEIZNY6bOmYQ7osthLDlaDhd7XLvRkNjkTOGCh09yUTYhrb9MrAnaDitDQb7A5jccIOzVE-yU8N1M+UnsPKumk0L1Ubc6BsTRyyZG57nab53QUdR7iPH0pXbAMEUoMIIF4BNw3QIxAhDZVHzWONE2TF8KWnI0ECUdo5BkN1YLNQC5EUJR13EeQ92zOhBlLa1RncMFvRbX1pUmAAhcM2GQABrSBsBieIkhHDYyLfKlhEQf9OnzPR2l0L5hikVjjE+b5ZEAkYASBCpNAQ4SoUoTBMHQNAAFtfCiWIEnIFJ0kyFNcknQoKI-BBRFUP9TW+FRJFsa1BnZBonBuAsnlUL5bHsNQ7MhIJHOctyPOwIRYGczAwBkdAADNyoCAAKOgAEpsHFey8qclzUHcvhMFU4L3w0sKKlo-MdFrIUrB6YzmgaLRLHdc1ekGKwcpPfLOu6nASrKirqtqhrmta3KZHWwqepocRAtffr1NKUQWKitKrG6YZ1ES7d2JsK5+SmkUFFW31Tq6jyZGxSTYDk6IE3WAlcHVbZyACvUbpne6rk3EV2j0EU-sS6jaOAuhHC0ZinhGAGHI6s7JmiFE+ExOHKDxeMtQOPqDVusR0s6WwifdIVnmtIzEv0mRHBo+4bHsboIop9qCuBnqZFp3wGfVAliVIUlUyCjnUeeui9BdS0S1i6bTMFG5rL0zld348Zm2OoHNuVunsGxGI1lh+HR3ZjNKPutR5AGdQrQivpHkS7RaN6f8-xdTRDLlk6qcV8TJJkuSFO8lJ1jiP2QsG0QBm-PTGQqa1umkcR3r6U0HDkGiCxUb57cEx2T1SZAAjAVXs6UvysgLgaaTeXNhSFI3hRdRKBTo-kzL-J5+kbASjs77ve74FDVjzrYdj2NmdeuvXKIW+ROUXQVrQqc2Wl5MXFFdR4pBeGjXDXoTjq7nvfB31IACa5BsT712NqYenMEBqFooKL8thLTWCuAMRKgp2JWF5uYP8T9bKfw7r6H+W8d6UHIKkAA6kQUBh8dRXXIiPRAc46JmETs8Gstx0r2ESh0b82ZdD5j-JNHoycCF-1lAiBM6A+w8H7MVUqWBdo1UCAdFqX8N6-23qImQ4jJG3ggTOGWPJSzUWUE-W40hOGMnnlxEU0sXRvCEZvER545SUD4JwVyWBbwyJ2pVBR9UmrKLwVCYR6inGoVce4qRUBdGUQLDAhBsFAT7keBwkyLQaJ0kUONIybooJ6XsWomQkQ2BLE8f3Hyyl87H1oZAxJMgawOB0NRaW-IUEqFzO6PMjhrAMWTtiNgbAAjYEIqQAAWvgAkCYEzRNCvdTQFhE61i-NaaOGgUENCis6V+WUsbZl6f0oIPguAAC9PHbTkT4-aBZ-Hr19H0gZUxjk6KqWpVGzg6k8MFhoRQ25OFBxxtuGwlo9JE2TqJO5gzhljPjOQJMSM0wowDnoWiLcOhPFfjoOZcg1kjVdAKN4e5uI4IdseES7ZwUPM4Cc6RZzyoXMUbWQ6KjSXzHJYcylTyaEvIDjBU0DQ3RfAXpyWCvz5zSBUGNKCXIP7EpOiwFgqRnIBBwNiR81BxmEGiNEYg0yi7MUqEKl4yTBhyFWakwy9JahuhrAeVeAk+BKngHkcEyNT4zNrD8FhdZ-zZL0uyH6wcrj2kQW8Q8uCSWBBdf7GZ5ROieprN66ivrUkJLqU-Z4EcNCDFBe2SNhc7pfE3M4Bo2ZAKWhUO9QCP4Rj2hLDuUNMq2qng7MsXNdCoHckkE4f8bQgIgTxkHfkllnjSBFNK9u4a2z+g0ZefCraal0k7UvHtBY+2pK+A4MWrQTX-nYd8bNU7QldivBVUgEYwBzpnAWdiGgiZxV0DbZBa6nA8xNRUVoEU8z-TDYhSdZ4LwKnwr2fsF7KLY1TW0dQr6azvFSaO2Q-JcmukJa6fdf7AwAZ7GJFy0kQOhTzJ0PonIaL6XKD0EWcy6mtEGK6QF8DUPNtQuhTC2FcIBFnfC11g0INVA6duVKtRVAizmsCKVf4jLSyMvRlCMgsMyVw1x4CpoiyWhDWYGDM1vjsUkCMROTdq1fobcdUSMmM6yQgPJy4pYLCul6Ca9K3EJNRx+BZf4ocTYGfHT+lOCtNoWbECbOpTwvVY0TWyNdUFKhjXxi8AUFRk7OxBmDDgkA-NhTaJUL8cyrSNKy4Jtd+M6naGJn0RuILv2NoS0rFW6lqn62SioS0yhX4aDnCkmaBXCbFdJmVwza1U4uziJwWA6AABGkZzMcajUXQjgXSzxpC-RRKJcxZltsH0Gi-Qx03Mpj5kGEkpJmdS+FPMNxiwVjMF8LKtc4mQSAi3UU5Xv4OJq1y0K6gDHcT0oMBwpjX6JQZI-R4mLrGWnyYQ0RqWXQfaMd9gYCDZ4esUDRNQbQniMjB44zsp7Iype6ATVK7oFklkyolDbPIVNqGAiKRO9bPONuCdJrRPVbypezJUHJihdIDFLGFma+Z5nMWnooJkQoMchM7C4txHjgOTbzfQ+4VQmFNaXO6RupPmLk8WSu6nGgxeFOKRhGXusps0krYCPogIIpmCZGuNdqDTRcK-NIS0NhV69dufso7-5uRvEUJ877Py11ipuAnAEpYr57PuQqtgLAjsaG5F+Lh2goK3xrnb9KlgqxZXMN0R4qhI8HLgOyo3J8TdiAeHRe4L9dOulNXzkUVsjI1m4ulHoRK6dGbJZ72XbbRDpN5a6QngquR5ZmtIfVuK8xGUBI8do9HyXR9jz3yBfeayncGJjZZ-4sXp599HWs9w31unn-silVKoBHZ4byoyVxzBl1LG1z4Vg6DyDdNLNFr9X75+-ZQOVCr0BKpe7Aibi9DEyEpt5p7NDm6bgz74YOAjDbgIT4B+BHY9Dfh8qAj1CMg6C25QFr4NC34AhSr8huBuBAA */
  id: "chat",

  context: {
    roomId: null,
    roomRef: null,
    mode: "normal",
    appCoor: {
      width: 0,
      height: 0,
    },
    textareaCoor: {
      width: 0,
      height: 0
    },
    inputCoor: {
      height: 0
    },
    error: null,
    cachedMessageContents: [],
    messages: []
  },

  states: {
    Render: {
      states: {
        Input: {
          states: {
            Ready: {
              states: {
                TypeMode: {
                  on: {
                    ATTACH_AUDIO: {
                      target: "AudioPlayerMode",
                      reenter: true
                    },

                    DETACH_IMAGE: {
                      target: "TypeMode",

                      actions: {
                        type: "ejectMessageQueue",
                        params: ({ event }) => ({ index: event.index })
                      },

                      reenter: true
                    }
                  },

                  states: {
                    Idle: {
                      on: {
                        TEXT_INPUT: "Typing"
                      }
                    },

                    Typing: {
                      on: {
                        TEXT_ENTER: {
                          target: "Idle",

                          actions: [{
                            type: "appendMessageQueue",
                            params: ({ event }) => ({ content: event.textContent })
                          }, {
                            type: "assignTextareaCoor",
                            params: ({ event }) => ({ width: event.width, height: event.height })
                          }],

                          reenter: true
                        },

                        TEXT_RESET: "Idle"
                      }
                    },

                    Back: {
                      type: "history"
                    }
                  },

                  initial: "Idle"
                },

                AudioPlayerMode: {
                  on: {
                    RESET_INPUT: {
                      target: "TypeMode.Back",
                      reenter: true
                    }
                  }
                },

                Back: {
                  type: "history",
                  history: "deep"
                }
              },

              initial: "TypeMode",

              on: {
                SEND_MESSAGE: {
                  target: ".TypeMode",
                  reenter: true
                }
              }
            },

            Blocked: {
              on: {
                LOADING_END: "Ready.Back"
              }
            }
          },

          initial: "Ready",

          on: {
            LOADING_START: ".Blocked"
          }
        },

        Attachment: {
          states: {
            Closed: {
              on: {
                OPEN_ATTACHMENT: "Open"
              }
            },

            Open: {
              on: {
                ATTACH_IMAGE: {
                  target: "Open",

                  actions: {
                    type: "unshiftMessageQueue",
                    params: ({ event }) => ({ content: event.imgContent })
                  }
                },

                ATTACH_AUDIO: {
                  target: "Open",

                  actions: {
                    type: "appendMessageQueue",
                    params: ({ event }) => ({ content: event.audioContent })
                  }
                },

                CLOSE_ATTACHMENT: {
                  target: "Closed",
                  reenter: true
                }
              }
            },

            Disabled: {
              type: "final"
            },

            Blocked: {
              on: {
                LOADING_END: {
                  target: "Closed",
                  reenter: true
                }
              }
            }
          },

          initial: "Closed",

          after: {
            "0": [{
              target: ".Disabled",
              guard: "is text only mode"
            }, {
              target: ".Closed",
              guard: "is normal mode"
            }]
          },

          on: {
            LOADING_START: ".Blocked"
          }
        },

        Screen: {
          states: {
            Ready: {
              on: {
                SEND_MESSAGE: {
                  target: ".Animating",
                  actions: ["sendMessage", "assignMessages", "resetMessageQueue"]
                },

                SYNC_MESSAGE: {
                  target: ".Painting",
                  actions: ["assignMessages"]
                },

                ANSWER_MESSAGE: {
                  target: ".Animating",
                  actions: "assignMessages"
                }
              },

              states: {
                Idle: {},
                Painting: {
                  after: {
                    "0": "Idle"
                  }
                },
                Animating: {
                  after: {
                    "0": {
                      target: "Idle",
                      reenter: true
                    }
                  }
                }
              },

              initial: "Idle"
            },

            Loading: {
              on: {
                LOADING_END: {
                  target: "Ready",
                  reenter: true
                }
              }
            }
          },

          initial: "Ready",

          on: {
            LOADING_START: ".Loading"
          }
        },

        Coor: {
          states: {
            Stop: {},
            Resizing: {
              after: {
                "300": "Stop"
              }
            }
          },

          initial: "Stop",

          on: {
            RESIZE_APP: {
              target: ".Resizing",

              actions: {
                type: "assignAppCoor",
                params: ({ event }) => ({ ...event })
              }
            }
          }
        },

        InputCoor: {
          states: {
            Stop: {},
            Resizing: {
              after: {
                "10": {
                  target: "Stop",
                  reenter: true
                }
              }
            }
          },

          initial: "Stop",

          on: {
            RESIZE_INPUT: {
              target: ".Resizing",

              actions: {
                type: "assignInputCoor",
                params: ({ event }) => ({ height: event.height })
              }
            }
          }
        }
      },

      type: "parallel"
    },

    AppStart: {
      on: {
        CREATE_ROOM: {
          target: "Render",
          actions: [
            { type: "assignRoomId", params: ({ event }) => ({ ...event.info }) },
            { type: "assignRoomRef", params: ({ event }) => ({ ...event.info }) },
            { type: "assignMode", params: ({ event }) => ({ ...event.info }) },
          ]
        }
      }
    },

    End: {
      type: "final",
      entry: "removeChatRoom"
    }
  },

  initial: "AppStart",

  on: {
    TERMINATE: "#chat.End"
  }
});

export type ChatMachineActorRef = ActorRefFrom<typeof appMachine>;

export type ChatMachineSnapshot = SnapshotFrom<typeof appMachine>;