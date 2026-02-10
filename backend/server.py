from fastapi import FastAPI, APIRouter, HTTPException, UploadFile, File, Depends, Request
from fastapi.responses import StreamingResponse
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
from passlib.context import CryptContext
from jose import jwt, JWTError
import os
import re
import logging
import time
from pathlib import Path
from pydantic import BaseModel, Field
from typing import List, Optional
import uuid
from datetime import datetime, timezone, timedelta
from collections import defaultdict
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

# ============== Middleware (CORS) ==============
# Must be added BEFORE routes/routers are included

# Security: Restrict CORS to known origins only
# Use regex to allow all Vercel preview deployments (ending in .vercel.app)
# and local development ports.
app.add_middleware(
    CORSMiddleware,
    allow_origin_regex=r"https://.*\.vercel\.app|http://localhost:\d+",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

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
    class Config:
        extra = "ignore"
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    items: List[PurchaseItem]
    total: float
    timestamp: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class PurchaseCreate(BaseModel):
    items: List[PurchaseItemCreate]
    credit_customer_id: Optional[str] = None  # If set, credit to this customer instead of cash
    staff_username: Optional[str] = None

class PurchaseResponse(BaseModel):
    id: str
    items: List[PurchaseItem]
    total: float
    timestamp: str
    credit_customer_id: Optional[str] = None
    credit_customer_name: Optional[str] = None

class DailyStats(BaseModel):
    date: str
    count: int
    total: float

class MonthlyStats(BaseModel):
    month: str
    count: int
    total: float

# ============== Customer & Credit Models ==============

class CustomerCreate(BaseModel):
    first_name: str
    last_name: str
    email: str
    address: Optional[str] = None
    phone: Optional[str] = None

class Customer(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    first_name: str
    last_name: str
    email: str
    address: Optional[str] = None
    phone: Optional[str] = None
    current_balance: float = 0.0
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class CustomerResponse(BaseModel):
    id: str
    first_name: str
    last_name: str
    email: str
    address: Optional[str] = None
    phone: Optional[str] = None
    current_balance: float
    created_at: str

class TransactionCreate(BaseModel):
    amount: float
    type: str  # "credit" or "debit"
    description: Optional[str] = None
    reference_id: Optional[str] = None

class CreditTransaction(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    customer_id: str
    amount: float  # Positive = credit, Negative = debit
    type: str  # "purchase_credit", "payout", "manual_credit", "manual_debit"
    description: Optional[str] = None
    reference_id: Optional[str] = None  # e.g., purchase_id
    staff_username: str
    timestamp: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class TransactionResponse(BaseModel):
    id: str
    customer_id: str
    amount: float
    type: str
    description: Optional[str]
    reference_id: Optional[str]
    staff_username: str
    timestamp: str

# ============== Input Validation Models (M3 fix) ==============

class CustomCategoryCreate(BaseModel):
    name: str
    image: Optional[str] = None
    icon: Optional[str] = None

class CategoryImageUpdate(BaseModel):
    image: Optional[str] = None

class SettingsUpdate(BaseModel):
    class Config:
        extra = "forbid"
    danger_zone_password: Optional[str] = None
    colors: Optional[dict] = None
    hidden_categories: Optional[List[str]] = None
    category_icons: Optional[dict] = None
    background: Optional[str] = None

class ReceiptSettingsUpdate(BaseModel):
    class Config:
        extra = "forbid"
    store_name: Optional[str] = None
    store_address: Optional[str] = None
    store_city: Optional[str] = None
    store_phone: Optional[str] = None
    footer_text: Optional[str] = None
    sub_footer_text: Optional[str] = None
    show_store_name: Optional[bool] = None
    show_address: Optional[bool] = None
    show_phone: Optional[bool] = None
    show_date: Optional[bool] = None
    show_receipt_id: Optional[bool] = None
    show_item_details: Optional[bool] = None
    show_relevance: Optional[bool] = None
    show_item_count: Optional[bool] = None
    show_footer: Optional[bool] = None
    font_size_store: Optional[int] = None
    font_size_title: Optional[int] = None
    font_size_items: Optional[int] = None
    font_size_total: Optional[int] = None
    font_size_footer: Optional[int] = None


# ============== Auth & Security (Moved to top for dependency injection) ==============

# JWT Configuration
JWT_SECRET = os.environ.get("JWT_SECRET", "dev-secret-change-in-production-" + str(uuid.uuid4()))
JWT_ALGORITHM = "HS256"
JWT_EXPIRATION_HOURS = 12

# Password hashing
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# Bearer token security scheme
security = HTTPBearer(auto_error=False)

# Rate limiting for login
login_attempts = defaultdict(list)  # IP -> list of timestamps
MAX_LOGIN_ATTEMPTS = 5
LOGIN_WINDOW_SECONDS = 60

# Hash passwords at startup
def _hash_pw(plain: str) -> str:
    return pwd_context.hash(plain)

# Critical: Validate Environment Variables
JWT_SECRET_ENV = os.environ.get("JWT_SECRET")
ADMIN_PW_ENV = os.environ.get("ADMIN_PASSWORD")
SMILLA_PW_ENV = os.environ.get("SMILLA_PASSWORD")

if not JWT_SECRET_ENV or JWT_SECRET_ENV == "dev-secret-change-in-production":
    logger.warning("WARN: JWT_SECRET not set or using default. Secure in production!")
    # In production, you might want to raise error:
    # raise RuntimeError("JWT_SECRET must be set!")

if not ADMIN_PW_ENV or ADMIN_PW_ENV == "1234":
    # Critical Security Check
    if os.environ.get("RAILWAY_ENVIRONMENT") == "production":
        raise RuntimeError("CRITICAL: ADMIN_PASSWORD is missing or default '1234'. Set a secure password!")
    logger.warning("WARN: ADMIN_PASSWORD is default '1234'. CHANGE THIS!")

if not SMILLA_PW_ENV or SMILLA_PW_ENV == "1234":
    if os.environ.get("RAILWAY_ENVIRONMENT") == "production":
         raise RuntimeError("CRITICAL: SMILLA_PASSWORD is missing or default '1234'. Set a secure password!")
    logger.warning("WARN: SMILLA_PASSWORD is default '1234'. CHANGE THIS!")

USERS = {
    "admin": {
        "password_hash": _hash_pw(ADMIN_PW_ENV or "1234"),
        "role": "admin"
    },
    "smilla": {
        "password_hash": _hash_pw(SMILLA_PW_ENV or "1234"),
        "role": "mitarbeiter"
    }
}

def create_access_token(username: str, role: str) -> str:
    payload = {
        "sub": username,
        "role": role,
        "exp": datetime.now(timezone.utc) + timedelta(hours=JWT_EXPIRATION_HOURS),
        "iat": datetime.now(timezone.utc),
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)

async def get_current_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security),
) -> dict:
    """Validate JWT token and return current user. Raises 401 if invalid."""
    if credentials is None:
        raise HTTPException(status_code=401, detail="Token erforderlich")
    try:
        payload = jwt.decode(credentials.credentials, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        username = payload.get("sub")
        role = payload.get("role")
        if username is None:
            raise HTTPException(status_code=401, detail="Ungültiger Token")
        return {"username": username, "role": role}
    except JWTError:
        raise HTTPException(status_code=401, detail="Token abgelaufen oder ungültig")

async def require_admin(current_user: dict = Depends(get_current_user)):
    """Dependency to restrict access to admins only."""
    if current_user["role"] != "admin":
        raise HTTPException(status_code=403, detail="Nur für Administratoren")
    return current_user

def check_rate_limit(request: Request):
    """Enforce rate limiting on login attempts."""
    # Security: Use X-Forwarded-For for proxies (Railway/Vercel)
    forwarded = request.headers.get("X-Forwarded-For")
    if forwarded:
        client_ip = forwarded.split(",")[0]
    else:
        client_ip = request.client.host if request.client else "unknown"
        
    now = time.time()
    # Clean old entries
    login_attempts[client_ip] = [
        t for t in login_attempts[client_ip] if now - t < LOGIN_WINDOW_SECONDS
    ]
    if len(login_attempts[client_ip]) >= MAX_LOGIN_ATTEMPTS:
        raise HTTPException(
            status_code=429,
            detail=f"Zu viele Anmeldeversuche. Bitte warten Sie {LOGIN_WINDOW_SECONDS} Sekunden."
        )
    login_attempts[client_ip].append(now)


# ============== Basic Routes ==============

@api_router.get("/")
async def root():
    try:
        await client.admin.command('ping')
        return {"message": "ReWear POS API", "database_status": "connected"}
    except Exception:
        return {"message": "ReWear POS API", "database_status": "disconnected"}

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
    relevance: str,
    current_user: dict = Depends(get_current_user)
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
async def download_price_matrix(current_user: dict = Depends(get_current_user)):
    existing = await db.price_matrix.find({}, {"_id": 0}).to_list(10000)
    existing_map = {}
    for e in existing:
        key = f"{e['category']}|{e['price_level']}|{e['condition']}|{e['relevance']}"
        existing_map[key] = e.get('fixed_price')
    
    # Get custom categories
    custom_cats = await db.custom_categories.find({}, {"_id": 0}).to_list(100)
    custom_cat_names = [c["name"] for c in custom_cats]
    
    # Combine all categories
    all_categories = CATEGORIES + custom_cat_names
    
    rows = []
    for cat in all_categories:
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
    
    # Security: Sanitize for Excel Injection
    # Escape cells starting with =, +, -, @
    def sanitize_excel_cell(value):
        if isinstance(value, str) and value.startswith(('=', '+', '-', '@')):
            return "'" + value
        return value

    # Apply to all string columns (object dtype)
    for col in df.select_dtypes(include=['object']).columns:
        df[col] = df[col].apply(sanitize_excel_cell)
        
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
async def get_price_matrix(current_user: dict = Depends(get_current_user)):
    entries = await db.price_matrix.find({}, {"_id": 0}).to_list(10000)
    return entries

@api_router.post("/price-matrix/upload")
async def upload_price_matrix(
    file: UploadFile = File(...),
    current_user: dict = Depends(require_admin) # RBAC: Admin only
):
    # Security: Limit file size (approx check via read/chunk) or content-length if available
    # For now, we read safely.
    MAX_SIZE = 5 * 1024 * 1024 # 5MB limit
    
    content = await file.read()
    if len(content) > MAX_SIZE:
        raise HTTPException(status_code=413, detail="Datei zu gross (Max 5MB)")
        
    try:
        df = pd.read_excel(io.BytesIO(content))
        
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
async def clear_price_matrix(current_user: dict = Depends(get_current_user)):
    result = await db.price_matrix.delete_many({})
    return {"message": f"{result.deleted_count} Einträge gelöscht"}

# ============== Purchase Routes ==============

@api_router.post("/purchases", response_model=PurchaseResponse)
async def create_purchase(purchase_data: PurchaseCreate, current_user: dict = Depends(get_current_user)):
    total_sum = sum(item.price for item in purchase_data.items)
    
    new_items = [
        PurchaseItem(
            category=item.category,
            price_level=item.price_level,
            condition=item.condition,
            relevance=item.relevance,
            price=item.price
        )
        for item in purchase_data.items
    ]
    
    new_purchase = Purchase(
        items=new_items,
        total=total_sum,
        # Audit Trail: Force username from token, ignore client input
        staff_username=current_user["username"]
    )
    
    # Check if this should be credited to a customer
    credit_customer_name = None
    if purchase_data.credit_customer_id:
        customer = await db.customers.find_one({"id": purchase_data.credit_customer_id})
        if not customer:
            raise HTTPException(status_code=404, detail="Kunde nicht gefunden")
        
        credit_customer_name = f"{customer.get('first_name', '')} {customer.get('last_name', '')}"
        
        # Create credit transaction
        transaction = CreditTransaction(
            customer_id=purchase_data.credit_customer_id,
            amount=total_sum,  # Positive = credit
            type="purchase_credit",
            description=f"Ankauf #{new_purchase.id[:8].upper()} - {len(new_items)} Artikel",
            reference_id=new_purchase.id,
            staff_username=current_user["username"] # Audit Trail: Force username from token
        )
        
        transaction_doc = transaction.model_dump()
        transaction_doc["timestamp"] = transaction.timestamp
        await db.credit_transactions.insert_one(transaction_doc)
        
        # Update customer balance
        new_balance = customer.get("current_balance", 0) + total_sum
        await db.customers.update_one(
            {"id": purchase_data.credit_customer_id},
            {"$set": {"current_balance": new_balance}}
        )
        
        logger.info(f"Credited {total_sum} CHF to customer {credit_customer_name} for purchase {new_purchase.id}")
    
    purchase_dict = new_purchase.model_dump()
    # Explicitly overwrite staff_username to ensure integrity
    purchase_dict["staff_username"] = current_user["username"]
    purchase_dict["credit_customer_id"] = purchase_data.credit_customer_id
    purchase_dict["credit_customer_name"] = credit_customer_name
    
    await db.purchases.insert_one(purchase_dict)
    
    return PurchaseResponse(
        id=new_purchase.id,
        items=new_items,
        total=total_sum,
        timestamp=new_purchase.timestamp.isoformat(),
        staff_username=new_purchase.staff_username,
        credit_customer_id=purchase_data.credit_customer_id,
        credit_customer_name=credit_customer_name
    )

@api_router.get("/purchases", response_model=List[PurchaseResponse])
async def get_purchases(
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    query = {"deleted": {"$ne": True}}
    
    if start_date or end_date:
        query["timestamp"] = {}
        if start_date:
            query["timestamp"]["$gte"] = start_date
        if end_date:
            query["timestamp"]["$lte"] = end_date
    
    purchases = await db.purchases.find(query, {"_id": 0}).sort("timestamp", -1).to_list(1000)
    return purchases

@api_router.get("/purchases/{purchase_id}", response_model=PurchaseResponse)
async def get_purchase(purchase_id: str, current_user: dict = Depends(get_current_user)):
    purchase = await db.purchases.find_one({"id": purchase_id, "deleted": {"$ne": True}}, {"_id": 0})
    if not purchase:
        raise HTTPException(status_code=404, detail="Purchase not found")
    return purchase

@api_router.delete("/purchases/{purchase_id}")
async def delete_purchase(purchase_id: str, current_user: dict = Depends(get_current_user)):
    # GeBüV compliance: soft-delete to preserve audit trail
    result = await db.purchases.update_one(
        {"id": purchase_id, "deleted": {"$ne": True}},
        {"$set": {"deleted": True, "deleted_at": datetime.now(timezone.utc).isoformat(), "deleted_by": current_user["username"]}}
    )
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Purchase not found")
    return {"message": "Purchase deleted"}

@api_router.delete("/purchases")
async def delete_all_purchases(current_user: dict = Depends(get_current_user)):
    # GeBüV compliance: soft-delete to preserve audit trail
    result = await db.purchases.update_many(
        {"deleted": {"$ne": True}},
        {"$set": {"deleted": True, "deleted_at": datetime.now(timezone.utc).isoformat(), "deleted_by": current_user["username"]}}
    )
    return {"message": f"{result.modified_count} Ankäufe gelöscht"}

# Export all purchases as Excel
@api_router.get("/purchases/export/excel")
async def export_purchases_excel(start_date: Optional[str] = None, end_date: Optional[str] = None, current_user: dict = Depends(get_current_user)):
    query = {"deleted": {"$ne": True}}
    
    if start_date or end_date:
        query["timestamp"] = {}
        if start_date:
            query["timestamp"]["$gte"] = start_date
        if end_date:
            # Add time to include the entire end day
            query["timestamp"]["$lte"] = end_date + "T23:59:59"
    
    # Optimized: Only fetch required fields, limit to 50000 for performance
    purchases = await db.purchases.find(
        query, 
        {"_id": 0, "id": 1, "timestamp": 1, "total": 1, "items": 1}
    ).sort("timestamp", -1).to_list(50000)
    
    # Flatten purchases into rows (one row per item)
    rows = []
    for p in purchases:
        for item in p["items"]:
            rows.append({
                "Datum": p["timestamp"][:10],
                "Zeit": p["timestamp"][11:16] if len(p["timestamp"]) > 16 else "",
                "Ankauf-Nr": p["id"][:8].upper(),
                "Kategorie": item.get("category", ""),
                "Preisniveau": item.get("price_level", ""),
                "Zustand": item.get("condition", ""),
                "Relevanz": item.get("relevance", ""),
                "Preis (CHF)": item.get("price", 0),
                "Ankauf Total (CHF)": p["total"]
            })
    
    if not rows:
        # Empty export with headers
        rows = [{"Datum": "", "Zeit": "", "Ankauf-Nr": "", "Kategorie": "", 
                 "Preisniveau": "", "Zustand": "", "Relevanz": "", 
                 "Preis (CHF)": "", "Ankauf Total (CHF)": ""}]
    
    df = pd.DataFrame(rows)
    
    # Security: Sanitize for Excel Injection
    def sanitize_excel_cell(value):
        if isinstance(value, str) and value.startswith(('=', '+', '-', '@')):
            return "'" + value
        return value

    # Apply to all string columns
    for col in df.select_dtypes(include=['object']).columns:
        df[col] = df[col].apply(sanitize_excel_cell)

    output = io.BytesIO()
    with pd.ExcelWriter(output, engine='openpyxl') as writer:
        df.to_excel(writer, index=False, sheet_name='Ankäufe')
        
        # Add summary sheet
        summary_data = {
            "Statistik": ["Anzahl Ankäufe", "Anzahl Artikel", "Gesamtsumme (CHF)"],
            "Wert": [
                len(purchases),
                sum(len(p["items"]) for p in purchases),
                sum(p["total"] for p in purchases)
            ]
        }
        summary_df = pd.DataFrame(summary_data)
        summary_df.to_excel(writer, index=False, sheet_name='Zusammenfassung')
    
    output.seek(0)
    
    return StreamingResponse(
        output,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": "attachment; filename=ankaufe_export.xlsx"}
    )

# ============== Stats Routes ==============

@api_router.get("/stats/daily", response_model=List[DailyStats])
async def get_daily_stats(days: int = 30, current_user: dict = Depends(get_current_user)):
    start_date = (datetime.now(timezone.utc) - timedelta(days=days)).isoformat()
    
    purchases = await db.purchases.find(
        {"timestamp": {"$gte": start_date}, "deleted": {"$ne": True}},
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
async def get_monthly_stats(months: int = 12, current_user: dict = Depends(get_current_user)):
    # Optimized: Only fetch required fields and limit results
    purchases = await db.purchases.find(
        {"deleted": {"$ne": True}}, 
        {"_id": 0, "timestamp": 1, "total": 1}
    ).to_list(50000)
    
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
async def get_today_stats(current_user: dict = Depends(get_current_user)):
    today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    
    # Optimized: Use date range query instead of regex, only fetch needed fields
    purchases = await db.purchases.find(
        {"timestamp": {"$gte": today, "$lt": today + "T23:59:59"}, "deleted": {"$ne": True}},
        {"_id": 0, "total": 1, "items": 1}
    ).to_list(1000)
    
    total_purchases = len(purchases)
    total_amount = sum(p["total"] for p in purchases)
    total_items = sum(len(p["items"]) for p in purchases)
    
    return {
        "date": today,
        "total_purchases": total_purchases,
        "total_amount": total_amount,
        "total_items": total_items
    }


class LoginRequest(BaseModel):
    username: str
    password: str

class UserResponse(BaseModel):
    username: str
    role: str

@api_router.post("/auth/login")
async def login(data: LoginRequest, request: Request):
    # Rate limiting
    check_rate_limit(request) # Pass request object now
    
    user = USERS.get(data.username.lower())
    if not user or not pwd_context.verify(data.password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="Falscher Benutzername oder Passwort")
    
    # Generate JWT token
    token = create_access_token(data.username.lower(), user["role"])
    
    return {
        "username": data.username.lower(),
        "role": user["role"],
        "access_token": token,
        "token_type": "bearer"
    }

@api_router.get("/auth/users")
async def get_users(current_user: dict = Depends(get_current_user)):
    return [{"username": k, "role": v["role"]} for k, v in USERS.items()]

# ============== Custom Categories Routes ==============

@api_router.get("/custom-categories")
async def get_custom_categories(current_user: dict = Depends(get_current_user)):
    categories = await db.custom_categories.find({}, {"_id": 0}).to_list(100)
    return categories  # Return full objects with name and image

@api_router.post("/custom-categories")
async def add_custom_category(data: CustomCategoryCreate, current_user: dict = Depends(get_current_user)):
    name = data.name.strip()
    
    if not name:
        raise HTTPException(status_code=400, detail="Name erforderlich")
    if name in CATEGORIES:
        raise HTTPException(status_code=400, detail="Kategorie existiert bereits")
    
    existing = await db.custom_categories.find_one({"name": name})
    if existing:
        raise HTTPException(status_code=400, detail="Kategorie existiert bereits")
    
    await db.custom_categories.insert_one({"name": name, "image": data.image, "icon": data.icon})
    return {"message": f"Kategorie '{name}' hinzugefügt"}

@api_router.put("/custom-categories/{name}/image")
async def update_category_image(name: str, data: CategoryImageUpdate, current_user: dict = Depends(get_current_user)):
    result = await db.custom_categories.update_one(
        {"name": name},
        {"$set": {"image": data.image}}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Kategorie nicht gefunden")
    return {"message": "Bild aktualisiert"}

@api_router.delete("/custom-categories/{name}")
async def delete_custom_category(name: str, current_user: dict = Depends(require_admin)): # RBAC: Admin only
    result = await db.custom_categories.delete_one({"name": name})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Kategorie nicht gefunden")
    return {"message": f"Kategorie '{name}' gelöscht"}

# ============== Settings Routes ==============

@api_router.get("/settings")
async def get_settings(current_user: dict = Depends(get_current_user)):
    settings = await db.app_settings.find_one({"type": "general"}, {"_id": 0})
    if not settings:
        return {
            "danger_zone_password": "",
            "colors": {
                "luxus": "#FEF3C7",
                "teuer": "#DBEAFE",
                "mittel": "#D1FAE5",
                "guenstig": "#F1F5F9"
            },
            "hidden_categories": [],
            "category_icons": {},
            "background": "paper"
        }
    return settings

@api_router.put("/settings")
async def update_settings(data: SettingsUpdate, current_user: dict = Depends(require_admin)): # RBAC: Admin only
    update_data = data.model_dump(exclude_none=True)
    update_data["type"] = "general"
    await db.app_settings.update_one(
        {"type": "general"},
        {"$set": update_data},
        upsert=True
    )
    return {"message": "Einstellungen gespeichert"}

# Receipt settings
@api_router.get("/settings/receipt")
async def get_receipt_settings(current_user: dict = Depends(get_current_user)):
    settings = await db.app_settings.find_one({"type": "receipt"}, {"_id": 0})
    if not settings:
        return {
            "store_name": "Smillå-Store GmbH",
            "store_address": "Musterstrasse 123",
            "store_city": "8000 Zürich",
            "store_phone": "+41 44 123 45 67",
            "footer_text": "Vielen Dank für Ihren Verkauf!",
            "sub_footer_text": "Diese Quittung dient als Nachweis.",
            "show_store_name": True,
            "show_address": True,
            "show_phone": True,
            "show_date": True,
            "show_receipt_id": True,
            "show_item_details": True,
            "show_relevance": True,
            "show_item_count": True,
            "show_footer": True,
            "font_size_store": 18,
            "font_size_title": 16,
            "font_size_items": 12,
            "font_size_total": 20,
            "font_size_footer": 12
        }
    return settings

@api_router.put("/settings/receipt")
async def update_receipt_settings(data: ReceiptSettingsUpdate, current_user: dict = Depends(get_current_user)):
    update_data = data.model_dump(exclude_none=True)
    update_data["type"] = "receipt"
    await db.app_settings.update_one(
        {"type": "receipt"},
        {"$set": update_data},
        upsert=True
    )
    return {"message": "Quittungs-Einstellungen gespeichert"}

# ============== Customer Routes ==============

@api_router.get("/customers", response_model=List[CustomerResponse])
async def get_customers(search: Optional[str] = None, current_user: dict = Depends(get_current_user)):
    """Get all customers, optionally filtered by search term (name or email)."""
    query = {}
    if search:
        escaped_search = re.escape(search)
        search_regex = {"$regex": escaped_search, "$options": "i"}
        query = {"$or": [
            {"first_name": search_regex},
            {"last_name": search_regex},
            {"email": search_regex}
        ]}
    
    customers = await db.customers.find(query, {"_id": 0}).sort("last_name", 1).to_list(500)
    
    # Convert datetime to string for response
    for c in customers:
        if isinstance(c.get("created_at"), datetime):
            c["created_at"] = c["created_at"].isoformat()
        elif "created_at" not in c:
            c["created_at"] = datetime.now(timezone.utc).isoformat()
    
    return customers

@api_router.post("/customers", response_model=CustomerResponse)
async def create_customer(data: CustomerCreate, current_user: dict = Depends(get_current_user)):
    """Create a new customer."""
    # Check if email already exists
    existing = await db.customers.find_one({"email": data.email.lower().strip()})
    if existing:
        raise HTTPException(status_code=400, detail="Ein Kunde mit dieser E-Mail existiert bereits")
    
    customer = Customer(
        first_name=data.first_name.strip(),
        last_name=data.last_name.strip(),
        email=data.email.lower().strip(),
        address=data.address.strip() if data.address else None,
        phone=data.phone.strip() if data.phone else None
    )
    
    doc = customer.model_dump()
    doc["created_at"] = customer.created_at
    await db.customers.insert_one(doc)
    
    return CustomerResponse(
        id=customer.id,
        first_name=customer.first_name,
        last_name=customer.last_name,
        email=customer.email,
        address=customer.address,
        phone=customer.phone,
        current_balance=customer.current_balance,
        created_at=customer.created_at.isoformat()
    )

@api_router.get("/customers/{customer_id}")
async def get_customer(customer_id: str, current_user: dict = Depends(get_current_user)):
    """Get a single customer with their transaction history."""
    customer = await db.customers.find_one({"id": customer_id}, {"_id": 0})
    if not customer:
        raise HTTPException(status_code=404, detail="Kunde nicht gefunden")
    
    # Get all transactions for this customer
    transactions = await db.credit_transactions.find(
        {"customer_id": customer_id}, {"_id": 0}
    ).sort("timestamp", -1).to_list(1000)
    
    # Calculate actual balance from transactions (source of truth)
    actual_balance = sum(t["amount"] for t in transactions)
    
    # Update cached balance if different
    if customer.get("current_balance", 0) != actual_balance:
        await db.customers.update_one(
            {"id": customer_id},
            {"$set": {"current_balance": actual_balance}}
        )
    
    # Format timestamps
    if isinstance(customer.get("created_at"), datetime):
        customer["created_at"] = customer["created_at"].isoformat()
    
    for t in transactions:
        if isinstance(t.get("timestamp"), datetime):
            t["timestamp"] = t["timestamp"].isoformat()
    
    return {
        **customer,
        "current_balance": actual_balance,
        "transactions": transactions
    }

@api_router.put("/customers/{customer_id}")
async def update_customer(customer_id: str, data: CustomerCreate, current_user: dict = Depends(get_current_user)):
    """Update customer details."""
    existing = await db.customers.find_one({"id": customer_id})
    if not existing:
        raise HTTPException(status_code=404, detail="Kunde nicht gefunden")
    
    # Check email uniqueness (if changed)
    if data.email.lower().strip() != existing.get("email"):
        email_exists = await db.customers.find_one({"email": data.email.lower().strip(), "id": {"$ne": customer_id}})
        if email_exists:
            raise HTTPException(status_code=400, detail="Diese E-Mail wird bereits verwendet")
    
    await db.customers.update_one(
        {"id": customer_id},
        {"$set": {
            "first_name": data.first_name.strip(),
            "last_name": data.last_name.strip(),
            "email": data.email.lower().strip(),
            "address": data.address.strip() if data.address else None,
            "phone": data.phone.strip() if data.phone else None
        }}
    )
    
    return {"message": "Kunde aktualisiert"}

@api_router.delete("/customers/{customer_id}")
async def delete_customer(customer_id: str, current_user: dict = Depends(get_current_user)):
    """Delete a customer and their transactions."""
    result = await db.customers.delete_one({"id": customer_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Kunde nicht gefunden")
    
    # Also delete their transactions
    await db.credit_transactions.delete_many({"customer_id": customer_id})
    
    return {"message": "Kunde gelöscht"}

@api_router.post("/customers/{customer_id}/transactions")
async def create_transaction(customer_id: str, data: TransactionCreate, staff_username: str = "system", current_user: dict = Depends(get_current_user)):
    """Create a manual transaction (credit or debit)."""
    customer = await db.customers.find_one({"id": customer_id})
    if not customer:
        raise HTTPException(status_code=404, detail="Kunde nicht gefunden")
    
    # Determine amount sign based on type
    amount = abs(data.amount)
    if data.type == "debit":
        amount = -amount
    
    transaction = CreditTransaction(
        customer_id=customer_id,
        amount=amount,
        type=f"manual_{data.type}",
        description=data.description,
        reference_id=data.reference_id or f"MANUAL-{str(uuid.uuid4())[:8].upper()}",
        staff_username=staff_username
    )
    
    doc = transaction.model_dump()
    doc["timestamp"] = transaction.timestamp
    await db.credit_transactions.insert_one(doc)
    
    # Update cached balance
    new_balance = customer.get("current_balance", 0) + amount
    await db.customers.update_one(
        {"id": customer_id},
        {"$set": {"current_balance": new_balance}}
    )
    
    return {
        "message": "Transaktion erstellt",
        "transaction_id": transaction.id,
        "new_balance": new_balance
    }

@api_router.get("/customers/export/excel")
async def export_customers_excel(current_user: dict = Depends(get_current_user)):
    """Export all customers and their transactions as Excel file."""
    customers = await db.customers.find({}, {"_id": 0}).to_list(10000)
    transactions = await db.credit_transactions.find({}, {"_id": 0}).to_list(50000)
    
    # Create customers sheet data
    customer_rows = []
    for c in customers:
        customer_rows.append({
            "ID": c.get("id", "")[:8].upper(),
            "Nachname": c.get("last_name", ""),
            "Vorname": c.get("first_name", ""),
            "E-Mail": c.get("email", ""),
            "Adresse": c.get("address", "") or "",
            "Telefon": c.get("phone", "") or "",
            "Aktuelles Guthaben (CHF)": c.get("current_balance", 0),
            "Erstellt am": str(c.get("created_at", ""))[:10]
        })
    
    # Create transactions sheet data
    transaction_rows = []
    customer_map = {c["id"]: f"{c.get('first_name', '')} {c.get('last_name', '')}" for c in customers}
    for t in transactions:
        transaction_rows.append({
            "Datum": str(t.get("timestamp", ""))[:10],
            "Zeit": str(t.get("timestamp", ""))[11:16] if len(str(t.get("timestamp", ""))) > 16 else "",
            "Kunde": customer_map.get(t.get("customer_id", ""), "Unbekannt"),
            "Typ": t.get("type", ""),
            "Betrag (CHF)": t.get("amount", 0),
            "Beschreibung": t.get("description", "") or "",
            "Referenz": t.get("reference_id", "") or "",
            "Mitarbeiter": t.get("staff_username", "")
        })
    
    # Create Excel file
    output = io.BytesIO()
    with pd.ExcelWriter(output, engine='openpyxl') as writer:
        if customer_rows:
            pd.DataFrame(customer_rows).to_excel(writer, index=False, sheet_name='Kunden')
        else:
            pd.DataFrame([{"Info": "Keine Kunden vorhanden"}]).to_excel(writer, index=False, sheet_name='Kunden')
        
        if transaction_rows:
            pd.DataFrame(transaction_rows).to_excel(writer, index=False, sheet_name='Transaktionen')
        else:
            pd.DataFrame([{"Info": "Keine Transaktionen vorhanden"}]).to_excel(writer, index=False, sheet_name='Transaktionen')
        
        # Summary sheet
        summary_data = {
            "Statistik": ["Anzahl Kunden", "Gesamtes Guthaben (CHF)", "Anzahl Transaktionen"],
            "Wert": [
                len(customers),
                sum(c.get("current_balance", 0) for c in customers),
                len(transactions)
            ]
        }
        pd.DataFrame(summary_data).to_excel(writer, index=False, sheet_name='Zusammenfassung')
    
    output.seek(0)
    
    return StreamingResponse(
        output,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": "attachment; filename=kunden_guthaben_export.xlsx"}
    )

# ============== App Setup ==============

app.include_router(api_router)



@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
