# 📚 AutoPrint Workshop — User Guide & Story

Welcome to the AutoPrint Workshop Management System! This guide contains your login credentials and a story-based walkthrough of how to use the entire application in a real-world scenario.

---

## 🔐 Login Credentials

You can log in at: `http://localhost:3000/`

### 👑 1. Admin Login (Owner / Manager)
- **Account Type**: `Admin`
- **Department**: `Store` (or any)
- **Emp ID**: `ims7191`
- **Password**: `Admin@123`
- **Access**: Full access to Master Data, Deals, Audit Logs, and User Management.

### 👷‍♂️ 2. Store User Login (Inventory Manager)
- **Account Type**: `User`
- **Department**: `Store`
- **Emp ID**: `ST-001`
- **Password**: `Store@123`
- **Access**: Restricted strictly to operational tools (Inward, Outward, Paint Calculator, Stock Count).

---

## 📖 The Story of AutoPrint Workshop

Imagine you run an automotive paint job-work facility. Car parts (Bumpers, Hoods, Doors) come to you raw, you paint them, and you send them back to the client. Let's see how our software handles a typical week!

### Chapter 1: The Setup (Admin's Job)
**Module used:** `Master Data` -> `Paint Norms` & `Vendors`

Ankit, the owner (Admin), signs into the system. Before taking any orders, he needs to tell the system *how* things are painted. 
He goes to **Paint Norms** and sets up a rule: *"1 Car Bumper requires 0.5L Primer, 0.8L Top Coat, and 0.2L Thinner"*.
He also goes to **Vendors** and adds "Asian Paints Ltd." as their main supplier.

### Chapter 2: Running out of Paint (Store's Job)
**Module used:** `Purchase Requests`

Mohan, the Store Manager, logs in (as a User). He checks his **Live Stock** and sees that Primer is running very low. 
He opens **Purchase Requests** and raises a request: *"Need 100 Litres of Primer from Asian Paints"*. 
Ankit (Admin) sees this request on his dashboard and approves it.

### Chapter 3: The Delivery Truck Arrives
**Module used:** `Material Inward (GRN)`

A truck from Asian Paints arrives with 100 Litres of Primer. Mohan opens the **Inward (GRN)** screen, selects Primer, enters `100`, types the Invoice number, and hits save. 
Instantly, the **Live Stock** updates!

### Chapter 4: A Big Client Order
**Module used:** `Deals & Contracts` & `WIP Tracking Board`

A big client, "Maruti Suzuki", drops off 50 raw Car Bumpers to be painted.
Ankit (Admin) logs this in **Deals & Contracts**.
Mohan goes to the **WIP Tracking Board** (Work In Progress) and adds a batch of 50 Bumpers into the *"Received (Raw)"* column.

### Chapter 5: Can we paint it? The Magic Calculator
**Module used:** `Paint Requirement Calculator`

Before issuing material to the painters, Mohan wants to ensure he has enough paint. He opens the **Paint Calculator**, selects "Car Bumper", and types "50".
The magic calculator instantly multiplies the *Paint Norms* by 50, checks the *Live Stock*, and shows a big green box: **✅ FEASIBLE**. 
It tells Mohan exactly how much Primer and Top Coat to take out of the barrel.

### Chapter 6: The Work Begins
**Module used:** `Issue to Production`

Mohan gives the raw bumpers and the exact calculated amount of paint to the shop floor workers. To keep records straight, he opens **Issue to Production** and deducts that paint from the system.

### Chapter 7: Dispatching the Finished Goods
**Module used:** `Outward Challan Generator`

Two days later, the painted bumpers are dry, shiny, and ready. 
Mohan moves their card on the **WIP Board** to *"Dispatched"*. 
He then opens the **Outward Challan Generator**, selects the 50 finished bumpers, enters the Truck Number, and clicks **Print**. A beautiful, professional Delivery Challan is printed and handed to the driver.

### Chapter 8: The Monthly Audit
**Module used:** `Physical Stock Count` & `Daily Shift Report`

It's the end of the month. Mohan takes his iPad to the store room to do a physical check. He counts 40 Litres of Thinner on the shelf, but the system says 42 Litres. He logs this in **Physical Stock Count**, and the system flags a `-2L discrepancy`. 
Meanwhile, Ankit (Admin) is sipping coffee in his office, looking at the **Daily Shift Report** and **Deal Consumption**, smiling at the profits!

---
*The End. Your AutoPrint Workshop is running perfectly!* 🚀
