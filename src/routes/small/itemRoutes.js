import express from 'express';
import {
  addItem,
  getItems,
  updateItem,
  deleteItem
} from '../../controllers/small/itemController.js';
import {authMiddleware} from '../../middlewares/authMiddleware.js';

const router = express.Router();

router.post('/', authMiddleware, addItem);
router.get('/', authMiddleware, getItems);
router.put('/:id', authMiddleware, updateItem);
router.delete('/:id', authMiddleware, deleteItem);

export default router;
