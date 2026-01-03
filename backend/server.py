from fastapi import FastAPI, APIRouter, HTTPException, UploadFile, File
from fastapi.responses import StreamingResponse
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict
from typing import List, Optional
import uuid
from datetime import datetime, timezone, timedelta
import io
import pandas as pd

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Create the main app without a prefix
app = FastAPI()

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# ============== Constants ==============
CATEGORIES = [
    "Kleider", "Strickmode/Cardigans", "Sweatshirt", "Hoodie",
    "Hosen", "Jeans", "Jacken", "Blazer", "Mäntel",
    "Shirts", "Top", "Hemd", "Bluse", "Röcke/Jupe",
    "Sportbekleidung", "Bademode", "Shorts"
]
PRICE_LEVELS = ["Luxus", "Teuer", "Mittel", "Günstig"]
CONDITIONS = ["Neu", "Kaum benutzt", "Gebraucht/Gut", "Abgenutzt"]
RELEVANCE_LEVELS = ["Stark relevant", "Wichtig", "Nicht beliebt"]

# ============== Models ==============

class PurchaseItem(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    category: str
    price_level: str
    condition: str
    relevance: str = "Wichtig"  # Default value for backward compatibility
    price: float

class PurchaseItemCreate(BaseModel):
    category: str
    price_level: str
    condition: str
    relevance: str
    price: float

class PriceMatrixEntry(BaseModel):
    category: str
    price_level: str
    condition: str
    relevance: str
    fixed_price: Optional[float] = None

class Purchase(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    items: List[PurchaseItem]
    total: float
    timestamp: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class PurchaseCreate(BaseModel):
    items: List[PurchaseItemCreate]

class PurchaseResponse(BaseModel):
    id: str
    items: List[PurchaseItem]
    total: float
    timestamp: str

class DailyStats(BaseModel):
    date: str
    count: int
    total: float

class MonthlyStats(BaseModel):
    month: str
    count: int
    total: float

# ============== Basic Routes ==============

@api_router.get("/")
async def root():
    return {"message": "ReWear POS API"}

@api_router.get("/categories")
async def get_categories():
    return {
        "categories": CATEGORIES,
        "price_levels": PRICE_LEVELS,
        "conditions": CONDITIONS,
        "relevance_levels": RELEVANCE_LEVELS
    }

# ============== Price Matrix Routes ==============

@api_router.get("/price-matrix/lookup")
async def lookup_fixed_price(
    category: str,
    price_level: str,
    condition: str,
    relevance: str
):
    entry = await db.price_matrix.find_one(
        {
            "category": category,
            "price_level": price_level,
            "condition": condition,
            "relevance": relevance
        },
        {"_id": 0}
    )
    if entry and entry.get("fixed_price") is not None:
        return {"fixed_price": entry["fixed_price"], "found": True}
    return {"fixed_price": None, "found": False}

@api_router.get("/price-matrix/download")
async def download_price_matrix():
    existing = await db.price_matrix.find({}, {"_id": 0}).to_list(10000)
    existing_map = {}
    for e in existing:
        key = f"{e['category']}|{e['price_level']}|{e['condition']}|{e['relevance']}"
        existing_map[key] = e.get('fixed_price')
    
    rows = []
    for cat in CATEGORIES:
        for level in PRICE_LEVELS:
            for cond in CONDITIONS:
                for rel in RELEVANCE_LEVELS:
                    key = f"{cat}|{level}|{cond}|{rel}"
                    rows.append({
                        "Kategorie": cat,
                        "Preisniveau": level,
                        "Zustand": cond,
                        "Relevanz": rel,
                        "Fixpreis": existing_map.get(key, "")
                    })
    
    df = pd.DataFrame(rows)
    output = io.BytesIO()
    with pd.ExcelWriter(output, engine='openpyxl') as writer:
        df.to_excel(writer, index=False, sheet_name='Preismatrix')
    output.seek(0)
    
    return StreamingResponse(
        output,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": "attachment; filename=preismatrix.xlsx"}
    )

@api_router.get("/price-matrix")
async def get_price_matrix():
    entries = await db.price_matrix.find({}, {"_id": 0}).to_list(10000)
    return entries

@api_router.post("/price-matrix/upload")
async def upload_price_matrix(file: UploadFile = File(...)):
    try:
        contents = await file.read()
        df = pd.read_excel(io.BytesIO(contents))
        
        required_cols = ["Kategorie", "Preisniveau", "Zustand", "Relevanz", "Fixpreis"]
        if not all(col in df.columns for col in required_cols):
            raise HTTPException(status_code=400, detail="Excel muss Spalten: Kategorie, Preisniveau, Zustand, Relevanz, Fixpreis enthalten")
        
        updated = 0
        for _, row in df.iterrows():
            category = str(row["Kategorie"]).strip()
            price_level = str(row["Preisniveau"]).strip()
            condition = str(row["Zustand"]).strip()
            relevance = str(row["Relevanz"]).strip()
            
            fixed_price = None
            price_val = row["Fixpreis"]
            if pd.notna(price_val) and str(price_val).strip() != "":
                try:
                    fixed_price = float(price_val)
                except (ValueError, TypeError):
                    pass
            
            if category not in CATEGORIES:
                continue
            if price_level not in PRICE_LEVELS:
                continue
            if condition not in CONDITIONS:
                continue
            if relevance not in RELEVANCE_LEVELS:
                continue
            
            await db.price_matrix.update_one(
                {
                    "category": category,
                    "price_level": price_level,
                    "condition": condition,
                    "relevance": relevance
                },
                {
                    "$set": {
                        "category": category,
                        "price_level": price_level,
                        "condition": condition,
                        "relevance": relevance,
                        "fixed_price": fixed_price
                    }
                },
                upsert=True
            )
            updated += 1
        
        return {"message": f"{updated} Einträge aktualisiert", "updated": updated}
    except Exception as e:
        logger.error(f"Upload error: {e}")
        raise HTTPException(status_code=400, detail=str(e))

@api_router.delete("/price-matrix")
async def clear_price_matrix():
    result = await db.price_matrix.delete_many({})
    return {"message": f"{result.deleted_count} Einträge gelöscht"}

# ============== Purchase Routes ==============

@api_router.post("/purchases", response_model=PurchaseResponse)
async def create_purchase(purchase_data: PurchaseCreate):
    total = sum(item.price for item in purchase_data.items)
    
    items = [
        PurchaseItem(
            category=item.category,
            price_level=item.price_level,
            condition=item.condition,
            relevance=item.relevance,
            price=item.price
        )
        for item in purchase_data.items
    ]
    
    purchase = Purchase(items=items, total=total)
    
    doc = {
        "id": purchase.id,
        "items": [item.model_dump() for item in items],
        "total": total,
        "timestamp": purchase.timestamp.isoformat()
    }
    
    await db.purchases.insert_one(doc)
    
    return PurchaseResponse(
        id=purchase.id,
        items=items,
        total=total,
        timestamp=purchase.timestamp.isoformat()
    )

@api_router.get("/purchases", response_model=List[PurchaseResponse])
async def get_purchases(
    start_date: Optional[str] = None,
    end_date: Optional[str] = None
):
    query = {}
    
    if start_date or end_date:
        query["timestamp"] = {}
        if start_date:
            query["timestamp"]["$gte"] = start_date
        if end_date:
            query["timestamp"]["$lte"] = end_date
    
    purchases = await db.purchases.find(query, {"_id": 0}).sort("timestamp", -1).to_list(1000)
    return purchases

@api_router.get("/purchases/{purchase_id}", response_model=PurchaseResponse)
async def get_purchase(purchase_id: str):
    purchase = await db.purchases.find_one({"id": purchase_id}, {"_id": 0})
    if not purchase:
        raise HTTPException(status_code=404, detail="Purchase not found")
    return purchase

@api_router.delete("/purchases/{purchase_id}")
async def delete_purchase(purchase_id: str):
    result = await db.purchases.delete_one({"id": purchase_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Purchase not found")
    return {"message": "Purchase deleted"}

# ============== Stats Routes ==============

@api_router.get("/stats/daily", response_model=List[DailyStats])
async def get_daily_stats(days: int = 30):
    start_date = (datetime.now(timezone.utc) - timedelta(days=days)).isoformat()
    
    purchases = await db.purchases.find(
        {"timestamp": {"$gte": start_date}},
        {"_id": 0}
    ).to_list(10000)
    
    daily_data = {}
    for p in purchases:
        date_str = p["timestamp"][:10]
        if date_str not in daily_data:
            daily_data[date_str] = {"count": 0, "total": 0.0}
        daily_data[date_str]["count"] += 1
        daily_data[date_str]["total"] += p["total"]
    
    result = [
        DailyStats(date=date, count=data["count"], total=data["total"])
        for date, data in sorted(daily_data.items(), reverse=True)
    ]
    
    return result

@api_router.get("/stats/monthly", response_model=List[MonthlyStats])
async def get_monthly_stats(months: int = 12):
    purchases = await db.purchases.find({}, {"_id": 0}).to_list(100000)
    
    monthly_data = {}
    for p in purchases:
        month_str = p["timestamp"][:7]
        if month_str not in monthly_data:
            monthly_data[month_str] = {"count": 0, "total": 0.0}
        monthly_data[month_str]["count"] += 1
        monthly_data[month_str]["total"] += p["total"]
    
    result = [
        MonthlyStats(month=month, count=data["count"], total=data["total"])
        for month, data in sorted(monthly_data.items(), reverse=True)
    ][:months]
    
    return result

@api_router.get("/stats/today")
async def get_today_stats():
    today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    
    purchases = await db.purchases.find(
        {"timestamp": {"$regex": f"^{today}"}},
        {"_id": 0}
    ).to_list(10000)
    
    total_purchases = len(purchases)
    total_amount = sum(p["total"] for p in purchases)
    total_items = sum(len(p["items"]) for p in purchases)
    
    return {
        "date": today,
        "total_purchases": total_purchases,
        "total_amount": total_amount,
        "total_items": total_items
    }

# ============== Auth Routes ==============

USERS = {
    "admin": {"password": "1234", "role": "admin"},
    "smilla": {"password": "1234", "role": "mitarbeiter"}
}

class LoginRequest(BaseModel):
    username: str
    password: str

class UserResponse(BaseModel):
    username: str
    role: str

@api_router.post("/auth/login")
async def login(data: LoginRequest):
    user = USERS.get(data.username.lower())
    if not user or user["password"] != data.password:
        raise HTTPException(status_code=401, detail="Falscher Benutzername oder Passwort")
    return {"username": data.username.lower(), "role": user["role"]}

@api_router.get("/auth/users")
async def get_users():
    return [{"username": k, "role": v["role"]} for k, v in USERS.items()]

# ============== Custom Categories Routes ==============

@api_router.get("/custom-categories")
async def get_custom_categories():
    categories = await db.custom_categories.find({}, {"_id": 0}).to_list(100)
    return categories  # Return full objects with name and image

@api_router.post("/custom-categories")
async def add_custom_category(data: dict):
    name = data.get("name", "").strip()
    image = data.get("image", None)  # Base64 image data
    
    if not name:
        raise HTTPException(status_code=400, detail="Name erforderlich")
    if name in CATEGORIES:
        raise HTTPException(status_code=400, detail="Kategorie existiert bereits")
    
    existing = await db.custom_categories.find_one({"name": name})
    if existing:
        raise HTTPException(status_code=400, detail="Kategorie existiert bereits")
    
    await db.custom_categories.insert_one({"name": name, "image": image})
    return {"message": f"Kategorie '{name}' hinzugefügt"}

@api_router.put("/custom-categories/{name}/image")
async def update_category_image(name: str, data: dict):
    image = data.get("image", None)
    result = await db.custom_categories.update_one(
        {"name": name},
        {"$set": {"image": image}}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Kategorie nicht gefunden")
    return {"message": "Bild aktualisiert"}

@api_router.delete("/custom-categories/{name}")
async def delete_custom_category(name: str):
    result = await db.custom_categories.delete_one({"name": name})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Kategorie nicht gefunden")
    return {"message": f"Kategorie '{name}' gelöscht"}

# ============== Settings Routes ==============

@api_router.get("/settings")
async def get_settings():
    settings = await db.app_settings.find_one({"type": "general"}, {"_id": 0})
    if not settings:
        return {
            "danger_zone_password": "",
            "colors": {
                "luxus": "#FEF3C7",
                "teuer": "#DBEAFE",
                "mittel": "#D1FAE5",
                "guenstig": "#F1F5F9"
            }
        }
    return settings

@api_router.put("/settings")
async def update_settings(data: dict):
    await db.app_settings.update_one(
        {"type": "general"},
        {"$set": {**data, "type": "general"}},
        upsert=True
    )
    return {"message": "Einstellungen gespeichert"}

# ============== App Setup ==============

app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
