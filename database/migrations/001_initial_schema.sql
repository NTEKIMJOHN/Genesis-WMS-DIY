-- Genesis WMS - Initial Database Schema
-- Migration: 001_initial_schema
-- Created: 2025-11-07

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "timescaledb";

-- ============================================
-- CORE TABLES
-- ============================================

-- Tenants (Multi-tenancy support)
CREATE TABLE tenants (
    tenant_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_name VARCHAR(255) NOT NULL,
    tenant_code VARCHAR(50) NOT NULL UNIQUE,
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'suspended', 'inactive')),
    settings JSONB DEFAULT '{}',
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_tenants_code ON tenants(tenant_code);
CREATE INDEX idx_tenants_status ON tenants(status);

-- Users
CREATE TABLE users (
    user_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(tenant_id) ON DELETE CASCADE,
    email VARCHAR(255) NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    first_name VARCHAR(100),
    last_name VARCHAR(100),
    role VARCHAR(50) NOT NULL CHECK (role IN ('warehouse_associate', 'warehouse_manager', 'inventory_analyst', 'qa_supervisor', 'tenant_admin')),
    phone VARCHAR(20),
    is_active BOOLEAN DEFAULT true,
    last_login_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(tenant_id, email)
);

CREATE INDEX idx_users_tenant ON users(tenant_id);
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role ON users(role);

-- Warehouses
CREATE TABLE warehouses (
    warehouse_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(tenant_id) ON DELETE CASCADE,
    warehouse_code VARCHAR(50) NOT NULL,
    warehouse_name VARCHAR(255) NOT NULL,
    address TEXT,
    city VARCHAR(100),
    state VARCHAR(50),
    country VARCHAR(50),
    zip_code VARCHAR(20),
    erp_code VARCHAR(50),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(tenant_id, warehouse_code)
);

CREATE INDEX idx_warehouses_tenant ON warehouses(tenant_id);
CREATE INDEX idx_warehouses_code ON warehouses(warehouse_code);

-- Zones (within warehouses)
CREATE TABLE zones (
    zone_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    warehouse_id UUID NOT NULL REFERENCES warehouses(warehouse_id) ON DELETE CASCADE,
    zone_code VARCHAR(50) NOT NULL,
    zone_name VARCHAR(255) NOT NULL,
    zone_type VARCHAR(50) CHECK (zone_type IN ('receiving', 'storage', 'picking', 'packing', 'shipping', 'quarantine', 'cold_storage')),
    capacity_unit VARCHAR(20),
    max_capacity NUMERIC(12,2),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(warehouse_id, zone_code)
);

CREATE INDEX idx_zones_warehouse ON zones(warehouse_id);
CREATE INDEX idx_zones_type ON zones(zone_type);

-- Bins (storage locations within zones)
CREATE TABLE bins (
    bin_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    zone_id UUID NOT NULL REFERENCES zones(zone_id) ON DELETE CASCADE,
    bin_code VARCHAR(50) NOT NULL,
    bin_type VARCHAR(50) DEFAULT 'standard',
    capacity_type VARCHAR(20) CHECK (capacity_type IN ('units', 'weight', 'volume')),
    max_capacity NUMERIC(12,2),
    current_occupancy NUMERIC(12,2) DEFAULT 0,
    dimensions_length NUMERIC(8,2),
    dimensions_width NUMERIC(8,2),
    dimensions_height NUMERIC(8,2),
    weight_capacity NUMERIC(10,2),
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'maintenance', 'deprecated', 'decommissioned')),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(zone_id, bin_code)
);

CREATE INDEX idx_bins_zone ON bins(zone_id);
CREATE INDEX idx_bins_code ON bins(bin_code);
CREATE INDEX idx_bins_status ON bins(status);

-- Categories
CREATE TABLE categories (
    category_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(tenant_id) ON DELETE CASCADE,
    category_name VARCHAR(255) NOT NULL,
    category_code VARCHAR(50),
    parent_category_id UUID REFERENCES categories(category_id),
    description TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_categories_tenant ON categories(tenant_id);
CREATE INDEX idx_categories_parent ON categories(parent_category_id);

-- ============================================
-- INVENTORY TABLES
-- ============================================

-- SKUs (Stock Keeping Units)
CREATE TABLE skus (
    sku_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(tenant_id) ON DELETE CASCADE,
    sku_code VARCHAR(100) NOT NULL,
    product_name VARCHAR(255) NOT NULL,
    description TEXT,
    category_id UUID REFERENCES categories(category_id),
    unit_of_measure VARCHAR(20) DEFAULT 'units',
    unit_cost NUMERIC(12,2),
    unit_price NUMERIC(12,2),
    is_batch_tracked BOOLEAN DEFAULT false,
    is_perishable BOOLEAN DEFAULT false,
    is_serialized BOOLEAN DEFAULT false,
    abc_classification CHAR(1) CHECK (abc_classification IN ('A', 'B', 'C')),
    product_image_url TEXT,
    barcode VARCHAR(100),
    gs1_gtin VARCHAR(14),
    tags TEXT[],
    metadata JSONB DEFAULT '{}',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(tenant_id, sku_code)
);

CREATE INDEX idx_skus_tenant ON skus(tenant_id);
CREATE INDEX idx_skus_code ON skus(sku_code);
CREATE INDEX idx_skus_category ON skus(category_id);
CREATE INDEX idx_skus_classification ON skus(abc_classification);
CREATE INDEX idx_skus_batch_tracked ON skus(is_batch_tracked) WHERE is_batch_tracked = true;
CREATE INDEX idx_skus_perishable ON skus(is_perishable) WHERE is_perishable = true;
CREATE INDEX idx_skus_search ON skus USING gin(to_tsvector('english', product_name || ' ' || sku_code));

-- Inventory (Current state per SKU per warehouse)
CREATE TABLE inventory (
    inventory_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    sku_id UUID NOT NULL REFERENCES skus(sku_id) ON DELETE CASCADE,
    warehouse_id UUID NOT NULL REFERENCES warehouses(warehouse_id) ON DELETE CASCADE,
    quantity_available NUMERIC(12,2) DEFAULT 0,
    quantity_reserved NUMERIC(12,2) DEFAULT 0,
    quantity_in_transit NUMERIC(12,2) DEFAULT 0,
    quantity_damaged NUMERIC(12,2) DEFAULT 0,
    quantity_on_hold NUMERIC(12,2) DEFAULT 0,
    last_movement_at TIMESTAMP,
    last_counted_at TIMESTAMP,
    version INT DEFAULT 1,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(sku_id, warehouse_id),
    CONSTRAINT non_negative_quantities CHECK (
        quantity_available >= 0 AND
        quantity_reserved >= 0 AND
        quantity_in_transit >= 0 AND
        quantity_damaged >= 0 AND
        quantity_on_hold >= 0
    )
);

CREATE INDEX idx_inventory_sku ON inventory(sku_id);
CREATE INDEX idx_inventory_warehouse ON inventory(warehouse_id);
CREATE INDEX idx_inventory_sku_warehouse ON inventory(sku_id, warehouse_id);
CREATE INDEX idx_inventory_available ON inventory(quantity_available);

-- Inventory Movements (Event sourcing for all inventory changes)
CREATE TABLE inventory_movements (
    movement_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    inventory_id UUID NOT NULL REFERENCES inventory(inventory_id) ON DELETE CASCADE,
    movement_type VARCHAR(50) NOT NULL CHECK (movement_type IN (
        'receiving', 'pick', 'transfer', 'adjustment',
        'damage', 'cycle_count', 'return', 'disposal', 'quarantine', 'release'
    )),
    reference_type VARCHAR(50),
    reference_id VARCHAR(100),
    quantity_change NUMERIC(12,2) NOT NULL,
    quantity_before NUMERIC(12,2) NOT NULL,
    quantity_after NUMERIC(12,2) NOT NULL,
    bin_id UUID REFERENCES bins(bin_id),
    batch_id UUID,
    performed_by UUID REFERENCES users(user_id),
    notes TEXT,
    metadata JSONB DEFAULT '{}',
    timestamp TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_movements_inventory ON inventory_movements(inventory_id);
CREATE INDEX idx_movements_type ON inventory_movements(movement_type);
CREATE INDEX idx_movements_timestamp ON inventory_movements(timestamp DESC);
CREATE INDEX idx_movements_inventory_time ON inventory_movements(inventory_id, timestamp DESC);
CREATE INDEX idx_movements_reference ON inventory_movements(reference_type, reference_id);

-- Convert to TimescaleDB hypertable for efficient time-series queries
SELECT create_hypertable('inventory_movements', 'timestamp',
    chunk_time_interval => INTERVAL '1 month',
    if_not_exists => TRUE
);

-- SKU-Bin Mappings (which SKUs are in which bins)
CREATE TABLE sku_bin_mappings (
    mapping_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    sku_id UUID NOT NULL REFERENCES skus(sku_id) ON DELETE CASCADE,
    bin_id UUID NOT NULL REFERENCES bins(bin_id) ON DELETE CASCADE,
    quantity NUMERIC(12,2) DEFAULT 0,
    is_primary_location BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(sku_id, bin_id)
);

CREATE INDEX idx_sku_bin_sku ON sku_bin_mappings(sku_id);
CREATE INDEX idx_sku_bin_bin ON sku_bin_mappings(bin_id);
CREATE INDEX idx_sku_bin_primary ON sku_bin_mappings(sku_id, is_primary_location) WHERE is_primary_location = true;

-- ============================================
-- BATCH MANAGEMENT TABLES
-- ============================================

-- Batches/Lots
CREATE TABLE batches (
    batch_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    sku_id UUID NOT NULL REFERENCES skus(sku_id) ON DELETE CASCADE,
    batch_number VARCHAR(100) NOT NULL,
    manufacturing_date DATE,
    expiry_date DATE,
    receipt_date DATE NOT NULL,
    supplier_name VARCHAR(255),
    purchase_order_reference VARCHAR(100),
    quantity_received NUMERIC(12,2) NOT NULL,
    quantity_available NUMERIC(12,2) NOT NULL,
    quantity_reserved NUMERIC(12,2) DEFAULT 0,
    quantity_picked NUMERIC(12,2) DEFAULT 0,
    quantity_damaged NUMERIC(12,2) DEFAULT 0,
    quantity_disposed NUMERIC(12,2) DEFAULT 0,
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN (
        'quarantine', 'active', 'near_expiry', 'expired', 'on_hold', 'disposed'
    )),
    qa_status VARCHAR(20) DEFAULT 'pending' CHECK (qa_status IN ('pending', 'released', 'rejected')),
    hold_reason TEXT,
    released_by UUID REFERENCES users(user_id),
    released_at TIMESTAMP,
    parent_batch_id UUID REFERENCES batches(batch_id),
    certificate_of_analysis_url TEXT,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_batches_sku ON batches(sku_id);
CREATE INDEX idx_batches_number ON batches(batch_number);
CREATE INDEX idx_batches_expiry ON batches(expiry_date, status);
CREATE INDEX idx_batches_status ON batches(status);
CREATE INDEX idx_batches_qa_status ON batches(qa_status);
CREATE INDEX idx_batches_expiry_active ON batches(expiry_date) WHERE status IN ('active', 'near_expiry');

-- ============================================
-- THRESHOLD & ALERT TABLES
-- ============================================

-- Inventory Thresholds
CREATE TABLE inventory_thresholds (
    threshold_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    sku_id UUID NOT NULL REFERENCES skus(sku_id) ON DELETE CASCADE,
    warehouse_id UUID REFERENCES warehouses(warehouse_id) ON DELETE CASCADE,
    zone_id UUID REFERENCES zones(zone_id) ON DELETE CASCADE,
    min_threshold NUMERIC(12,2) NOT NULL,
    max_threshold NUMERIC(12,2),
    safety_stock NUMERIC(12,2),
    reorder_quantity NUMERIC(12,2),
    supplier_lead_time_days INT,
    velocity_adjustment_enabled BOOLEAN DEFAULT false,
    seasonal_patterns_enabled BOOLEAN DEFAULT false,
    alert_cooldown_hours INT DEFAULT 6,
    recipients JSONB NOT NULL DEFAULT '[]',
    alert_channels JSONB DEFAULT '{"in_app": true, "email": true, "sms": false, "webhook": false}',
    last_calculated_at TIMESTAMP,
    created_by UUID REFERENCES users(user_id),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(sku_id, warehouse_id, zone_id)
);

CREATE INDEX idx_thresholds_sku ON inventory_thresholds(sku_id);
CREATE INDEX idx_thresholds_warehouse ON inventory_thresholds(warehouse_id);
CREATE INDEX idx_thresholds_zone ON inventory_thresholds(zone_id);

-- Inventory Alerts
CREATE TABLE inventory_alerts (
    alert_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    threshold_id UUID NOT NULL REFERENCES inventory_thresholds(threshold_id) ON DELETE CASCADE,
    sku_id UUID NOT NULL REFERENCES skus(sku_id) ON DELETE CASCADE,
    warehouse_id UUID REFERENCES warehouses(warehouse_id) ON DELETE CASCADE,
    alert_type VARCHAR(50) NOT NULL CHECK (alert_type IN (
        'low_stock', 'critical_stock', 'overstock', 'near_expiry', 'expired', 'velocity_change'
    )),
    severity VARCHAR(20) NOT NULL CHECK (severity IN ('warning', 'critical', 'emergency')),
    threshold_value NUMERIC(12,2),
    current_stock NUMERIC(12,2),
    variance_percentage NUMERIC(5,2),
    days_to_stockout INT,
    status VARCHAR(20) DEFAULT 'unread' CHECK (status IN ('unread', 'acknowledged', 'resolved', 'snoozed')),
    snoozed_until TIMESTAMP,
    message TEXT,
    triggered_at TIMESTAMP DEFAULT NOW(),
    acknowledged_by UUID REFERENCES users(user_id),
    acknowledged_at TIMESTAMP,
    resolved_at TIMESTAMP,
    metadata JSONB DEFAULT '{}'
);

CREATE INDEX idx_alerts_threshold ON inventory_alerts(threshold_id);
CREATE INDEX idx_alerts_sku ON inventory_alerts(sku_id);
CREATE INDEX idx_alerts_status_severity ON inventory_alerts(status, severity, triggered_at DESC);
CREATE INDEX idx_alerts_triggered ON inventory_alerts(triggered_at DESC);
CREATE INDEX idx_alerts_unresolved ON inventory_alerts(status) WHERE status IN ('unread', 'acknowledged');

-- ============================================
-- CYCLE COUNT TABLES
-- ============================================

-- Cycle Count Tasks
CREATE TABLE cycle_count_tasks (
    task_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(tenant_id) ON DELETE CASCADE,
    task_code VARCHAR(50) NOT NULL,
    count_type VARCHAR(50) NOT NULL CHECK (count_type IN ('manual_sku', 'zone_sweep', 'bin_sweep', 'abc_classification', 'scheduled')),
    priority VARCHAR(20) DEFAULT 'normal' CHECK (priority IN ('normal', 'high', 'urgent')),
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'cancelled')),
    blind_count BOOLEAN DEFAULT false,
    require_photos BOOLEAN DEFAULT false,
    allow_partial_count BOOLEAN DEFAULT false,
    assigned_to UUID REFERENCES users(user_id),
    created_by UUID REFERENCES users(user_id),
    reason TEXT,
    due_date TIMESTAMP,
    started_at TIMESTAMP,
    completed_at TIMESTAMP,
    total_skus INT DEFAULT 0,
    completed_skus INT DEFAULT 0,
    accuracy_percentage NUMERIC(5,2),
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(tenant_id, task_code)
);

CREATE INDEX idx_cycle_tasks_tenant ON cycle_count_tasks(tenant_id);
CREATE INDEX idx_cycle_tasks_status ON cycle_count_tasks(status);
CREATE INDEX idx_cycle_tasks_assigned ON cycle_count_tasks(assigned_to);
CREATE INDEX idx_cycle_tasks_due ON cycle_count_tasks(due_date) WHERE status IN ('pending', 'in_progress');

-- Cycle Count Items (individual SKU counts within a task)
CREATE TABLE cycle_count_items (
    item_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    task_id UUID NOT NULL REFERENCES cycle_count_tasks(task_id) ON DELETE CASCADE,
    sku_id UUID NOT NULL REFERENCES skus(sku_id) ON DELETE CASCADE,
    bin_id UUID REFERENCES bins(bin_id),
    batch_id UUID REFERENCES batches(batch_id),
    expected_quantity NUMERIC(12,2),
    counted_quantity NUMERIC(12,2),
    variance NUMERIC(12,2),
    variance_percentage NUMERIC(5,2),
    variance_value NUMERIC(12,2),
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'counted', 'variance_review', 'approved', 'rejected')),
    counted_by UUID REFERENCES users(user_id),
    counted_at TIMESTAMP,
    reviewed_by UUID REFERENCES users(user_id),
    reviewed_at TIMESTAMP,
    review_action VARCHAR(20) CHECK (review_action IN ('approve', 'reject', 'recount')),
    notes TEXT,
    photo_urls TEXT[],
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_cycle_items_task ON cycle_count_items(task_id);
CREATE INDEX idx_cycle_items_sku ON cycle_count_items(sku_id);
CREATE INDEX idx_cycle_items_status ON cycle_count_items(status);
CREATE INDEX idx_cycle_items_variance ON cycle_count_items(status) WHERE status = 'variance_review';

-- ============================================
-- ADJUSTMENT TABLES
-- ============================================

-- Inventory Adjustments
CREATE TABLE inventory_adjustments (
    adjustment_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    sku_id UUID NOT NULL REFERENCES skus(sku_id) ON DELETE CASCADE,
    warehouse_id UUID NOT NULL REFERENCES warehouses(warehouse_id) ON DELETE CASCADE,
    bin_id UUID REFERENCES bins(bin_id),
    batch_id UUID REFERENCES batches(batch_id),
    adjustment_type VARCHAR(20) NOT NULL CHECK (adjustment_type IN ('increase', 'decrease', 'status_change')),
    quantity_before NUMERIC(12,2) NOT NULL,
    quantity_after NUMERIC(12,2) NOT NULL,
    quantity_change NUMERIC(12,2) NOT NULL,
    value_impact NUMERIC(12,2),
    reason VARCHAR(100) NOT NULL CHECK (reason IN (
        'damage', 'loss_theft', 'found', 'audit_discrepancy', 'reclassification',
        'transfer_not_recorded', 'receiving_error', 'picking_error', 'expiry_spoilage',
        'customer_return', 'system_error', 'cycle_count_variance', 'other'
    )),
    remarks TEXT,
    attachment_urls TEXT[],
    status VARCHAR(20) DEFAULT 'pending_approval' CHECK (status IN ('pending_approval', 'approved', 'rejected')),
    requires_approval BOOLEAN DEFAULT false,
    created_by UUID NOT NULL REFERENCES users(user_id),
    approved_by UUID REFERENCES users(user_id),
    approved_at TIMESTAMP,
    rejection_reason TEXT,
    cycle_count_task_id UUID REFERENCES cycle_count_tasks(task_id),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_adjustments_sku ON inventory_adjustments(sku_id);
CREATE INDEX idx_adjustments_warehouse ON inventory_adjustments(warehouse_id);
CREATE INDEX idx_adjustments_status ON inventory_adjustments(status);
CREATE INDEX idx_adjustments_created_by ON inventory_adjustments(created_by);
CREATE INDEX idx_adjustments_pending ON inventory_adjustments(status) WHERE status = 'pending_approval';

-- ============================================
-- AUDIT & REPORTING TABLES
-- ============================================

-- Audit Logs (immutable trail)
CREATE TABLE audit_logs (
    audit_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(tenant_id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(user_id),
    action VARCHAR(100) NOT NULL,
    entity_type VARCHAR(50) NOT NULL,
    entity_id UUID,
    old_values JSONB,
    new_values JSONB,
    ip_address INET,
    user_agent TEXT,
    timestamp TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_audit_tenant ON audit_logs(tenant_id);
CREATE INDEX idx_audit_user ON audit_logs(user_id);
CREATE INDEX idx_audit_entity ON audit_logs(entity_type, entity_id);
CREATE INDEX idx_audit_timestamp ON audit_logs(timestamp DESC);
CREATE INDEX idx_audit_action ON audit_logs(action);

-- Convert to TimescaleDB hypertable
SELECT create_hypertable('audit_logs', 'timestamp',
    chunk_time_interval => INTERVAL '1 month',
    if_not_exists => TRUE
);

-- ============================================
-- FUNCTIONS & TRIGGERS
-- ============================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply updated_at trigger to all relevant tables
CREATE TRIGGER update_tenants_updated_at BEFORE UPDATE ON tenants
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_warehouses_updated_at BEFORE UPDATE ON warehouses
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_zones_updated_at BEFORE UPDATE ON zones
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_bins_updated_at BEFORE UPDATE ON bins
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_skus_updated_at BEFORE UPDATE ON skus
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_inventory_updated_at BEFORE UPDATE ON inventory
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_batches_updated_at BEFORE UPDATE ON batches
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_thresholds_updated_at BEFORE UPDATE ON inventory_thresholds
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_cycle_tasks_updated_at BEFORE UPDATE ON cycle_count_tasks
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_cycle_items_updated_at BEFORE UPDATE ON cycle_count_items
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_adjustments_updated_at BEFORE UPDATE ON inventory_adjustments
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to calculate bin occupancy
CREATE OR REPLACE FUNCTION calculate_bin_occupancy()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE bins
    SET current_occupancy = (
        SELECT COALESCE(SUM(quantity), 0)
        FROM sku_bin_mappings
        WHERE bin_id = NEW.bin_id
    )
    WHERE bin_id = NEW.bin_id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_bin_occupancy_on_mapping
AFTER INSERT OR UPDATE OR DELETE ON sku_bin_mappings
FOR EACH ROW EXECUTE FUNCTION calculate_bin_occupancy();

-- Function to update inventory version (optimistic locking)
CREATE OR REPLACE FUNCTION increment_inventory_version()
RETURNS TRIGGER AS $$
BEGIN
    NEW.version = OLD.version + 1;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER increment_version_on_update
BEFORE UPDATE ON inventory
FOR EACH ROW EXECUTE FUNCTION increment_inventory_version();

-- ============================================
-- MATERIALIZED VIEWS FOR PERFORMANCE
-- ============================================

-- SKU Inventory Summary (aggregated view)
CREATE MATERIALIZED VIEW mv_sku_inventory_summary AS
SELECT
    s.sku_id,
    s.tenant_id,
    s.sku_code,
    s.product_name,
    s.category_id,
    s.abc_classification,
    s.is_batch_tracked,
    s.is_perishable,
    COUNT(DISTINCT i.warehouse_id) as warehouse_count,
    SUM(i.quantity_available) as total_available,
    SUM(i.quantity_reserved) as total_reserved,
    SUM(i.quantity_damaged) as total_damaged,
    MAX(i.last_movement_at) as last_movement_at,
    MAX(i.last_counted_at) as last_counted_at
FROM skus s
LEFT JOIN inventory i ON s.sku_id = i.sku_id
WHERE s.is_active = true
GROUP BY s.sku_id, s.tenant_id, s.sku_code, s.product_name, s.category_id, s.abc_classification, s.is_batch_tracked, s.is_perishable;

CREATE UNIQUE INDEX idx_mv_sku_summary_sku ON mv_sku_inventory_summary(sku_id);
CREATE INDEX idx_mv_sku_summary_tenant ON mv_sku_inventory_summary(tenant_id);

-- Batch Expiry Report (active batches with expiry info)
CREATE MATERIALIZED VIEW mv_batch_expiry_report AS
SELECT
    b.batch_id,
    b.sku_id,
    s.sku_code,
    s.product_name,
    s.tenant_id,
    b.batch_number,
    b.expiry_date,
    b.quantity_available,
    b.status,
    (b.expiry_date - CURRENT_DATE) as days_to_expiry,
    CASE
        WHEN b.expiry_date < CURRENT_DATE THEN 'expired'
        WHEN b.expiry_date - CURRENT_DATE <= 7 THEN 'critical'
        WHEN b.expiry_date - CURRENT_DATE <= 30 THEN 'near_expiry'
        WHEN b.expiry_date - CURRENT_DATE <= 90 THEN 'warning'
        ELSE 'ok'
    END as expiry_status
FROM batches b
JOIN skus s ON b.sku_id = s.sku_id
WHERE b.status IN ('active', 'near_expiry')
    AND b.quantity_available > 0;

CREATE INDEX idx_mv_batch_expiry_sku ON mv_batch_expiry_report(sku_id);
CREATE INDEX idx_mv_batch_expiry_status ON mv_batch_expiry_report(expiry_status);
CREATE INDEX idx_mv_batch_expiry_date ON mv_batch_expiry_report(expiry_date);

-- Comments
COMMENT ON TABLE tenants IS 'Multi-tenant organizations using the system';
COMMENT ON TABLE skus IS 'Stock Keeping Units - Product master data';
COMMENT ON TABLE inventory IS 'Current inventory state per SKU per warehouse';
COMMENT ON TABLE inventory_movements IS 'Immutable event log of all inventory changes';
COMMENT ON TABLE batches IS 'Batch/Lot tracking for perishable and regulated items';
COMMENT ON TABLE inventory_thresholds IS 'Min/Max thresholds for automated alerting';
COMMENT ON TABLE inventory_alerts IS 'Generated alerts when thresholds are breached';
COMMENT ON TABLE cycle_count_tasks IS 'Cycle counting tasks for inventory verification';
COMMENT ON TABLE audit_logs IS 'Immutable audit trail for compliance';
