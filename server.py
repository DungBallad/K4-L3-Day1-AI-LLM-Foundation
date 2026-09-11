import os
import json
import time
import urllib.parse
from http.server import ThreadingHTTPServer, SimpleHTTPRequestHandler
from pathlib import Path
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Import functions from solution
from solution.solution import (
    count_tokens,
    estimate_cost,
    OPENAI_MODEL,
    OPENAI_MINI_MODEL,
    PRICING_PER_1K_TOKENS,
)

BASE_DIR = Path(__file__).resolve().parent
DATA_DIR = BASE_DIR / "data"
DATA_DIR.mkdir(exist_ok=True)
SESSIONS_FILE = DATA_DIR / "sessions.json"
WEB_DIR = BASE_DIR / "web"

# Initialize sessions file if not exists
if not SESSIONS_FILE.exists():
    default_session = [
        {
            "id": f"session_{int(time.time())}",
            "title": "Cuộc trò chuyện mẫu",
            "persona": "Bạn là trợ lý AI thông minh, hỗ trợ giải đáp thắc mắc ngắn gọn, súc tích và chính xác.",
            "model": "gpt-4o-mini",
            "messages": [
                {
                    "role": "user",
                    "content": "Xin chào! Bạn có thể làm được những gì?",
                    "timestamp": time.time() - 60,
                },
                {
                    "role": "assistant",
                    "content": "Chào bạn! Tôi là trợ lý AI. Tôi có thể giúp bạn giải đáp kiến thức, phân tích code, tóm tắt tài liệu và trò chuyện với ngữ cảnh linh hoạt!",
                    "timestamp": time.time() - 55,
                    "meta": {
                        "latency": 0.45,
                        "input_tokens": 32,
                        "output_tokens": 40,
                        "total_cost": 0.000028,
                    },
                },
            ],
            "createdAt": time.strftime("%Y-%m-%d %H:%M:%S"),
            "updatedAt": time.strftime("%Y-%m-%d %H:%M:%S"),
        }
    ]
    with open(SESSIONS_FILE, "w", encoding="utf-8") as f:
        json.dump(default_session, f, ensure_ascii=False, indent=2)


def read_sessions() -> list:
    try:
        with open(SESSIONS_FILE, "r", encoding="utf-8") as f:
            return json.load(f)
    except Exception:
        return []


def write_sessions(sessions: list) -> None:
    with open(SESSIONS_FILE, "w", encoding="utf-8") as f:
        json.dump(sessions, f, ensure_ascii=False, indent=2)


class ChatbotHandler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(WEB_DIR), **kwargs)

    def do_GET(self):
        parsed = urllib.parse.urlparse(self.path)
        path = parsed.path

        if path == "/api/sessions":
            sessions = read_sessions()
            self.send_response(200)
            self.send_header("Content-Type", "application/json; charset=utf-8")
            self.end_headers()
            self.wfile.write(json.dumps(sessions, ensure_ascii=False).encode("utf-8"))
            return

        if path == "/api/models":
            self.send_response(200)
            self.send_header("Content-Type", "application/json; charset=utf-8")
            self.end_headers()
            models_info = {
                "default": OPENAI_MINI_MODEL,
                "models": [
                    {"id": "gpt-4o-mini", "name": "GPT-4o Mini (Nhanh, Tiết kiệm)"},
                    {"id": "gpt-4o", "name": "GPT-4o (Thông minh, Mạnh mẽ)"},
                ],
            }
            self.wfile.write(json.dumps(models_info, ensure_ascii=False).encode("utf-8"))
            return

        super().do_GET()

    def do_POST(self):
        parsed = urllib.parse.urlparse(self.path)
        path = parsed.path
        content_len = int(self.headers.get("Content-Length", 0))
        body = self.rfile.read(content_len).decode("utf-8") if content_len > 0 else "{}"
        try:
            data = json.loads(body)
        except Exception:
            data = {}

        if path == "/api/sessions":
            # Create or update session
            sessions = read_sessions()
            session_id = data.get("id")
            now_str = time.strftime("%Y-%m-%d %H:%M:%S")

            existing_idx = next((i for i, s in enumerate(sessions) if s["id"] == session_id), None)
            if existing_idx is not None:
                sessions[existing_idx].update({
                    "title": data.get("title", sessions[existing_idx]["title"]),
                    "persona": data.get("persona", sessions[existing_idx]["persona"]),
                    "model": data.get("model", sessions[existing_idx]["model"]),
                    "temperature": float(data.get("temperature", sessions[existing_idx].get("temperature", 0.7))),
                    "top_p": float(data.get("top_p", sessions[existing_idx].get("top_p", 0.9))),
                    "max_tokens": int(data.get("max_tokens", sessions[existing_idx].get("max_tokens", 512))),
                    "updatedAt": now_str,
                })
                target_session = sessions[existing_idx]
            else:
                new_session = {
                    "id": session_id or f"session_{int(time.time())}",
                    "title": data.get("title", "Cuộc trò chuyện mới"),
                    "persona": data.get("persona", "Bạn là một trợ lý AI thông minh."),
                    "model": data.get("model", "gpt-4o-mini"),
                    "temperature": float(data.get("temperature", 0.7)),
                    "top_p": float(data.get("top_p", 0.9)),
                    "max_tokens": int(data.get("max_tokens", 512)),
                    "messages": [],
                    "createdAt": now_str,
                    "updatedAt": now_str,
                }
                sessions.insert(0, new_session)
                target_session = new_session

            write_sessions(sessions)
            self.send_response(200)
            self.send_header("Content-Type", "application/json; charset=utf-8")
            self.end_headers()
            self.wfile.write(json.dumps(target_session, ensure_ascii=False).encode("utf-8"))
            return

        if path == "/api/tokens":
            text = data.get("text", "")
            model = data.get("model", "gpt-4o-mini")
            tok_count = count_tokens(text, model=model)
            self.send_response(200)
            self.send_header("Content-Type", "application/json; charset=utf-8")
            self.end_headers()
            self.wfile.write(json.dumps({"tokens": tok_count}).encode("utf-8"))
            return

        if path == "/api/chat":
            self.handle_chat_stream(data)
            return

        self.send_response(404)
        self.end_headers()

    def do_DELETE(self):
        parsed = urllib.parse.urlparse(self.path)
        path = parsed.path
        if path == "/api/sessions":
            qs = urllib.parse.parse_qs(parsed.query)
            session_id = qs.get("id", [None])[0]
            if session_id:
                sessions = read_sessions()
                sessions = [s for s in sessions if s["id"] != session_id]
                write_sessions(sessions)
                self.send_response(200)
                self.send_header("Content-Type", "application/json; charset=utf-8")
                self.end_headers()
                self.wfile.write(json.dumps({"status": "deleted", "id": session_id}).encode("utf-8"))
                return
        self.send_response(400)
        self.end_headers()

    def handle_chat_stream(self, data: dict):
        session_id = data.get("sessionId")
        user_message = data.get("message", "").strip()
        model = data.get("model", "gpt-4o-mini")
        persona = data.get("persona", "Bạn là một trợ lý AI thông minh.")
        temperature = float(data.get("temperature", 0.7))
        top_p = float(data.get("top_p", 0.9))
        max_tokens = int(data.get("max_tokens", 512))

        if not user_message:
            self.send_response(400)
            self.end_headers()
            return

        sessions = read_sessions()
        session_idx = next((i for i, s in enumerate(sessions) if s["id"] == session_id), None)
        if session_idx is None:
            # Create session if not exist
            session_obj = {
                "id": session_id or f"session_{int(time.time())}",
                "title": user_message[:25] + ("..." if len(user_message) > 25 else ""),
                "persona": persona,
                "model": model,
                "temperature": temperature,
                "top_p": top_p,
                "max_tokens": max_tokens,
                "messages": [],
                "createdAt": time.strftime("%Y-%m-%d %H:%M:%S"),
                "updatedAt": time.strftime("%Y-%m-%d %H:%M:%S"),
            }
            sessions.insert(0, session_obj)
            session_idx = 0
        else:
            session_obj = sessions[session_idx]
            # Update persona, model and hyperparameters
            session_obj["persona"] = persona
            session_obj["model"] = model
            session_obj["temperature"] = temperature
            session_obj["top_p"] = top_p
            session_obj["max_tokens"] = max_tokens
            if len(session_obj["messages"]) == 0:
                session_obj["title"] = user_message[:25] + ("..." if len(user_message) > 25 else "")

        # Prepare 3-turn sliding window (6 messages maximum)
        existing_history = [
            {"role": m["role"], "content": m["content"]}
            for m in session_obj["messages"]
            if m.get("role") in ("user", "assistant")
        ]

        # Slicing the last 6 messages (3 turns)
        context_window = existing_history[-6:]
        dropped_count = max(0, len(existing_history) - 6)

        # Build OpenAI request payload
        api_messages = (
            [{"role": "system", "content": persona}]
            + context_window
            + [{"role": "user", "content": user_message}]
        )

        # Start SSE response
        self.send_response(200)
        self.send_header("Content-Type", "text/event-stream; charset=utf-8")
        self.send_header("Cache-Control", "no-cache")
        self.send_header("Connection", "close")
        self.send_header("Access-Control-Allow-Origin", "*")
        self.end_headers()

        # Send initial context metadata event so frontend displays exactly what goes into API
        init_event = {
            "type": "init",
            "context_messages": context_window,
            "dropped_count": dropped_count,
            "system_prompt": persona,
            "parameters": {
                "temperature": temperature,
                "top_p": top_p,
                "max_tokens": max_tokens,
            },
        }
        self.wfile.write(f"data: {json.dumps(init_event, ensure_ascii=False)}\n\n".encode("utf-8"))
        self.wfile.flush()

        # Call OpenAI Stream
        from openai import OpenAI
        client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))

        start_time = time.perf_counter()
        full_reply = ""

        try:
            stream = client.chat.completions.create(
                model=model,
                messages=api_messages,
                temperature=temperature,
                top_p=top_p,
                max_tokens=max_tokens,
                stream=True,
            )

            for chunk in stream:
                delta = chunk.choices[0].delta.content or ""
                if delta:
                    full_reply += delta
                    chunk_event = {"type": "chunk", "text": delta}
                    self.wfile.write(f"data: {json.dumps(chunk_event, ensure_ascii=False)}\n\n".encode("utf-8"))
                    self.wfile.flush()

            latency = time.perf_counter() - start_time

            # Compute token and cost stats
            combined_prompt_text = persona + " " + " ".join(m["content"] for m in context_window) + " " + user_message
            cost_info = estimate_cost(combined_prompt_text, full_reply, model=model)

            meta_data = {
                "model": model,
                "temperature": temperature,
                "top_p": top_p,
                "max_tokens": max_tokens,
                "latency": round(latency, 2),
                "input_tokens": cost_info["input_tokens"],
                "output_tokens": cost_info["output_tokens"],
                "total_tokens": cost_info["input_tokens"] + cost_info["output_tokens"],
                "total_cost": round(cost_info["total_cost"], 6),
            }

            # Append messages to session and save to disk
            user_msg_entry = {
                "role": "user",
                "content": user_message,
                "timestamp": time.time(),
            }
            assistant_msg_entry = {
                "role": "assistant",
                "content": full_reply,
                "timestamp": time.time(),
                "meta": meta_data,
            }
            session_obj["messages"].append(user_msg_entry)
            session_obj["messages"].append(assistant_msg_entry)
            session_obj["updatedAt"] = time.strftime("%Y-%m-%d %H:%M:%S")

            write_sessions(sessions)

            done_event = {
                "type": "done",
                "meta": meta_data,
                "reply": full_reply,
                "session": session_obj,
            }
            self.wfile.write(f"data: {json.dumps(done_event, ensure_ascii=False)}\n\n".encode("utf-8"))
            self.wfile.flush()

        except Exception as e:
            error_event = {"type": "error", "error": str(e)}
            self.wfile.write(f"data: {json.dumps(error_event, ensure_ascii=False)}\n\n".encode("utf-8"))
            self.wfile.flush()
        finally:
            self.close_connection = True


def run_server(port: int = 8000):
    server_address = ("", port)
    httpd = ThreadingHTTPServer(server_address, ChatbotHandler)
    print("=" * 60)
    print(f"Chatbot UI Server running at: http://localhost:{port}")
    print(f"Data stored in disk at: {SESSIONS_FILE}")
    print("Press Ctrl+C to stop the server")
    print("=" * 60)
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        print("\nServer shutting down gracefully...")
        httpd.server_close()


if __name__ == "__main__":
    run_server()
