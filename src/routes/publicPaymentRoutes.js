import { Router } from 'express';

import { createBrandPaymentOrder, createBrandPaymentOrderValidation, createOrder, createOrderValidation, verifyPayment, verifyPaymentValidation } from '../controllers/publicPaymentController.js';
import validate from '../middleware/validation.js';

const router = Router();

router.post('/create-order', createOrderValidation, validate, createOrder);
router.post('/create-brand-payment-order', createBrandPaymentOrderValidation, validate, createBrandPaymentOrder);
router.post('/verify', verifyPaymentValidation, validate, verifyPayment);

export default router;
