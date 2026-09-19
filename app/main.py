import json
import random
import os
from typing import Optional, List
from fastapi import FastAPI, Query, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from pydantic import BaseModel

from app.database import db_session, init_db
from app.seed import seed_database

app = FastAPI(title="BuildMate - Contractor & Material Marketplace API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize and seed on startup
@app.on_event("startup")
def startup_event():
    init_db()
    seed_database()

# Pydantic models for input validation
class OtpRequest(BaseModel):
    phone: str
    role: Optional[str] = "customer" # 'customer' or 'contractor'
    name: Optional[str] = None

class OtpVerify(BaseModel):
    phone: str
    otp: str
    name: Optional[str] = None
    role: Optional[str] = "customer"

class MaterialCreate(BaseModel):
    contractor_id: int
    name: str
    brand: str
    category: str
    price: float
    unit: str
    stock: int
    description: Optional[str] = ""
    image_url: Optional[str] = ""

class MaterialUpdate(BaseModel):
    price: Optional[float] = None
    stock: Optional[int] = None
    is_in_stock: Optional[int] = None
    name: Optional[str] = None
    description: Optional[str] = None

class GuidanceRequestCreate(BaseModel):
    customer_id: int
    contractor_id: int
    project_title: str
    project_details: str
    preferred_brand: Optional[str] = ""

class GuidanceQuoteSubmit(BaseModel):
    contractor_notes: str
    quote_items: list # list of dicts: {material_id, name, unit, qty, price, total}
    quote_total: float

class OrderItem(BaseModel):
    material_id: Optional[int] = None
    name: str
    unit: str
    qty: int
    price: float
    total: float

class OrderCreate(BaseModel):
    customer_id: int
    contractor_id: int
    items: List[OrderItem]
    subtotal: float
    delivery_fee: float
    total_amount: float
    fulfillment_method: str # 'doorstep' or 'pickup'
    delivery_address: Optional[str] = ""
    contact_phone: str
    payment_method: str # 'cod' or 'upi'
    guidance_request_id: Optional[int] = None

class ReviewCreate(BaseModel):
    order_id: Optional[int] = None
    contractor_id: int
    customer_id: int
    customer_name: str
    material_rating: float
    workmanship_rating: float
    comment: str

# ----------------- AUTH & DEMO USERS -----------------
@app.post("/api/auth/otp-request")
def request_otp(data: OtpRequest):
    clean_phone = data.phone.replace(" ", "").replace("+91", "")
    return {
        "success": True,
        "phone": clean_phone,
        "message": "OTP sent successfully! For demo, use code: 123456",
        "demo_otp": "123456"
    }

@app.post("/api/auth/otp-verify")
def verify_otp(data: OtpVerify):
    clean_phone = data.phone.replace(" ", "").replace("+91", "")
    with db_session() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM users WHERE phone LIKE ?", (f"%{clean_phone}%",))
        user = cursor.fetchone()
        
        if not user:
            name = data.name or f"User {clean_phone[-4:]}"
            role = data.role or "customer"
            cursor.execute("INSERT INTO users (phone, name, role) VALUES (?, ?, ?)", (clean_phone, name, role))
            user_id = cursor.lastrowid
            user = {"id": user_id, "phone": clean_phone, "name": name, "role": role}
        else:
            user = dict(user)

        # If contractor, fetch contractor profile id
        contractor_profile = None
        if user["role"] == "contractor":
            cursor.execute("SELECT * FROM contractors WHERE user_id = ?", (user["id"],))
            row = cursor.fetchone()
            if row:
                contractor_profile = dict(row)

        return {
            "success": True,
            "user": user,
            "contractor_profile": contractor_profile
        }

@app.get("/api/users/demo-accounts")
def get_demo_accounts():
    with db_session() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM users")
        users = [dict(u) for u in cursor.fetchall()]
        
        # Attach contractor profile if applicable
        for u in users:
            if u["role"] == "contractor":
                cursor.execute("SELECT * FROM contractors WHERE user_id = ?", (u["id"],))
                c = cursor.fetchone()
                u["contractor_profile"] = dict(c) if c else None
        return users

# ----------------- CONTRACTORS -----------------
@app.get("/api/contractors")
def list_contractors(
    trade: Optional[str] = None,
    city: Optional[str] = None,
    min_rating: Optional[float] = None,
    search: Optional[str] = None,
    all_status: Optional[bool] = False
):
    with db_session() as conn:
        cursor = conn.cursor()
        query = "SELECT * FROM contractors WHERE 1=1"
        params = []

        if not all_status:
            query += " AND is_approved = 1"

        if trade and trade.lower() != "all":
            query += " AND LOWER(trade) = LOWER(?)"
            params.append(trade)

        if city and city.lower() != "all":
            query += " AND LOWER(city) = LOWER(?)"
            params.append(city)

        if min_rating and min_rating > 0:
            query += " AND ((rating_workmanship + rating_materials)/2.0) >= ?"
            params.append(min_rating)

        if search and search.strip():
            query += " AND (LOWER(name) LIKE ? OR LOWER(bio) LIKE ? OR LOWER(area) LIKE ?)"
            s_param = f"%{search.strip().lower()}%"
            params.extend([s_param, s_param, s_param])

        query += " ORDER BY completed_projects DESC, rating_workmanship DESC"
        cursor.execute(query, params)
        contractors = [dict(r) for r in cursor.fetchall()]

        # Attach materials count & preview photos
        for c in contractors:
            cursor.execute("SELECT COUNT(*) as count FROM materials WHERE contractor_id = ?", (c["id"],))
            c["materials_count"] = cursor.fetchone()["count"]
            
            cursor.execute("SELECT image_url, title FROM contractor_portfolios WHERE contractor_id = ? LIMIT 3", (c["id"],))
            c["portfolio_previews"] = [dict(p) for p in cursor.fetchall()]

            c["overall_rating"] = round((c["rating_workmanship"] + c["rating_materials"]) / 2.0, 1)

        return contractors

@app.get("/api/contractors/{contractor_id}")
def get_contractor_detail(contractor_id: int):
    with db_session() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM contractors WHERE id = ?", (contractor_id,))
        row = cursor.fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="Contractor not found")
        
        contractor = dict(row)
        contractor["overall_rating"] = round((contractor["rating_workmanship"] + contractor["rating_materials"]) / 2.0, 1)

        # Portfolios
        cursor.execute("SELECT * FROM contractor_portfolios WHERE contractor_id = ?", (contractor_id,))
        contractor["portfolios"] = [dict(p) for p in cursor.fetchall()]

        # Materials
        cursor.execute("SELECT * FROM materials WHERE contractor_id = ? ORDER BY category, name", (contractor_id,))
        contractor["materials"] = [dict(m) for m in cursor.fetchall()]

        # Reviews
        cursor.execute("SELECT * FROM reviews WHERE contractor_id = ? ORDER BY created_at DESC", (contractor_id,))
        contractor["reviews"] = [dict(r) for r in cursor.fetchall()]

        return contractor

# ----------------- MATERIALS -----------------
@app.get("/api/materials")
def list_all_materials(
    category: Optional[str] = None,
    city: Optional[str] = None,
    search: Optional[str] = None
):
    with db_session() as conn:
        cursor = conn.cursor()
        query = """
        SELECT m.*, c.name as contractor_name, c.trade as contractor_trade, c.city as contractor_city, 
               c.rating_materials as contractor_mat_rating
        FROM materials m
        JOIN contractors c ON m.contractor_id = c.id
        WHERE c.is_approved = 1 AND m.is_in_stock = 1
        """
        params = []

        if category and category.lower() != "all":
            query += " AND LOWER(m.category) = LOWER(?)"
            params.append(category)

        if city and city.lower() != "all":
            query += " AND LOWER(c.city) = LOWER(?)"
            params.append(city)

        if search and search.strip():
            query += " AND (LOWER(m.name) LIKE ? OR LOWER(m.brand) LIKE ? OR LOWER(m.description) LIKE ?)"
            s_param = f"%{search.strip().lower()}%"
            params.extend([s_param, s_param, s_param])

        query += " ORDER BY m.id DESC"
        cursor.execute(query, params)
        return [dict(r) for r in cursor.fetchall()]

@app.post("/api/materials")
def add_material(data: MaterialCreate):
    with db_session() as conn:
        cursor = conn.cursor()
        img = data.image_url or "https://images.unsplash.com/photo-1589939705384-5185137a7f0f?w=400&q=80"
        cursor.execute("""
        INSERT INTO materials (contractor_id, name, brand, category, price, unit, stock, is_in_stock, description, image_url)
        VALUES (?, ?, ?, ?, ?, ?, ?, 1, ?, ?)
        """, (data.contractor_id, data.name, data.brand, data.category, data.price, data.unit, data.stock, data.description, img))
        return {"success": True, "material_id": cursor.lastrowid}

@app.patch("/api/materials/{material_id}")
def update_material(material_id: int, data: MaterialUpdate):
    with db_session() as conn:
        cursor = conn.cursor()
        fields = []
        params = []
        if data.price is not None:
            fields.append("price = ?")
            params.append(data.price)
        if data.stock is not None:
            fields.append("stock = ?")
            params.append(data.stock)
            if data.is_in_stock is None:
                fields.append("is_in_stock = ?")
                params.append(1 if data.stock > 0 else 0)
        if data.is_in_stock is not None:
            fields.append("is_in_stock = ?")
            params.append(data.is_in_stock)
        if data.name is not None:
            fields.append("name = ?")
            params.append(data.name)
        if data.description is not None:
            fields.append("description = ?")
            params.append(data.description)

        if not fields:
            return {"success": True, "message": "No fields to update"}

        params.append(material_id)
        cursor.execute(f"UPDATE materials SET {', '.join(fields)} WHERE id = ?", params)
        return {"success": True}

@app.delete("/api/materials/{material_id}")
def delete_material(material_id: int):
    with db_session() as conn:
        cursor = conn.cursor()
        cursor.execute("DELETE FROM materials WHERE id = ?", (material_id,))
        return {"success": True}

# ----------------- GUIDANCE & QUOTES -----------------
@app.post("/api/guidance/request")
def create_guidance_request(data: GuidanceRequestCreate):
    with db_session() as conn:
        cursor = conn.cursor()
        cursor.execute("""
        INSERT INTO guidance_requests (customer_id, contractor_id, project_title, project_details, preferred_brand, status)
        VALUES (?, ?, ?, ?, ?, 'pending')
        """, (data.customer_id, data.contractor_id, data.project_title, data.project_details, data.preferred_brand))
        return {"success": True, "request_id": cursor.lastrowid}

@app.get("/api/guidance/customer/{customer_id}")
def get_customer_guidance_requests(customer_id: int):
    with db_session() as conn:
        cursor = conn.cursor()
        cursor.execute("""
        SELECT gr.*, c.name as contractor_name, c.trade as contractor_trade, c.phone as contractor_phone, c.photo_url as contractor_photo
        FROM guidance_requests gr
        JOIN contractors c ON gr.contractor_id = c.id
        WHERE gr.customer_id = ?
        ORDER BY gr.created_at DESC
        """, (customer_id,))
        rows = [dict(r) for r in cursor.fetchall()]
        for r in rows:
            if r["quote_items"]:
                r["quote_items"] = json.loads(r["quote_items"])
            else:
                r["quote_items"] = []
        return rows

@app.get("/api/guidance/contractor/{contractor_id}")
def get_contractor_guidance_requests(contractor_id: int):
    with db_session() as conn:
        cursor = conn.cursor()
        cursor.execute("""
        SELECT gr.*, u.name as customer_name, u.phone as customer_phone
        FROM guidance_requests gr
        JOIN users u ON gr.customer_id = u.id
        WHERE gr.contractor_id = ?
        ORDER BY gr.created_at DESC
        """, (contractor_id,))
        rows = [dict(r) for r in cursor.fetchall()]
        for r in rows:
            if r["quote_items"]:
                r["quote_items"] = json.loads(r["quote_items"])
            else:
                r["quote_items"] = []
        return rows

@app.post("/api/guidance/{request_id}/quote")
def submit_guidance_quote(request_id: int, data: GuidanceQuoteSubmit):
    with db_session() as conn:
        cursor = conn.cursor()
        cursor.execute("""
        UPDATE guidance_requests 
        SET contractor_notes = ?, quote_items = ?, quote_total = ?, status = 'quoted'
        WHERE id = ?
        """, (data.contractor_notes, json.dumps(data.quote_items), data.quote_total, request_id))
        return {"success": True}

# ----------------- ORDERS -----------------
@app.post("/api/orders")
def place_order(data: OrderCreate):
    with db_session() as conn:
        cursor = conn.cursor()
        order_code = f"ORD-2026-{random.randint(1000, 9999)}"
        items_json_str = json.dumps([item.dict() for item in data.items])
        payment_status = "paid" if data.payment_method == "upi" else "pending"

        cursor.execute("""
        INSERT INTO orders (
            order_code, customer_id, contractor_id, items_json, subtotal, 
            delivery_fee, total_amount, fulfillment_method, delivery_address, 
            contact_phone, payment_method, payment_status, status, guidance_request_id
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'placed', ?)
        """, (
            order_code, data.customer_id, data.contractor_id, items_json_str,
            data.subtotal, data.delivery_fee, data.total_amount, data.fulfillment_method,
            data.delivery_address, data.contact_phone, data.payment_method, payment_status,
            data.guidance_request_id
        ))
        order_id = cursor.lastrowid

        # Update guidance request status if applicable
        if data.guidance_request_id:
            cursor.execute("UPDATE guidance_requests SET status = 'accepted' WHERE id = ?", (data.guidance_request_id,))

        # Deduct stock for ordered items
        for it in data.items:
            if it.material_id:
                cursor.execute("""
                UPDATE materials 
                SET stock = MAX(0, stock - ?), 
                    is_in_stock = CASE WHEN (stock - ?) <= 0 THEN 0 ELSE 1 END
                WHERE id = ?
                """, (it.qty, it.qty, it.material_id))

        return {
            "success": True, 
            "order_id": order_id, 
            "order_code": order_code,
            "message": "Order placed successfully!"
        }

@app.get("/api/orders/customer/{customer_id}")
def get_customer_orders(customer_id: int):
    with db_session() as conn:
        cursor = conn.cursor()
        cursor.execute("""
        SELECT o.*, c.name as contractor_name, c.trade as contractor_trade, c.phone as contractor_phone
        FROM orders o
        JOIN contractors c ON o.contractor_id = c.id
        WHERE o.customer_id = ?
        ORDER BY o.created_at DESC
        """, (customer_id,))
        rows = [dict(r) for r in cursor.fetchall()]
        for r in rows:
            r["items"] = json.loads(r["items_json"])
            # Check if reviewed
            cursor.execute("SELECT id FROM reviews WHERE order_id = ?", (r["id"],))
            r["has_reviewed"] = cursor.fetchone() is not None
        return rows

@app.get("/api/orders/contractor/{contractor_id}")
def get_contractor_orders(contractor_id: int):
    with db_session() as conn:
        cursor = conn.cursor()
        cursor.execute("""
        SELECT o.*, u.name as customer_name, u.phone as customer_phone
        FROM orders o
        JOIN users u ON o.customer_id = u.id
        WHERE o.contractor_id = ?
        ORDER BY o.created_at DESC
        """, (contractor_id,))
        rows = [dict(r) for r in cursor.fetchall()]
        for r in rows:
            r["items"] = json.loads(r["items_json"])
        return rows

@app.patch("/api/orders/{order_id}/status")
def update_order_status(order_id: int, status: str = Query(...)):
    with db_session() as conn:
        cursor = conn.cursor()
        cursor.execute("UPDATE orders SET status = ? WHERE id = ?", (status, order_id))
        
        # If completed, increment contractor completed_projects
        if status == "completed":
            cursor.execute("""
            UPDATE contractors 
            SET completed_projects = completed_projects + 1 
            WHERE id = (SELECT contractor_id FROM orders WHERE id = ?)
            """, (order_id,))

        return {"success": True, "status": status}

# ----------------- REVIEWS (DUAL RATINGS) -----------------
@app.post("/api/reviews")
def add_review(data: ReviewCreate):
    with db_session() as conn:
        cursor = conn.cursor()
        cursor.execute("""
        INSERT INTO reviews (order_id, contractor_id, customer_id, customer_name, material_rating, workmanship_rating, comment)
        VALUES (?, ?, ?, ?, ?, ?, ?)
        """, (data.order_id, data.contractor_id, data.customer_id, data.customer_name, data.material_rating, data.workmanship_rating, data.comment))
        
        # Recalculate average ratings for contractor
        cursor.execute("""
        SELECT AVG(material_rating) as avg_mat, AVG(workmanship_rating) as avg_work, COUNT(*) as cnt
        FROM reviews WHERE contractor_id = ?
        """, (data.contractor_id,))
        stat = cursor.fetchone()
        if stat and stat["cnt"] > 0:
            cursor.execute("""
            UPDATE contractors 
            SET rating_materials = ?, rating_workmanship = ?, review_count = ?
            WHERE id = ?
            """, (round(stat["avg_mat"], 1), round(stat["avg_work"], 1), stat["cnt"], data.contractor_id))

        return {"success": True}

# ----------------- ADMIN PORTAL -----------------
@app.get("/api/admin/stats")
def get_admin_stats():
    with db_session() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT COUNT(*) as total_contractors FROM contractors")
        tot_c = cursor.fetchone()["total_contractors"]

        cursor.execute("SELECT COUNT(*) as pending_contractors FROM contractors WHERE is_approved = 0")
        pen_c = cursor.fetchone()["pending_contractors"]

        cursor.execute("SELECT COUNT(*) as total_orders, COALESCE(SUM(total_amount), 0) as total_gmv FROM orders")
        ord_stats = cursor.fetchone()

        cursor.execute("SELECT COUNT(*) as total_materials FROM materials")
        tot_m = cursor.fetchone()["total_materials"]

        return {
            "total_contractors": tot_c,
            "pending_approvals": pen_c,
            "total_orders": ord_stats["total_orders"],
            "total_gmv": ord_stats["total_gmv"],
            "total_materials": tot_m
        }

@app.patch("/api/admin/contractors/{contractor_id}/approval")
def toggle_contractor_approval(contractor_id: int, approve: int = Query(...)):
    with db_session() as conn:
        cursor = conn.cursor()
        cursor.execute("UPDATE contractors SET is_approved = ? WHERE id = ?", (approve, contractor_id))
        return {"success": True, "is_approved": approve}

# ----------------- FRONTEND SERVING -----------------
STATIC_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "static")
app.mount("/static", StaticFiles(directory=STATIC_DIR), name="static")

@app.get("/")
def serve_index():
    return FileResponse(os.path.join(STATIC_DIR, "index.html"))
