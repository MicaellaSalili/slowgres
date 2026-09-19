"""
API tests for Supabase Auth, Row Level Security (RLS) tenant isolation,
and entitlement quota enforcement.
"""

import asyncio
import base64
import hashlib
import hmac
import json
import time
import unittest
from typing import Optional

from api.auth import AuthenticatedUser, verify_supabase_jwt
from api.config import settings
from api.database import DatabaseRepository
from api.entitlements import PlanType, get_entitlements
from api.routers.analyses import (
    create_analysis,
    delete_analysis_by_id,
    get_analysis_by_id,
    list_analyses,
)
from api.schemas import AnalysisCreateRequest
from fastapi import HTTPException


def create_mock_jwt(
    user_id: str,
    email: str,
    org_id: str,
    exp_offset_seconds: int = 3600,
    secret: str = settings.SUPABASE_JWT_SECRET,
) -> str:
    """Mints a valid HMAC-SHA256 Supabase test JWT."""
    header = {"alg": "HS256", "typ": "JWT"}
    payload = {
        "sub": user_id,
        "email": email,
        "org_id": org_id,
        "role": "authenticated",
        "exp": int(time.time()) + exp_offset_seconds,
    }

    def b64url(data: bytes) -> str:
        return base64.urlsafe_b64encode(data).decode("utf-8").rstrip("=")

    h_str = b64url(json.dumps(header).encode("utf-8"))
    p_str = b64url(json.dumps(payload).encode("utf-8"))
    signing_input = f"{h_str}.{p_str}".encode("utf-8")

    sig = hmac.new(secret.encode("utf-8"), signing_input, hashlib.sha256).digest()
    sig_str = b64url(sig)

    return f"{h_str}.{p_str}.{sig_str}"


class TestAuthAndRLS(unittest.IsolatedAsyncioTestCase):
    async def asyncSetUp(self):
        # Fresh isolated database repository for each test
        self.test_db = DatabaseRepository()
        # Patch the router's global db with our test db
        import api.routers.analyses as analyses_module
        self.orig_db = analyses_module.db
        analyses_module.db = self.test_db

    async def asyncTearDown(self):
        import api.routers.analyses as analyses_module
        analyses_module.db = self.orig_db

    # -------------------------------------------------------------------------
    # 1. JWT Authentication Tests
    # -------------------------------------------------------------------------
    def test_valid_jwt_decodes_claims(self):
        token = create_mock_jwt(user_id="user-123", email="user1@example.com", org_id="org-aaa")
        claims = verify_supabase_jwt(token, settings.SUPABASE_JWT_SECRET)
        self.assertEqual(claims["sub"], "user-123")
        self.assertEqual(claims["email"], "user1@example.com")
        self.assertEqual(claims["org_id"], "org-aaa")

    def test_expired_jwt_rejected(self):
        token = create_mock_jwt(user_id="user-123", email="user1@example.com", org_id="org-aaa", exp_offset_seconds=-10)
        with self.assertRaises(HTTPException) as ctx:
            verify_supabase_jwt(token, settings.SUPABASE_JWT_SECRET)
        self.assertEqual(ctx.exception.status_code, 401)
        self.assertIn("expired", ctx.exception.detail)

    def test_tampered_jwt_signature_rejected(self):
        token = create_mock_jwt(user_id="user-123", email="user1@example.com", org_id="org-aaa", secret="wrong-secret")
        with self.assertRaises(HTTPException) as ctx:
            verify_supabase_jwt(token, settings.SUPABASE_JWT_SECRET)
        self.assertEqual(ctx.exception.status_code, 401)
        self.assertIn("Invalid JWT signature", ctx.exception.detail)

    # -------------------------------------------------------------------------
    # 2. RLS Multi-Tenant Isolation Tests (User A vs User B)
    # -------------------------------------------------------------------------
    async def test_rls_tenant_isolation(self):
        # User A belongs to Org A
        user_a = AuthenticatedUser(id="user-a", email="a@org-a.com", org_id="org-a", claims={})
        # User B belongs to Org B
        user_b = AuthenticatedUser(id="user-b", email="b@org-b.com", org_id="org-b", claims={})

        valid_plan = {
            "Plan": {
                "Node Type": "Seq Scan",
                "Relation Name": "confidential_orders",
                "Actual Rows": 100,
                "Actual Loops": 1,
            }
        }

        # Step 1: User A creates an analysis in Org A
        req = AnalysisCreateRequest(plan_json=valid_plan, query_text="SELECT * FROM confidential_orders")
        created_a = await create_analysis(req, user=user_a)
        analysis_id = created_a["id"]

        # Step 2: User A can view their own analysis
        view_a = await get_analysis_by_id(analysis_id, user=user_a)
        self.assertEqual(view_a["id"], analysis_id)
        self.assertEqual(view_a["org_id"], "org-a")

        # Step 3: User B (in Org B) attempts to read User A's analysis -> MUST return 404 (RLS check)
        with self.assertRaises(HTTPException) as ctx:
            await get_analysis_by_id(analysis_id, user=user_b)
        self.assertEqual(ctx.exception.status_code, 404)

        # Step 4: User B lists analyses -> Org A's analysis must NOT appear
        history_b = await list_analyses(page=1, page_size=20, user=user_b)
        self.assertEqual(history_b["total"], 0)
        self.assertEqual(len(history_b["items"]), 0)

        # User A lists analyses -> Org A's analysis is present
        history_a = await list_analyses(page=1, page_size=20, user=user_a)
        self.assertEqual(history_a["total"], 1)
        self.assertEqual(history_a["items"][0]["id"], analysis_id)

        # Step 5: User B attempts to DELETE User A's analysis -> MUST return 404 (RLS check)
        with self.assertRaises(HTTPException) as ctx:
            await delete_analysis_by_id(analysis_id, user=user_b)
        self.assertEqual(ctx.exception.status_code, 404)

        # Confirm analysis still exists
        view_after_unauthorized_delete = await get_analysis_by_id(analysis_id, user=user_a)
        self.assertIsNotNone(view_after_unauthorized_delete)

        # Step 6: User A can delete their own analysis
        await delete_analysis_by_id(analysis_id, user=user_a)
        with self.assertRaises(HTTPException) as ctx:
            await get_analysis_by_id(analysis_id, user=user_a)
        self.assertEqual(ctx.exception.status_code, 404)

    # -------------------------------------------------------------------------
    # 3. Input Validation & Error Handling
    # -------------------------------------------------------------------------
    async def test_invalid_plan_rejected_with_400(self):
        user = AuthenticatedUser(id="user-1", email="u@test.com", org_id="org-1", claims={})
        req = AnalysisCreateRequest(plan_json="not a valid json object or array")

        with self.assertRaises(HTTPException) as ctx:
            await create_analysis(req, user=user)
        self.assertEqual(ctx.exception.status_code, 400)
        self.assertIn("Invalid PostgreSQL plan format", ctx.exception.detail)

    # -------------------------------------------------------------------------
    # 4. Entitlements & Daily Quota Limit Enforcement
    # -------------------------------------------------------------------------
    async def test_daily_analysis_quota_enforcement(self):
        user = AuthenticatedUser(id="user-quota", email="quota@test.com", org_id="org-quota", claims={})
        # Simulate free tier with limit of 10
        await self.test_db.set_subscription("org-quota", plan="free", status="active")

        # Artificially set usage to limit
        entitlements = await get_entitlements("org-quota", self.test_db)
        for _ in range(entitlements.daily_analysis_limit):
            await self.test_db.increment_daily_usage("org-quota", "analysis_run")

        valid_plan = {"Plan": {"Node Type": "Seq Scan", "Actual Rows": 1, "Actual Loops": 1}}
        req = AnalysisCreateRequest(plan_json=valid_plan)

        # Next request must be rejected with 429
        with self.assertRaises(HTTPException) as ctx:
            await create_analysis(req, user=user)
        self.assertEqual(ctx.exception.status_code, 429)
        self.assertIn("Daily analysis quota reached", ctx.exception.detail)
        self.assertIn("Upgrade to Premium", ctx.exception.detail)


if __name__ == "__main__":
    unittest.main()
