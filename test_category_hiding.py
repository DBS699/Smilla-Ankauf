import requests
import sys
import json
from datetime import datetime

class CategoryHidingTester:
    def __init__(self, base_url="https://apparel-inventory-8.preview.emergentagent.com"):
        self.base_url = base_url
        self.tests_run = 0
        self.tests_passed = 0

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

    def test_initial_settings(self):
        """Test getting initial settings"""
        success, response = self.run_test(
            "Get Initial Settings",
            "GET",
            "api/settings",
            200
        )
        
        if success:
            if 'hidden_categories' in response:
                hidden_count = len(response['hidden_categories'])
                print(f"   ✅ Settings include hidden_categories field with {hidden_count} hidden categories")
                print(f"   📋 Hidden categories: {response['hidden_categories']}")
                return True, response
            else:
                print(f"   ❌ Settings missing hidden_categories field")
                return False, {}
        return False, {}

    def test_hide_single_category(self):
        """Test hiding a single category"""
        # First get current settings
        success, current_settings = self.test_initial_settings()
        if not success:
            return False
            
        # Hide "Jeans" category
        test_settings = {
            **current_settings,
            "hidden_categories": ["Jeans"]
        }
        
        success, response = self.run_test(
            "Hide Single Category (Jeans)",
            "PUT",
            "api/settings",
            200,
            data=test_settings
        )
        
        if success:
            # Verify the setting was saved
            success, updated_settings = self.run_test(
                "Verify Single Category Hidden",
                "GET",
                "api/settings",
                200
            )
            
            if success and "Jeans" in updated_settings.get('hidden_categories', []):
                print(f"   ✅ Jeans category successfully hidden")
                return True
            else:
                print(f"   ❌ Jeans category not found in hidden_categories after update")
                return False
        return False

    def test_hide_all_categories(self):
        """Test hiding all 17 standard categories"""
        # Get all standard categories from the constants
        standard_categories = [
            "Kleider", "Strickmode/Cardigans", "Sweatshirt", "Hoodie",
            "Hosen", "Jeans", "Jacken", "Blazer", "Mäntel",
            "Shirts", "Top", "Hemd", "Bluse", "Röcke/Jupe",
            "Sportbekleidung", "Bademode", "Shorts"
        ]
        
        # First get current settings
        success, current_settings = self.test_initial_settings()
        if not success:
            return False
            
        # Hide all standard categories
        test_settings = {
            **current_settings,
            "hidden_categories": standard_categories
        }
        
        success, response = self.run_test(
            "Hide All Standard Categories",
            "PUT",
            "api/settings",
            200,
            data=test_settings
        )
        
        if success:
            # Verify all categories are hidden
            success, updated_settings = self.run_test(
                "Verify All Categories Hidden",
                "GET",
                "api/settings",
                200
            )
            
            if success:
                hidden_categories = updated_settings.get('hidden_categories', [])
                if len(hidden_categories) == 17 and all(cat in hidden_categories for cat in standard_categories):
                    print(f"   ✅ All 17 standard categories successfully hidden")
                    print(f"   📋 Hidden: {len(hidden_categories)} categories")
                    return True
                else:
                    print(f"   ❌ Not all categories hidden. Expected 17, got {len(hidden_categories)}")
                    print(f"   📋 Missing: {[cat for cat in standard_categories if cat not in hidden_categories]}")
                    return False
        return False

    def test_restore_all_categories(self):
        """Test restoring all categories (empty hidden_categories)"""
        # First get current settings
        success, current_settings = self.test_initial_settings()
        if not success:
            return False
            
        # Restore all categories (empty hidden_categories)
        test_settings = {
            **current_settings,
            "hidden_categories": []
        }
        
        success, response = self.run_test(
            "Restore All Categories",
            "PUT",
            "api/settings",
            200,
            data=test_settings
        )
        
        if success:
            # Verify all categories are restored
            success, updated_settings = self.run_test(
                "Verify All Categories Restored",
                "GET",
                "api/settings",
                200
            )
            
            if success:
                hidden_categories = updated_settings.get('hidden_categories', [])
                if len(hidden_categories) == 0:
                    print(f"   ✅ All categories successfully restored (0 hidden)")
                    return True
                else:
                    print(f"   ❌ Categories not fully restored. Still hidden: {hidden_categories}")
                    return False
        return False

    def test_partial_hide_restore(self):
        """Test hiding some categories and then restoring some"""
        # First get current settings
        success, current_settings = self.test_initial_settings()
        if not success:
            return False
            
        # Hide 3 specific categories
        test_hidden = ["Jeans", "Shirts", "Jacken"]
        test_settings = {
            **current_settings,
            "hidden_categories": test_hidden
        }
        
        success, response = self.run_test(
            "Hide 3 Specific Categories",
            "PUT",
            "api/settings",
            200,
            data=test_settings
        )
        
        if success:
            # Verify the 3 categories are hidden
            success, updated_settings = self.run_test(
                "Verify 3 Categories Hidden",
                "GET",
                "api/settings",
                200
            )
            
            if success:
                hidden_categories = updated_settings.get('hidden_categories', [])
                if len(hidden_categories) == 3 and all(cat in hidden_categories for cat in test_hidden):
                    print(f"   ✅ 3 categories successfully hidden: {test_hidden}")
                    
                    # Now restore 1 category (remove "Shirts" from hidden)
                    partial_hidden = ["Jeans", "Jacken"]  # Remove "Shirts"
                    partial_settings = {
                        **current_settings,
                        "hidden_categories": partial_hidden
                    }
                    
                    success, response = self.run_test(
                        "Restore 1 Category (Shirts)",
                        "PUT",
                        "api/settings",
                        200,
                        data=partial_settings
                    )
                    
                    if success:
                        # Verify only 2 categories remain hidden
                        success, final_settings = self.run_test(
                            "Verify Partial Restore",
                            "GET",
                            "api/settings",
                            200
                        )
                        
                        if success:
                            final_hidden = final_settings.get('hidden_categories', [])
                            if len(final_hidden) == 2 and "Shirts" not in final_hidden and "Jeans" in final_hidden and "Jacken" in final_hidden:
                                print(f"   ✅ Partial restore successful. Shirts restored, Jeans and Jacken still hidden")
                                return True
                            else:
                                print(f"   ❌ Partial restore failed. Expected [Jeans, Jacken], got {final_hidden}")
                                return False
                else:
                    print(f"   ❌ 3 categories not properly hidden. Expected {test_hidden}, got {hidden_categories}")
                    return False
        return False

def main():
    print("🧪 Starting Category Hiding Feature Tests")
    print("=" * 50)
    
    tester = CategoryHidingTester()
    
    # Run all tests in order
    tests = [
        tester.test_initial_settings,
        tester.test_hide_single_category,
        tester.test_hide_all_categories,
        tester.test_restore_all_categories,
        tester.test_partial_hide_restore,
    ]
    
    for test in tests:
        try:
            test()
        except Exception as e:
            print(f"❌ Test failed with exception: {str(e)}")
    
    # Print final results
    print("\n" + "=" * 50)
    print(f"📊 Category Hiding Test Results: {tester.tests_passed}/{tester.tests_run} passed")
    
    if tester.tests_passed == tester.tests_run:
        print("🎉 All category hiding tests passed!")
        return 0
    else:
        print("⚠️  Some category hiding tests failed")
        return 1

if __name__ == "__main__":
    sys.exit(main())