require('dotenv').config({path:'.env.local'});
const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

const query = `
      SELECT 
        i.id, i.name, i.category, i.project, i.new_rate, i.old_rate, i.unit_of_measure, i.min_stock_level,
        
        -- Opening Qty: Net transactions BEFORE start date
        COALESCE(SUM(CASE WHEN t.transaction_date < $1 THEN 
          CASE WHEN t.transaction_type = 'Inward' AND (t.status IS NULL OR t.status = 'Approved') THEN t.quantity
               WHEN t.transaction_type IN ('Issue', 'Outward', 'Scrap') THEN -t.quantity
               ELSE 0 END
        ELSE 0 END), 0) as opening_qty,
        
        -- Inward during period
        COALESCE(SUM(CASE WHEN t.transaction_date >= $1 AND t.transaction_date < $2 AND t.transaction_type = 'Inward' AND (t.status IS NULL OR t.status = 'Approved') THEN t.quantity ELSE 0 END), 0) as inward_qty,
        
        -- Outward during period
        COALESCE(SUM(CASE WHEN t.transaction_date >= $1 AND t.transaction_date < $2 AND t.transaction_type IN ('Issue', 'Outward', 'Scrap') THEN t.quantity ELSE 0 END), 0) as outward_qty,
        
        -- Closing Qty: Total up to end date (Opening + Inward - Outward)
        COALESCE(SUM(CASE WHEN t.transaction_date < $2 THEN 
          CASE WHEN t.transaction_type = 'Inward' AND (t.status IS NULL OR t.status = 'Approved') THEN t.quantity
               WHEN t.transaction_type IN ('Issue', 'Outward', 'Scrap') THEN -t.quantity
               ELSE 0 END
        ELSE 0 END), 0) as closing_qty,

        -- Fallback current_qty for compatibility
        COALESCE(SUM(CASE WHEN t.transaction_date < $2 THEN 
          CASE WHEN t.transaction_type = 'Inward' AND (t.status IS NULL OR t.status = 'Approved') THEN t.quantity
               WHEN t.transaction_type IN ('Issue', 'Outward', 'Scrap') THEN -t.quantity
               ELSE 0 END
        ELSE 0 END), 0) as current_qty
        
      FROM items i
      LEFT JOIN inventory_transactions t ON i.id = t.item_id
      GROUP BY i.id
      ORDER BY i.name ASC;
`;

pool.query(query, ['1970-01-01', '2100-01-01']).then(res => {
  console.log(res.rows.length, "rows returned");
  pool.end();
}).catch(e => {
  console.error("SQL Error:", e);
  pool.end();
});
