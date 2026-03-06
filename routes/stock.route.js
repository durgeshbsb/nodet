import express from 'express';
import upload from '../utils/upload.js';
import {
    getResult
} from "../controllers/stock.controller.js";

const router = express.Router();

router.post('/get', upload.none(), getResult);


export default router;