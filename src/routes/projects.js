import express from 'express';
import { createProject, getProjects, getProjectById, addCollaborator } from '../controllers/projectController.js';
import { authMiddleware } from '../middlewares/authMiddleware.js';

const router = express.Router();

// Create a new project
router.post('/', authMiddleware, createProject);

// Get all projects
router.get('/', authMiddleware, getProjects);

// Get a specific project by ID
router.get('/:id', authMiddleware, getProjectById);

// Add a collaborator to a project
router.post('/:id/collaborators', authMiddleware, addCollaborator);

export default router;
