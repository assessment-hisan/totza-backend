
import express from 'express';
import { 
  createWorker, 
  getWorkers, 
  getWorkerById, 
  getWorkerTransactions,
  updateWorker, 
  deleteWorker 
} from "../../controllers/small/workerController.js"
import { authMiddleware } from "../../middlewares/authMiddleware.js";

const router = express.Router();

router.post('/', authMiddleware, createWorker);
router.get('/', authMiddleware, getWorkers);
router.get('/transactions', authMiddleware, getWorkerTransactions);
router.get('/:id', authMiddleware, getWorkerById);
router.put('/:id', authMiddleware, updateWorker);
router.delete('/:id', authMiddleware, deleteWorker);

export default router;