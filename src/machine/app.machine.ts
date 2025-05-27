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
  /** @xstate-layout N4IgpgJg5mDOIC5QGMAWBDALgYgCoFEAlAWQEkA5AQQIG0AGAXUVAAcB7WAS007YDtmIAB6IAtAEZxAJgB0ANgCcAdikBmJUoAcdBVN0AaEAE9ESuqpmqpmqXoUBWBdvEBfF4bRYZhMHwhgAJxlSPhYAVxwAGQB5SgARCgBxAH0AZVxKQlx6JiQQdi4efkERBAVzGSVxOQAWGrlzOql7cUMTBHFtWTlNBRqlexqFVTlR13cQT0xvX38gkPDpn3QII2xU-HI45OJ8VNTKRPwcwQLuXgE80qlxe0q6JRrpTU16pzopNsRxBTklGQc4hUkh+ozo9jcHgwS1mgWCoQiMxWRhkuCMLDAxDY-mw1AyAGEABLJSgAVQS0ROeTORUuoFKwJkkjoH2kIysNXsXwQUnM-2amlUCmUalUqnBkMm0JmfjhC0Ry1WqPRmOxYGwcXwBOJpGIh2OjFOHHOxSupkkMie9Qa-R6im5tmFljk9jo1T6PSUqk0kqmMrm8MWSKVaIxWP8wQgABt1QQABq4ZIUAAKpOyhupxtpJUQzVkIzoLxqrykKmtDqB-004iGQpqdHr9ikNV90p8svmCJhyOVYbVvc4fCgeHwCeSmwIhCprCzFxzCCFcktYr+fyeDgrvxkRcFjmGozkra87YD8u7IZV4bAA6HI7HhD2Wun+Vnpvp30LllL1r0mj+egrDRtxrBQfhsXlNAhCY-RPOUu2DFFKDCCBeGTKN0CMQIr3WTZtl2fZ9WfGk5zNBBRgscQdBrLRXRuT5jFzTpNABJtKIacofgeI8YQ7QMFTAHskJQtg0IwrC1VxZNk1wklyVISkMxnQoSPfBAXjoeQNE5SRNBUXp6PaG5RhkWxBhdGxtGrbj-TgoMACEozYZAAGtIGwGJ4iScctiI186WEUwrABZslB6axnjkAzvl0hQZHsEYeheSCEqkazYKCShMEwdA0AAW18KJYgScgUnSTJ01yJSTX80pRHrGomXsKpFDqRwlAMBieTdCxlFA8RvUsvo0thDKspy1B8r4HAhFgbLMGvdAADN5oCAAKOgAEpsBgkaZEy7K8oK3zlLfAKEFEMxZF5ORVHsQU-wGL1uR+YY4vKJ4LMir0lGG3j9vGybptmrAFuWwJ1q2na-rGw6ppocRKpfE6arEKoKMcYtbnUUt4odBt-geOh-3BO6GigqFj12-7YemfFHNgNzomk8gSVwbVdnICqjWR+dRBuu5FE9AZbqqaoKzkcQv2GQt7BdfHfoDamJoKmRogxPhcTZygiSTPUjmO6redUH4ZA+Jt3prUZ6gdVROUsSingxt1BR+6C2ypmHlam1X1c17VZIpA3s1I0RxQauitH6m7SwcVQHWaCidC0XQNDuomFbhJXAZ93xsHxGINlZ9mJyDlSzr5oU4qsatlEioVWk62wbm3dQXvsJqhVtjPRoOr3pgcpzXIgdyiq83DS9O2rHElkYnGqLTBXUCs3TiuoRZZRxRW7mRUmQAIwFzjzitKjIsgnlGEEuxrIqJ39Isg57+tkepOmeV4iabbfd-33wEJwrYdh7AOPrRSSNDakSeP8HovwdC8k5J6R+TpZYOCGDUEKL8v57wPnwP+qQACa5B8SAIIiAxGxFJ65hGCZM2jpng-Cas9XkM8m4sgGooO6mCf44MVGsSg5BUgAHUiDEOAQaMhfl5xPAsP0QsZh6xAmGLcZ6ts7hSEUKKF4VgxTkylJTXi39sEIRkMmdAg4eC3hmnNUGK0IbbXdvorBv8eHGNMVNQcUBz7zn6onB4QxQoOHatIZRNRpGRQaDcFokEPicMMc4ygfBOC5SwO47AliQYyCWjYzadi9EBgMU4gSSp4mJOSUOTxpFxRLj0NIYYVQdAYy5J1S2UDQIsm-HUV4CgYm-0iGwFYKSj5jx8qA8hF86mm3oUnbSEtGEqEao7W6uhehWG3viNgbAAjYAfKkUgAAtfAJIpLlNUnzMwlR+o-C0rLDQUUOhWDuFoV4ts3RuhCalN2uS4RrI2TMLgAAvFJaT5oZLBmtV02SoYBm+UEHw-z3HHPLloKsihCwcVqNUOOTSQkWCqObHonImw9G3meaFWy9h7IOSmNMCLap-EliBW4BLiyvAbu0aorp7jChUOocw0h3kUx4qeLs0LfmcABRY4GwLMng0opDexQrFgithWK+FIyJEh3ahYG6kUmxCjUY9Z6j04o9FltIWWvIRjWUoCwFgqRsoBBwPiB81ADmEGiNEYgNKxCjGYr0Po7VOShT+EobkAxZDlD0LbeR1z3kTD4GqeAeQpjc3AScyipYASMtdNUMJLpuQSy1ZE3c2rtBdI+YKwIKbg4nN6pmwY2bRhqLzZ1WpptBbfjdJRSQxKuxVrLrVW6mkE48qflUQ1twmTLL6PUIYboe1Bh4X2ihHR8zfkbU4f85RMVspitQ6otghTv1CvO-iPZQyqn8Eui+DQvyPHXQ9ACjdzAWCahLWwkE7QuhPeeFE56ryRhjFe+c1gGrKGrA2cExZo4VlsF+N9rzpDFlUN+oxf7+yhncUB0iOMTKPFArob06grbxw5X8au3pKKy2Q+WmynYF2FN-ZefsdkcrOSw6pSJptQpNleE86wty6KSweDfAaVH+W6IrXR09RTkKoXQphAIV52NnSqP8BlHSDxNU0BWaoJlrAizUB8WwKHnEsZcsphkdsJYvMiiEkCChnq-CXGYIEjRSxAmsChgeLlIAWdMHdeQItejOw+EvJpXR5C9H6IMfcVtt5ZwKn586ii62cjdI20YjS2VbssPVUtjgGidHi57bOdMOC+czDzDVgwmRilCs2G4t1H2GWqMw6WH7XTWmK73bOatfBJbqjWeQDZajtyqGovQWXGISyluKDrI3Dw0fSntErKs4icFgOgAARjGCAA3NGpYbbmqbHRhQaXftiqjlSfRLY9j1lW3mh4DdnnFdq4JHQ8p6MvSWgwQlNQ3gR6jAraM70cf5UZ851BMhZHh-xTVQLNmeh8BqyC04smLOnW7DiuEISS5BaHvja4BIR4-aQbaHC-BsA7aQ3TuEMYA2AJLUdTZhw+s1IzJ3LZLh+OmubNxdKu2B8t-JdOewmLMZhyrqazpqOYnUN4ehA0sgc00sUFg-yNr-MMcoi2he7RF0Y4pSTzFQCS-AgEZhegqEBE8Woz1rRMlaYZqnAvacyF6f0ocSWvTOc6HS70Zg6yMJXmoTkzQamdGM1jqF6yAj7cHVr1F6Xbfbu+GoZi1heM1iJiEmwqzY870wGwFgA2g2mwcDdZ9kUnPBMlrpQU5g7p9R0ZCr5BflXitN1L6t5dahVOFJIFokVbgqHt0FCJTXK8fpbNH2yERoX7aeIFnVahdB-AYU0qj1CnCgVtoywXEmQckoL3a4vpfQpMhA8bWufwGzPTI8uUbOhCw6Ru3r3ix+fkd8l1VHvtKQmBZNYV5NQCiGrtymysKDDsh6Rv6H7Wq2r2qYD7a6aQSQTKAPC7jVihqdDbhVCxxDDtxUbWT4B+DPbgH75AjVghI6A1Chory3CcR8gD4SxuBuBAA */
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

                    SEND_MESSAGE: {
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