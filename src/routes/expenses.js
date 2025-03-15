import express from 'express';
import { createExpense, getExpenses, getExpenseById, updateExpense, deleteExpense } from '../controllers/expensesController.js';
import { authMiddleware } from '../middlewares/authMiddleware.js';

const router = express.Router();

// Create an expense
router.post('/', authMiddleware, createExpense);

// Get all expenses of the logged-in user
router.get('/', authMiddleware, getExpenses);

// Get a specific expense by ID
router.get('/:id', authMiddleware, getExpenseById);

// Update an expense by ID
router.put('/:id', authMiddleware, updateExpense);

// Delete an expense by ID
router.delete('/:id', authMiddleware, deleteExpense);

export default router;
