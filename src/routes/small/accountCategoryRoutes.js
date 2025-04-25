import express from 'express';
import { createCategory, getCategories, updateCategory, deleteCategory } from '../../controllers/small/accountCategoryController.js';
import {authMiddleware} from "../../middlewares/authMiddleware.js";

const router = express.Router();

router.post('/', authMiddleware, createCategory);
router.get('/', authMiddleware, getCategories);
router.put('/:id', authMiddleware, updateCategory);
router.delete('/:id', authMiddleware, deleteCategory);

export default router;
