import express from 'express';
import { createPersonalTransaction, getPersonalTransactions, deletePersonalTransaction } from "../controllers/personalTransactionController.js"
import { authMiddleware } from "../middlewares/authMiddleware.js";

const router = express.Router();

router.post('/', authMiddleware, createPersonalTransaction);
router.get('/', authMiddleware, getPersonalTransactions);
router.delete('/:id', authMiddleware, deletePersonalTransaction);

export default router;
