import { createEmployeeHandler, getAllEmployeesHandler, getEmployeeByIdHandler } from '../controllers/employee.controller.ts';
import { Router } from 'express';

const router = Router();

router.post('/employees', createEmployeeHandler);
router.get('/employees', getAllEmployeesHandler);
router.get('/employees/:id', getEmployeeByIdHandler);

export default router;