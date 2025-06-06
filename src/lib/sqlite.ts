
import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

// Define the path for the database file
// It's good practice to place database files outside the `src` directory in a real project,
// but for simplicity with Next.js bundling and serverless functions,
// placing it where it can be accessed by server-side code is important.
// Let's aim for a `data` directory in the project root.
const dbDir = path.join(process.cwd(), 'data');
const dbPath = path.join(dbDir, 'alshawaya.db');

// Ensure the data directory exists
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

export const db = new Database(dbPath, { verbose: console.log }); // verbose logging for development

// Function to create tables
function createTables() {
  const createUsersTable = `
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      username TEXT NOT NULL UNIQUE,
      password TEXT NOT NULL, -- In a real app, this should be a hashed password
      role TEXT NOT NULL CHECK(role IN ('admin', 'cashier'))
    );
  `;

  const createSettingsTable = `
    CREATE TABLE IF NOT EXISTS settings (
      id INTEGER PRIMARY KEY DEFAULT 1,
      current_business_day TEXT NOT NULL,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT settings_id_check CHECK (id = 1)
    );
  `;

  const createMenuItemsTable = `
    CREATE TABLE IF NOT EXISTS menu_items (
      id TEXT PRIMARY KEY,
      code TEXT NOT NULL UNIQUE,
      name TEXT NOT NULL,
      price REAL NOT NULL CHECK (price >= 0),
      category TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `;

  const createDealsTable = `
    CREATE TABLE IF NOT EXISTS deals (
      id TEXT PRIMARY KEY,
      deal_number TEXT NOT NULL UNIQUE,
      name TEXT NOT NULL,
      description TEXT,
      items TEXT NOT NULL, -- Store as JSON string
      calculated_total_deal_price REAL NOT NULL CHECK (calculated_total_deal_price >= 0),
      is_active INTEGER DEFAULT 1 NOT NULL, -- 0 for false, 1 for true
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `;

  const createSalesTable = `
    CREATE TABLE IF NOT EXISTS sales (
      id TEXT PRIMARY KEY,
      table_number TEXT,
      customer_name TEXT,
      waiter_name TEXT,
      items TEXT NOT NULL, -- Store as JSON string
      subtotal REAL NOT NULL CHECK (subtotal >= 0),
      tax REAL CHECK (tax IS NULL OR tax >= 0),
      discount REAL CHECK (discount IS NULL OR discount >= 0),
      total_amount REAL NOT NULL CHECK (total_amount >= 0),
      created_at DATETIME NOT NULL,
      cashier_id TEXT NOT NULL
    );
  `;
  // Index for faster querying by date
  const createSalesTimestampIndex = `CREATE INDEX IF NOT EXISTS idx_sales_created_at ON sales (created_at);`;


  const createDeletedItemLogsTable = `
    CREATE TABLE IF NOT EXISTS deleted_item_logs (
      id TEXT PRIMARY KEY,
      menu_item_id TEXT NOT NULL,
      item_name TEXT NOT NULL,
      item_code TEXT NOT NULL,
      quantity_removed INTEGER NOT NULL CHECK (quantity_removed > 0),
      price_per_item REAL NOT NULL,
      removed_by_cashier_id TEXT NOT NULL,
      bill_id TEXT,
      timestamp DATETIME NOT NULL,
      reason TEXT,
      is_deal_item INTEGER, -- 0 for false, 1 for true
      deal_name TEXT
    );
  `;
  // Index for faster querying by timestamp
  const createDeletedLogsTimestampIndex = `CREATE INDEX IF NOT EXISTS idx_deleted_item_logs_timestamp ON deleted_item_logs (timestamp);`;


  db.exec(createUsersTable);
  db.exec(createSettingsTable);
  db.exec(createMenuItemsTable);
  db.exec(createDealsTable);
  db.exec(createSalesTable);
  db.exec(createSalesTimestampIndex);
  db.exec(createDeletedItemLogsTable);
  db.exec(createDeletedLogsTimestampIndex);

  // Initialize settings if not present
  const stmt = db.prepare('SELECT COUNT(*) as count FROM settings WHERE id = 1');
  const result = stmt.get() as { count: number };
  if (result.count === 0) {
    const insertSettings = db.prepare('INSERT INTO settings (id, current_business_day) VALUES (1, DATE(\\'now\\'))');
    insertSettings.run();
  }
  
  // Initialize mock users if users table is empty
  const userCountStmt = db.prepare('SELECT COUNT(*) as count FROM users');
  const userCountResult = userCountStmt.get() as { count: number };
  if (userCountResult.count === 0) {
    const initialUsers = [
      { id: 'admin001', username: 'admin', password: 'password', role: 'admin' }, // Store plain text passwords for mock
      { id: 'cashier001', username: 'ca1', password: 'password', role: 'cashier' },
      { id: 'cashier002', username: 'ca2', password: 'password', role: 'cashier' },
    ];
    const insertUser = db.prepare('INSERT INTO users (id, username, password, role) VALUES (?, ?, ?, ?)');
    db.transaction((users) => {
      for (const user of users) insertUser.run(user.id, user.username, user.password, user.role);
    })(initialUsers);
  }

  console.log('Database tables created and initialized successfully.');
}

// Initialize database and tables
// This will run once when this module is first imported.
try {
    createTables();
} catch (error) {
    console.error("Failed to initialize the database:", error);
    // Depending on the error, you might want to exit or handle it differently
}

// Note on IDs: For tables like menu_items, deals, sales, deleted_item_logs,
// the 'id' is TEXT PRIMARY KEY. Your application logic (in the future API routes/Server Actions)
// will be responsible for generating unique IDs (e.g., using a library like 'uuid' or a simpler custom method)
// before inserting new records.

// Note on JSON: SQLite stores JSON as TEXT. You'll need to JSON.stringify() before saving
// and JSON.parse() after fetching for columns like 'items' in 'deals' and 'sales'.
// The 'deals.items' structure will be an array of DealItem objects.
// The 'sales.items' structure will be an array of BillItem objects.
