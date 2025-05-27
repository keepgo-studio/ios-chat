import { assign, setup, type ActorRefFrom, type SnapshotFrom } from "xstate";
import LitComponent from "@/config/component";
import type { ChatMessage, ChatMessageContent, ChatMessageContentMap } from "@/models/chat-room";
import type { ChatRoomId } from "@/lib/data-structure";
import type SupportChatMode from "@/controller/chat-room";
import ChatRoomController from "@/controller/chat-room";
import { AppError } from "@/config/error";
import { logPrefix } from "@/config/console";
import type { AppAttributeKey } from "@/App";

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
  ChatRoomController.createRoom(roomId, roomRef);

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
  };
  inputAudio: {
    data?: ChatMessageContentMap["audio"],
  };
  error: string | null;
  cachedMessageContents: ChatMessageContent[];
  messages: ChatMessage[];
}

type Events =
  | { type: "CREATE_ROOM"; info: ReturnType<typeof checkAppValid> }
  | { type: "RESIZE_APP"; width: number; height: number }
  | { type: "OPEN_ATTACHMENT" }
  | { type: "CLOSE_ATTACHMENT" }
  | { type: "SEND_MESSAGE" }
  | { type: "ANSWER_MESSAGE" }
  | { type: "SYNC_MESSAGE" }
  | { type: "TEXT_INPUT" }
  | { type: "TEXT_ENTER"; textContent: ChatMessageContentMap["text"]; width: number; height: number }
  | { type: "TEXT_RESET" }
  | { type: "DETACH_IMAGE"; index: number; }
  | { type: "RESIZE_INPUT"; height: number; }
  | { type: "ATTACH_IMAGE"; imgContent: ChatMessageContentMap["img"] }
  | { type: "ATTACH_AUDIO"; audioContent?: ChatMessageContentMap["audio"] }
  | { type: "APPEND_AUDIO"; audioContent: ChatMessageContentMap["audio"] }
  | { type: "DETACH_AUDIO"; }
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
    assignInputAudio: assign({
      inputAudio: (_, params: { audioContent?: ChatMessageContentMap["audio"] }) => ({
        data: params.audioContent
      })
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
      messages: ({ context }) => ChatRoomController.getMessages(context.roomId!)
    }),
    sendMessage: ({ context }) => {
      const { roomId, cachedMessageContents } = context;

      ChatRoomController.sendMessage(roomId!, {
        origin: "app",
        contents: cachedMessageContents
      });
    },
    removeChatRoom: ({ context }) => {
      const { roomId } = context;
      ChatRoomController.removeRoom(roomId!);
    }
  },
  guards: {
    "is normal mode": ({ context }) => context.mode === "normal",
    "is text only mode": ({ context }) => context.mode === "text-only",
  }
}).createMachine({
  /** @xstate-layout N4IgpgJg5mDOIC5QGMAWBDALgYgCoFEAlAWQEkA5AQQIG0AGAXUVAAcB7WAS007YDtmIAB6IAtAEZxAJgB0ANgCcAdikBmJUoAcdBVN0AaEAE9ESuqpmqpmqXoUBWBdvEBfF4bRYZhMHwhgAJxlSPhYAVxwAGQB5SgARCgBxAH0AZVxKQlx6JiQQdi4efkERBAVzGSVxOQAWGrlzOql7cUMTBHFtWTlNBRqlexqFVTlR13cQT0xvX38gkPDpn3QII2xU-HI45OJ8VNTKRPwcwQLuXgE80qlxe0q6JRrpTU16pzopNsRxBTklGQc4hUkh+ozo9jcHgwS1mgWCoQiMxWRhkuCMLDAxDY-mw1AyAGEABLJSgAVQS0ROeTORUuoFKwJkkjoH2kIysNXsXwQUnM-2amlUCmUalUqnBkMm0JmfjhC0Ry1WqPRmOxYGwcXwBOJpGIh2OjFOHHOxSupkkMie9Qa-R6im5tmFljk9jo1T6PSUqk0kqmMrm8MWSKVaIxWP8wQgABt1QQABq4ZIUAAKpOyhupxtpJUQzVkIzoLxqrykKmtDqB-004iGQpqdHr9ikNV90p8svmCJhyOVYbVvc4fCgeHwCeSmwIhCprCzFxzCCFcktYr+fyeDgrvxkRcFjmGozkra87YD8u7IZV4bAA6HI7HhD2Wun+Vnpvp30LllL1r0mj+egrDRtxrBQfhsXlNAhCY-RPOUu2DFFKDCCBeGTKN0CMQIrw1LVKCJElyVISkMxnQo5zNBAek0SwqkGOoHnsexRgrF4ARaPobG9TlCyPGEO0DREACEozYZAAGtIGwGJ4iScctmfGlyPfBAvVkXRbRsatrDkT5jG+TQlAUGR7BGKiXhM0YpF4-04UoTBMHQNAAFtfCiWIEnIFJ0kydNclIk06WEMR6xqJl7CqRQ6kcQzdPaXlxAsZRQISl5Cz6azYKCOyHOc1zsCEWAHMwa90AAM2KgIAAo6AASmwGDYSy+zHNQFy+EwBTX0C0pRDMWReTkVR7EFP8Bi9bkfmGYzyieTSdK9JQMsamRspatqcAKoqSvKwJqrqhr+NW3L2pocQ-JfMi3yChBeoSsKONudRSxMh0G3+B46H-cFhoaKCoWPZajta1yZHxETYEk6Jk02ElcG1XZyF8o1Lu6sRBruRRPQGIaqmqCs5HEL9hkLJjXX6JbDua47pmiDE+FxOG8J1PUjk6lH51EVQfhkD4mxmmtRnqB1VE5SxxAbW4+jdQVFugttAap4H2pkWnfAZ7UCIpNmAo58VQpuUtq3ZUsHFUB1mgscXlF6UsBm0Q85YBymcqVmm6ewfEYg2WH4YnbXswo0RBqMkzrB+JQdKFVo9J5WxCZlybGK9YYW0dviAyB9aZGE0SJIgKT3NkzY4n9pTrtERxCZGJxqg0YsxSUCs3WMuocZZRxRQpgNUmQAIwDV6SPK8jIslLq6GQ+MKdM+38dMgiaEtkepOmeV5PqbLu4R7vvfAQ9Zi52PYDlZkiLp1iinn+Hpfh0XlOU9BenSYhwhhqZtHgJzegm3-u+D31IACa5B8SH32PqMeqMeQjBkLyPMehng-HChNeKX5bAsm9H+BwPo042W-r3X+e9KDkFSAAdSIKA4+BpzqKXHogJ4Fh+iFjMPWIEwxbgTRFncKQihRQvCsGKP6Uonbd3wbvRUKJkzoEHDwW8m0sDbQqnteq8t+I-zEWAHskjpGDigBA+cCVLYskeMoRQ4VQKxW+CLBhOkGg3BaJBD4X8ZBqL-uIlafBOBOSwDo-KhV5EyDKoo2qyjhFb1Ea4jRSpKAeK8TI3Rp8aGQPFEueBeh1BW0cJyCa9Qr6gRZN+OorwFBOJcTISIbAVg+MHkXeSCSurziqHQHmiCdCPBaATZBKgwpPBMh3XoVgnH4jYGwAI2AHypFIAALXwCSZMyY9GBz+E0qoXNlBtL+CoDhzRKhFhFm6N0NQBk4MyqDYZQQfBcAAF4+LkcVAJO0qqumCQdAMQyRkzCuTohZyleoGW3IoNKbpajVDNjHGsYpKi3D0D0TkTYehOLPG80Z4ypkzJTGmb55c-iExArcWFxZXjR3aNUV09xhQqHUOYaQVljnLURWcj5nBrmyL8XcwJu1xb7RUaeLsSLGXMvidQ+pgdDIWEGjpJsQpuFjQmmNYyPQmLSCYryEY1lKAsBYKkByAQcD4gfNQGZhBojRGIJinqoxqK9D6IZTkEcNncgGGpD4KcWFMRUAi+CbikIoTYGhDCWE1S4jmQfMkWs6nswoqleQdcWidBUDbfGKTmj1GGtYQs4wJh8DVPAPIUxkbnx+eLUsAI8WumqDYl03ICZivYk2bQrpim0o7PmgOPykolsGGWyyowuQx2GO9TGBkbhujFDS-66c4KLBbWXHqQ1o0W0pYvKosrbhMl6MvLmOlbDYPHbggS552j+VbddaQX4P46ScP+cooLiUGSMvFa+zYRQOA9UGNxoZVT+GnbQyiTSrDntnioBQr0IXhXmpe5hstd0nLPAhXsn7rykGjGAb9kDrChWtuLRsxZBoWJ5NSr8BN4pPGbIKV9CpIkog-VeG8UBUPzmejA4xPw1Ay0FubUlfwrAjXFkxVQ5GD3wZo4JRyYl6MUXsTzCOdbiyHOsHhg2hMHjTwwXxsdQiJ2djfZRlayFULoUwgEK84nlJVH+LiwpB5wqaArNUGB1gcZqA+LYATcGRPiRM9dNp8hxbix0ockCwGwW-CXGYIEjRSxAmsK5nO4lICeYZMNeQONejSw+OoCaXR5DroGLWA8qdoMKxdutBLYg2Edu4uW7hlbgsVD2UNQUQoWQJScZnEGYMODxczBGn5uWmQN38zcIaAEY43AJkTcUkEXQNlGK1xWWdVaBUSRzK08gZuwqqNwvQva4rVCrmkkm03rRzeKyDOInBYDoAAEYxggKVm6fCKtdorTt74womlr0OUNQaySd0ab3W15WsW873c5ooYyhlwSOkpT0JuhM6Jt3BLoMUJTwn3fUEyIxQwI4OEMtIGoE0PihWfmF70Y0XSo53hE5E93IKY4eNj0xeO8MglkJ9X4ybPp7f402kRVO4NIZjPdhKS5zANlmhFZzr2OjWiZHkpzNg41Qf+yc0pbitHtR0fd7h1E6hvD0LalkQXiVigsH+SymCmsO0K6o8JcHomeO8UOe798ARmF6EBloTxajZNGHLotk2bgGWVy8sJ-PymVOd91gtXnoFVFGilMwdZkHNzUJyZo0hQLgUGWc0Hu5-nlFS9Ub3N7visZgeZHQwpbjDQKyr5afKtVsBYKDu1PMHCDXMCMaFcgOFPG3FocUDXkqCND0EPlFymVa+j8e819QYHV9uNUOxmywVyZgY9OFk2mJ17H-upFef+-irzFKv4SCwV8ZgToD3AsWTwt55OiIjfMDN9bxHJk6HVl2uYRNLjy5agNrpqdB-Z770rvKT4Cqg61BioCLbYugqDDSyqMQ8zoKDDsjxogHSjqqaraqYB552aQSQTKAPC7jVgOqdAD6IIiwOCMSDTWT4B+Cg5DR3B4pmbViHI6AE4xxhZhQ-DoKGSgSfxuAuBAA */
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
    inputAudio: {},
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
                    DETACH_AUDIO: {
                      target: "TypeMode.Back",
                      reenter: true
                    },

                    APPEND_AUDIO: {
                      target: "AudioPlayerMode",
                      actions: {
                        type: "appendMessageQueue",
                        params: ({ event }) => ({ content: event.audioContent })
                      }
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
                    type: "assignInputAudio",
                    params: ({ event }) => ({ ...event })
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
                "500": "Stop"
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