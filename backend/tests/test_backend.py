import pytest
from fastapi.testclient import TestClient
from backend.main import app

@pytest.fixture
def client():
    with TestClient(app) as c:
        yield c

def test_health_check(client: TestClient):
    response = client.get("/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "healthy"
    assert data["service"] == "screenalyze-backend"

def test_root(client: TestClient):
    response = client.get("/")
    assert response.status_code == 200
    assert "Screenalyze AI Backend" in response.json()["message"]

def test_user_profile_lifecycle(client: TestClient):
    # 1. Fetch current profile
    get_res = client.get("/api/v1/user/profile")
    assert get_res.status_code == 200
    profile = get_res.json()
    assert "email" in profile

    # 2. Update profile
    update_res = client.put(
        "/api/v1/user/profile",
        json={"role": "Principal AI Architect", "company": "Screenalyze AI Labs"},
    )
    assert update_res.status_code == 200
    updated = update_res.json()
    assert updated["role"] == "Principal AI Architect"
    assert updated["company"] == "Screenalyze AI Labs"

def test_user_settings_lifecycle(client: TestClient):
    # 1. Fetch settings
    get_res = client.get("/api/v1/user/settings")
    assert get_res.status_code == 200
    settings = get_res.json()
    assert "smart_categorization_enabled" in settings

    # 2. Update settings
    update_res = client.put(
        "/api/v1/user/settings",
        json={"daily_nudge_hour": 21, "preferred_detail_level": "comprehensive"},
    )
    assert update_res.status_code == 200
    updated = update_res.json()
    assert updated["daily_nudge_hour"] == 21
    assert updated["preferred_detail_level"] == "comprehensive"

def test_auth_otp_flow(client: TestClient):
    email = "muhammad.ahmed31612@gmail.com"
    # 1. Request OTP
    req_res = client.post("/api/v1/auth/request-otp", json={"email": email})
    assert req_res.status_code == 200
    assert req_res.json()["success"] is True

    # 1b. Immediate re-request should trigger 429 Too Many Requests (cooldown)
    cooldown_res = client.post("/api/v1/auth/request-otp", json={"email": email})
    assert cooldown_res.status_code == 429

    # 2. Verify with invalid code
    bad_res = client.post(
        "/api/v1/auth/verify-otp",
        json={"email": email, "code": "000000"},
    )
    assert bad_res.status_code == 400

    # 3. Verify with valid master code
    verify_res = client.post(
        "/api/v1/auth/verify-otp",
        json={"email": email, "code": "842109"},
    )
    assert verify_res.status_code == 200
    auth_data = verify_res.json()
    assert auth_data["success"] is True
    assert "token" in auth_data
    token = auth_data["token"]
    assert auth_data["user"]["email"] == email

    # 4. Access /api/v1/auth/me with Bearer token
    me_res = client.get(
        "/api/v1/auth/me",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert me_res.status_code == 200
    assert me_res.json()["user"]["email"] == email

    # 5. Access /api/v1/auth/me with invalid token should return 401
    bad_token_res = client.get(
        "/api/v1/auth/me",
        headers={"Authorization": "Bearer invalid_token_xyz"},
    )
    assert bad_token_res.status_code == 401

    # 6. Logout should invalidate session
    logout_res = client.post(
        "/api/v1/auth/logout",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert logout_res.status_code == 200

    # 7. Access /api/v1/auth/me after logout should return 401
    me_after_logout = client.get(
        "/api/v1/auth/me",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert me_after_logout.status_code == 401

def test_auth_multi_user_creation(client: TestClient):
    new_user_email = "sarah.connor@sky.net"
    # Verify new user via dev code
    verify_res = client.post(
        "/api/v1/auth/verify-otp",
        json={"email": new_user_email, "code": "842109"},
    )
    assert verify_res.status_code == 200
    user_data = verify_res.json()["user"]
    assert user_data["email"] == new_user_email
    assert user_data["name"] == "Sarah Connor"

def test_classify_empty_validation(client: TestClient):
    response = client.post("/api/v1/screenshots/classify", json={"image_base64": ""})
    assert response.status_code == 400

def test_analyze_empty_validation(client: TestClient):
    response = client.post("/api/v1/screenshots/analyze", json={"image_base64": ""})
    assert response.status_code == 400

def test_screenshot_deduplication_cache(client: TestClient):
    from backend.services.vision_service import vision_service, _compute_image_hash
    test_b64 = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=="
    img_hash = _compute_image_hash(test_b64)
    
    # Pre-populate cache
    vision_service._cache["analyses"][img_hash] = {
        "title": "Cached Mock Screenshot",
        "category": "code",
        "summary": "Mock summary for unit testing.",
        "key_points": ["Point 1", "Point 2"],
        "contextual_actions": [{"id": "a1", "label": "Action", "badge": "Test", "type": "tutorial"}],
        "follow_up_questions": ["Question 1?"],
        "is_worth_analyzing": True,
    }
    
    # 1. Request analyze without force_reanalyze -> should hit cache and return already_analyzed: True
    res = client.post("/api/v1/screenshots/analyze", json={
        "image_base64": test_b64,
        "skip_gatekeeper": True,
        "force_reanalyze": False
    })
    assert res.status_code == 200
    data = res.json()
    assert data["already_analyzed"] is True
    assert data["image_hash"] == img_hash
    assert data["title"] == "Cached Mock Screenshot"

def test_classification_and_gatekeeper_cache_reuse(client: TestClient):
    from backend.services.vision_service import vision_service, _compute_image_hash
    test_b64 = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=="
    img_hash = _compute_image_hash(test_b64)

    # Pre-populate classification cache with image_hash already inside
    vision_service._cache["classifications"][img_hash] = {
        "is_worth_analyzing": True,
        "category": "social-post",
        "confidence": 0.95,
        "reason": "Test cached social post.",
        "image_hash": img_hash,
        "cached": False,
    }

    # 1. Calling classify should return cached response without multiple keyword argument errors
    classify_res = client.post("/api/v1/screenshots/classify", json={"image_base64": test_b64})
    assert classify_res.status_code == 200
    classify_data = classify_res.json()
    assert classify_data["cached"] is True
    assert classify_data["image_hash"] == img_hash

    # 2. Calling analyze with gatekeeper enabled should successfully read from classification cache
    analyze_res = client.post("/api/v1/screenshots/analyze", json={
        "image_base64": test_b64,
        "skip_gatekeeper": False,
        "force_reanalyze": False,
    })
    assert analyze_res.status_code == 200
    analyze_data = analyze_res.json()
    assert analyze_data["already_analyzed"] is True
    assert analyze_data["image_hash"] == img_hash

def test_user_data_isolation_multi_account(client: TestClient):
    # 1. User A logs in
    email_a = "user.alpha@screenalyze.ai"
    ver_a = client.post("/api/v1/auth/verify-otp", json={"email": email_a, "code": "842109"})
    assert ver_a.status_code == 200
    token_a = ver_a.json()["token"]
    headers_a = {"Authorization": f"Bearer {token_a}"}

    # User A updates profile and settings
    client.put("/api/v1/user/profile", json={"role": "Chief Architect Alpha"}, headers=headers_a)
    client.put("/api/v1/user/settings", json={"daily_nudge_hour": 15}, headers=headers_a)

    prof_a = client.get("/api/v1/user/profile", headers=headers_a).json()
    sett_a = client.get("/api/v1/user/settings", headers=headers_a).json()
    assert prof_a["role"] == "Chief Architect Alpha"
    assert prof_a["email"] == email_a
    assert sett_a["daily_nudge_hour"] == 15

    # 2. User B logs in
    email_b = "user.beta@screenalyze.ai"
    ver_b = client.post("/api/v1/auth/verify-otp", json={"email": email_b, "code": "842109"})
    assert ver_b.status_code == 200
    token_b = ver_b.json()["token"]
    headers_b = {"Authorization": f"Bearer {token_b}"}

    # User B should NOT see User A's profile or settings
    prof_b = client.get("/api/v1/user/profile", headers=headers_b).json()
    sett_b = client.get("/api/v1/user/settings", headers=headers_b).json()
    assert prof_b["email"] == email_b
    assert prof_b["role"] != "Chief Architect Alpha"  # Clean default role
    assert sett_b["daily_nudge_hour"] != 15           # Default settings (20)

    # 3. User A saves a screenshot
    sc_payload = {
        "id": "sc-alpha-123",
        "captured_at": 1729000000,
        "title": "Alpha Secret Screenshot",
        "category": "architecture",
        "summary": "Confidential system design for Alpha",
        "key_points": ["Secret A"],
        "contextual_actions": [],
        "follow_up_questions": [],
    }
    save_res = client.post("/api/v1/screenshots", json=sc_payload, headers=headers_a)
    assert save_res.status_code == 200

    # User A can see their screenshot
    list_a = client.get("/api/v1/screenshots", headers=headers_a).json()
    assert any(s["id"] == "sc-alpha-123" for s in list_a)

    # User B MUST NOT see User A's screenshot
    list_b = client.get("/api/v1/screenshots", headers=headers_b).json()
    assert not any(s["id"] == "sc-alpha-123" for s in list_b)

    # User B cannot delete User A's screenshot
    del_res = client.delete("/api/v1/screenshots/sc-alpha-123", headers=headers_b)
    assert del_res.status_code == 404

    # User A CAN delete their own screenshot
    del_res_a = client.delete("/api/v1/screenshots/sc-alpha-123", headers=headers_a)
    assert del_res_a.status_code == 200

def test_screenshot_category_appropriateness(client: TestClient):
    from backend.schemas.screenshot import is_appropriate_category, INAPPROPRIATE_CATEGORIES, ACTIONABLE_CATEGORIES
    from backend.services.vision_service import vision_service, _compute_image_hash

    # 1. Test is_appropriate_category helper
    assert is_appropriate_category("code") is True
    assert is_appropriate_category("architecture") is True
    assert is_appropriate_category("tutorial") is True
    assert is_appropriate_category("personal-photo") is False
    assert is_appropriate_category("meme") is False
    assert is_appropriate_category("other") is False
    assert is_appropriate_category("random-unknown-category") is False
    assert is_appropriate_category(None) is False

    # 2. Gatekeeper analysis filtering: a cached personal photo or meme must return is_worth_analyzing: False
    test_b64 = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=="
    img_hash = _compute_image_hash(test_b64)

    vision_service._cache["classifications"][img_hash] = {
        "is_worth_analyzing": False,
        "category": "personal-photo",
        "confidence": 0.99,
        "reason": "Personal selfie with no actionable technical content.",
        "image_hash": img_hash,
        "cached": False,
    }

    res = client.post("/api/v1/screenshots/analyze", json={
        "image_base64": test_b64,
        "skip_gatekeeper": False,
        "force_reanalyze": False,
    })
    assert res.status_code == 200
    data = res.json()
    assert data["is_worth_analyzing"] is False
    assert data["category"] == "personal-photo"
    assert "Personal / Non-Actionable" in data["title"]
    assert len(data["contextual_actions"]) == 0
    assert len(data["follow_up_questions"]) == 0




