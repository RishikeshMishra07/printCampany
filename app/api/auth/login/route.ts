import { NextResponse } from 'next/server';
import { query } from '@/lib/db';

export async function POST(request: Request) {
  try {
    // AUTO-SETUP: Create tables and seed data for AutoPrint Workshop
    await query(` 
      CREATE TABLE IF NOT EXISTS departments (
        id SERIAL PRIMARY KEY,
        name VARCHAR(100) UNIQUE NOT NULL,
        description TEXT
      );

      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        employee_id VARCHAR(100) UNIQUE NOT NULL,
        name VARCHAR(255),
        username VARCHAR(50) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        role VARCHAR(20) NOT NULL,
        department_id INTEGER REFERENCES departments(id)
      );

      CREATE TABLE IF NOT EXISTS machines (
        id SERIAL PRIMARY KEY,
        name VARCHAR(100) UNIQUE NOT NULL,
        department_id INTEGER REFERENCES departments(id)
      );

      CREATE TABLE IF NOT EXISTS production_logs (
        id SERIAL PRIMARY KEY,
        operator_id VARCHAR(100) REFERENCES users(employee_id),
        machine_id INTEGER REFERENCES machines(id),
        car_brand VARCHAR(100),
        part_type VARCHAR(100),
        material VARCHAR(100),
        parts_produced INTEGER DEFAULT 0,
        defective_parts INTEGER DEFAULT 0,
        duplicate_prints INTEGER DEFAULT 0,
        supervisor_id VARCHAR(100) REFERENCES users(employee_id),
        upload_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      -- Seed Departments
      INSERT INTO departments (name) VALUES 
        ('Printing'), 
        ('Quality Control (QC)'), 
        ('Dispatch'), 
        ('Management')
      ON CONFLICT (name) DO NOTHING;

      -- Seed Default Users
      INSERT INTO users (employee_id, name, username, password, role, department_id) 
      VALUES 
        ('ims7191', 'Ankit (Manager)', 'admin_user', 'Admin@123', 'admin', (SELECT id FROM departments WHERE name='Management')), 
        ('AP-101', 'Ankit (Operator)', 'operator_01', 'pass123', 'user', (SELECT id FROM departments WHERE name='Printing')),
        ('AP-102', 'Raju (QC Inspector)', 'qc_01', 'pass123', 'user', (SELECT id FROM departments WHERE name='Quality Control (QC)'))
      ON CONFLICT (username) DO UPDATE 
      SET password = EXCLUDED.password, employee_id = EXCLUDED.employee_id;

      -- Seed Machines
      INSERT INTO machines (name, department_id) VALUES 
        ('MakerBot-01', (SELECT id FROM departments WHERE name='Printing')),
        ('Formlabs-02', (SELECT id FROM departments WHERE name='Printing'))
      ON CONFLICT (name) DO NOTHING;
    `);

    const { employee_id, password, role, department } = await request.json();

    // Query the database for a matching user strictly based on provided role and department
    let dbQuery = `
      SELECT u.id, u.employee_id, u.name, u.username, u.role, d.name as department_name
      FROM users u
      LEFT JOIN departments d ON u.department_id = d.id
      WHERE u.employee_id = $1 AND u.password = $2 AND u.role = $3
    `;
    const params: any[] = [employee_id, password, role];

    if (role === 'user' && department) {
      dbQuery += ` AND d.name = $4`;
      params.push(department);
    }

    const result = await query(dbQuery, params);

    if (result.rows.length > 0) {
      const user = result.rows[0];
      
      const response = NextResponse.json({ success: true, message: 'Login successful', user });
      
      // Create a secure HttpOnly session cookie
      response.cookies.set('auth_session', JSON.stringify({ id: user.id, employee_id: user.employee_id, name: user.name, username: user.username, role: user.role, department: user.department_name || null }), {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        maxAge: 60 * 60 * 24, // 1 day
        path: '/',
      });
      
      return response;
    } else {
      // No match
      return NextResponse.json({ success: false, message: 'Invalid credentials or role mismatch' }, { status: 401 });
    }
  } catch (error: any) {
    console.error("Login Error:", error);
    return NextResponse.json({ success: false, message: 'Internal server error', error: error.message }, { status: 500 });
  }
}

