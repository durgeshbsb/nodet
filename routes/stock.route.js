import express from 'express';
import upload from '../utils/upload.js';
import {
    getResult, analyzeNewsBatch
} from "../controllers/stock.controller.js";

const router = express.Router();

router.post('/get', upload.none(), getResult);
router.post('/analyse', upload.none(), analyzeNewsBatch);


export default router;