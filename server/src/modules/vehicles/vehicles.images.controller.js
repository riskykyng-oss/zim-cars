import fs from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import prisma from '../../config/database.js';
import {
  supabase,
  hasSupabaseStorage,
  uploadImageBuffer,
  deleteImageByUrl,
} from '../../config/supabase.js';
import { uploadDir, ensureUploadDir } from '../../middleware/upload.js';

export const uploadVehicleImage = async (req, res) => {
  try {
    const { id } = req.params;

    const vehicle = await prisma.vehicle.findUnique({ where: { id } });
    if (!vehicle) {
      return res.status(404).json({ error: 'Vehicle not found' });
    }

    // Check access
    if (req.session.role !== 'admin' && req.session.dealerId !== vehicle.dealerId) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const extension = path.extname(req.file.originalname).toLowerCase() || '.jpg';
    const filename = `${uuidv4()}${extension}`;

    let imageUrl;
    if (hasSupabaseStorage()) {
      imageUrl = await uploadImageBuffer(req.file.buffer, filename, req.file.mimetype);
    } else {
      // Local development fallback when SUPABASE_* env vars are absent.
      if (process.env.VERCEL) {
        return res.status(500).json({
          error: 'Image storage is not configured. Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.',
        });
      }
      ensureUploadDir();
      fs.writeFileSync(path.join(uploadDir, filename), req.file.buffer);
      imageUrl = `/uploads/${filename}`;
    }

    // Check if this is the first image
    const existingImages = await prisma.vehicleImage.count({
      where: { vehicleId: id },
    });

    const image = await prisma.vehicleImage.create({
      data: {
        vehicleId: id,
        url: imageUrl,
        isPrimary: existingImages === 0,
      },
    });

    return res.status(201).json(image);
  } catch (error) {
    console.error('Upload image error:', error);
    return res.status(500).json({ error: 'Failed to upload image' });
  }
};

export const uploadVehicleImages = async (req, res) => {
  try {
    const { id } = req.params;

    const vehicle = await prisma.vehicle.findUnique({ where: { id } });
    if (!vehicle) {
      return res.status(404).json({ error: 'Vehicle not found' });
    }

    if (req.session.role !== 'admin' && req.session.dealerId !== vehicle.dealerId) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ error: 'No files uploaded' });
    }

    const existingCount = await prisma.vehicleImage.count({ where: { vehicleId: id } });
    const images = [];

    for (let i = 0; i < req.files.length; i++) {
      const file = req.files[i];
      const extension = path.extname(file.originalname).toLowerCase() || '.jpg';
      const filename = `${uuidv4()}${extension}`;

      let imageUrl;
      if (hasSupabaseStorage()) {
        imageUrl = await uploadImageBuffer(file.buffer, filename, file.mimetype);
      } else {
        if (process.env.VERCEL) {
          return res.status(500).json({ error: 'Image storage is not configured. Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.' });
        }
        ensureUploadDir();
        fs.writeFileSync(path.join(uploadDir, filename), file.buffer);
        imageUrl = `/uploads/${filename}`;
      }

      const image = await prisma.vehicleImage.create({
        data: {
          vehicleId: id,
          url: imageUrl,
          isPrimary: existingCount === 0 && i === 0,
        },
      });
      images.push(image);
    }

    return res.status(201).json(images);
  } catch (error) {
    console.error('Upload images error:', error);
    return res.status(500).json({ error: 'Failed to upload images' });
  }
};

export const deleteVehicleImage = async (req, res) => {
  try {
    const { imageId } = req.params;

    const image = await prisma.vehicleImage.findUnique({
      where: { id: imageId },
      include: { vehicle: true },
    });

    if (!image) {
      return res.status(404).json({ error: 'Image not found' });
    }

    // Check access
    if (req.session.role !== 'admin' && req.session.dealerId !== image.vehicle.dealerId) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    // Remove the stored file first. A storage failure should not leave a
    // dangling database row pointing at a file that no longer exists.
    if (image.url.startsWith('http') && supabase) {
      await deleteImageByUrl(image.url);
    } else if (image.url.startsWith('/uploads/')) {
      const localPath = path.join(uploadDir, path.basename(image.url));
      if (fs.existsSync(localPath)) fs.unlinkSync(localPath);
    }

    await prisma.vehicleImage.delete({ where: { id: imageId } });

    return res.json({ message: 'Image deleted successfully' });
  } catch (error) {
    console.error('Delete image error:', error);
    return res.status(500).json({ error: 'Failed to delete image' });
  }
};
