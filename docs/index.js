window.onload = () => {
  Chat.addRoomListener("chat", (msg) => {
    console.log(msg);
  })
}

async function delay(n) {
  return new Promise(res => setTimeout(() => res(), n));
}

function init () {
  Chat.answerChat("chat", {
    type: "text",
    content: "hello world!"
  });

  const btn = document.querySelector(".chat-btn-container > button");
  const chatWrapper = document.querySelector(".chat");
  
  let open = false;
  
  const renderOpen = () => {
    if (open) {
      chatWrapper.style.top = "-10px";
      chatWrapper.style.opacity = "1";
      return;
    }

    chatWrapper.style.top = "0";
    chatWrapper.style.opacity = "0";
  }

  btn.addEventListener("click", () => {
    open = !open;

    renderOpen();
  })
  renderOpen();

  const buttons = document.querySelectorAll("section > button");

  let waitAnimation = false;
  [...buttons].forEach(elem => {
    const id = elem.id;

    elem.addEventListener("click", async () => {
      open = true;

      if (waitAnimation) return;
      waitAnimation = true;

      renderOpen();

      try {
        Chat.startAnswerLoading("chat");
  
        await delay(2000);
  
        await Chat.endAnswerLoading("chat");
  
        switch(id) {
          case "web":
            Chat.answerChat("chat", {
              type: "text",
              content: "Check Demo Page"
            });
            Chat.answerChat("chat", {
              type: "img",
              content: "https://raw.githubusercontent.com/keepgo-studio/example-ios-chat-next/main/public/example-nextjs.png"
            });
            Chat.answerChat("chat", {
              type: "text",
              content: "Next js + ios chat \n https://keepgo-studio.github.io/example-ios-chat-next/"
            });
            break;
          case "npm":
            Chat.answerChat("chat", {
              type: "text",
              content: "To install, visit npm page"
            });
            Chat.answerChat("chat", {
              type: "text",
              content: "https://www.npmjs.com/package/ios-chat?activeTab=readme"
            });
            break;
          case "github":
            Chat.answerChat("chat", {
              type: "text",
              content: "To contact, visit Github repo."
            });
            Chat.answerChat("chat", {
              type: "img",
              content: "./hero.webp"
            });
            Chat.answerChat("chat", {
              type: "text",
              content: "https://github.com/keepgo-studio/ios-chat"
            });
            break;
        }
      } catch {
        alert("still loading!");
      }

      await delay(300);

      waitAnimation = false;
    })
  });
}  


(function () {
  init();
})()