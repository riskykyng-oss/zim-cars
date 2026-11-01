import express from 'express';
import { getAllVehicles, getPublicVehicles, getVehicleById, createVehicle, updateVehicle } from './vehicles.controller.js';
import { uploadVehicleImage, deleteVehicleImage } from './vehicles.images.controller.js';
import { requireAuth, requireRole } from '../../middleware/auth.js';
import { requireDealerActive } from '../../middleware/requireDealerActive.js';
import { upload } from '../../middleware/upload.js';

const router = express.Router();

// Public routes
router.get('/public', getPublicVehicles);

// Protected routes
router.get('/', requireAuth, getAllVehicles);
router.get('/:id', getVehicleById); // Public can view if available, checked in controller
router.post('/', requireAuth, requireRole(['admin', 'dealer_owner']), requireDealerActive, createVehicle);
router.put('/:id', requireAuth, requireRole(['admin', 'dealer_owner']), requireDealerActive, updateVehicle);
router.post('/:id/images', requireAuth, requireRole(['admin', 'dealer_owner', 'dealer_staff']), requireDealerActive, upload.array('images', 10), uploadVehicleImages);
router.post('/:id/image', requireAuth, requireRole(['admin', 'dealer_owner', 'dealer_staff']), requireDealerActive, upload.single('image'), uploadVehicleImage);
router.delete('/images/:imageId', requireAuth, requireRole(['admin', 'dealer_owner', 'dealer_staff']), deleteVehicleImage);

export default router;
