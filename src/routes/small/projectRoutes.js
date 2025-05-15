import express from 'express';
import { createProject, getProjects, deleteProject, getProjectById } from "../../controllers/small/projectController.js"
import { authMiddleware } from "../../middlewares/authMiddleware.js"

const router = express.Router();

router.post('/', authMiddleware, createProject);
router.get('/', authMiddleware, getProjects);
router.get("/:id", authMiddleware, getProjectById)
router.delete('/:id', authMiddleware, deleteProject);
export default router;