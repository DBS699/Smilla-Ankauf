import requests
import sys
import json
from datetime import datetime

class ReWearPOSAPITester:
    def __init__(self, base_url="https://apparel-inventory-8.preview.emergentagent.com"):
        self.base_url = base_url
        self.tests_run = 0
        self.tests_passed = 0
        self.created_purchase_id = None

    def run_test(self, name, method, endpoint, expected_status, data=None, params=None):
        """Run a single API test"""
        url = f"{self.base_url}/{endpoint}"
        headers = {'Content-Type': 'application/json'}

        self.tests_run += 1
        print(f"\n🔍 Testing {name}...")
        print(f"   URL: {url}")
        
        try:
            if method == 'GET':
                response = requests.get(url, headers=headers, params=params, timeout=10)
            elif method == 'POST':
                response = requests.post(url, json=data, headers=headers, timeout=10)
            elif method == 'PUT':
                response = requests.put(url, json=data, headers=headers, timeout=10)
            elif method == 'DELETE':
                response = requests.delete(url, headers=headers, timeout=10)

            success = response.status_code == expected_status
            if success:
                self.tests_passed += 1
                print(f"✅ Passed - Status: {response.status_code}")
                try:
                    response_data = response.json()
                    print(f"   Response: {json.dumps(response_data, indent=2)[:200]}...")
                    return True, response_data
                except:
                    return True, {}
            else:
                print(f"❌ Failed - Expected {expected_status}, got {response.status_code}")
                try:
                    error_data = response.json()
                    print(f"   Error: {error_data}")
                except:
                    print(f"   Error: {response.text}")
                return False, {}

        except Exception as e:
            print(f"❌ Failed - Error: {str(e)}")
            return False, {}

    def test_root_endpoint(self):
        """Test root API endpoint"""
        return self.run_test("Root Endpoint", "GET", "api/", 200)

    def test_get_categories(self):
        """Test categories endpoint"""
        success, response = self.run_test("Get Categories", "GET", "api/categories", 200)
        if success:
            # Verify response structure includes new relevance_levels
            required_fields = ['categories', 'price_levels', 'conditions', 'relevance_levels']
            if all(field in response for field in required_fields):
                print("   ✅ Categories structure is correct (includes relevance_levels)")
                print(f"   📋 Relevance levels: {response.get('relevance_levels', [])}")
                return True
            else:
                print("   ❌ Categories structure is incorrect - missing relevance_levels")
                return False
        return False

    def test_create_purchase(self):
        """Test creating a purchase with relevance"""
        test_items = [
            {
                "category": "Jeans",
                "price_level": "Mittel",
                "condition": "Gebraucht/Gut",
                "relevance": "Wichtig",
                "price": 25.50
            },
            {
                "category": "Shirts",
                "price_level": "Günstig",
                "condition": "Kaum benutzt",
                "relevance": "Stark relevant",
                "price": 15.00
            }
        ]
        
        success, response = self.run_test(
            "Create Purchase",
            "POST",
            "api/purchases",
            200,
            data={"items": test_items}
        )
        
        if success and 'id' in response:
            self.created_purchase_id = response['id']
            print(f"   ✅ Purchase created with ID: {self.created_purchase_id}")
            
            # Verify total calculation
            expected_total = sum(item['price'] for item in test_items)
            if abs(response.get('total', 0) - expected_total) < 0.01:
                print(f"   ✅ Total calculation correct: {response['total']}")
                
                # Verify items include relevance
                items = response.get('items', [])
                if all('relevance' in item for item in items):
                    print(f"   ✅ All items include relevance field")
                    return True
                else:
                    print(f"   ❌ Some items missing relevance field")
                    return False
            else:
                print(f"   ❌ Total calculation incorrect: expected {expected_total}, got {response.get('total')}")
                return False
        return False

    def test_get_purchases(self):
        """Test getting all purchases"""
        success, response = self.run_test("Get All Purchases", "GET", "api/purchases", 200)
        if success and isinstance(response, list):
            print(f"   ✅ Found {len(response)} purchases")
            return True
        return False

    def test_get_single_purchase(self):
        """Test getting a single purchase by ID"""
        if not self.created_purchase_id:
            print("   ⚠️  Skipping - No purchase ID available")
            return True
            
        success, response = self.run_test(
            "Get Single Purchase",
            "GET",
            f"api/purchases/{self.created_purchase_id}",
            200
        )
        
        if success and response.get('id') == self.created_purchase_id:
            print(f"   ✅ Purchase retrieved correctly")
            return True
        return False

    def test_today_stats(self):
        """Test today's statistics"""
        success, response = self.run_test("Get Today Stats", "GET", "api/stats/today", 200)
        if success:
            required_fields = ['date', 'total_purchases', 'total_amount', 'total_items']
            if all(field in response for field in required_fields):
                print(f"   ✅ Today stats structure correct")
                print(f"   📊 Today: {response['total_purchases']} purchases, CHF {response['total_amount']}, {response['total_items']} items")
                return True
            else:
                print(f"   ❌ Missing required fields in today stats")
                return False
        return False

    def test_daily_stats(self):
        """Test daily statistics"""
        success, response = self.run_test("Get Daily Stats", "GET", "api/stats/daily", 200, params={"days": 7})
        if success and isinstance(response, list):
            print(f"   ✅ Daily stats returned {len(response)} days")
            return True
        return False

    def test_monthly_stats(self):
        """Test monthly statistics"""
        success, response = self.run_test("Get Monthly Stats", "GET", "api/stats/monthly", 200, params={"months": 6})
        if success and isinstance(response, list):
            print(f"   ✅ Monthly stats returned {len(response)} months")
            return True
        return False

    def test_price_matrix_lookup(self):
        """Test price matrix lookup functionality"""
        success, response = self.run_test(
            "Price Matrix Lookup",
            "GET",
            "api/price-matrix/lookup",
            200,
            params={
                "category": "Jeans",
                "price_level": "Mittel",
                "condition": "Gebraucht/Gut",
                "relevance": "Wichtig"
            }
        )
        
        if success:
            if 'found' in response and 'fixed_price' in response:
                print(f"   ✅ Price lookup structure correct")
                print(f"   💰 Fixed price found: {response.get('found')}, Price: {response.get('fixed_price')}")
                return True
            else:
                print(f"   ❌ Price lookup response structure incorrect")
                return False
        return False

    def test_price_matrix_download(self):
        """Test price matrix Excel download"""
        success, response = self.run_test(
            "Price Matrix Download",
            "GET",
            "api/price-matrix/download",
            200
        )
        
        if success:
            print(f"   ✅ Price matrix download endpoint accessible")
            return True
        return False

    def test_price_matrix_get(self):
        """Test getting price matrix entries"""
        success, response = self.run_test(
            "Get Price Matrix",
            "GET",
            "api/price-matrix",
            200
        )
        
        if success and isinstance(response, list):
            print(f"   ✅ Price matrix returned {len(response)} entries")
            return True
        return False

    def test_delete_purchase(self):
        """Test deleting a purchase"""
        if not self.created_purchase_id:
            print("   ⚠️  Skipping - No purchase ID available")
            return True
            
        success, response = self.run_test(
            "Delete Purchase",
            "DELETE",
            f"api/purchases/{self.created_purchase_id}",
            200
        )
        
        if success:
            print(f"   ✅ Purchase deleted successfully")
            return True
        return False

    def test_custom_categories(self):
        """Test custom categories functionality"""
        # Test getting custom categories
        success, response = self.run_test(
            "Get Custom Categories",
            "GET",
            "api/custom-categories",
            200
        )
        
        if not success:
            return False
            
        initial_count = len(response) if isinstance(response, list) else 0
        print(f"   📋 Initial custom categories: {initial_count}")
        
        # Test adding a custom category
        test_category = f"Test_Category_{datetime.now().strftime('%H%M%S')}"
        success, response = self.run_test(
            "Add Custom Category",
            "POST",
            "api/custom-categories",
            200,
            data={"name": test_category}
        )
        
        if not success:
            return False
            
        # Verify category was added
        success, response = self.run_test(
            "Get Custom Categories After Add",
            "GET",
            "api/custom-categories",
            200
        )
        
        if success and isinstance(response, list):
            if test_category in response:
                print(f"   ✅ Custom category '{test_category}' added successfully")
                
                # Test deleting the custom category
                success, response = self.run_test(
                    "Delete Custom Category",
                    "DELETE",
                    f"api/custom-categories/{test_category}",
                    200
                )
                
                if success:
                    print(f"   ✅ Custom category '{test_category}' deleted successfully")
                    return True
                else:
                    print(f"   ❌ Failed to delete custom category")
                    return False
            else:
                print(f"   ❌ Custom category '{test_category}' not found after adding")
                return False
        return False

    def test_settings(self):
        """Test settings functionality"""
        # Test getting settings
        success, response = self.run_test(
            "Get Settings",
            "GET",
            "api/settings",
            200
        )
        
        if not success:
            return False
            
        # Verify settings structure
        if 'colors' in response:
            colors = response['colors']
            required_colors = ['luxus', 'teuer', 'mittel', 'guenstig']
            if all(color in colors for color in required_colors):
                print(f"   ✅ Settings structure correct with all color keys")
                print(f"   🎨 Colors: {colors}")
                
                # Test updating settings
                test_settings = {
                    "danger_zone_password": "test123",
                    "colors": {
                        "luxus": "#FF0000",
                        "teuer": "#00FF00", 
                        "mittel": "#0000FF",
                        "guenstig": "#FFFF00"
                    }
                }
                
                success, response = self.run_test(
                    "Update Settings",
                    "PUT",
                    "api/settings",
                    200,
                    data=test_settings
                )
                
                if success:
                    print(f"   ✅ Settings updated successfully")
                    
                    # Verify settings were updated
                    success, response = self.run_test(
                        "Get Updated Settings",
                        "GET",
                        "api/settings",
                        200
                    )
                    
                    if success and response.get('danger_zone_password') == 'test123':
                        print(f"   ✅ Settings verification successful")
                        
                        # Reset settings to default
                        default_settings = {
                            "danger_zone_password": "",
                            "colors": {
                                "luxus": "#FEF3C7",
                                "teuer": "#DBEAFE",
                                "mittel": "#D1FAE5",
                                "guenstig": "#F1F5F9"
                            }
                        }
                        
                        self.run_test(
                            "Reset Settings",
                            "PUT",
                            "api/settings",
                            200,
                            data=default_settings
                        )
                        
                        return True
                    else:
                        print(f"   ❌ Settings verification failed")
                        return False
                else:
                    print(f"   ❌ Failed to update settings")
                    return False
            else:
                print(f"   ❌ Settings missing required color keys")
                return False
        else:
            print(f"   ❌ Settings response missing 'colors' field")
            return False

def main():
    print("🧪 Starting ReWear POS API Tests")
    print("=" * 50)
    
    tester = ReWearPOSAPITester()
    
    # Run all tests in order
    tests = [
        tester.test_root_endpoint,
        tester.test_get_categories,
        tester.test_price_matrix_lookup,
        tester.test_price_matrix_download,
        tester.test_price_matrix_get,
        tester.test_custom_categories,
        tester.test_settings,
        tester.test_today_stats,
        tester.test_daily_stats,
        tester.test_monthly_stats,
        tester.test_get_purchases,
        tester.test_create_purchase,
        tester.test_get_single_purchase,
        tester.test_delete_purchase,
    ]
    
    for test in tests:
        try:
            test()
        except Exception as e:
            print(f"❌ Test failed with exception: {str(e)}")
    
    # Print final results
    print("\n" + "=" * 50)
    print(f"📊 Test Results: {tester.tests_passed}/{tester.tests_run} passed")
    
    if tester.tests_passed == tester.tests_run:
        print("🎉 All tests passed!")
        return 0
    else:
        print("⚠️  Some tests failed")
        return 1

if __name__ == "__main__":
    sys.exit(main())