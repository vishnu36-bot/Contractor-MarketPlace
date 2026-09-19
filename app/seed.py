import json
from app.database import db_session, init_db

def seed_database():
    init_db()
    with db_session() as conn:
        cursor = conn.cursor()
        
        # Check if already seeded
        cursor.execute("SELECT COUNT(*) as cnt FROM users")
        if cursor.fetchone()["cnt"] > 0:
            print("Database already seeded.")
            return

        print("Seeding database with realistic Indian contractor marketplace data...")

        # 1. Users
        users = [
            ("9876543210", "Ramesh Kumar (Customer)", "customer"),
            ("9845012345", "Vikram Rathore (Painter)", "contractor"),
            ("9820011223", "Praveen Sharma (Civil & Mason)", "contractor"),
            ("9811122334", "Anand Verma (Licensed Electrician)", "contractor"),
            ("9888877766", "Sunil Kulkarni (Master Plumber)", "contractor"),
            ("9899988877", "Rajesh Mistry (Wood & Interior)", "contractor"),
            ("9900011122", "Kavita Rao (Customer)", "customer"),
            ("9999999999", "Platform Admin", "admin")
        ]
        cursor.executemany("INSERT INTO users (phone, name, role) VALUES (?, ?, ?)", users)
        
        # 2. Contractors
        contractors = [
            (
                2, # user_id Vikram
                "Vikram ColourCraft Painters",
                "Painter",
                "+91 98450 12345",
                "Bangalore",
                "Indiranagar / Koramangala",
                "124, 100ft Road, Indiranagar, Bangalore 560038",
                12, # experience_years
                142, # completed_projects
                4.9, # rating_workmanship
                4.8, # rating_materials
                28, # review_count
                "Asian Paints Authorized Master Painter specializing in luxury interior textures, exterior weatherproofing, and dust-free automated sanding.",
                "https://images.unsplash.com/photo-1541888946425-d0fbb18086f6?w=400&q=80",
                1 # is_approved
            ),
            (
                3, # user_id Praveen
                "Sharma Civil & Foundation Builders",
                "Mason & Civil",
                "+91 98200 11223",
                "Mumbai",
                "Andheri West / Lokhandwala",
                "Shop 8, Galaxy Plaza, Link Road, Andheri West, Mumbai 400053",
                16,
                89,
                4.8,
                4.7,
                19,
                "RCC structural works, tile masonry, brickwork, terrace waterproofing, and structural remodeling. Certified supplier of UltraTech & Tata Steel.",
                "https://images.unsplash.com/photo-1504307651254-35680f356dfd?w=400&q=80",
                1
            ),
            (
                4, # user_id Anand
                "PowerGrid Electrical Solutions",
                "Electrician",
                "+91 98111 22334",
                "Delhi NCR",
                "Sector 62 Noida / South Extension",
                "Plot 45, Commercial Complex, Sector 62, Noida 201301",
                9,
                210,
                4.9,
                4.9,
                45,
                "Government licensed Class-A electrical contractor. 3-phase wiring, smart home automation, DB box setup, Havells & Polycab certified installer.",
                "https://images.unsplash.com/photo-1621905251189-08b45d6a269e?w=400&q=80",
                1
            ),
            (
                5, # user_id Sunil
                "HydroPro Plumbing & Sanitary",
                "Plumber",
                "+91 98888 77766",
                "Hyderabad",
                "Gachibowli / Hitec City",
                "Plot 12, Telecom Nagar, Gachibowli, Hyderabad 500032",
                11,
                165,
                4.7,
                4.8,
                32,
                "Complete sanitary piping, concealed shower panels, pressure pumps, CPVC line overhauls, and drainage solutions with guaranteed leak-proof warranty.",
                "https://images.unsplash.com/photo-1581578731548-c64695cc6952?w=400&q=80",
                1
            ),
            (
                6, # user_id Rajesh
                "Mistry Woodcraft & Modulars",
                "Carpenter",
                "+91 98999 88877",
                "Bangalore",
                "Whitefield / HSR Layout",
                "No. 18, ITPL Main Road, Whitefield, Bangalore 560066",
                14,
                115,
                4.9,
                4.6,
                22,
                "Custom teakwood door frames, modular kitchen carcase, soft-close hardware fittings, and custom acoustic wall paneling.",
                "https://images.unsplash.com/photo-1534447677768-be436bb09401?w=400&q=80",
                0 # pending approval demo
            )
        ]

        cursor.executemany("""
        INSERT INTO contractors (
            user_id, name, trade, phone, city, area, address, 
            experience_years, completed_projects, rating_workmanship, 
            rating_materials, review_count, bio, photo_url, is_approved
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, contractors)

        # 3. Portfolios
        portfolios = [
            # Vikram (Painter)
            (1, "Luxury 3BHK Royale Texture Finish", "Applied Asian Paints Royale Aspire texture in Living room with Royale Matt across all bedrooms in Indiranagar villa.", "https://images.unsplash.com/photo-1513694203232-719a280e022f?w=600&q=80", "Interior"),
            (1, "Apex Ultima Weatherproof Exterior", "3-storey bungalow exterior coated with silicone-enhanced Asian Paints Ultima Protek with 10-year waterproofing warranty.", "https://images.unsplash.com/photo-1564013799919-ab600027ffc6?w=600&q=80", "Exterior"),
            # Praveen (Civil)
            (2, "Terrace Waterproofing & Italian Marble Laying", "Complete membrane crack filling, Dr. Fixit Newcoat coating followed by precision diamond-cut Italian marble flooring.", "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=600&q=80", "Flooring & Masonry"),
            # Anand (Electrician)
            (3, "Modern Duplex Smart Lighting & DB Panel", "Engineered complete concealed wiring with Polycab FRLS, Schneider MCBs, and automated Philips Hue dimmable circuits.", "https://images.unsplash.com/photo-1507089947368-19c1da9775ae?w=600&q=80", "Smart Wiring"),
            # Sunil (Plumber)
            (4, "Master Bath Grohe Concealed Diverter Installation", "Dual thermostatic valves with Jaguar overhead rain shower and noise-insulated UPVC drain stacks.", "https://images.unsplash.com/photo-1584622650111-993a426fbf0a?w=600&q=80", "Sanitary")
        ]
        cursor.executemany("""
        INSERT INTO contractor_portfolios (contractor_id, title, description, image_url, category)
        VALUES (?, ?, ?, ?, ?)
        """, portfolios)

        # 4. Materials listed by contractors
        materials = [
            # Vikram (Painter) Store
            (1, "Asian Paints Royale Luxury Emulsion (Brilliant White)", "Asian Paints", "Interior Paint", 5850.0, "20 Litre Bucket", 15, 1, "Teflon-surface protector, smooth luxurious sheen, stain-resistant washability.", "https://images.unsplash.com/photo-1589939705384-5185137a7f0f?w=400&q=80"),
            (1, "Asian Paints TruCare Interior Wall Primer", "Asian Paints", "Primer", 1850.0, "20 Litre Bucket", 22, 1, "Water-thinnable primer with excellent opacity and alkali resistance.", "https://images.unsplash.com/photo-1562259949-e8e7689d7828?w=400&q=80"),
            (1, "Asian Paints Apex Ultima Exterior Emulsion", "Asian Paints", "Exterior Paint", 6400.0, "20 Litre Bucket", 10, 1, "High-performance exterior wall finish with anti-algae and dirt pick-up resistance.", "https://images.unsplash.com/photo-1513694203232-719a280e022f?w=400&q=80"),
            (1, "Birla White WallSeal Waterproof Putty", "Birla White", "Wall Putty", 980.0, "40 kg Bag", 35, 1, "Extra white polymer-modified putty that prevents flaking and dampness.", "https://images.unsplash.com/photo-1590381105924-c72589b9ef3f?w=400&q=80"),
            (1, "Professional 9-inch Microfiber Roller + Tray Kit", "PaintMaster", "Tools", 350.0, "Kit", 50, 1, "High density shed-resistant roller for ultra-smooth wall finish.", "https://images.unsplash.com/photo-1589939705384-5185137a7f0f?w=400&q=80"),
            
            # Praveen (Civil) Store
            (2, "UltraTech Super Cement (High Early Strength)", "UltraTech", "Cement", 410.0, "50 kg Bag", 120, 1, "Micro-fine particles providing dense concrete matrix with supreme durability.", "https://images.unsplash.com/photo-1590381105924-c72589b9ef3f?w=400&q=80"),
            (2, "Tata Tiscon 550D TMT Steel Rebars (12mm)", "Tata Tiscon", "Steel & Rebars", 72.0, "per Kg (12m Rod ~ 10.6kg)", 500, 1, "High ductility seismic-resistant thermo-mechanically treated bar.", "https://images.unsplash.com/photo-1504307651254-35680f356dfd?w=400&q=80"),
            (2, "Dr. Fixit Newcoat Waterproofing Roof Membrane", "Dr. Fixit", "Waterproofing", 4600.0, "20 Litre Drum", 18, 1, "Heavy duty elastomeric waterproof coating with heat-reflective insulation.", "https://images.unsplash.com/photo-1581578731548-c64695cc6952?w=400&q=80"),
            (2, "River Sand Sifted (Plaster Grade)", "Local Quarry", "Aggregates", 65.0, "per 50kg Bag", 80, 1, "Washed and silt-free coarse sand for crack-free wall plaster.", "https://images.unsplash.com/photo-1590381105924-c72589b9ef3f?w=400&q=80"),

            # Anand (Electrician) Store
            (3, "Polycab FRLS Copper Flexible Wire 2.5 sq.mm", "Polycab", "Cables & Wires", 2450.0, "90 Meter Coil", 40, 1, "Flame retardant low smoke 100% pure electrolytic grade copper wire.", "https://images.unsplash.com/photo-1544724569-5f546fd6f2b5?w=400&q=80"),
            (3, "Polycab FRLS Copper Flexible Wire 1.5 sq.mm", "Polycab", "Cables & Wires", 1680.0, "90 Meter Coil", 50, 1, "Ideal for indoor lighting circuits and exhaust connections.", "https://images.unsplash.com/photo-1544724569-5f546fd6f2b5?w=400&q=80"),
            (3, "Havells Coral 10A Modular Switch (White)", "Havells", "Switches", 75.0, "Piece", 200, 1, "Polycarbonate shock-proof spark shield modular switch.", "https://images.unsplash.com/photo-1558494949-ef010cbdcc31?w=400&q=80"),
            (3, "Schneider Electric 32A Double Pole MCB (C-Curve)", "Schneider", "Protection", 560.0, "Piece", 30, 1, "Reliable short-circuit and thermal overload protection for home mains.", "https://images.unsplash.com/photo-1558494949-ef010cbdcc31?w=400&q=80"),

            # Sunil (Plumber) Store
            (4, "Supreme Lifeline CPVC Pipe SDR 11 (1 inch)", "Supreme", "Pipes", 780.0, "3 Meter Length", 60, 1, "Hot & cold water potable pipe withstands up to 93°C.", "https://images.unsplash.com/photo-1581578731548-c64695cc6952?w=400&q=80"),
            (4, "Ashirvad FlowGuard Brass Female Thread Adapter 1x3/4", "Ashirvad", "Fittings", 145.0, "Piece", 85, 1, "Lead-free brass embedded heavy duty fitting for bib taps.", "https://images.unsplash.com/photo-1581578731548-c64695cc6952?w=400&q=80"),
            (4, "Cera Brass Wall Mixer with L-Bend", "Cera", "Sanitary", 3200.0, "Piece", 12, 1, "Chrome-plated solid forged brass body with hot and cold mixer knob.", "https://images.unsplash.com/photo-1584622650111-993a426fbf0a?w=400&q=80")
        ]
        cursor.executemany("""
        INSERT INTO materials (
            contractor_id, name, brand, category, price, unit, stock, is_in_stock, description, image_url
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, materials)

        # 5. Guidance Request & Sample Quote
        quote_sample = [
            {"material_id": 1, "name": "Asian Paints Royale Luxury Emulsion (Brilliant White)", "unit": "20 Litre Bucket", "qty": 2, "price": 5850.0, "total": 11700.0},
            {"material_id": 2, "name": "Asian Paints TruCare Interior Wall Primer", "unit": "20 Litre Bucket", "qty": 1, "price": 1850.0, "total": 1850.0},
            {"material_id": 4, "name": "Birla White WallSeal Waterproof Putty", "unit": "40 kg Bag", "qty": 3, "price": 980.0, "total": 2940.0}
        ]
        cursor.execute("""
        INSERT INTO guidance_requests (
            customer_id, contractor_id, project_title, project_details, 
            preferred_brand, status, contractor_notes, quote_items, quote_total
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            1, # Ramesh
            1, # Vikram
            "2BHK Interior Wall Repainting (1200 sq.ft)",
            "We want to repaint our 2BHK flat in Indiranagar. Living room has mild hair-line cracks. We prefer Asian Paints Royale low-odor finish.",
            "Asian Paints",
            "quoted",
            "Inspected your 1200 sq.ft carpet area specs. Recommended 3 bags of Birla White putty for seam smoothing, 1 bucket primer basecoat, and 2 buckets (40L) Royale for 2 solid finish coats. Pricing includes contractor discounted rates.",
            json.dumps(quote_sample),
            16490.0
        ))

        # 6. Sample Completed Order with Dual Review
        sample_order_items = [
            {"material_id": 1, "name": "Asian Paints Royale Luxury Emulsion (Brilliant White)", "unit": "20 Litre Bucket", "qty": 1, "price": 5850.0, "total": 5850.0},
            {"material_id": 5, "name": "Professional 9-inch Microfiber Roller + Tray Kit", "unit": "Kit", "qty": 2, "price": 350.0, "total": 700.0}
        ]
        cursor.execute("""
        INSERT INTO orders (
            order_code, customer_id, contractor_id, items_json, subtotal, 
            delivery_fee, total_amount, fulfillment_method, delivery_address, 
            contact_phone, payment_method, payment_status, status, guidance_request_id
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            "ORD-2026-9041",
            1,
            1,
            json.dumps(sample_order_items),
            6550.0,
            150.0,
            6700.0,
            "doorstep",
            "Flat 302, Palm Heights, 12th Main, Indiranagar, Bangalore 560038",
            "+91 98765 43210",
            "upi",
            "paid",
            "completed",
            None
        ))

        # 7. Reviews with Dual Ratings (Material Quality + Workmanship)
        reviews = [
            (
                1, # order_id
                1, # contractor_id Vikram
                1, # customer_id Ramesh
                "Ramesh Kumar",
                5.0, # material_rating
                4.9, # workmanship_rating
                "Vikram delivered genuine factory-sealed Asian Paints buckets with batch numbers verified. His guidance on applying the primer coat before the Royale emulsion made the walls look velvet smooth! Highly recommended."
            ),
            (
                None,
                1,
                7,
                "Kavita Rao",
                4.8,
                5.0,
                "Ordered paint and had Vikram do our duplex living room. The crew maintained extreme cleanliness with drop cloths and finished 1 day ahead of schedule."
            ),
            (
                None,
                3,
                1,
                "Ramesh Kumar",
                5.0,
                4.8,
                "Anand supplied original Polycab fire-retardant cables and re-wired our distribution board. Very knowledgeable electrical engineer."
            )
        ]
        cursor.executemany("""
        INSERT INTO reviews (
            order_id, contractor_id, customer_id, customer_name, 
            material_rating, workmanship_rating, comment
        ) VALUES (?, ?, ?, ?, ?, ?, ?)
        """, reviews)

        print("Seed completed successfully!")

if __name__ == "__main__":
    seed_database()
