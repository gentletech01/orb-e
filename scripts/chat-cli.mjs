import readline from "node:readline";

const baseUrl = process.env.CHAT_CLI_URL ?? "http://localhost:3000";
const sessionId = process.argv[2] ?? `cli-${Date.now()}`;

const rl = readline.createInterface({ input: process.stdin, output: process.stdout });

const state = { messageCount: 0, status: "idle" };

function printNewMessages(conversationState) {
  for (const message of conversationState.messages.slice(state.messageCount)) {
    const who = message.from === "bot" ? "🤖" : "🧑";
    console.log(`${who} ${message.text}\n`);
  }
  state.messageCount = conversationState.messages.length;
  state.status = conversationState.status;
}

async function postConversation(body) {
  const response = await fetch(`${baseUrl}/api/conversation`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  return response.json();
}

rl.on("line", async (line) => {
  const input = line.trim();
  if (!input) {
    rl.prompt();
    return;
  }
  if (input.toLowerCase() === "salir") {
    rl.close();
    return;
  }

  const normalized = input.toLowerCase();
  const isConfirming = state.status === "awaiting_confirmation";
  let body;

  if (isConfirming && ["si", "sí", "yes"].includes(normalized)) {
    body = { sessionId, type: "confirm" };
  } else if (isConfirming && ["no"].includes(normalized)) {
    body = { sessionId, type: "reject" };
  } else {
    body = { sessionId, type: "text", text: input };
  }

  const conversationState = await postConversation(body);
  printNewMessages(conversationState);
  rl.prompt();
});

rl.on("close", () => {
  console.log("Chau!");
});

async function main() {
  console.log(`Sesión: ${sessionId} (escribí "salir" para terminar)\n`);

  const initial = await fetch(
    `${baseUrl}/api/conversation?sessionId=${encodeURIComponent(sessionId)}`
  ).then((res) => res.json());

  printNewMessages(initial);
  rl.setPrompt("> ");
  rl.prompt();
}

main();
