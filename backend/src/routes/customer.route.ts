import { createCustomerHandler, deleteCustomerHandler, getAllCustomersHandler, getCustomerByIdHandler } from '../controllers/customer.controller.ts';
import { Router } from 'express';

const router = Router();

router.post('/customers', createCustomerHandler);
router.get('/customers', getAllCustomersHandler);
router.get('/customers/:id', getCustomerByIdHandler);
router.delete('/customers/:id', deleteCustomerHandler);

export default router;