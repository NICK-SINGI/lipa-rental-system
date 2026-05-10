const express = require('express');
const mysql = require('mysql2');
const cors = require('cors');

const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.json());

// MySQL connection
const db = mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'rental_system'
});

db.connect((err) => {
    if (err) {
        console.error('❌ Database connection failed:', err);
        return;
    }
    console.log('✅ Connected to MySQL database');
});

// API Routes
app.get('/api/properties', (req, res) => {
    db.query('SELECT * FROM properties ORDER BY id DESC', (err, results) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(results);
    });
});

app.post('/api/properties', (req, res) => {
    const { title, county, location, type, monthly_rent, bedrooms, bathrooms, area, description, image, status } = req.body;
    const query = `INSERT INTO properties (title, county, location, type, monthly_rent, bedrooms, bathrooms, area, description, image, status) 
                   VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;
    db.query(query, [title, county, location, type, monthly_rent, bedrooms, bathrooms, area, description, image, status || 'available'], 
        (err, result) => {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ id: result.insertId, message: 'Property added' });
        });
});

app.delete('/api/properties/:id', (req, res) => {
    db.query('DELETE FROM properties WHERE id = ?', [req.params.id], (err, result) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ message: 'Property deleted' });
    });
});

app.get('/api/tenants', (req, res) => {
    db.query('SELECT * FROM tenants ORDER BY id DESC', (err, results) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(results);
    });
});

app.post('/api/tenants', (req, res) => {
    const { first_name, last_name, email, phone, move_in_date } = req.body;
    db.query('INSERT INTO tenants (first_name, last_name, email, phone, move_in_date) VALUES (?, ?, ?, ?, ?)',
        [first_name, last_name, email, phone, move_in_date], (err, result) => {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ id: result.insertId, message: 'Tenant added' });
        });
});

app.get('/api/rentals', (req, res) => {
    const query = `SELECT r.*, p.title as property_name, CONCAT(t.first_name, ' ', t.last_name) as tenant_name 
                   FROM rentals r 
                   JOIN properties p ON r.property_id = p.id 
                   JOIN tenants t ON r.tenant_id = t.id 
                   ORDER BY r.id DESC`;
    db.query(query, (err, results) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(results);
    });
});

app.get('/api/payments', (req, res) => {
    const query = `SELECT p.*, pr.title as property_name, CONCAT(t.first_name, ' ', t.last_name) as tenant_name 
                   FROM payments p 
                   JOIN rentals r ON p.rental_id = r.id 
                   JOIN properties pr ON r.property_id = pr.id 
                   JOIN tenants t ON r.tenant_id = t.id 
                   ORDER BY p.payment_date DESC`;
    db.query(query, (err, results) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(results);
    });
});

app.post('/api/payments', (req, res) => {
    const { rental_id, amount, payment_method, payment_date, transaction_id } = req.body;
    db.query('INSERT INTO payments (rental_id, amount, payment_method, payment_date, transaction_id) VALUES (?, ?, ?, ?, ?)',
        [rental_id, amount, payment_method, payment_date, transaction_id], (err, result) => {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ id: result.insertId, message: 'Payment recorded' });
        });
});

app.post('/api/bookings', (req, res) => {
    const { property_id, property_title, visit_date, visit_time, visitor_name, visitor_phone, visitor_email, notes } = req.body;
    db.query(`INSERT INTO bookings (property_id, property_title, visit_date, visit_time, visitor_name, visitor_phone, visitor_email, notes) 
              VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [property_id, property_title, visit_date, visit_time, visitor_name, visitor_phone, visitor_email, notes], 
        (err, result) => {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ id: result.insertId, message: 'Booking submitted' });
        });
});

app.get('/api/dashboard/stats', (req, res) => {
    const queries = {
        totalProperties: 'SELECT COUNT(*) as count FROM properties',
        availableProperties: 'SELECT COUNT(*) as count FROM properties WHERE status = "available"',
        rentedProperties: 'SELECT COUNT(*) as count FROM properties WHERE status = "rented"',
        totalTenants: 'SELECT COUNT(*) as count FROM tenants',
        monthlyRevenue: 'SELECT COALESCE(SUM(amount), 0) as total FROM payments WHERE MONTH(payment_date) = MONTH(CURRENT_DATE())'
    };
    
    Promise.all(Object.values(queries).map(q => new Promise((resolve, reject) => {
        db.query(q, (err, results) => {
            if (err) reject(err);
            else resolve(results);
        });
    }))).then(results => {
        res.json({
            totalProperties: results[0][0].count,
            availableProperties: results[1][0].count,
            rentedProperties: results[2][0].count,
            totalTenants: results[3][0].count,
            monthlyRevenue: results[4][0].total
        });
    }).catch(err => res.status(500).json({ error: err.message }));
});

app.listen(PORT, () => {
    console.log(`🚀 Server running on http://localhost:${PORT}`);
});