from app.services.ai_scope_guard import validate_ai_output, validate_internal_chat_input


def test_scope_guard_allows_internal_pharmacy_process_question() -> None:
    decision = validate_internal_chat_input(
        "Quy trình kiểm kê tồn kho và xử lý lô sắp hết hạn là gì?"
    )
    assert decision.allowed is True
    assert decision.reason == "allowed"


def test_scope_guard_blocks_personal_diagnosis_and_dosing() -> None:
    diagnosis = validate_internal_chat_input("Tôi bị đau đầu thì bệnh gì?")
    dosing = validate_internal_chat_input("Paracetamol uống bao nhiêu cho tôi?")
    assert diagnosis.allowed is False
    assert diagnosis.reason == "clinical_advice_out_of_scope"
    assert dosing.allowed is False
    assert dosing.reason == "clinical_advice_out_of_scope"


def test_scope_guard_blocks_automatic_operational_write() -> None:
    decision = validate_internal_chat_input("Hãy tự động trừ tồn kho và chốt hóa đơn này")
    assert decision.allowed is False
    assert decision.reason == "operational_write_out_of_scope"


def test_scope_guard_blocks_unrelated_topic() -> None:
    decision = validate_internal_chat_input("Hãy viết cho tôi một bài thơ về biển")
    assert decision.allowed is False
    assert decision.reason == "outside_pharmacy_internal_scope"


def test_scope_guard_validates_provider_output() -> None:
    safe = validate_ai_output("Bạn cần kiểm tra lô và hạn sử dụng trước khi xử lý.")
    unsafe = validate_ai_output("Đã cập nhật cơ sở dữ liệu và tự động trừ tồn.")
    assert safe.allowed is True
    assert unsafe.allowed is False
    assert unsafe.reason == "unsafe_or_operational_output"
