import requests
import pandas as pd
import io
import time
import os

# Configuration
BASE_URL = "http://localhost:8000/api"
CUSTOM_CATEGORY_NAME = "Test Custom Category " + str(int(time.time()))
EXPORT_FILENAME = "test_export.xlsx"

def verify_export():
    print(f"--- Verify Custom Category Export ---")
    
    # 1. Add Custom Category
    print(f"1. Adding custom category: '{CUSTOM_CATEGORY_NAME}'...")
    try:
        resp = requests.post(f"{BASE_URL}/custom-categories", json={
            "name": CUSTOM_CATEGORY_NAME,
            "image": None,
            "icon": "Package"
        })
        if resp.status_code not in [200, 400]: # 400 if exists is fine for test
             print(f"Failed to add category: {resp.status_code} {resp.text}")
             return False
        print("   Category added successfully.")
    except Exception as e:
        print(f"Error connecting to API: {e}")
        return False

    # 2. Create Purchase with that Category
    print(f"2. Creating purchase with category '{CUSTOM_CATEGORY_NAME}'...")
    purchase_data = {
        "items": [
            {
                "category": CUSTOM_CATEGORY_NAME,
                "price_level": "Mittel",
                "condition": "Neu",
                "relevance": "Wichtig",
                "price": 99.99
            }
        ]
    }
    
    try:
        resp = requests.post(f"{BASE_URL}/purchases", json=purchase_data)
        if resp.status_code != 200:
             print(f"Failed to create purchase: {resp.status_code} {resp.text}")
             return False
        purchase_id = resp.json().get("id")
        print(f"   Purchase created with ID: {purchase_id}")
    except Exception as e:
        print(f"Error creating purchase: {e}")
        return False

    # 3. Download Excel Export
    print(f"3. Downloading Excel export...")
    try:
        resp = requests.get(f"{BASE_URL}/purchases/export/excel")
        if resp.status_code != 200:
             print(f"Failed to download export: {resp.status_code}")
             return False
        
        with open(EXPORT_FILENAME, "wb") as f:
            f.write(resp.content)
        print(f"   Export saved to {EXPORT_FILENAME}")
    except Exception as e:
        print(f"Error downloading export: {e}")
        return False

    # 4. Verify Content
    print(f"4. Verifying content of Excel file...")
    try:
        df = pd.read_excel(EXPORT_FILENAME, sheet_name="Ankäufe")
        
        # Check if the custom category is in the 'Kategorie' column
        if 'Kategorie' not in df.columns:
            print("   Column 'Kategorie' missing in Excel file.")
            return False
            
        found = False
        # Filter dataframe for our custom category
        matches = df[df['Kategorie'] == CUSTOM_CATEGORY_NAME]
        
        if not matches.empty:
            print(f"   SUCCESS: Found {len(matches)} row(s) with category '{CUSTOM_CATEGORY_NAME}'.")
            found = True
            
            # Print specific row details for confirmation
            print("   Row details:")
            print(matches[['Datum', 'Ankauf-Nr', 'Kategorie', 'Preis (CHF)']].to_string(index=False))
        else:
            print(f"   FAILURE: Category '{CUSTOM_CATEGORY_NAME}' NOT found in Excel export.")
            print("   Unique categories found:", df['Kategorie'].unique())

        # Cleanup
        if os.path.exists(EXPORT_FILENAME):
            os.remove(EXPORT_FILENAME)
            
        return found

    except Exception as e:
        print(f"Error analyzing Excel file: {e}")
        return False

if __name__ == "__main__":
    verify_export()
