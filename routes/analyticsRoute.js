// routes/adminRoutes.js
import express from 'express';
import { anaylyicsData, analyticsYearly, analyticsCountries, analyticsTrafficSources, trafficSourcesWeekly } from '../controllers/analyticsController.js';

const router = express.Router();
router.get('/analytics-data', anaylyicsData);
router.get('/analytics-data/yearly', analyticsYearly);
router.get('/analytics-countries', analyticsCountries);
router.get('/analytics-traffic-sources', analyticsTrafficSources);
router.get('/traffic-sources/weekly', trafficSourcesWeekly);



export default router;