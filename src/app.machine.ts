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
  /** @xstate-layout N4IgpgJg5mDOIC5QGMAWBDALgYgCoFEAlAWQEkA5AQQIG0AGAXUVAAcB7WAS007YDtmIAB6IAtAEZxAJgB0ANgCcAdikBmJUoAcdBVN0AaEAE9ESuqpmqpmqXoUBWBdvEBfF4bRYZhMHwhgAJxlSPhYAVxwAGQB5SgARCgBxAH0AZVxKQlx6JiQQdi4efkERBE1xOhkbTVVNG3FVdTp7QxMEcSUOmTo6G1U6cQAWCvtFNw8MTG9ffyCQ8KmfdAgjbFT8cjjk4nxU1MpE-BzBAu5eATzS8XtBmUHleyUFOXE5TsbWxA7leUl7TQ0igUDXGIE8ixmgWCoQi02WRhkuCMLDAxDY-mw1AyAGEABLJSgAVQS0WOeVORQuoFKSkaVUemkGmgUvWkqk+7WZFjonU64gB9nMelB4Omfih81hSxWiORqPRYGCEAANmA8PgABq4ZIUAAKhOyjBOHDOxUuiGsChkCicgyU-xsDicHKk5k0dztvV0Vl69nsIsmYtm0IWcJlSJRaP8spYnD4UHVWuSGwIhDJrBNlJKiEGqnsMiUgykZikwyGDg0Lroue6NV04l02kegwDXh84rmMIh8Jj8ujEbjCYIScIu3whtyGcK52z7UG+eegsejWZvXMVdqHrMijkgskmlbEI7IalYB7lDCEF4uuV6CMgSjatH621eoN6fymZn5oQhdkg2rRQ-wGKw5CrSQZBuRprlpRQAKUQ8gwlLsZAAIWVNhkAAa0gbAYniJJk02D8KW-alEDkVRblsAYNFzJxygUDlviUX5rgBJQgRBdwwUDdtg0oTBMHQNAAFtfCiWIEnIFJ0kyCdjWnM1yIQUQpEceQzEdJkHCLG4qzqTTynnTjVGeflEP4qFBOEsSJOwIRYGEzBFXQAAzFyAgACjoABKbBRSsoIbJE1BxL4TASK-ZThDEOQ5EqFRPVUDonjke5mIZSwmwS6sK1zSzIWCoTQvCnBHOc1yPMCHz-MCoqZBCuyIpocRJ0-JSqVi1S3nETStCkSjrCZPRmMovrNAS8pagbV5pEK48mrCiSZGxDDYFw6JdQ2AlcBxXEdnIBTyWirrSlERxqOuWw1EG4EDGML5CzkGRJAUechRqO0EJ4+rFpK5qpmiFE+ExPbKDxHViAOI4jROzrZ1ETjblpbRGQAzQlzAx72mUViBuBYsdGguQFoEgHloimRgd8MH9oJYlSFJOGp1NM6xGRgtamaeK83sBslGYgEXv5tRBiLDpVEosnrIpsrqZB7BsRidZdv2w7jtZrMfyRxQqjUG1+X6JxBZx-l+UsV1bGGKQG2eGXitsympnQzCcIgPCpMIjY4iihGdb-bpi2kXNpD9SscddQy3mMx5KPMg9fr4hrUmQAIwFp-DpNkjIsj9tnZxLV7RldOQ9Em6wWjNhp-xecprEZOhdykB2ZFT9PfDDVZ1k2bZdn2Q58+1lThlYuRmQS3Rq1GAFmLtyDFBud7S2e1wk7bFO04zvgu7WABNchsT7vYYaHsjurUF6rfsWxCcYx5mNdPqrBot1JocROJg3492+33fKHIKkAA6kQY+A9YbtVIjFUowwLCegBNWWiCgUpVzaA0ecMg7pqFqDUbB-p15HmDL-Tu0oES6nQHGHg8YHJOSwFVTytUArJx-lvEhZ4ZTkMoYOM+0Cvh0gqDye4nEKyE2YlROBZcEq235pjOgLcCFISCMQnepDGp8E4KJLAg4aGVRkO5BhfkmHfyIawlR7CESUHUZoqhUAeHswQP0K+hNkGdB0JdVBXxBhvHkMCHoxZxZMnuK3ZRMhIhsGWNorO3tiIsw6gXH8rjugNkFMoecc1H4qGLsMeweZGzIPkV-QhUJsRsDYAEbAz5SAAC18AEl1LqOxiNx4WABBUdS85tBvFNmg6RmDMYDXnKWWwpMFFBVWqUoIPguAAC9tEVToXo6q3l+iGL+sGEpZTpgzO4bEqB9jRDOCDooas30dzsjNlYCwttBq1D0OWZordJSYA2eUypNSdTkH1JrOJw9upqWeAWawVEAKlh0DUbGPTXiWBuDXORLIeSf14sY5CCwXlbM4LM6h8yXKLIYdcVZzDgxPLRVMjFOzIGnURkWWQ7Sb4dOaHS7pfDbCvQCUuawLxGiIUoCwFgqRhIBBwNiUc1BamEGiNEYgjSdbxXdMyd6TwTLxQjm0e0sgWR6GBQMUYKg3A8T4AqeAeRwSKXiSpUQTgXq5nUO9fKhZxAck5fIGRwJx6Ck6CMwpijTW-POsg901rFV2uGByFx3RF61ConIwaBSkVFM7AsH158rjWl3M0WktQWTaHUmNW2lgXjjzBQldQjyUKkKTbwhA9xU1LgzaubNHj2haSqAWieaNyj4K9WMp5XdeyPgrfYn4i500rizeuM2zJ8wdMGtIQsuZx6ltDKoiMfZFSkBVGAAds4X6-FGA4NxYLzloKcOq-4d1niNiGIu08PYV2PhjIOLdP4UrqrDm0rQLwOgQotJIZ+zRrWUUxs8H6XaGo9tUReK8bAbx3gfAqJ9KkVBWgng4Bs6lXheOYg4F6rIbTNHUsCe017uwylQiJLCCHur3AkbYPdCrS5HqegCqWrwnDqEeOpRFayUWwldthSAlHSiMinU3dQdyjbj2Yk8MefwOJcVUK3JaZVBNiFXHcRoQbmz2uYkyd0DR02wK-e9RTcsVprQ4AJ+GZq-mdFkM3CoKgw4JUbR0Lxr0GwfSsF9WkJmnbyxpl1PZiN1AWGkHYcwZdPTfqbW5t6nmgV2gU6MhqSmVpxE4LAdAAAjVUEAVOqUZP+DTtqtMhrNo8fMlF005MGglQsvnSorT4+7fLohbnOqLLUEueZOgGXdDHIYcczJ12CaY-L6hXo9ELMoReTwQ7MTkbcPdNwzB5h5E3UbHczHwny5jSbgiZsiOkHPaQ4bdI2HC4yTbf9VHrtVPlhoOH+ji35B66NLmvEvVmnI-o9QOLXbYT2ThEVH1Wd9RaceHovG6Heo8HoTELl0kmvFDlyCWSerjYotupje2WI0Vo+M+X5wvWUF6JD-NhjpR0-FV6vi1C9Ftv95LLCtuhPCVeQnYPk2mDzAWfksqAJ+naY-Lo6U53rekBq1uLzWuMitHI454tATPEY+0WdBZ+n1wq3L6XEy26YDYCwVrGgrTqSov8ask1WmPxSpYe0zdzANHekl0Dx4SVwDJZzrW3OeoaWJ8vAE85vpiLzbZswDmUp5i44SnjzyJmtc9Jgm4dKLdC7tHPaw9JYG9Coqx6PyKE0RDRfyw3CeBgFh5GXIYHTGTRbZPLzpIxZXV+I+77ZXufk+7Unra5nQWRUXej0FzPp5Diwp9GosBUFE8r5QKzAsuoWYyA2YLQUeHU406HKvvOT7h+lGC7zH+A-Ctb5lk3kxljaDA5OH4uDYeg2tdWvV3RKy3mL7QqNC5H8t+j6oWTNdQgMy4pAsMHBMEzIzBRh+QYc9UXAgA */
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