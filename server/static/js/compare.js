/* Trang /compare: chạy Chatbot Baseline vs ReAct Agent trên cùng 1 câu hỏi,
   dùng chung provider server-side (không có Provider/API key ở frontend). */

const testCaseSelect = document.getElementById("test-case-select");
const questionInput = document.getElementById("question-input");
const compareForm = document.getElementById("compare-form");
const runBtn = document.getElementById("run-btn");

const baselineMetaEl = document.getElementById("baseline-meta");
const baselineOutputEl = document.getElementById("baseline-output");

const reactMetaEl = document.getElementById("react-meta");
const toolCallBadgeEl = document.getElementById("tool-call-badge");
const reactStepsEl = document.getElementById("react-steps");
const reactFinalEl = document.getElementById("react-final");

async function initTestCases() {
  const { test_cases } = await Api.listTestCases();
  for (const tc of test_cases) {
    const opt = document.createElement("option");
    opt.value = tc.id;
    opt.textContent = `#${tc.id} — ${tc.category}`;
    opt.dataset.question = tc.question;
    testCaseSelect.appendChild(opt);
  }
  if (test_cases.length) {
    questionInput.value = test_cases[0].question;
  }
}

testCaseSelect.addEventListener("change", () => {
  const opt = testCaseSelect.selectedOptions[0];
  if (opt && opt.dataset.question) questionInput.value = opt.dataset.question;
});

function renderReactSteps(steps) {
  reactStepsEl.innerHTML = "";
  for (const s of steps) {
    if (s.thought) {
      const el = document.createElement("div");
      el.className = "step-line step-thought";
      el.textContent = `🧠 Thought: ${s.thought}`;
      reactStepsEl.appendChild(el);
    }

    if ("tool_name" in s) {
      const action = document.createElement("div");
      action.className = "step-line step-action";
      action.textContent = `🛠️ Action: ${s.tool_name}[${s.raw_args}]`;
      reactStepsEl.appendChild(action);

      const obs = document.createElement("div");
      obs.className = "step-line step-observation";
      obs.textContent = `👁️ Observation: ${s.observation}`;
      reactStepsEl.appendChild(obs);
    } else if (s.guardrail_triggered) {
      const el = document.createElement("div");
      el.className = "step-line step-guardrail";
      el.textContent = `🛡️ ${s.message}`;
      reactStepsEl.appendChild(el);
    } else if (s.error) {
      const el = document.createElement("div");
      el.className = "step-line step-guardrail";
      el.textContent = "⚠️ LLM trả lời sai định dạng.";
      reactStepsEl.appendChild(el);
    }
  }
}

compareForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  const question = questionInput.value.trim();
  if (!question) return;

  runBtn.disabled = true;
  runBtn.textContent = "Đang chạy...";
  baselineMetaEl.textContent = "";
  reactMetaEl.textContent = "";
  toolCallBadgeEl.style.display = "none";
  baselineOutputEl.textContent = "Đang chờ phản hồi...";
  reactStepsEl.innerHTML = "";
  reactFinalEl.style.display = "none";

  try {
    const { ok, data } = await Api.compare(question);
    if (!ok) {
      baselineOutputEl.textContent = data.message || "Có lỗi khi chạy so sánh.";
      return;
    }

    const meta = `via ${data.provider} (${data.model || "?"})`;
    baselineMetaEl.textContent = meta;
    reactMetaEl.textContent = meta;

    baselineOutputEl.textContent = data.baseline.answer;

    toolCallBadgeEl.style.display = "inline-block";
    toolCallBadgeEl.textContent = `🔧 ${data.react.tool_calls} tool call(s)`;
    renderReactSteps(data.react.steps);

    reactFinalEl.style.display = "block";
    reactFinalEl.textContent = `🏁 ${data.react.final_answer || "(Không có Final Answer — agent dừng do lỗi hoặc chạm giới hạn bước)"}`;
  } catch (err) {
    baselineOutputEl.textContent = "Có lỗi khi kết nối tới server.";
  } finally {
    runBtn.disabled = false;
    runBtn.textContent = "▶️ Chạy so sánh";
  }
});

initTestCases();
