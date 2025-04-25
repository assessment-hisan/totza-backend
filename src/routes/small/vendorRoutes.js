import express from 'express';
import {
  addVendor,
  getVendors,
  updateVendor,
  deleteVendor
} from '../../controllers/small/vendorController.js';
import {authMiddleware} from '../../middlewares/authMiddleware.js';

const router = express.Router();

router.post('/', authMiddleware, addVendor);
router.get('/', authMiddleware, getVendors);
router.put('/:id', authMiddleware, updateVendor);
router.delete('/:id', authMiddleware, deleteVendor);

export default router;
