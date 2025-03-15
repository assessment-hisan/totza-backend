import express from 'express';
import { addProjectExpense, getProjectExpenses, deleteProjectExpense } from '../controllers/projectExpensesController.js';
import { authMiddleware } from '../middlewares/authMiddleware.js';

const router = express.Router();

// Add a new project expense
router.post('/:projectId/', authMiddleware, addProjectExpense);

// Get all expenses of a project
router.get('/:projectId/', authMiddleware, getProjectExpenses);

// Delete a specific project expense
router.delete('/:projectId/:expenseId', authMiddleware, deleteProjectExpense);

export default router;
