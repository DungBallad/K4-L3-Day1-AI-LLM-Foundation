"""
Script khởi động giao diện Chatbot Studio (3 Layouts).
Chạy lệnh:
    python run_ui.py
"""

import sys
import os
import webbrowser
import threading
import time

def open_browser(port):
    time.sleep(1.2)
    url = f"http://localhost:{port}"
    print(f"Đang mở trình duyệt tại: {url}")
    webbrowser.open(url)

if __name__ == "__main__":
    from server import run_server
    port = 8000
    threading.Thread(target=open_browser, args=(port,), daemon=True).start()
    run_server(port=port)
