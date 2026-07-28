/* Chat widget: demo ReAct Agent bằng ngôn ngữ tự nhiên qua POST /api/chat */

const chatFab = document.getElementById("chat-fab");
const chatPanel = document.getElementById("chat-panel");
const chatMessages = document.getElementById("chat-messages");
const chatInput = document.getElementById("chat-input");
const chatSend = document.getElementById("chat-send");

chatFab.addEventListener("click", () => {
  chatPanel.classList.toggle("open");
  if (chatPanel.classList.contains("open")) chatInput.focus();
});

function appendMessage(role, text) {
  const el = document.createElement("div");
  el.className = role === "user" ? "chat-message-user" : "chat-message-bot";
  el.textContent = text;
  chatMessages.appendChild(el);
  chatMessages.scrollTop = chatMessages.scrollHeight;
}

function appendTrace(text) {
  const el = document.createElement("div");
  el.className = "chat-trace";
  el.textContent = text;
  chatMessages.appendChild(el);
  chatMessages.scrollTop = chatMessages.scrollHeight;
}

function renderSteps(steps) {
  for (const s of steps) {
    if (s.thought) appendTrace(`🧠 Thought: ${s.thought}`);

    if ("tool_name" in s) {
      appendTrace(`🛠️ Action: ${s.tool_name}[${s.raw_args}]`);
      appendTrace(`👁️ Observation: ${s.observation}`);
    } else if (s.guardrail_triggered) {
      appendTrace(`🛡️ ${s.message}`);
    } else if (s.error) {
      appendTrace(`⚠️ LLM trả lời sai định dạng.`);
    }
  }
}

async function sendMessage() {
  const message = chatInput.value.trim();
  if (!message) return;

  appendMessage("user", message);
  chatInput.value = "";
  chatSend.disabled = true;

  try {
    const { steps, final_answer } = await Api.chat(message);
    renderSteps(steps);
    appendMessage("bot", final_answer || "Xin lỗi, tôi chưa thể hoàn tất yêu cầu này.");
  } catch (err) {
    appendMessage("bot", "Có lỗi khi kết nối tới trợ lý AI. Vui lòng thử lại.");
  } finally {
    chatSend.disabled = false;
  }
}

chatSend.addEventListener("click", sendMessage);
chatInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter") sendMessage();
});
