// routes/small/vendorRoutes.js
import express from 'express';
import { 
  createVendor, 
  getVendors, 
  getVendorById, 
  updateVendor, 
  deleteVendor 
} from "../../controllers/small/vendorController.js"
import { authMiddleware } from "../../middlewares/authMiddleware.js";

const router = express.Router();

router.post('/', authMiddleware, createVendor);
router.get('/', authMiddleware, getVendors);
router.get('/:id', authMiddleware, getVendorById);
router.put('/:id', authMiddleware, updateVendor);
router.delete('/:id', authMiddleware, deleteVendor);

export default router;