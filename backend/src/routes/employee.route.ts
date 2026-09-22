import { createEmployeeHandler, deleteEmployeeHandler, getAllEmployeesHandler, getEmployeeByIdHandler } from '../controllers/employee.controller.ts';
import { Router } from 'express';

const router = Router();

router.post('/employees', createEmployeeHandler);
router.get('/employees', getAllEmployeesHandler);
router.get('/employees/:id', getEmployeeByIdHandler);
router.delete('/employees/:id', deleteEmployeeHandler);

export default router;