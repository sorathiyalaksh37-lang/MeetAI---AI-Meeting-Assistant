import express from "express";
import { analyzeMeeting } from "../controllers/aiController.js";

const router = express.Router();

router.post("/analyze", analyzeMeeting);

export default router;