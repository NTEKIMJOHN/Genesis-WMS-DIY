-- Genesis WMS - Sample Seed Data
-- For development and testing purposes

-- Insert Sample Tenant
INSERT INTO tenants (tenant_id, tenant_name, tenant_code, status, settings) VALUES
('11111111-1111-1111-1111-111111111111', 'Acme Corporation', 'ACME', 'active', '{"enable_batch_tracking": true, "enable_fefo": true}');

-- Insert Sample Users
INSERT INTO users (user_id, tenant_id, email, password_hash, first_name, last_name, role, is_active) VALUES
('22222222-2222-2222-2222-222222222222', '11111111-1111-1111-1111-111111111111', 'admin@acme.com', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewY5GyYzJGF0F4Hm', 'John', 'Admin', 'tenant_admin', true),
('33333333-3333-3333-3333-333333333333', '11111111-1111-1111-1111-111111111111', 'manager@acme.com', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewY5GyYzJGF0F4Hm', 'Jane', 'Manager', 'warehouse_manager', true),
('44444444-4444-4444-4444-444444444444', '11111111-1111-1111-1111-111111111111', 'analyst@acme.com', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewY5GyYzJGF0F4Hm', 'Bob', 'Analyst', 'inventory_analyst', true),
('55555555-5555-5555-5555-555555555555', '11111111-1111-1111-1111-111111111111', 'associate@acme.com', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewY5GyYzJGF0F4Hm', 'Mike', 'Worker', 'warehouse_associate', true);

-- Insert Sample Warehouse
INSERT INTO warehouses (warehouse_id, tenant_id, warehouse_code, warehouse_name, address, city, state, country, zip_code, is_active) VALUES
('66666666-6666-6666-6666-666666666666', '11111111-1111-1111-1111-111111111111', 'WH-MAIN', 'Main Warehouse', '123 Industrial Pkwy', 'New York', 'NY', 'USA', '10001', true),
('77777777-7777-7777-7777-777777777777', '11111111-1111-1111-1111-111111111111', 'WH-WEST', 'West Coast Warehouse', '456 Pacific Ave', 'Los Angeles', 'CA', 'USA', '90001', true);

-- Insert Sample Zones
INSERT INTO zones (zone_id, warehouse_id, zone_code, zone_name, zone_type, capacity_unit, max_capacity, is_active) VALUES
('88888888-8888-8888-8888-888888888888', '66666666-6666-6666-6666-666666666666', 'ZONE-A', 'Zone A - General Storage', 'storage', 'units', 10000, true),
('99999999-9999-9999-9999-999999999999', '66666666-6666-6666-6666-666666666666', 'ZONE-B', 'Zone B - Cold Storage', 'cold_storage', 'units', 5000, true),
('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '66666666-6666-6666-6666-666666666666', 'ZONE-C', 'Zone C - Receiving', 'receiving', 'units', 3000, true);

-- Insert Sample Bins
INSERT INTO bins (bin_id, zone_id, bin_code, bin_type, capacity_type, max_capacity, dimensions_length, dimensions_width, dimensions_height, weight_capacity, status) VALUES
-- Zone A bins
('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', '88888888-8888-8888-8888-888888888888', 'A1-01', 'standard', 'units', 100, 4.0, 4.0, 6.0, 500, 'active'),
('cccccccc-cccc-cccc-cccc-cccccccccccc', '88888888-8888-8888-8888-888888888888', 'A1-02', 'standard', 'units', 100, 4.0, 4.0, 6.0, 500, 'active'),
('dddddddd-dddd-dddd-dddd-dddddddddddd', '88888888-8888-8888-8888-888888888888', 'A2-01', 'standard', 'units', 150, 5.0, 5.0, 8.0, 750, 'active'),
('eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee', '88888888-8888-8888-8888-888888888888', 'A2-02', 'standard', 'units', 150, 5.0, 5.0, 8.0, 750, 'active'),
-- Zone B bins (cold storage)
('ffffffff-ffff-ffff-ffff-ffffffffffff', '99999999-9999-9999-9999-999999999999', 'B1-01', 'refrigerated', 'units', 80, 4.0, 4.0, 6.0, 400, 'active'),
('10101010-1010-1010-1010-101010101010', '99999999-9999-9999-9999-999999999999', 'B1-02', 'refrigerated', 'units', 80, 4.0, 4.0, 6.0, 400, 'active');

-- Insert Sample Categories
INSERT INTO categories (category_id, tenant_id, category_name, category_code) VALUES
('11001100-1100-1100-1100-110011001100', '11111111-1111-1111-1111-111111111111', 'Electronics', 'ELEC'),
('11001101-1100-1100-1100-110011001100', '11111111-1111-1111-1111-111111111111', 'Food & Beverage', 'FOOD'),
('11001102-1100-1100-1100-110011001100', '11111111-1111-1111-1111-111111111111', 'Pharmaceuticals', 'PHARMA'),
('11001103-1100-1100-1100-110011001100', '11111111-1111-1111-1111-111111111111', 'Apparel', 'APPAREL');

-- Insert Sample SKUs
INSERT INTO skus (sku_id, tenant_id, sku_code, product_name, description, category_id, unit_of_measure, unit_cost, unit_price, is_batch_tracked, is_perishable, abc_classification, barcode) VALUES
-- Electronics (non-perishable, non-batch)
('12121212-1212-1212-1212-121212121212', '11111111-1111-1111-1111-111111111111', 'SKU-001', 'Wireless Mouse', 'Ergonomic wireless mouse', '11001100-1100-1100-1100-110011001100', 'units', 15.00, 29.99, false, false, 'B', '001234567890'),
('12121213-1212-1212-1212-121212121212', '11111111-1111-1111-1111-111111111111', 'SKU-002', 'USB Cable', 'USB-C to USB-A cable 6ft', '11001100-1100-1100-1100-110011001100', 'units', 3.00, 9.99, false, false, 'C', '001234567891'),
-- Food (perishable, batch-tracked)
('12121214-1212-1212-1212-121212121212', '11111111-1111-1111-1111-111111111111', 'SKU-003', 'Organic Almonds', 'Raw organic almonds 1lb bag', '11001101-1100-1100-1100-110011001100', 'units', 8.00, 15.99, true, true, 'A', '001234567892'),
('12121215-1212-1212-1212-121212121212', '11111111-1111-1111-1111-111111111111', 'SKU-004', 'Protein Powder', 'Whey protein powder 2lb', '11001101-1100-1100-1100-110011001100', 'units', 20.00, 39.99, true, true, 'A', '001234567893'),
-- Pharmaceuticals (batch-tracked, regulated)
('12121216-1212-1212-1212-121212121212', '11111111-1111-1111-1111-111111111111', 'SKU-005', 'Vitamin C 1000mg', 'Vitamin C supplement 100 tablets', '11001102-1100-1100-1100-110011001100', 'units', 5.00, 12.99, true, true, 'A', '001234567894'),
('12121217-1212-1212-1212-121212121212', '11111111-1111-1111-1111-111111111111', 'SKU-006', 'First Aid Kit', 'Complete first aid kit', '11001102-1100-1100-1100-110011001100', 'units', 25.00, 49.99, true, false, 'B', '001234567895');

-- Insert Sample Inventory
INSERT INTO inventory (inventory_id, sku_id, warehouse_id, quantity_available, quantity_reserved, last_movement_at, last_counted_at) VALUES
('13131313-1313-1313-1313-131313131313', '12121212-1212-1212-1212-121212121212', '66666666-6666-6666-6666-666666666666', 450, 50, NOW() - INTERVAL '2 days', NOW() - INTERVAL '15 days'),
('13131314-1313-1313-1313-131313131313', '12121213-1212-1212-1212-121212121212', '66666666-6666-6666-6666-666666666666', 1200, 100, NOW() - INTERVAL '1 day', NOW() - INTERVAL '10 days'),
('13131315-1313-1313-1313-131313131313', '12121214-1212-1212-1212-121212121212', '66666666-6666-6666-6666-666666666666', 75, 25, NOW() - INTERVAL '3 hours', NOW() - INTERVAL '5 days'),
('13131316-1313-1313-1313-131313131313', '12121215-1212-1212-1212-121212121212', '66666666-6666-6666-6666-666666666666', 180, 40, NOW() - INTERVAL '5 hours', NOW() - INTERVAL '7 days'),
('13131317-1313-1313-1313-131313131313', '12121216-1212-1212-1212-121212121212', '66666666-6666-6666-6666-666666666666', 320, 80, NOW() - INTERVAL '1 day', NOW() - INTERVAL '3 days'),
('13131318-1313-1313-1313-131313131313', '12121217-1212-1212-1212-121212121212', '66666666-6666-6666-6666-666666666666', 95, 15, NOW() - INTERVAL '4 days', NOW() - INTERVAL '20 days');

-- Insert Sample SKU-Bin Mappings
INSERT INTO sku_bin_mappings (sku_id, bin_id, quantity, is_primary_location) VALUES
('12121212-1212-1212-1212-121212121212', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 300, true),
('12121212-1212-1212-1212-121212121212', 'cccccccc-cccc-cccc-cccc-cccccccccccc', 150, false),
('12121213-1212-1212-1212-121212121212', 'cccccccc-cccc-cccc-cccc-cccccccccccc', 800, true),
('12121213-1212-1212-1212-121212121212', 'dddddddd-dddd-dddd-dddd-dddddddddddd', 400, false),
('12121214-1212-1212-1212-121212121212', 'ffffffff-ffff-ffff-ffff-ffffffffffff', 75, true),
('12121215-1212-1212-1212-121212121212', 'ffffffff-ffff-ffff-ffff-ffffffffffff', 180, true),
('12121216-1212-1212-1212-121212121212', 'dddddddd-dddd-dddd-dddd-dddddddddddd', 320, true),
('12121217-1212-1212-1212-121212121212', 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee', 95, true);

-- Insert Sample Batches (for batch-tracked items)
INSERT INTO batches (batch_id, sku_id, batch_number, manufacturing_date, expiry_date, receipt_date, supplier_name, quantity_received, quantity_available, status, qa_status) VALUES
-- Organic Almonds batches
('14141414-1414-1414-1414-141414141414', '12121214-1212-1212-1212-121212121212', 'ALM-2025-001', '2024-11-01', '2025-05-01', '2024-11-15', 'Organic Farms Inc', 50, 45, 'active', 'released'),
('14141415-1414-1414-1414-141414141414', '12121214-1212-1212-1212-121212121212', 'ALM-2025-002', '2024-12-01', '2025-06-01', '2024-12-10', 'Organic Farms Inc', 30, 30, 'active', 'released'),
-- Protein Powder batches
('14141416-1414-1414-1414-141414141414', '12121215-1212-1212-1212-121212121212', 'PRO-2025-A1', '2024-10-15', '2026-10-15', '2024-11-01', 'NutriSupplements LLC', 100, 90, 'active', 'released'),
('14141417-1414-1414-1414-141414141414', '12121215-1212-1212-1212-121212121212', 'PRO-2025-A2', '2024-11-20', '2026-11-20', '2024-12-05', 'NutriSupplements LLC', 90, 90, 'active', 'released'),
-- Vitamin C batches
('14141418-1414-1414-1414-141414141414', '12121216-1212-1212-1212-121212121212', 'VIT-2025-123', '2024-09-01', '2027-09-01', '2024-10-01', 'Pharma Wholesale Co', 200, 180, 'active', 'released'),
('14141419-1414-1414-1414-141414141414', '12121216-1212-1212-1212-121212121212', 'VIT-2025-124', '2024-10-15', '2027-10-15', '2024-11-15', 'Pharma Wholesale Co', 140, 140, 'active', 'released'),
-- Near expiry batch
('1414141a-1414-1414-1414-141414141414', '12121214-1212-1212-1212-121212121212', 'ALM-2024-099', '2024-07-01', '2025-01-30', '2024-08-15', 'Organic Farms Inc', 25, 20, 'near_expiry', 'released');

-- Insert Sample Thresholds
INSERT INTO inventory_thresholds (threshold_id, sku_id, warehouse_id, min_threshold, max_threshold, safety_stock, reorder_quantity, supplier_lead_time_days, recipients, created_by) VALUES
('15151515-1515-1515-1515-151515151515', '12121212-1212-1212-1212-121212121212', '66666666-6666-6666-6666-666666666666', 100, 1000, 50, 500, 14, '["33333333-3333-3333-3333-333333333333", "44444444-4444-4444-4444-444444444444"]', '22222222-2222-2222-2222-222222222222'),
('15151516-1515-1515-1515-151515151515', '12121214-1212-1212-1212-121212121212', '66666666-6666-6666-6666-666666666666', 50, 300, 25, 150, 7, '["33333333-3333-3333-3333-333333333333", "44444444-4444-4444-4444-444444444444"]', '22222222-2222-2222-2222-222222222222'),
('15151517-1515-1515-1515-151515151515', '12121216-1212-1212-1212-121212121212', '66666666-6666-6666-6666-666666666666', 200, 500, 100, 300, 10, '["33333333-3333-3333-3333-333333333333"]', '22222222-2222-2222-2222-222222222222');

-- Insert Sample Movement History
INSERT INTO inventory_movements (inventory_id, movement_type, reference_type, reference_id, quantity_change, quantity_before, quantity_after, bin_id, performed_by, notes) VALUES
('13131313-1313-1313-1313-131313131313', 'receiving', 'purchase_order', 'PO-2025-001', 500, 0, 500, 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', '33333333-3333-3333-3333-333333333333', 'Initial stock receipt'),
('13131313-1313-1313-1313-131313131313', 'pick', 'sales_order', 'SO-2025-100', -50, 500, 450, 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', '55555555-5555-5555-5555-555555555555', 'Picked for order SO-2025-100'),
('13131315-1313-1313-1313-131313131313', 'receiving', 'purchase_order', 'PO-2025-002', 100, 0, 100, 'ffffffff-ffff-ffff-ffff-ffffffffffff', '33333333-3333-3333-3333-333333333333', 'Organic almonds received'),
('13131315-1313-1313-1313-131313131313', 'pick', 'sales_order', 'SO-2025-101', -25, 100, 75, 'ffffffff-ffff-ffff-ffff-ffffffffffff', '55555555-5555-5555-5555-555555555555', 'FEFO pick - batch ALM-2025-001');

-- Refresh materialized views
REFRESH MATERIALIZED VIEW mv_sku_inventory_summary;
REFRESH MATERIALIZED VIEW mv_batch_expiry_report;
