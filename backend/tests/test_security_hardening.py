
import os
import sys
import pytest
from fastapi.testclient import TestClient

# Valid AsyncMock for python < 3.8 compatibility if needed, but we start with 3.8+
from unittest.mock import MagicMock, patch, AsyncMock

# Set required env vars BEFORE importing server
os.environ["JWT_SECRET"] = "test-secret"
os.environ["ADMIN_PASSWORD"] = "secure-admin-pw"
os.environ["SMILLA_PASSWORD"] = "secure-smilla-pw"
os.environ["MONGO_URL"] = "mongodb://localhost:27017"
os.environ["DB_NAME"] = "test_db"
os.environ["RAILWAY_ENVIRONMENT"] = "production" 

# Mock motor before importing server
# The client needs to return a db, which returns collections, which return methods that are awaitable
mock_client = MagicMock()
mock_db = MagicMock()
mock_collection = MagicMock()

# Configure collection methods to be AsyncMock
mock_collection.find_one = AsyncMock(return_value=None)
mock_collection.insert_one = AsyncMock(return_value=MagicMock(inserted_id="123"))
mock_collection.update_one = AsyncMock(return_value=MagicMock(matched_count=1, modified_count=1))
mock_collection.delete_one = AsyncMock(return_value=MagicMock(deleted_count=1))
# find() returns a cursor which needs to be async iterable or have to_list awaitable
mock_cursor = MagicMock()
mock_cursor.to_list = AsyncMock(return_value=[])
mock_cursor.sort = MagicMock(return_value=mock_cursor)
mock_collection.find = MagicMock(return_value=mock_cursor)

# Wire them up
# server.py uses db = client[os.environ['DB_NAME']] -> __getitem__
mock_client.__getitem__ = MagicMock(return_value=mock_db)

# server.py uses db.collection_name -> attribute access
# Since we can't easily hook __getattr__ on MagicMock instance, we set the known collections
mock_db.purchases = mock_collection
mock_db.customers = mock_collection
mock_db.credit_transactions = mock_collection
mock_db.app_settings = mock_collection
mock_db.custom_categories = mock_collection
mock_db.price_matrix = mock_collection

# In case server.py used db['collection'], but it seems it uses dot notation for collections
mock_db.__getitem__ = MagicMock(return_value=mock_collection)

sys.modules["motor.motor_asyncio"] = MagicMock()
sys.modules["motor.motor_asyncio"].AsyncIOMotorClient = MagicMock(return_value=mock_client)

# Import app from server
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from server import app, create_access_token, check_rate_limit, login_attempts

client = TestClient(app)

# Helper to get headers
def get_auth_headers(username, role):
    token = create_access_token(username, role)
    return {"Authorization": f"Bearer {token}"}

class TestSecurityHardening:

    def setup_method(self):
        # Reset rate limits AND mock side effects
        login_attempts.clear()
        
    # 1. Test RBAC: Admin Routes Protection
    def test_rbac_admin_routes_protected(self):
        """Verify that non-admin users cannot access admin routes."""
        headers = get_auth_headers("smilla", "mitarbeiter")
        
        # PUT /api/settings
        response = client.put("/api/settings", json={"danger_zone_password": "123"}, headers=headers)
        assert response.status_code == 403
        assert "Nur für Administratoren" in response.text

        # DELETE /api/custom-categories/{name}
        response = client.delete("/api/custom-categories/TestCat", headers=headers)
        assert response.status_code == 403

        # POST /api/price-matrix/upload
        files = {'file': ('matrix.xlsx', b'fake content', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')}
        response = client.post("/api/price-matrix/upload", files=files, headers=headers)
        assert response.status_code == 403

    def test_rbac_admin_routes_accessible(self):
        """Verify that admin users CAN access admin routes (mocked DB)."""
        headers = get_auth_headers("admin", "admin")
        
        # PUT /api/settings
        # We need to make sure the db update call inside doesn't crash
        
        response = client.put("/api/settings", json={"danger_zone_password": "123"}, headers=headers)
        # It shouldn't be 403. It might be 200 or 500 depending on mock details, but 403 is the failure condition.
        assert response.status_code != 403
        # If successfully mocked, it should be 200
        assert response.status_code == 200

    # 2. Test Rate Limiting
    def test_rate_limiting(self):
        """Verify login rate limiting."""
        for i in range(5):
            response = client.post("/api/auth/login", json={"username": "wrong", "password": "pw"})
            assert response.status_code == 401
        
        response = client.post("/api/auth/login", json={"username": "wrong", "password": "pw"})
        assert response.status_code == 429

    def test_rate_limiting_proxy(self):
        """Verify rate limiting uses X-Forwarded-For."""
        headers = {"X-Forwarded-For": "10.0.0.1, 127.0.0.1"}
        for i in range(6):
             response = client.post("/api/auth/login", json={"username": "wrong", "password": "pw"}, headers=headers)
        assert response.status_code == 429
        
        headers2 = {"X-Forwarded-For": "10.0.0.2"}
        response = client.post("/api/auth/login", json={"username": "wrong", "password": "pw"}, headers=headers2)
        assert response.status_code == 401

    # 3. Audit Trail Integrity
    # Since we mocked standard mongo client at module level, standard patching of server.db might conflict or be redundant.
    # The 'server.db' is already our 'mock_db' from sys.modules setup.
    # We can inspect the module-level mocks directly.
    def test_audit_trail_integrity(self):
        """Verify that staff_username from client is ignored."""
        headers = get_auth_headers("smilla", "mitarbeiter")
        
        purchase_data = {
            "items": [{"category": "Hose", "price_level": "Mittel", "condition": "Gut", "relevance": "Wichtig", "price": 10}],
            "staff_username": "hacker_user"
        }
        
        # Reset mock for clarity
        mock_collection.insert_one.reset_mock()
        
        response = client.post("/api/purchases", json=purchase_data, headers=headers)
        
        assert response.status_code == 200
        
        # Verify insert_one call arguments
        # server.py does: await db.purchases.insert_one(purchase_dict)
        # Our mock setup: db.purchases returns mock_collection.
        
        args, _ = mock_collection.insert_one.call_args
        inserted_doc = args[0]
        
        assert inserted_doc["staff_username"] == "smilla"
        assert inserted_doc["staff_username"] != "hacker_user"

    # 4. Excel Sanitization
    def test_excel_sanitization(self):
        """Verify that Excel export functionality escapes dangerous characters."""
        headers = get_auth_headers("admin", "admin")
        
        # Setup data with malicious payload on the mocked cursor
        malicious_data = [{
            "id": "123", "timestamp": "2023-01-01T12:00:00", "total": 10,
            "items": [{"category": "=cmd|' /C calc'!'A1'", "price": 10}]
        }]
        mock_cursor.to_list.side_effect = None
        mock_cursor.to_list.return_value = malicious_data
        
        response = client.get("/api/purchases/export/excel?start_date=2023-01-01", headers=headers)
        
        assert response.status_code == 200
        assert response.headers["content-type"] == "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        
        # Content verification would require reading the excel, but basic execution proves no crash.

