import { assign, setup, type ActorRefFrom, type SnapshotFrom } from "xstate";
import LitComponent from "@/config/component";
import type { ChatMessage, ChatMessageContent, ChatMessageContentMap } from "@/models/chat-room";
import type { ChatRoomId } from "@/lib/data-structure";
import type { SupportChatMode } from "@/controller/chat-room";
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

  const excludeAttachments = roomRef.getAttr<AppAttributeKey>("exclude-attachments");
  if (excludeAttachments && mode === "text-only") {
    throw new AppError("CHAT_ROOM_ATTRIBUTE_ERROR", "excluding attahcments only works at 'normal' mode");
  }

  console.info(logPrefix(`Initializing chat room (id: "${roomId}", mode "${mode}")`));

  // create chat room via controller
  ChatRoomController.createRoom(roomId, roomRef);

  return {
    roomId: roomId as ChatRoomId,
    roomRef,
    mode,
    excludeAttachments
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
  | { type: "DETACH_AUDIO" }
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
  /** @xstate-layout N4IgpgJg5mDOIC5QGMAWBDALgYgCoFEAlAWQEkA5AQQIG0AGAXUVAAcB7WAS007YDtmIAB6IAtAEZxAJgB0ANgCcAdikBmJUoAcdBVN0AaEAE9ESuqpmqpmqXoUBWBdvEBfF4bRYZhMHwhgAJxlSPhYAVxwAGQB5SgARCgBxAH0AZVxKQlx6JiQQdi4efkERBAVzGSVxOQAWGrlzOql7cUMTBHFtWTlNBRqlexqFVTlR13cQT0xvX38gkPDpn3QII2xU-HI45OJ8VNTKRPwcwQLuXgE80qlxe0q6JRrpTU16pzopNsRxBTklGQc4hUkh+ozo9jcHgwS1mgWCoQiMxWRhkuCMLDAxDY-mw1AyAGEABLJSgAVQS0ROeTORUuoFKwJkkjoH2kIysNXsXwQUnM-2amlUCmUalUqnBkMm0JmfjhC0Ry1WqPRmOxYGwcXwBOJpGIh2OjFOHHOxSupkkMie9Qa-R6im5tmFljk9jo1T6PSUqk0kqmMrm8MWSKVaIxWP8wQgABt1QQABq4ZIUAAKpOyhupxtpJUQzVkIzoLxqrykKmtDqB-004iGQpqdHr9ikNV90p8svmCJhyOVYbVvc4fCgeHwCeSmwIhCprCzFxzCCFcktYr+fyeDgrvxkRcFjmGozkra87YD8u7IZV4bAA6HI7HhD2Wun+Vnpvp30LllL1r0mj+egrDRtxrBQfhsXlNAhCY-RPOUu2DFFKDCCBeGTKN0CMQIr1xZNk02bYyQpZ8aTnM0EBeOh5A0TlJE0FRek+Yxc1sf4PQ0Oim1eQUjxhDtAwVMAeyQlC2DQjCsLVdZ8J2PYDiOYjXzpYREF6JdJCGNQ6kgl5VEAqsQLrBtwWbHj-TgoMACEozYZAAGtIGwGJ4iScctgUwpSPfBAvVkXRbRsatrDkRj2k6JQFBkewRh6F5IOiqRTNgoJKEwTB0DQABbXwoliBJyBSdJMnTXIZw8t9lIQUR6xqJl7CqRQ6kccKQtzN0LGUUDxG9bRehbaC21hZLUvS1Asr4HAhFgNLMGvdAADMZoCAAKOgAEpsBgwaZBStLMuy9yTSU0pRDMWReTkVR7EFP8Bi9bkfmGSLyieALgq9JREq2naRrGiapqwWaFsCFb1s2vjvr28aaHEEqXzKo6xCqCxbj6asopUAZdKYnkG3+B46H-cEroaKCoWPL7hsh6Z8Ws2AHOiPDyBJXBtV2chiqNeH51EC67kUT1MbqyQ5ArORxC-YZC3sF1cc+8HKdG7KZGiDE+FxFnKCJJM9XkjNSsO7nVB+GQPibZ6a1GeoHVUTlLHEBsUfrTp1DlgMIcV8bldV9XtRJclSEpPW4YNsjRHFGqblLat2VLBwsfaWwoqZHQtF0DQroJ124Xd36vd8bB8RiDZmdZicDuzUOLoiqLrB+JRgqFVpsdsG5t3UB77DqoUbazobdo96YrJs+yIEc3KXPw8vPIq0RHHFkYnGqajBXUCs3UiupLrMcFdDFXuZFSZAAjAfOnLygqMiyKfyoZD5auCgnf2CyD7q62R6k6Z5XgJpt98P4-fAISklsGS+x9TXwRggJ4-wei-B0LyTknpX5Omlg4IYNRmyPDFn-I+J8+BANSAATXIPiUBckDSwxIjfXMIwZC8jzHoZ4Pw6r3V5PPFuLJuqKCujggB+DFRrEoOQVIAB1IgZDwFByoZAp4Fh+iFjME7cKRsuTYy6rbKQihRQ6VFKTKU5M+L-zwQhGQyZ0CDh4LeSa01AaLRBhtAahjcGAIEaY8x41BxQAgfOLqyMWSPGUNw8K0h7o2zkcFBoNwWiQQ+Lw4xrjKB8E4BlLAnjsDWIBjIeadi1oOIMQGIxLjBJKkSck1JQ5vFkXFEuRheh246EcJye69QYGgRZN+LSQw4mAMiGwFYaSz4TzclIxS84qiUTdA4FONExasJULVJ4UVHDWGGAlfq+S4T4jYGwAI2AHypFIAALXwCSXClSvI8zMJULqddHjSw0C1DoVg7haFeDbN0boahWH3lsnZMwuAAC80kZJmlkoGy1XS5LBgGX5QQfCAs8ecmeWgqyKELOUaoTwLrNLFNcs2PRORNh6PvM8sK9l7COSclMaYkXHT+OLECtxCXFleE3UKMt7jChUOocw0g1lk14qeLssL-mcCBVY-6oLsnA3tqDRxQrFgivhWKxFIyuah2UfIEYeYhSaNuvdW6kUejS2kNLXkIxTKUBYCwVIaUAg4HxA+agJzCDRGiMQWlYhRiaG3MKfofQ6qjA0NyAYvkPjDDqG6e5-L9GCvMgJISyFULoUwgEbCmpfaEQDp6hAYs1KugwY8esYotAVkFNuFkXyhQFsUG4CYfA1TwDyFMTmIcLn21LACJlrpqgRJdNyMWFgXSgiLSs24vdW0VwuR1Ltgwe2jE0f27Gww8YNWsC0NQEESVdkndPY6l0qLNBLW1UsbLvhVDuJ0NBzRpa1HHesuNnYgwCN3dQjo+ZvwLqcP+co8dvh0QimwjQDYMXFhjdC+N54UShlVP4V9kCGhfiwcFb9KgFAOnMBYOqjSiwqE7gobdz7inQcvP2Ug0YwDwfnNYGqyhqxGUGH+KwFZbBfjFmwp4zZuIPrMk+hNF4+wRlDJ4qjZFSx3G-KBXegp661AdM0SifwrDXXttLVQhH+MkcE9eCy6VbKia8tEk29dOLFi+dYR5kdxYPAft1NT4H5WQZMcJZN4k01qgMxVKo-xGVaQPHVTQFZqh0OsFvNQHxbAaagzIXTdlPMMltmLD5wUvkgXQ2o34S4zBAkaKe+iUWYvWTspAeLpgrpaoCxiroq81FdHkL1AYtYDx9QFbx7aCtfqlcqsMcWoE51ugXaMVRoVf2WEbCyCJFmHMbL7j9JWNMOAlczOqi5jWmQlpSzcS6AFm7VHYZLSCMtrT7xzkrFWvgutVRrPIBstRO5VE0XoYbuY9sS3FIdmth4eNJXa-3XOcROCwHQAAIxjBAS7OlZ2cgG3257HRhSUW-lWtT1SfTfYpn9pWQ9ivg+W22meC9IrhWMnUswPQ17i0GF8uqLJll73R04vhXX1DJweEMeuDhgnNnuh8GqqC6h13qCvbp-DiNdcgqzgJHO6qgUeSCWQBMA2DB5ZyD6DOCnONFz2cjMYutdSXOYBsL16oRbhxbNSbTws2DCmr1rP3Cla6VGYixIm8dToqpon1dQ3h6FVyydLoUxQWD-Auv8wxyhfbt1tB3zmkkpMsVALriCARmF6GhloWKajNNGEyS372bh0Vt7GtrMfen9KHF1r0WXOj0u9GYOsrD16aSbBu0C4EfnbICBDg9Yf0UDaxX+993o6EvB7Q8I2NeO9-NtWwFgl3ZMmwcBdTDKHRihKeNuLQ4pLq9EkHoiDQQlVwBVRXt3e6vX1DocKPf1QokqBxWdW423l+HZa8Xn7pLO8Q43xdYKTZdV-AsJqJqZ0L2zmB9BijWD1xRYioz5z5n5vonT1xMg0ZGyBJ-ANj3RKbLh3Y6CFi0Ro5R58Sf5-LKriqJ4IGQI8xfJarbZL51QCgGqdwmycLK4XT0SEHF5Wo2p2qYAQ7BbaRNQPC7jVghqdCb7MI2wOCdwXSmT4B+CXaXSXqDDebVhfI6BZ7YzZa1Q-CcLhSgTYJ1pAA */
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
                    APPEND_AUDIO: {
                      target: "AudioPlayerMode",
                      actions: {
                        type: "appendMessageQueue",
                        params: ({ event }) => ({ content: event.audioContent })
                      }
                    },

                    SEND_MESSAGE: "AudioPlayerMode",
                    DETACH_AUDIO: "TypeMode.Back"
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