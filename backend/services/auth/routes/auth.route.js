import {Router} from 'express';
import { demoLogin, login, logout } from '../controllers/auth.controller.js';

const router = Router()

router.post('/login',login);
router.post('/demo', demoLogin);
router.get('/logout',logout);

export default router;
