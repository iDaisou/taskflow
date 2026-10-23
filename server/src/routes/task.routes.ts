import { Router } from 'express';
import {
  createTask,
  deleteTask,
  getTasksByProject,
  updateTask,
} from '../controllers/task.controller.js';
import { protect } from '../middleware/auth.js';

const router = Router({ mergeParams: true });

router.use(protect);

router.get('/project/:projectId', getTasksByProject);
router.post('/project/:projectId', createTask);
router.put('/:id', updateTask);
router.delete('/:id', deleteTask);

export default router;
