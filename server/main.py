"""
🌐 FLASK WEB LAYER
Lớp web bọc quanh src/tools.py (marketplace: tìm/chi tiết/đặt lịch, không qua LLM)
và src/app.py (ReAct Agent, dùng cho chat widget). Không sửa logic bên trong
tools.py/providers.py/prompts.py — chỉ import và gọi lại.
"""

import json
import os
import sys

from flask import Flask, jsonify, request, send_from_directory

# Cho phép import trực tiếp các module trong src/ (giống cách src/app.py tự thêm sys.path)
SRC_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "src")
sys.path.append(SRC_DIR)

from tools import search_rooms, get_room_details, book_viewing_appointment, MOCK_ROOMS  # noqa: E402
from providers import get_llm_provider  # noqa: E402
from prompts import CHATBOT_BASELINE_PROMPT  # noqa: E402
import app as core_agent  # noqa: E402  (đặt tên khác để không đụng biến `app` Flask bên dưới)

STATIC_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "static")

provider = get_llm_provider()  # 1 instance dùng chung cho cả server

app = Flask(__name__, static_folder=STATIC_DIR, static_url_path="/static")


@app.get("/")
def index():
    """Phục vụ trang giao diện chính (marketplace + chat widget)."""
    return send_from_directory(STATIC_DIR, "index.html")


@app.get("/compare")
def compare_page():
    """Phục vụ trang so sánh Chatbot Baseline vs ReAct Agent (Lab 03 demo)."""
    return send_from_directory(STATIC_DIR, "compare.html")


@app.get("/api/locations")
def list_locations():
    """Danh sách location DUY NHẤT có trong dữ liệu thật (data/mock.json), để
    frontend dựng dropdown — search_rooms() so khớp location CHÍNH XÁC
    (lowercased), free-text sẽ âm thầm trả rỗng nếu gõ sai."""
    return jsonify({"locations": sorted({r["location"] for r in MOCK_ROOMS})})


@app.get("/api/rooms")
def search_rooms_endpoint():
    """Bọc trực tiếp search_rooms() — không qua LLM, tra cứu tất định."""
    location = request.args.get("location", "")
    try:
        max_price = int(request.args.get("max_price", 0))
    except ValueError:
        return jsonify({"status": "error", "message": "max_price phải là số nguyên."}), 400
    return jsonify(json.loads(search_rooms(location, max_price)))


@app.get("/api/rooms/<room_id>")
def get_room_endpoint(room_id):
    """Bọc get_room_details() — trả đủ address/contact/viewing_schedule mà
    search_rooms() không có, cần thiết cho modal chi tiết + đặt lịch."""
    result = json.loads(get_room_details(room_id))
    if result["status"] == "error":
        return jsonify(result), 404
    return jsonify(result)


@app.post("/api/appointments")
def book_appointment_endpoint():
    """Bọc book_viewing_appointment(). date phải đúng dd/mm/yyyy theo đúng yêu
    cầu của tools.py, không phải ISO yyyy-mm-dd."""
    body = request.get_json(force=True, silent=True) or {}
    required = ("room_id", "customer_name", "date", "time")
    missing = [f for f in required if not body.get(f)]
    if missing:
        return jsonify({"status": "error", "message": f"Thiếu trường: {', '.join(missing)}"}), 400

    result = json.loads(
        book_viewing_appointment(body["room_id"], body["customer_name"], body["date"], body["time"])
    )
    if result["status"] == "error":
        return jsonify(result), 400
    return jsonify(result)


@app.get("/api/test-cases")
def test_cases_endpoint():
    """Danh sách test case của Role 1 (config/test_cases.json), để dựng dropdown
    ở trang /compare — tái dùng load_test_cases() có sẵn trong src/app.py."""
    return jsonify({"test_cases": core_agent.load_test_cases()})


@app.post("/api/compare")
def compare_endpoint():
    """Chạy song song Chatbot Baseline (1 lần gọi LLM, không tool) và ReAct Agent
    (vòng lặp đầy đủ) trên CÙNG một câu hỏi, để so sánh trực quan ở trang /compare.
    Dùng chung 1 provider instance đã cấu hình sẵn từ .env (LLM_PROVIDER/LLM_MODEL)
    — không có lựa chọn provider hay nhập API key ở phía frontend."""
    body = request.get_json(force=True, silent=True) or {}
    question = body.get("question", "").strip()
    if not question:
        return jsonify({"status": "error", "message": "Thiếu question."}), 400

    baseline_answer = provider.generate(question, system_prompt=CHATBOT_BASELINE_PROMPT)

    react_steps = core_agent.run_react_agent_steps(question, provider)
    react_final = next((s["final_answer"] for s in react_steps if "final_answer" in s), None)
    tool_calls = sum(1 for s in react_steps if "tool_name" in s)

    return jsonify({
        "provider": provider.__class__.__name__,
        "model": getattr(provider, "model_name", None),
        "baseline": {"answer": baseline_answer},
        "react": {"steps": react_steps, "final_answer": react_final, "tool_calls": tool_calls},
    })


@app.post("/api/chat")
def chat_endpoint():
    """Chạy vòng lặp ReAct 1 lần cho 1 tin nhắn, trả về toàn bộ trace các bước
    Thought/Action/Observation để frontend hiển thị minh bạch giống CLI."""
    body = request.get_json(force=True, silent=True) or {}
    message = body.get("message", "").strip()
    if not message:
        return jsonify({"status": "error", "message": "Thiếu message."}), 400

    steps = core_agent.run_react_agent_steps(message, provider)
    final_answer = next((s["final_answer"] for s in steps if "final_answer" in s), None)
    return jsonify({"steps": steps, "final_answer": final_answer})


if __name__ == "__main__":
    app.run(debug=True, port=8000)
