import { Router } from 'express';
import { authenticate, authorize } from '../middleware/auth';
import * as inventoryController from '../controllers/inventory.controller';

const router = Router();

// All routes require authentication
router.use(authenticate);

/**
 * @route   GET /api/v1/inventory
 * @desc    Get inventory overview with filtering and pagination
 * @access  Warehouse Associate, Manager, Analyst, QA Supervisor, Admin
 */
router.get(
  '/',
  inventoryController.getInventoryOverview
);

/**
 * @route   GET /api/v1/inventory/:skuId
 * @desc    Get detailed inventory information for specific SKU
 * @access  All authenticated users
 */
router.get(
  '/:skuId',
  inventoryController.getInventoryDetail
);

/**
 * @route   GET /api/v1/inventory/:skuId/bins
 * @desc    Get bin-level breakdown for specific SKU
 * @access  All authenticated users
 */
router.get(
  '/:skuId/bins',
  inventoryController.getBinLevelInventory
);

/**
 * @route   GET /api/v1/inventory/bins/:binId/movements
 * @desc    Get movement history for specific bin
 * @access  All authenticated users
 */
router.get(
  '/bins/:binId/movements',
  inventoryController.getBinMovementHistory
);

/**
 * @route   POST /api/v1/inventory/export
 * @desc    Export inventory data
 * @access  Manager, Analyst, Admin
 */
router.post(
  '/export',
  authorize('warehouse_manager', 'inventory_analyst', 'tenant_admin'),
  inventoryController.exportInventory
);

/**
 * @route   GET /api/v1/inventory/search
 * @desc    Search inventory by SKU code, name, or batch number
 * @access  All authenticated users
 */
router.get(
  '/search',
  inventoryController.searchInventory
);

export default router;
