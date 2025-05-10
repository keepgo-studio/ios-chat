import { assign, fromPromise, setup, type ActorRefFrom, type SnapshotFrom } from "xstate";
import { AppError } from "./config/error";
import LitComponent from "./config/core";
import { logInfo, logWarn } from "./config/console";
import type { ChatMessage, ChatMessageContent, ChatMessageContentMap } from "./models/chat-room";
import type { ChatRoomId } from "./lib/data";
import ChatController from "./controller/chat";

export type ChatMode = "text-only" | "normal";

interface Context {
  roomId: ChatRoomId | null;
  roomRef: LitComponent | null;
  mode: ChatMode;
  appCoor: {
    width: number;
    height: number;
  };
  error: string | null;
  cachedMessageContents: ChatMessageContent[];
}

type Events =
  | { type: "INIT"; elemRef: LitComponent }
  | { type: "RESIZE"; width: number; height: number }
  | { type: "OPEN_ATTACHMENT" }
  | { type: "CLOSE_ATTACHMENT" }
  | { type: "RESET_INPUT" }
  | { type: "SEND_MESSAGE" }
  | { type: "ANSWER_MESSAGE" }
  | { type: "TEXT_ENTER"; textContent: ChatMessageContentMap["text"] }
  | { type: "ATTACH_IMAGE"; imgContent: ChatMessageContentMap["img"] }
  | { type: "ATTACH_AUDIO"; audioContent: ChatMessageContentMap["audio"] }
  | { type: "LOADING_START" }
  | { type: "LOADING_END" }
  | { type: "ANIMATE_END" }
  | { type: "TERMINATE" }
  ;

export const chatMachine = setup({
  types: {
    context: {} as Context,
    events: {} as Events,
  },
  actors: {
    initActor: fromPromise<{ 
      roomId: ChatRoomId;
      roomRef: LitComponent;
      mode: ChatMode;
    }, {
      elemRef?: LitComponent; 
    }>(async ({ input }) => {
      const { elemRef } = input;

      if (!elemRef) {
        throw new Error("elemRef is null");
      }
    
      // check room-id attribute
      const roomId = elemRef.getAttribute("room-id");
    
      if (!roomId) {
        throw new AppError("CHAT_ROOM_ID_REQUIRED", "room-id is required");
      }

      // check mode attribute
      const rawMode = elemRef.getAttribute("mode");

      if (rawMode !== null && rawMode !== "normal" && rawMode !== "text-only") {
        logWarn(`Invalid mode "${rawMode}". — fallback to "normal"`);
      }

      const mode: ChatMode = rawMode === "text-only" ? "text-only" : "normal";

      logInfo(`Initializing chat room (id: "${roomId}", mode "${mode}")`);

      return {
        roomId: roomId as ChatRoomId,
        roomRef: elemRef,
        mode
      };
    })
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
      mode: (_, params: { mode: ChatMode }) => params.mode
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
    connectToController: ({ context }) => {
      const { roomId, roomRef } = context;
      ChatController.createRoom(roomId!, roomRef!);
    },
    disconnectFromController: ({ context }) => {
      const { roomId } = context;
      ChatController.removeRoom(roomId!);
    },
    sendMessage: ({ context }) => {
      const { roomId, cachedMessageContents } = context;
      ChatController.sendMessage(roomId!, {
        origin: "app",
        contents: cachedMessageContents
      });
    },
    "app:syncMessages": (_, __: { modelMessages: ChatMessage[] }) => {}
  },
  guards: {
    "is normal mode": ({ context }) => context.mode === "normal",
    "is text only mode": ({ context }) => context.mode === "text-only",
  }
}).createMachine({
  /** @xstate-layout N4IgpgJg5mDOIC5QGMAWBDALgYgCoFEAlAWQEkA5AQQIG0AGAXUVAAcB7WAS007YDtmIAB6IAzACZxAOgAs4uXQl15dAJwB2ADQgAnogCsq1VIAc69apkaAjCZPjr6gL5PtaLFIDCAJzBZOfFDYEPxgUgEAbmwA1mEB3PRMSCDsXDz8giIIALTi6nRS1tb6JjKl1g4AbDIy2noIlZWihdbVJtaioqqVdJXWLm4YmF6+-oHYYN7ebN5SLAA2WABmMwC24XwJjIKp3LwCyVnZHVI9jeq2MqLtxXT6dQZ9p3QVMupXMpXy+gMg7sOEMB8CCTLxsGbYQj4ADKpAAWvhEjsOHsModELlrlJxPpqvp9KI1CV1KIHghrC9pJZCWZLCZCaIfq4-kMpIDgaDSHwWABXHAAGQA8pQACIUADiAH1obhKIRcEjkrt0gdQFl1A4pKoSqpRJUTGoNbqycUCVJruZ1PpxHQri9RL9-mygSDZlzecNcGAhJh0KNsND8OQRZLiDDoZRxYjtkqUSrMohJOpsZJlDIOopGfqTU1jOJ7N11Pr6Y1xI7WezXVJ3XypF6fX6-HWdCwwMQ2CDsNRZZ4ABKSygAVTFgsVrDj+wTCFx2JM1q6eqa1lUeVqukQtmKUnedF6N0chnLHkrnO5tfrvtGzdb7c7BAAGrhJUGCIQxykJ2i1YgZMpzcSZBKExKhXd4tHXcki2MOwrCg-FlFEGQjwBF1Tw9OtvUvJtKB5CBeAABUWHRJlvMBIRhfAnwofDBwVGNxzSSd0QQcRRGTQDqjTYoin1UkIM3fRt1-PcigPVRkOdDk3TPYYACF5jYZBYggbAhVFCVn2Dd9lSY79pxJLVEKtT51Hsd4cy6WcGVxNRGWUCST1mShMF9NBViBAVhTFcgpRlOU6KSBjUVVYQMXzaDunkQDFHkDoTQ1ZN9EAkoQO6CR+mZJ1HKkZzXNQdy+BwIRYF9TAwnQJYyu8AAKOgAEpsCy1CnJc9A3I87TPxCo4QIKbUXk3VRWiacD6gqRxsTKXcKnaXUkMyitmpy1r2sK7BitK8rKsmWqGqaqTlrygrMBoaxAo-Riv1CnJ8msLUYvTRCHHaUaNzyAoNXseD9GKG0TAcpbcra-KPK8BTYEgbBBXwoMB1wHtezDcgAuRS7uoxL4ZFkX8RsQ3pbBNa4sdUYCTCGmz8neAGDqB1bhkFVs+C7eHKD7SVSGISNo3OnSrqOCxiaaKxLEkG0ahzVpTn0RQCUsVohodBbj0BlaQcKqQGaBZmEYHYdSFHeiLuCqdsgFrUhYuaoV1se5+J+wS2I0Ocag0VjqarWm1fpxnsE8IVAzhhGkZR2M0ZNg0CltSw9xqfUShNQDk1sItKgJJLGUPJWUJp1XjqkeTFOU1SvI0oMRU6sPmNNjVsWtWWJC+XFbbGhKpCS-FgKMJoHHd0FoWQXwtbU7zfNleUK+N5jMcKelCU+N4LGAk1lGTXcEvEXUixg3vZn7we+GddAIB0AMy9DcMuYn+NmKKAo8kilOrVT7N+LuZM9SfxQXiNSod6kPewBAkPsfLs5BoQAHUiDn2hBGKMV9dLXQpJUKQvQ6BmF+vYYWlQTQODuuUcQXwSRpXzH-ABQDKCbFWGMIIlByAc2oPgTS5dDa83RggButdG6Eg6ElL4OCSimB6IBIw856TOCzpJKsZCD4FyUpDYepctIsK6lOMod0fpoK-vmOgGprDL26KYUQRQNRGNEeIwYHhKAsBYNCS8OAKCkBDkFa+elsi-mkGg74EhPhpyXhBEo0gzIljsCSaoLhmR8A7HAQQ-xUaT1cRSSWqcVxqBsI4DeZI3h4LyBYW0wEizWHmhY4YPg-A8ECHElx11chNDbiuX8gFWKASuGSfExgJCmWEvIBkitimSMmJUhBRxugmClikowFx0mqDJHODxOikztBtF0P+NZMCDL5hiSyFw3hnE6PqeZ2D+KfGaDFIwup3rphWTJDCDZRjrLYaM-M85dSNCMaBNcY14JtwkNHbo+htlXPQheRs6BrxtiifcqcBDmhJXJvmeQTyTDxWXHUu4JNoqWEBeeTCIKcq4QIkREiELQ7xOupIYmZQUqEhAjUCQJo7CCUsJYXEt9CH-QkdlVZNysKgtkm1aIkLmJXGaCZSoT9igrnpBZUZpzVB3Bim0rFckFJyIgIKvSBStQ1Dyb0R6FgLJ5npDLHouppZlg5SrI6Hl1XVJSWMm0EzjEZP4hUZBEzCzKEKTic1fTsqezzp4cGkAbX8zkKYcw1pRaN2NPxImWpSbkx6JTDKvrLXAzzprEKrCTa-maIhUodw2J9BAnxMacaSb6kTTonRKaWTKxzla9WIpOCwHQAAI3mMGklVSjhmGkMkh1aSjQ4MKbIEmLxU46jFb0ut2cPa51BrI5SIaMTpkCRYVOjIix3BKKWjcrd24pS7ulUhA9AFZpUcxARqD0HWkwV3MkupjDSw1E06aPjT372AfUZxQyxACPaGoK4lxzBFH0cg+kTrTGsXpJ+89OVKHUJXeSK4QkSwWAIWcZQhNLKPW4bCkomdU0HWkfnFVy7u1-oaAIgpNQprAR6Ho1+BjIPpOg9cGdTorEsAAIo8m4Mh1iyCcStHzK0ec+qIKpWxOva0Zy2JFNnVIfAUwZjIYqDPFQeRcxk3TM3RAVpBLVCsPYRjOISYSW47Yv0azKMbJyF8tObTCmx0OfUAJpg8jBLMHqRT+0qyeHBN4ZD2RCTQV6PiMVBCyZJkfRcFBct80-T1BlFwQA */
  id: "chat",

  context: {
    roomId: null,
    roomRef: null,
    mode: "normal",
    appCoor: {
      width: 0,
      height: 0,
    },
    error: null,
    cachedMessageContents: []
  },

  states: {
    Creating: {
      invoke: {
        src: "initActor",
        id: "init",
        input: ({ event }) => ({ 
          elemRef: event.type === "INIT" ? event.elemRef : undefined
        }),
        onDone: {
          target: "Render",
          actions: [{
            type: "assignRoomId",
            params: ({ event }) => ({ ...event.output })
          }, {
            type: "assignMode",
            params: ({ event }) => ({ ...event.output })
          }, {
            type: "assignRoomRef",
            params: ({ event }) => ({ ...event.output })
          }, "connectToController"]
        },
        onError: {
          target: "Error",
          actions: {
            type: "assignError",
            params: ({ event }) => ({ error: event.error })
          }
        }
      },
    },

    Render: {
      states: {
        Input: {
          states: {
            Textarea: {
              states: {
                TypeMode: {
                  on: {
                    ATTACH_AUDIO: {
                      target: "AudioPlayerMode",
                      reenter: true
                    },

                    TEXT_ENTER: {
                      target: "TypeMode",
                      actions: {
                        type: "appendMessageQueue",
                        params: ({ event }) => ({ content: event.textContent })
                      }
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
                LOADING_END: "Textarea.Back"
              }
            }
          },

          initial: "Textarea",

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
                  target: "Animating",
                  actions: ["sendMessage", "resetMessageQueue", {
                    type: "app:syncMessages",
                    params: ({ context }) => ({ modelMessages: ChatController.getMessages(context.roomId!)})
                  }],
                  reenter: true
                },

                ANSWER_MESSAGE: {
                  target: "Animating",
                  actions: {
                    type: "app:syncMessages",
                    params: ({ context }) => ({ modelMessages: ChatController.getMessages(context.roomId!)})
                  },
                  reenter: true
                }
              }
            },

            Animating: {
              on: {
                "ANIMATE_END": "Ready"
              }
            },

            Blocked: {
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
            LOADING_START: ".Blocked"
          }
        },

        Coor: {
          on: {
            RESIZE: {
              target: "Coor",

              actions: {
                type: "assignAppCoor",
                params: ({ event }) => ({ ...event })
              }
            }
          }
        }
      },

      type: "parallel"
    },

    AppQuit: {
      type: "final",
      entry: "disconnectFromController"
    },

    Error: {},

    AppStart: {
      on: {
        INIT: "Creating"
      }
    }
  },

  initial: "AppStart",

  on: {
    TERMINATE: ".AppQuit"
  }
});

export type ChatMachineActorRef = ActorRefFrom<typeof chatMachine>;

export type ChatMachineSnapshot = SnapshotFrom<typeof chatMachine>;