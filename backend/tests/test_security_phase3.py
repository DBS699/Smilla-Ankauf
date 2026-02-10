import pytest
from fastapi.testclient import TestClient
from unittest.mock import MagicMock, AsyncMock, patch
import pandas as pd
import io
import sys
import os

# Setup mock for MongoDB before importing app
sys.modules["motor.motor_asyncio"] = MagicMock()
mock_client = MagicMock()
mock_db = MagicMock()
mock_collection = AsyncMock()
mock_cursor = AsyncMock()

# Setup mock cursor behavior
# Motor find() returns a cursor immediately (not async), the cursor methods are async
mock_cursor = MagicMock()
mock_cursor.to_list = AsyncMock(return_value=[])

# IMPORTANT: find() must be a MagicMock (sync), not AsyncMock
mock_collection.find = MagicMock(return_value=mock_cursor)
mock_collection.find_one = AsyncMock(return_value=None)
mock_collection.insert_one = AsyncMock(return_value=AsyncMock(inserted_id="new_id"))
mock_collection.update_one = AsyncMock(return_value=AsyncMock(modified_count=1, matched_count=1))
mock_collection.delete_one = AsyncMock(return_value=AsyncMock(deleted_count=1))
mock_collection.delete_many = AsyncMock(return_value=AsyncMock(deleted_count=1))

# Wire DB connections
mock_client.__getitem__ = MagicMock(return_value=mock_db)
mock_db.purchases = mock_collection
mock_db.customers = mock_collection
mock_db.credit_transactions = mock_collection
mock_db.app_settings = mock_collection
mock_db.custom_categories = mock_collection
mock_db.price_matrix = mock_collection
mock_db.__getitem__ = MagicMock(return_value=mock_collection)

sys.modules["motor.motor_asyncio"].AsyncIOMotorClient = MagicMock(return_value=mock_client)

# Import app
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from server import app, create_access_token, check_rate_limit, login_attempts, USERS

client = TestClient(app)

def get_auth_headers(username, role):
    token = create_access_token(username, role)
    return {"Authorization": f"Bearer {token}"}

class TestSecurityPhase3:

    def setup_method(self):
        login_attempts.clear()
        mock_collection.reset_mock()
        mock_collection.find.return_value = mock_cursor
        mock_cursor.to_list.return_value = []

    def test_rbac_destructive_endpoints(self):
        """Verify that destructive endpoints are restricted to admins."""
        # Non-admin user
        headers = get_auth_headers("smilla", "mitarbeiter")
        
        # 1. DELETE /api/purchases/{id}
        response = client.delete("/api/purchases/123", headers=headers)
        assert response.status_code == 403
        
        # 2. DELETE /api/purchases (delete all)
        response = client.delete("/api/purchases", headers=headers)
        assert response.status_code == 403
        
        # 3. DELETE /api/customers/{id}
        response = client.delete("/api/customers/123", headers=headers)
        assert response.status_code == 403
        
        # 4. DELETE /api/price-matrix
        response = client.delete("/api/price-matrix", headers=headers)
        assert response.status_code == 403

        # 5. GET /api/customers/export/excel (PII Export)
        response = client.get("/api/customers/export/excel", headers=headers)
        assert response.status_code == 403

    def test_settings_password_hidden(self):
        """Verify that danger_zone_password is removed from settings response."""
        headers = get_auth_headers("admin", "admin")
        
        mock_settings = {
            "type": "general",
            "danger_zone_password": "SECRET_PASSWORD",
            "colors": {},
            "background": "paper"
        }
        mock_collection.find_one.return_value = mock_settings
        
        response = client.get("/api/settings", headers=headers)
        assert response.status_code == 200
        data = response.json()
        
        # Should NOT be in the response
        assert "danger_zone_password" not in data or data["danger_zone_password"] is None

    def test_audit_spoofing_manual_transaction(self):
        """Verify that staff_username query param is ignored."""
        headers = get_auth_headers("smilla", "mitarbeiter")
        
        mock_collection.find_one.return_value = {"id": "cust1", "current_balance": 100}
        
        payload = {
            "amount": 50,
            "type": "credit", # manual_credit
            "description": "Test"
        }
        
        # Try to spoof as 'admin' via query param (if it were supported)
        # Note: server.py signature changed to NOT accept it, but we test that the outcome is correct
        response = client.post(
            "/api/customers/cust1/transactions?staff_username=admin",
            json=payload,
            headers=headers
        )
        
        assert response.status_code == 200
        
        # Check what was inserted
        # db.credit_transactions.insert_one(doc)
        args, _ = mock_collection.insert_one.call_args
        inserted_doc = args[0]
        
        assert inserted_doc["staff_username"] == "smilla"
        assert inserted_doc["staff_username"] != "admin"

    def test_customer_export_sanitization(self):
        """Verify Excel sanitization in customer export."""
        headers = get_auth_headers("admin", "admin")
        
        # Mock malicious customer data
        mock_customers = [{
            "id": "C1",
            "first_name": "=cmd|' /C calc'!A0", 
            "last_name": "Doe",
            "email": "test@test.com",
            "current_balance": 100
        }]
        
        # We need two calls to to_list: one for customers, one for transactions
        mock_cursor.to_list.side_effect = [mock_customers, []]
        
        response = client.get("/api/customers/export/excel", headers=headers)
        assert response.status_code == 200
        assert response.headers["content-type"] == "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        
        # Read the excel back to verify content
        with io.BytesIO(response.content) as f:
            df = pd.read_excel(f, sheet_name="Kunden")
            # The value should be escaped with a single quote
            val = df.iloc[0]["Vorname"]
            assert val.startswith("'=") or val == "'=cmd|' /C calc'!A0"
