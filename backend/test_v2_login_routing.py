"""
Smoke tests for the v2 login route.

The v2 login is rendered client-side by the React router in
main-client-v2.jsx when ?screen=login is present. These tests verify:
  - /v2/login redirects to /v2?screen=login
  - /v2?screen=login serves the same v2 HTML (routing is client-side)
  - The legacy /login still works (no regression)
"""
import pytest
from fastapi.testclient import TestClient


@pytest.fixture(scope="module")
def client():
    import api
    # follow_redirects=False so we can assert the 302 explicitly
    return TestClient(api.app)


def test_v2_login_path_redirects(client):
    """/v2/login should 302 → /v2?screen=login"""
    r = client.get("/v2/login", follow_redirects=False)
    assert r.status_code in (302, 307)
    location = r.headers.get("location", "")
    assert "screen=login" in location
    assert "/v2" in location


def test_v2_login_redirect_followed_returns_v2_html(client):
    """Following the redirect should return the v2 HTML (React routes client-side)."""
    r = client.get("/v2/login", follow_redirects=True)
    assert r.status_code == 200
    # Should be the v2 client HTML (references clientV2 bundle or v2 module)
    assert "clientV2" in r.text or "main-client-v2" in r.text


def test_v2_with_login_query_serves_v2_html(client):
    """Direct ?screen=login on /v2 serves the v2 HTML."""
    r = client.get("/v2?screen=login")
    assert r.status_code == 200
    assert "<div id=\"root\">" in r.text


def test_legacy_login_still_works(client):
    """Regression: /login must still serve the v24 login page."""
    r = client.get("/login")
    assert r.status_code == 200
    # v24 login HTML references the legacy login bundle
    assert "login" in r.text.lower()
    # And does NOT reference the v2 bundle
    assert "clientV2" not in r.text
