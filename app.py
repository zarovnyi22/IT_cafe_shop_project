import json
import os
import sqlite3
import base64
import hmac
import hashlib
from http import HTTPStatus
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from urllib.parse import urlparse, parse_qs

DB_PATH = os.path.join(os.path.dirname(__file__), "database.sqlite")
SECRET_KEY = os.environ.get("APP_SECRET", "super-secret-key")
FRONTEND_DIR = os.path.join(os.path.dirname(__file__), "frontend")


def dict_factory(cursor, row):
    return {col[0]: row[idx] for idx, col in enumerate(cursor.description)}


def get_db():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = dict_factory
    conn.execute("PRAGMA foreign_keys = ON;")
    return conn


def ensure_db():
    if os.path.exists(DB_PATH):
        return
    conn = get_db()
    cur = conn.cursor()
    cur.executescript(
        """
        CREATE TABLE categories (
            category_id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL
        );
        CREATE TABLE employees (
            employee_id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            role TEXT NOT NULL CHECK(role IN ('Barista','Admin')),
            phone TEXT,
            password_hash TEXT NOT NULL,
            is_active INTEGER DEFAULT 1
        );
        CREATE TABLE ingredients (
            ingredient_id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            current_stock REAL DEFAULT 0.0,
            unit TEXT NOT NULL,
            warning_threshold REAL DEFAULT 0.0
        );
        CREATE TABLE products (
            product_id INTEGER PRIMARY KEY AUTOINCREMENT,
            category_id INTEGER NOT NULL,
            name TEXT NOT NULL,
            description TEXT,
            price REAL NOT NULL,
            is_active INTEGER DEFAULT 1,
            FOREIGN KEY(category_id) REFERENCES categories(category_id) ON DELETE RESTRICT
        );
        CREATE TABLE recipes (
            recipe_id INTEGER PRIMARY KEY AUTOINCREMENT,
            product_id INTEGER NOT NULL,
            ingredient_id INTEGER NOT NULL,
            quantity_required REAL NOT NULL,
            FOREIGN KEY(product_id) REFERENCES products(product_id) ON DELETE CASCADE,
            FOREIGN KEY(ingredient_id) REFERENCES ingredients(ingredient_id) ON DELETE RESTRICT
        );
        CREATE TABLE supplies (
            supply_id INTEGER PRIMARY KEY AUTOINCREMENT,
            ingredient_id INTEGER NOT NULL,
            quantity_added REAL NOT NULL,
            cost REAL,
            supply_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY(ingredient_id) REFERENCES ingredients(ingredient_id) ON DELETE CASCADE
        );
        CREATE TABLE orders (
            order_id INTEGER PRIMARY KEY AUTOINCREMENT,
            employee_id INTEGER NOT NULL,
            order_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            total_amount REAL NOT NULL,
            payment_method TEXT DEFAULT 'Card',
            status TEXT DEFAULT 'Paid',
            FOREIGN KEY(employee_id) REFERENCES employees(employee_id) ON DELETE RESTRICT
        );
        CREATE TABLE order_details (
            detail_id INTEGER PRIMARY KEY AUTOINCREMENT,
            order_id INTEGER NOT NULL,
            product_id INTEGER NOT NULL,
            quantity INTEGER DEFAULT 1,
            price_at_sale REAL NOT NULL,
            FOREIGN KEY(order_id) REFERENCES orders(order_id) ON DELETE CASCADE,
            FOREIGN KEY(product_id) REFERENCES products(product_id) ON DELETE RESTRICT
        );
        """
    )

    def hash_password(password: str) -> str:
        salt = os.urandom(16)
        dk = hashlib.pbkdf2_hmac("sha256", password.encode(), salt, 100000)
        return base64.b64encode(salt + dk).decode()

    def seed(table, rows):
        placeholders = ",".join(["?" for _ in rows[0]])
        cur.executemany(
            f"INSERT INTO {table} ({','.join(rows[0].keys())}) VALUES ({placeholders})",
            [tuple(r.values()) for r in rows],
        )

    seed(
        "categories",
        [
            {"name": "Кава"},
            {"name": "Чаї та Напої"},
            {"name": "Десети"},
            {"name": "Випічка"},
        ],
    )

    seed(
        "ingredients",
        [
            {"name": "Зерно Арабіка 100%", "current_stock": 10.0, "unit": "kg", "warning_threshold": 1.0},
            {"name": "Зерно Бленд", "current_stock": 5.0, "unit": "kg", "warning_threshold": 0.5},
            {"name": "Молоко 2.5%", "current_stock": 40.0, "unit": "l", "warning_threshold": 5.0},
            {"name": "Молоко Безлактозне", "current_stock": 10.0, "unit": "l", "warning_threshold": 2.0},
            {"name": "Сироп Карамель", "current_stock": 5.0, "unit": "l", "warning_threshold": 0.5},
            {"name": "Чай Ерл Грей", "current_stock": 2.0, "unit": "kg", "warning_threshold": 0.2},
            {"name": "Стакан паперовий S", "current_stock": 500.0, "unit": "pcs", "warning_threshold": 50.0},
            {"name": "Стакан паперовий L", "current_stock": 500.0, "unit": "pcs", "warning_threshold": 50.0},
            {"name": "Круасан (заморозка)", "current_stock": 100.0, "unit": "pcs", "warning_threshold": 10.0},
            {"name": "Цукор стік", "current_stock": 1000.0, "unit": "pcs", "warning_threshold": 100.0},
        ],
    )

    seed(
        "employees",
        [
            {"name": "Олена Адмін", "role": "Admin", "phone": "+380991234567", "password_hash": hash_password("admin123")},
            {"name": "Іван Бариста", "role": "Barista", "phone": "+380997654321", "password_hash": hash_password("barista123")},
            {"name": "Петро Стажер", "role": "Barista", "phone": "+380630000000", "password_hash": hash_password("barista123")},
        ],
    )

    seed(
        "products",
        [
            {"category_id": 1, "name": "Еспресо", "description": "Класичний шот, 30мл", "price": 40.0},
            {"category_id": 1, "name": "Американо", "description": "Еспресо з гарячою водою", "price": 45.0},
            {"category_id": 1, "name": "Капучино", "description": "Еспресо + спінене молоко", "price": 60.0},
            {"category_id": 1, "name": "Лате", "description": "Багато молока, трохи кави", "price": 65.0},
            {"category_id": 1, "name": "Лате Карамель", "description": "Солодкий лате з сиропом", "price": 75.0},
            {"category_id": 2, "name": "Чай Чорний", "description": "Класичний Ерл Грей", "price": 35.0},
            {"category_id": 4, "name": "Круасан класичний", "description": "Французька випічка", "price": 55.0},
            {"category_id": 3, "name": "Чізкейк", "description": "Нью-Йорк", "price": 90.0},
        ],
    )

    seed(
        "recipes",
        [
            {"product_id": 1, "ingredient_id": 1, "quantity_required": 0.02},
            {"product_id": 1, "ingredient_id": 7, "quantity_required": 1.0},
            {"product_id": 2, "ingredient_id": 1, "quantity_required": 0.02},
            {"product_id": 2, "ingredient_id": 8, "quantity_required": 1.0},
            {"product_id": 3, "ingredient_id": 1, "quantity_required": 0.02},
            {"product_id": 3, "ingredient_id": 3, "quantity_required": 0.15},
            {"product_id": 3, "ingredient_id": 7, "quantity_required": 1.0},
            {"product_id": 4, "ingredient_id": 1, "quantity_required": 0.02},
            {"product_id": 4, "ingredient_id": 3, "quantity_required": 0.25},
            {"product_id": 4, "ingredient_id": 8, "quantity_required": 1.0},
            {"product_id": 5, "ingredient_id": 1, "quantity_required": 0.02},
            {"product_id": 5, "ingredient_id": 3, "quantity_required": 0.25},
            {"product_id": 5, "ingredient_id": 5, "quantity_required": 0.02},
            {"product_id": 5, "ingredient_id": 8, "quantity_required": 1.0},
            {"product_id": 6, "ingredient_id": 6, "quantity_required": 0.01},
            {"product_id": 6, "ingredient_id": 8, "quantity_required": 1.0},
            {"product_id": 7, "ingredient_id": 9, "quantity_required": 1.0},
        ],
    )

    seed(
        "supplies",
        [
            {"ingredient_id": 1, "quantity_added": 10.0, "cost": 4500.0},
            {"ingredient_id": 3, "quantity_added": 50.0, "cost": 1500.0},
            {"ingredient_id": 7, "quantity_added": 1000.0, "cost": 2000.0},
        ],
    )

    seed(
        "orders",
        [
            {"employee_id": 2, "total_amount": 45.0, "payment_method": "Cash", "status": "Paid"},
            {"employee_id": 3, "total_amount": 130.0, "payment_method": "Card", "status": "Paid"},
            {"employee_id": 2, "total_amount": 255.0, "payment_method": "App", "status": "Paid"},
        ],
    )

    seed(
        "order_details",
        [
            {"order_id": 1, "product_id": 2, "quantity": 1, "price_at_sale": 45.0},
            {"order_id": 2, "product_id": 5, "quantity": 1, "price_at_sale": 75.0},
            {"order_id": 2, "product_id": 7, "quantity": 1, "price_at_sale": 55.0},
            {"order_id": 3, "product_id": 3, "quantity": 2, "price_at_sale": 60.0},
            {"order_id": 3, "product_id": 8, "quantity": 1, "price_at_sale": 90.0},
            {"order_id": 3, "product_id": 2, "quantity": 1, "price_at_sale": 45.0},
        ],
    )

    conn.commit()
    conn.close()


def sign_token(payload: dict) -> str:
    header = {"alg": "HS256", "typ": "JWT"}
    def b64(obj):
        return base64.urlsafe_b64encode(json.dumps(obj, separators=(',', ':')).encode()).rstrip(b'=')
    segments = [b64(header), b64(payload)]
    signing_input = b'.'.join(segments)
    signature = hmac.new(SECRET_KEY.encode(), signing_input, hashlib.sha256).digest()
    segments.append(base64.urlsafe_b64encode(signature).rstrip(b'='))
    return '.'.join(s.decode() for s in segments)


def verify_token(token: str):
    try:
        header_b64, payload_b64, sig_b64 = token.split('.')
        signing_input = f"{header_b64}.{payload_b64}".encode()
        expected = base64.urlsafe_b64encode(
            hmac.new(SECRET_KEY.encode(), signing_input, hashlib.sha256).digest()
        ).rstrip(b'=')
        if not hmac.compare_digest(expected, sig_b64.encode()):
            return None
        payload_json = base64.urlsafe_b64decode(payload_b64 + '==').decode()
        return json.loads(payload_json)
    except Exception:
        return None


def read_json(handler):
    length = int(handler.headers.get('Content-Length', 0))
    body = handler.rfile.read(length) if length else b''
    if not body:
        return {}
    return json.loads(body.decode())


def authenticate(handler):
    auth_header = handler.headers.get('Authorization', '')
    if not auth_header.startswith('Bearer '):
        return None
    token = auth_header.split(' ', 1)[1]
    return verify_token(token)


def send_json(handler, data, status=HTTPStatus.OK):
    response = json.dumps(data).encode()
    handler.send_response(status)
    handler.send_header('Content-Type', 'application/json')
    handler.send_header('Content-Length', str(len(response)))
    handler.send_header('Access-Control-Allow-Origin', '*')
    handler.send_header('Access-Control-Allow-Headers', 'Content-Type, Authorization')
    handler.send_header('Access-Control-Allow-Methods', 'GET,POST,PUT,OPTIONS')
    handler.end_headers()
    handler.wfile.write(response)


def handle_login(body):
    phone = body.get('phone')
    password = body.get('password')
    if not phone or not password:
        return None, "Phone and password required"
    conn = get_db()
    user = conn.execute("SELECT * FROM employees WHERE phone=? AND is_active=1", (phone,)).fetchone()
    conn.close()
    if not user:
        return None, "User not found"
    stored = base64.b64decode(user['password_hash'].encode())
    salt, stored_dk = stored[:16], stored[16:]
    test_dk = hashlib.pbkdf2_hmac('sha256', password.encode(), salt, 100000)
    if not hmac.compare_digest(stored_dk, test_dk):
        return None, "Invalid credentials"
    token = sign_token({"employee_id": user['employee_id'], "role": user['role'], "name": user['name']})
    return {"token": token, "user": {"name": user['name'], "role": user['role']}}, None


def get_products(category_id=None):
    conn = get_db()
    query = "SELECT * FROM products WHERE is_active=1"
    params = []
    if category_id:
        query += " AND category_id=?"
        params.append(category_id)
    products = conn.execute(query, params).fetchall()
    availability = {}
    for prod in products:
        recipes = conn.execute(
            "SELECT ingredient_id, quantity_required FROM recipes WHERE product_id=?",
            (prod['product_id'],),
        ).fetchall()
        if not recipes:
            availability[prod['product_id']] = None
            continue
        possible_counts = []
        for r in recipes:
            ingredient = conn.execute(
                "SELECT current_stock FROM ingredients WHERE ingredient_id=?",
                (r['ingredient_id'],),
            ).fetchone()
            possible_counts.append(int(ingredient['current_stock'] // r['quantity_required']))
        availability[prod['product_id']] = min(possible_counts) if possible_counts else None
    conn.close()
    for prod in products:
        prod['max_available'] = availability.get(prod['product_id'])
    return products


def adjust_stock(conn, product_id, quantity):
    recipes = conn.execute(
        "SELECT ingredient_id, quantity_required FROM recipes WHERE product_id=?",
        (product_id,),
    ).fetchall()
    for recipe in recipes:
        needed = recipe['quantity_required'] * quantity
        current = conn.execute(
            "SELECT current_stock FROM ingredients WHERE ingredient_id=?",
            (recipe['ingredient_id'],),
        ).fetchone()
        if current['current_stock'] < needed:
            raise ValueError("Недостатньо інгредієнтів")
    for recipe in recipes:
        needed = recipe['quantity_required'] * quantity
        conn.execute(
            "UPDATE ingredients SET current_stock=current_stock-? WHERE ingredient_id=?",
            (needed, recipe['ingredient_id']),
        )


class AppHandler(SimpleHTTPRequestHandler):
    def translate_path(self, path):
        # Serve frontend files for non-api routes
        if path.startswith('/api'):
            return super().translate_path(path)
        if path == '/':
            path = '/index.html'
        return os.path.join(FRONTEND_DIR, path.lstrip('/'))

    def do_OPTIONS(self):
        self.send_response(HTTPStatus.NO_CONTENT)
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type, Authorization')
        self.send_header('Access-Control-Allow-Methods', 'GET,POST,PUT,OPTIONS')
        self.end_headers()

    def do_POST(self):
        if self.path.startswith('/api/auth/login'):
            body = read_json(self)
            data, error = handle_login(body)
            if error:
                send_json(self, {"error": error}, HTTPStatus.UNAUTHORIZED)
            else:
                send_json(self, data)
            return
        user = authenticate(self)
        if not user:
            send_json(self, {"error": "Unauthorized"}, HTTPStatus.UNAUTHORIZED)
            return
        if self.path == '/api/orders':
            body = read_json(self)
            items = body.get('items', [])
            payment_method = body.get('payment_method', 'Card')
            if not items:
                send_json(self, {"error": "Порожнє замовлення"}, HTTPStatus.BAD_REQUEST)
                return
            conn = get_db()
            try:
                total = 0.0
                for item in items:
                    product = conn.execute(
                        "SELECT price FROM products WHERE product_id=?",
                        (item['product_id'],),
                    ).fetchone()
                    total += product['price'] * item.get('quantity', 1)
                for item in items:
                    adjust_stock(conn, item['product_id'], item.get('quantity', 1))
                cur = conn.cursor()
                cur.execute(
                    "INSERT INTO orders (employee_id, total_amount, payment_method, status) VALUES (?,?,?,?)",
                    (user['employee_id'], total, payment_method, 'Paid'),
                )
                order_id = cur.lastrowid
                for item in items:
                    product = conn.execute(
                        "SELECT price FROM products WHERE product_id=?",
                        (item['product_id'],),
                    ).fetchone()
                    cur.execute(
                        "INSERT INTO order_details (order_id, product_id, quantity, price_at_sale) VALUES (?,?,?,?)",
                        (order_id, item['product_id'], item.get('quantity', 1), product['price']),
                    )
                conn.commit()
                send_json(self, {"message": "Замовлення оформлено", "order_id": order_id, "total": total})
            except ValueError as exc:
                conn.rollback()
                send_json(self, {"error": str(exc)}, HTTPStatus.BAD_REQUEST)
            finally:
                conn.close()
            return
        if self.path == '/api/products':
            if user['role'] != 'Admin':
                send_json(self, {"error": "Доступ заборонено"}, HTTPStatus.FORBIDDEN)
                return
            body = read_json(self)
            conn = get_db()
            cur = conn.cursor()
            cur.execute(
                "INSERT INTO products (category_id, name, description, price, is_active) VALUES (?,?,?,?,1)",
                (
                    body.get('category_id'),
                    body.get('name'),
                    body.get('description', ''),
                    body.get('price'),
                ),
            )
            conn.commit()
            new_id = cur.lastrowid
            conn.close()
            send_json(self, {"product_id": new_id})
            return
        if self.path == '/api/ingredients':
            if user['role'] != 'Admin':
                send_json(self, {"error": "Доступ заборонено"}, HTTPStatus.FORBIDDEN)
                return
            body = read_json(self)
            conn = get_db()
            cur = conn.cursor()
            cur.execute(
                "INSERT INTO ingredients (name, current_stock, unit, warning_threshold) VALUES (?,?,?,?)",
                (body['name'], body.get('current_stock', 0), body.get('unit', ''), body.get('warning_threshold', 0)),
            )
            conn.commit()
            new_id = cur.lastrowid
            conn.close()
            send_json(self, {"ingredient_id": new_id})
            return
        if self.path.startswith('/api/products/') and self.path.endswith('/recipes'):
            if user['role'] != 'Admin':
                send_json(self, {"error": "Доступ заборонено"}, HTTPStatus.FORBIDDEN)
                return
            product_id = int(self.path.split('/')[3])
            body = read_json(self)
            recipe_items = body.get('recipes', [])
            conn = get_db()
            conn.execute("DELETE FROM recipes WHERE product_id=?", (product_id,))
            conn.executemany(
                "INSERT INTO recipes (product_id, ingredient_id, quantity_required) VALUES (?,?,?)",
                [(product_id, r['ingredient_id'], r['quantity_required']) for r in recipe_items],
            )
            conn.commit()
            conn.close()
            send_json(self, {"message": "Рецепт оновлено"})
            return
        send_json(self, {"error": "Not found"}, HTTPStatus.NOT_FOUND)

    def do_PUT(self):
        user = authenticate(self)
        if not user:
            send_json(self, {"error": "Unauthorized"}, HTTPStatus.UNAUTHORIZED)
            return
        if self.path.startswith('/api/ingredients/'):
            if user['role'] != 'Admin':
                send_json(self, {"error": "Доступ заборонено"}, HTTPStatus.FORBIDDEN)
                return
            ing_id = int(self.path.split('/')[-1])
            body = read_json(self)
            conn = get_db()
            conn.execute(
                "UPDATE ingredients SET name=?, current_stock=?, unit=?, warning_threshold=? WHERE ingredient_id=?",
                (
                    body.get('name'),
                    body.get('current_stock', 0),
                    body.get('unit', ''),
                    body.get('warning_threshold', 0),
                    ing_id,
                ),
            )
            conn.commit()
            conn.close()
            send_json(self, {"message": "Інгредієнт оновлено"})
            return
        if self.path.startswith('/api/products/'):
            if user['role'] != 'Admin':
                send_json(self, {"error": "Доступ заборонено"}, HTTPStatus.FORBIDDEN)
                return
            product_id = int(self.path.split('/')[-1])
            body = read_json(self)
            conn = get_db()
            conn.execute(
                "UPDATE products SET category_id=?, name=?, description=?, price=?, is_active=? WHERE product_id=?",
                (
                    body.get('category_id'),
                    body.get('name'),
                    body.get('description', ''),
                    body.get('price'),
                    1 if body.get('is_active', True) else 0,
                    product_id,
                ),
            )
            conn.commit()
            conn.close()
            send_json(self, {"message": "Продукт оновлено"})
            return
        send_json(self, {"error": "Not found"}, HTTPStatus.NOT_FOUND)

    def do_GET(self):
        if self.path.startswith('/api/'):
            user = authenticate(self)
            if not user and not self.path.startswith('/api/auth/login'):
                send_json(self, {"error": "Unauthorized"}, HTTPStatus.UNAUTHORIZED)
                return
            if self.path.startswith('/api/products'):
                query = parse_qs(urlparse(self.path).query)
                category_id = query.get('category_id', [None])[0]
                products = get_products(int(category_id) if category_id else None)
                send_json(self, products)
                return
            if self.path == '/api/ingredients':
                conn = get_db()
                data = conn.execute("SELECT * FROM ingredients").fetchall()
                conn.close()
                send_json(self, data)
                return
            if self.path.startswith('/api/reports/sales'):
                if user['role'] != 'Admin':
                    send_json(self, {"error": "Доступ заборонено"}, HTTPStatus.FORBIDDEN)
                    return
                query = parse_qs(urlparse(self.path).query)
                period = query.get('period', ['day'])[0]
                conn = get_db()
                cur = conn.cursor()
                cur.execute(
                    "SELECT SUM(total_amount) as total, COUNT(*) as count FROM orders WHERE order_date >= CASE ? WHEN 'day' THEN datetime('now','-1 day') WHEN 'week' THEN datetime('now','-7 day') ELSE datetime('now','-1 month') END",
                    (period,),
                )
                row = cur.fetchone()
                conn.close()
                send_json(self, row)
                return
            send_json(self, {"error": "Not found"}, HTTPStatus.NOT_FOUND)
            return
        return super().do_GET()


if __name__ == '__main__':
    ensure_db()
    server = ThreadingHTTPServer(('0.0.0.0', 8000), AppHandler)
    print('Server running on http://0.0.0.0:8000')
    server.serve_forever()
