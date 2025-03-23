import express from 'express';
import { addProjectTransaction, getProjectTransactions, deleteProjectTransaction } from '../controllers/projectExpensesController.js';
import { authMiddleware } from '../middlewares/authMiddleware.js';

const router = express.Router();

// Add a new project expense
router.post('/:projectId/', authMiddleware, addProjectTransaction);

// Get all expenses of a project
router.get('/:projectId/', authMiddleware, getProjectTransactions);

// Delete a specific project expense
router.delete('/:projectId/:expenseId', authMiddleware, deleteProjectTransaction);

export default router;
