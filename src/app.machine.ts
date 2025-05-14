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
  | { type: "TEXT_ENTER"; textContent: ChatMessageContentMap["text"]; width: number; height: number }
  | { type: "RESIZE_INPUT"; height: number; }
  | { type: "ATTACH_IMAGE"; imgContent: ChatMessageContentMap["img"] }
  | { type: "ATTACH_AUDIO"; audioContent: ChatMessageContentMap["audio"] }
  | { type: "LOADING_START" }
  | { type: "LOADING_END" }
  | { type: "ANIMATE_END" }
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
  /** @xstate-layout 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-z6K6b4vx-iAkBDik8VN8LWGYtoK6CglVxh8LiLYOwjRgFVVIz2shbChh3J6F0J1PhdW0PTRE7iGjmtWJa1U6pNRsF1PqQ0hJ7WrnBIMasdRqwsgmE0AwkC2hih0ipPpBlxj1ADSqDY8ZLIpmjbhTosgrzdn6G7DQ3ZmyVhley-C7QdBmvJfdJ8CYkypkgKWvytb5Anh6gRCspE9UtmGO2CYXYewPONiNTAfadnF3RfSpoxzsW+gGUkpo2g5awhlLfe687sbjQ4L2gG0t4kcgsD2MYjhRhw3rJklRp15DNA5WoQ1HM53DWxrjDaHyZacgsBRT9-QuSjBOvRd9F0v3XRaL+vmo1kicFgOgAARjqC9ZMqU7PbBYL9a7GV6o-a2JoWtOTMjikhrG-MzY9ogEu4GB0uocp6uofJIpvbaT9vpDQesg7ILvjINBgHAYywREMei7pc7SB0EzSBxEAzgxRj2es20kEiN0RwlVl7kWbV0vIbl7IrwOAaE2FRV5NzVmhpybsjRbrtoxmJmQGCsHfmY6YUYXUenJJaLTH0Vm6E6R7IUgizCXR5uc+XPRnDuHIC81UHQZ4tB6wIkPV2vpy3Gc+BKCzugJ7afvnFtUtjAJJcurUYByMEE+uUcfHLig4o9QbI4OEDyUJJdlj8bpHJxhAjhgMnOpEdJjGSSm0iHWYsxmafMtgLBuvKVZJBke-xPh62PHUWoUNdzKShf0TrpSWmVKgN1xQrJto1hZBoIyhTqLaCGOKFo1gO67mmDNpC2Iuv6bwyxxQRESJkTqGoBrYJ2i0XPA2UY4piLTNmfM9AiylvqCIk0MYVhCt-CBQgd7tQugNjqM98UH3b74D8N19J8twTpIxV+joAoeo5JFHiz4V5mSk+Ex25Cx35uLd+wKsQdDZAcuWyyX1sUsmEQ6E4f4WgEHqHzc0tCrTPMC7VeuBo8g9bcuZHDLSD3hTtnduYLQ5m3BuCAA */
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

                    TEXT_ENTER: {
                      target: "TypeMode",

                      actions: [{
                        type: "appendMessageQueue",
                        params: ({ event }) => ({ content: event.textContent })
                      }, {
                        type: "assignTextareaCoor",
                        params: ({ event }) => ({ width: event.width, height: event.height })
                      }]
                    }
                  }
                },

                AudioPlayerMode: {
                  on: {
                    RESET_INPUT: {
                      target: "TypeMode",
                      reenter: true
                    }
                  }
                },

                Back: {
                  type: "history"
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
                  target: "Closed",

                  actions: {
                    type: "appendMessageQueue",
                    params: ({ event }) => ({ content: event.imgContent })
                  },

                  reenter: true
                },

                ATTACH_AUDIO: {
                  target: "Closed",

                  actions: {
                    type: "appendMessageQueue",
                    params: ({ event }) => ({ content: event.audioContent })
                  },

                  reenter: true
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
                  target: "Animate",
                  actions: ["sendMessage", "assignMessages", "resetMessageQueue"],
                  reenter: true
                },

                SYNC_MESSAGE: {
                  target: "Sync",
                  actions: ["assignMessages"],
                  reenter: true
                },

                ANSWER_MESSAGE: {
                  target: "Animate",
                  actions: "assignMessages"
                }
              }
            },

            Loading: {
              on: {
                LOADING_END: {
                  target: "Ready",
                  reenter: true
                }
              }
            },

            Sync: {
              after: {
                "0": "Ready"
              }
            },

            Animate: {
              after: {
                "0": "Ready"
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
                "150": {
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