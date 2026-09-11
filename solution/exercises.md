# K4 — Ngày 1: Bài Tập & Phản Ánh
## Khám Phá LLM API | Phiếu Thực Hành

**Thời lượng:** 4 tiếng
**Cách làm:** Trả lời từng câu ngay sau khi hoàn thành block tương ứng —
đừng để dồn hết về cuối buổi. Thay dòng `*Câu trả lời của bạn*` bằng câu
trả lời thật (chấm tự động sẽ đếm số câu đã trả lời).

---

## Block 1 — API Cơ Bản (trả lời sau Checkpoint 1)

### Câu 1.1 — Độ nhạy của temperature
Gọi `call_openai` với temperature 0.0, 0.5, 1.0 và 1.5 dùng prompt
**"Hãy kể cho tôi một sự thật thú vị về Việt Nam."**

**Bạn nhận thấy quy luật gì qua bốn phản hồi?** (2–3 câu)
> Ở temperature thấp (0.0 và 0.5), mô hình có tính tất định cao nên cùng chọn một sự thật phổ biến nhất là hang Sơn Đoòng với cấu trúc câu, từ ngữ và các số liệu (dài 5km, cao 200m, tòa nhà 40 tầng) gần như lặp lại y hệt nhau. Khi tăng temperature lên 1.0 và 1.5, tính ngẫu nhiên và đa dạng tăng rõ rệt: mô hình chuyển hẳn chủ đề sang xuất khẩu cà phê Việt Nam và mở rộng thêm các chi tiết phong phú hơn về cà phê Robusta, cà phê trứng và cà phê sữa đá.

### Câu 1.2 — Chọn temperature cho sản phẩm
**Bạn sẽ đặt temperature bao nhiêu cho chatbot hỗ trợ khách hàng, và tại sao?**
> Tôi sẽ đặt temperature trong khoảng 0.0 đến 0.2. Vì chatbot chăm sóc khách hàng ưu tiên hàng đầu là tính chính xác, nhất quán và trung thực với chính sách của doanh nghiệp; mức temperature thấp sẽ giảm thiểu tối đa hiện tượng ảo giác (hallucination), tránh trường hợp bot tự bịa đặt thông tin hoặc ưu đãi không có thật.

### Câu 1.3 — Đánh đổi chi phí
Kịch bản: 10.000 người dùng hoạt động mỗi ngày, mỗi người gọi API 3 lần,
mỗi lần trung bình ~350 token đầu ra.

**Ước tính GPT-4o đắt hơn GPT-4o-mini bao nhiêu lần cho workload này? Nêu một
trường hợp GPT-4o xứng đáng với chi phí và một trường hợp nên dùng mini:**
> GPT-4o đắt hơn GPT-4o-mini khoảng 16.7 lần. GPT-4o xứng đáng chi phí cho các bài toán đòi hỏi suy luận, phân tích văn bản pháp lý chuyên sâu hoặc viết mã nguồn phức tạp. Nên dùng mini cho các tác vụ đơn giản, tốc độ cao như phân loại cảm xúc hoặc tóm tắt nhanh văn bản ngắn.

---

## Block 2 — System Prompt & Token (trả lời sau Checkpoint 2)

### Câu 2.1 — Sức mạnh của persona
Gọi `chat_with_system_prompt` hai lần với cùng câu hỏi
**"Giải thích blockchain là gì?"** nhưng hai system prompt khác nhau:
- "Bạn là giáo viên tiểu học, giải thích thật đơn giản cho trẻ 8 tuổi."
- "Bạn là chuyên gia tài chính, trả lời chuyên sâu bằng thuật ngữ kỹ thuật."

**Hai phản hồi khác nhau như thế nào (độ dài, từ vựng, ví dụ)? System prompt
ảnh hưởng đến hành vi model ra sao?** (3–4 câu)
> Phản hồi của giáo viên tiểu học dùng từ ngữ giản dị, kể chuyện tự nhiên và sử dụng ví dụ ẩn dụ trực quan. Ngược lại, chuyên gia tài chính sử dụng văn phong học thuật, định nghĩa chính xác bằng các thuật ngữ kỹ thuật chuyên sâu. System prompt ảnh hưởng đến hành vi model bằng cách định hình persona, giọng điệu, độ phức tạp của nội dung và phong cách trình bày. 

### Câu 2.2 — tiktoken vs đếm từ
Chọn một đoạn văn tiếng Việt ~100 từ. So sánh số token theo `count_tokens`
(tiktoken) với ước lượng `số từ / 0.75` mà Part 1 đã dùng.

**Hai con số chênh nhau bao nhiêu phần trăm? Vì sao tiếng Việt thường tốn
nhiều token hơn tiếng Anh cùng độ dài?**
> Với đoạn văn tiếng Việt ~100 từ, công thức ước lượng thô cho ra khoảng 133 token, trong khi đếm thực tế bằng tiktoken cho khoảng 150 – 165 token, chênh lệch khoảng 15% đến 25%. Nguyên nhân là do tiếng Việt dùng nhiều âm tiết đơn, mỗi từ có thể là nhiều hơn một âm tiết, mà tokenizer của OpenAI thường mã hóa mỗi âm tiết hoặc một phần nhỏ của âm tiết thành một token riêng biệt

---

## Block 3 — Streaming & Độ Bền (trả lời sau Checkpoint 3)

### Câu 3.1 — Trải nghiệm người dùng với streaming
**Streaming quan trọng nhất trong trường hợp nào, và khi nào thì
non-streaming lại phù hợp hơn?** (1 đoạn văn)
> Streaming quan trọng nhất trong các ứng dụng tương tác với người dùng nhằm tối ưu thời gian và tăng trải nhiệm người dùng. Ngược lại non-streaming phù hợp hơn trong các task ngầm, xử lý hàng loạt, khi cần đảm bảo tính toàn vẹn của toàn bộ phản hồi trước khi xử lý tiếp hoặc xuất dữ liệu có cấu trúc (JSON output) cần toàn bộ payload hoàn chỉnh để parse dữ liệu, cũng như các tác vụ kiểm duyệt an toàn nội dung trước khi hiển thị cho người dùng.

### Câu 3.2 — Vì sao backoff theo cấp số nhân?
**So với delay cố định (ví dụ luôn chờ 1 giây), exponential backoff có lợi
thế gì khi API bị quá tải? Điều gì xảy ra nếu hàng nghìn client cùng retry
> So với delay cố định, exponential backoff có lợi thế phản ứng nhanh với lỗi mạng thoáng qua ở lần thử đầu, đồng thời tự động kéo giãn thời gian chờ ngày càng dài ở các lần sau (0.1s -> 0.2s -> 0.4s...) để giảm áp lực truy vấn và tạo "khoảng thở" cho máy chủ tự hồi phục. Nếu hàng nghìn client cùng retry với delay cố định 1 giây, sẽ gây ra hiện tượng "Retry Storm" (cơn bão thử lại / thundering herd) khi tất cả client đồng loạt gửi lại request tại cùng một thời điểm, khiến máy chủ vừa chớm phục hồi lập tức bị quá tải nặng nề hơn và có nguy cơ sập hoàn toàn hệ thống.

---

## Block 4 — Mini-Project (trả lời sau Checkpoint 4)

### Câu 4.1 — Thiết kế persona
**Bạn chọn persona gì cho trợ lý của mình? Viết lại system prompt đó và giải
thích 1–2 lựa chọn từ ngữ quan trọng trong prompt (ví dụ: vì sao yêu cầu
"trả lời ngắn gọn", vì sao chỉ định ngôn ngữ...):**
> Persona được chọn: "Bạn là trợ giảng thân thiện của khóa AI, hỗ trợ giải đáp thắc mắc về lập trình và LLM API. Luôn trả lời ngắn gọn, súc tích bằng tiếng Việt, đi thẳng vào bản chất vấn đề kèm ví dụ minh họa." Lựa chọn từ ngữ quan trọng: (1) "trả lời ngắn gọn, súc tích bằng tiếng Việt" giúp tối ưu hóa chi phí token đầu ra, giảm độ trễ phản hồi và đảm bảo đúng ngôn ngữ tiếp nhận của sinh viên; (2) "đi thẳng vào bản chất vấn đề kèm ví dụ minh họa" giúp loại bỏ các câu mở đầu/kết thúc xã giao dư thừa, tập trung vào việc giải quyết nhanh vấn đề kỹ thuật cho người học.

### Câu 4.2 — Hạn chế & cải thiện
**Trợ lý của bạn hiện có hạn chế lớn nhất là gì (ví dụ: history chỉ 3 lượt,
không có bộ nhớ dài hạn, không kiểm duyệt nội dung...)? Đề xuất một cải
thiện cụ thể và mô tả ngắn cách triển khai:**
> Hạn chế lớn nhất: Bộ nhớ ngắn hạn chỉ duy trì tối đa 3 lượt hội thoại gần nhất và mất sạch khi tắt ứng dụng, không có khả năng ghi nhớ dài hạn về hồ sơ, tiến độ hay thói quen của người dùng. Cải thiện đề xuất: Triển khai cơ chế Tóm tắt ngữ cảnh (Rolling Summarization) kết hợp lưu trữ vào SQLite hoặc JSON. Khi hội thoại vượt quá 3 lượt, thay vì vứt bỏ, ta dùng GPT-4o-mini tóm tắt các lượt cũ thành một đoạn ngắn và đưa vào system prompt của các lượt tiếp theo. Đồng thời, lưu toàn bộ tin nhắn theo session_id để người dùng có thể tải lại lịch sử khi mở lại ứng dụng.

---

## Danh Sách Kiểm Tra Nộp Bài

- [x] `python grade.py` — xem điểm tự động, mục tiêu ≥ 75/100
- [x] Cả 4 checkpoint pytest đều pass
- [x] Tất cả 9 câu trong file này đã được trả lời
- [x] Đã copy bài làm vào folder `solution/`, push lên fork và dán link trên trang bài Lab ở VLearn trước 23:59 ngày 11/09/2026
