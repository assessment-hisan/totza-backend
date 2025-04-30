import express from 'express';
import { createCompanyTransaction, getCompanyTransactions, deleteCompanyTransaction, getRecentCompanyTransactions } from '../controllers/companyTransactionController.js';
import {authMiddleware} from "../middlewares/authMiddleware.js";

const router = express.Router();

router.post('/', authMiddleware, createCompanyTransaction);
router.get('/', authMiddleware, getCompanyTransactions);
router.get('/recent', authMiddleware, getRecentCompanyTransactions);
router.delete('/:id', authMiddleware, deleteCompanyTransaction);

export default router;
