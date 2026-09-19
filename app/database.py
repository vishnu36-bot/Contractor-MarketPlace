import sqlite3
import os
from contextlib import contextmanager

DB_PATH = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "marketplace.db")

def get_db():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    try:
        yield conn
    finally:
        conn.close()

@contextmanager
def db_session():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    try:
        yield conn
        conn.commit()
    except Exception:
        conn.rollback()
        raise
    finally:
        conn.close()

def init_db():
    with db_session() as conn:
        cursor = conn.cursor()
        
        # Users table
        cursor.execute("""
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            phone TEXT UNIQUE NOT NULL,
            name TEXT NOT NULL,
            role TEXT NOT NULL CHECK(role IN ('customer', 'contractor', 'admin')),
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
        """)

        # Contractors table
        cursor.execute("""
        CREATE TABLE IF NOT EXISTS contractors (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER,
            name TEXT NOT NULL,
            trade TEXT NOT NULL,
            phone TEXT NOT NULL,
            city TEXT NOT NULL,
            area TEXT NOT NULL,
            address TEXT NOT NULL,
            experience_years INTEGER DEFAULT 1,
            completed_projects INTEGER DEFAULT 0,
            rating_workmanship REAL DEFAULT 5.0,
            rating_materials REAL DEFAULT 5.0,
            review_count INTEGER DEFAULT 0,
            bio TEXT,
            photo_url TEXT,
            is_approved INTEGER DEFAULT 0,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(id)
        );
        """)

        # Contractor Portfolios table
        cursor.execute("""
        CREATE TABLE IF NOT EXISTS contractor_portfolios (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            contractor_id INTEGER NOT NULL,
            title TEXT NOT NULL,
            description TEXT,
            image_url TEXT NOT NULL,
            category TEXT,
            FOREIGN KEY (contractor_id) REFERENCES contractors(id) ON DELETE CASCADE
        );
        """)

        # Materials table
        cursor.execute("""
        CREATE TABLE IF NOT EXISTS materials (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            contractor_id INTEGER NOT NULL,
            name TEXT NOT NULL,
            brand TEXT NOT NULL,
            category TEXT NOT NULL,
            price REAL NOT NULL,
            unit TEXT NOT NULL,
            stock INTEGER NOT NULL DEFAULT 0,
            is_in_stock INTEGER DEFAULT 1,
            description TEXT,
            image_url TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (contractor_id) REFERENCES contractors(id) ON DELETE CASCADE
        );
        """)

        # Guidance Requests table
        cursor.execute("""
        CREATE TABLE IF NOT EXISTS guidance_requests (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            customer_id INTEGER NOT NULL,
            contractor_id INTEGER NOT NULL,
            project_title TEXT NOT NULL,
            project_details TEXT NOT NULL,
            preferred_brand TEXT,
            status TEXT DEFAULT 'pending' CHECK(status IN ('pending', 'quoted', 'accepted', 'declined')),
            contractor_notes TEXT,
            quote_items TEXT,
            quote_total REAL DEFAULT 0,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (customer_id) REFERENCES users(id),
            FOREIGN KEY (contractor_id) REFERENCES contractors(id)
        );
        """)

        # Orders table
        cursor.execute("""
        CREATE TABLE IF NOT EXISTS orders (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            order_code TEXT UNIQUE NOT NULL,
            customer_id INTEGER NOT NULL,
            contractor_id INTEGER NOT NULL,
            items_json TEXT NOT NULL,
            subtotal REAL NOT NULL,
            delivery_fee REAL NOT NULL DEFAULT 0,
            total_amount REAL NOT NULL,
            fulfillment_method TEXT NOT NULL CHECK(fulfillment_method IN ('doorstep', 'pickup')),
            delivery_address TEXT,
            contact_phone TEXT NOT NULL,
            payment_method TEXT NOT NULL CHECK(payment_method IN ('cod', 'upi')),
            payment_status TEXT DEFAULT 'pending',
            status TEXT DEFAULT 'placed' CHECK(status IN ('placed', 'preparing', 'dispatched', 'completed', 'cancelled')),
            guidance_request_id INTEGER,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (customer_id) REFERENCES users(id),
            FOREIGN KEY (contractor_id) REFERENCES contractors(id)
        );
        """)

        # Reviews table (Dual rating: Material Quality + Workmanship)
        cursor.execute("""
        CREATE TABLE IF NOT EXISTS reviews (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            order_id INTEGER,
            contractor_id INTEGER NOT NULL,
            customer_id INTEGER NOT NULL,
            customer_name TEXT NOT NULL,
            material_rating REAL NOT NULL,
            workmanship_rating REAL NOT NULL,
            comment TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (order_id) REFERENCES orders(id),
            FOREIGN KEY (contractor_id) REFERENCES contractors(id),
            FOREIGN KEY (customer_id) REFERENCES users(id)
        );
        """)
