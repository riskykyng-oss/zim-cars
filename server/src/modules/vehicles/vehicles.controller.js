import prisma from '../../config/database.js';

const VEHICLE_STATUSES = ['available', 'unpublished', 'sold'];
const MAX_YEAR = new Date().getFullYear() + 1;

const optionalInt = (value, { min = 0, max = Number.MAX_SAFE_INTEGER } = {}) => {
  if (value === undefined || value === null || value === '') return null;
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < min || parsed > max) return NaN;
  return parsed;
};

const requiredText = (value) => (typeof value === 'string' ? value.trim() : '');

export const getAllVehicles = async (req, res) => {
  try {
    const { dealerId } = req.query;
    const where = {};

    // If user is dealer, only show their dealer's vehicles
    if (req.session.role !== 'admin') {
      if (!req.session.dealerId) {
        return res.status(403).json({ error: 'No dealer assigned' });
      }
      where.dealerId = req.session.dealerId;
    } else if (dealerId) {
      where.dealerId = dealerId;
    }

    const vehicles = await prisma.vehicle.findMany({
      where,
      include: {
        dealer: true,
        images: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    return res.json(vehicles);
  } catch (error) {
    console.error('Get vehicles error:', error);
    return res.status(500).json({ error: 'Failed to fetch vehicles' });
  }
};

export const getPublicVehicles = async (req, res) => {
  try {
    const { make, minPrice, maxPrice } = req.query;
    const where = {
      status: 'available',
      images: { some: {} },
    };

    if (make) {
      where.make = { contains: make, mode: 'insensitive' };
    }
    if (minPrice || maxPrice) {
      where.price = {};
      if (minPrice) where.price.gte = parseFloat(minPrice);
      if (maxPrice) where.price.lte = parseFloat(maxPrice);
    }

    const vehicles = await prisma.vehicle.findMany({
      where,
      include: {
        dealer: true,
        images: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    return res.json(vehicles);
  } catch (error) {
    console.error('Get public vehicles error:', error);
    return res.status(500).json({ error: 'Failed to fetch vehicles' });
  }
};

export const getVehicleById = async (req, res) => {
  try {
    const { id } = req.params;

    const vehicle = await prisma.vehicle.findUnique({
      where: { id },
      include: {
        dealer: true,
        images: true,
      },
    });

    if (!vehicle) {
      return res.status(404).json({ error: 'Vehicle not found' });
    }

    // Check access - public can view available, dealers can view their own
    if (vehicle.status !== 'available' && req.session.role !== 'admin') {
      if (req.session.dealerId !== vehicle.dealerId) {
        return res.status(403).json({ error: 'Forbidden' });
      }
    }

    return res.json(vehicle);
  } catch (error) {
    console.error('Get vehicle error:', error);
    return res.status(500).json({ error: 'Failed to fetch vehicle' });
  }
};

export const createVehicle = async (req, res) => {
  try {
    const { make, model, price, year, description, dealerId } = req.body;

    const cleanMake = requiredText(make);
    const cleanModel = requiredText(model);
    const parsedPrice = Number(price);
    const parsedYear = optionalInt(year, { min: 1900, max: MAX_YEAR });

    if (!cleanMake || !cleanModel) {
      return res.status(400).json({ error: 'Make and model are required.' });
    }
    if (!Number.isFinite(parsedPrice) || parsedPrice <= 0) {
      return res.status(400).json({ error: 'Enter a valid price greater than zero.' });
    }
    if (Number.isNaN(parsedYear)) {
      return res.status(400).json({ error: `Year must be between 1900 and ${MAX_YEAR}.` });
    }

    let targetDealerId = dealerId;
    // Dealers can only create for their own dealership
    if (req.session.role !== 'admin') {
      targetDealerId = req.session.dealerId;
    }

    if (!targetDealerId) {
      return res.status(400).json({ error: 'Dealer ID required' });
    }

    const dealer = await prisma.dealer.findUnique({ where: { id: targetDealerId } });
    if (!dealer) {
      return res.status(400).json({ error: 'Dealer not found' });
    }

    const vehicle = await prisma.vehicle.create({
      data: {
        dealerId: targetDealerId,
        make: cleanMake,
        model: cleanModel,
        year: parsedYear,
        price: parsedPrice,
        description: typeof description === 'string' ? description.trim() : null,
        status: 'available',
      },
      include: {
        dealer: true,
      },
    });

    // Create audit log
    await prisma.auditLog.create({
      data: {
        actorId: req.session.userId,
        dealerId: targetDealerId,
        entityType: 'vehicle',
        entityId: vehicle.id,
        action: 'create',
        details: { make: cleanMake, model: cleanModel, year: parsedYear, price: parsedPrice },
      },
    });

    return res.status(201).json(vehicle);
  } catch (error) {
    console.error('Create vehicle error:', error);
    return res.status(500).json({ error: 'Failed to create vehicle' });
  }
};

export const updateVehicle = async (req, res) => {
  try {
    const { id } = req.params;

    const vehicle = await prisma.vehicle.findUnique({
      where: { id },
      include: { images: true },
    });
    if (!vehicle) {
      return res.status(404).json({ error: 'Vehicle not found' });
    }

    // Check access
    if (req.session.role !== 'admin' && req.session.dealerId !== vehicle.dealerId) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    // Whitelist fields so a dealer cannot move a vehicle to another dealership
    // or write arbitrary columns.
    const allowedFields = [
      'make', 'model', 'year', 'price', 'description', 'status',
      'mileage', 'transmission', 'fuelType', 'dutyPaid', 'location',
      'videoUrl', 'slug', 'currency',
    ];
    const updates = {};
    for (const field of allowedFields) {
      if (Object.prototype.hasOwnProperty.call(req.body, field)) {
        updates[field] = req.body[field];
      }
    }

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ error: 'No valid fields to update.' });
    }

    if (Object.prototype.hasOwnProperty.call(updates, 'make')) {
      updates.make = requiredText(updates.make);
      if (!updates.make) return res.status(400).json({ error: 'Make cannot be empty.' });
    }
    if (Object.prototype.hasOwnProperty.call(updates, 'model')) {
      updates.model = requiredText(updates.model);
      if (!updates.model) return res.status(400).json({ error: 'Model cannot be empty.' });
    }
    if (Object.prototype.hasOwnProperty.call(updates, 'price')) {
      const parsedPrice = Number(updates.price);
      if (!Number.isFinite(parsedPrice) || parsedPrice <= 0) {
        return res.status(400).json({ error: 'Enter a valid price greater than zero.' });
      }
      updates.price = parsedPrice;
    }
    if (Object.prototype.hasOwnProperty.call(updates, 'year')) {
      const parsedYear = optionalInt(updates.year, { min: 1900, max: MAX_YEAR });
      if (Number.isNaN(parsedYear)) {
        return res.status(400).json({ error: `Year must be between 1900 and ${MAX_YEAR}.` });
      }
      updates.year = parsedYear;
    }
    if (Object.prototype.hasOwnProperty.call(updates, 'mileage')) {
      const parsedMileage = optionalInt(updates.mileage, { min: 0 });
      if (Number.isNaN(parsedMileage)) {
        return res.status(400).json({ error: 'Mileage must be a positive whole number.' });
      }
      updates.mileage = parsedMileage;
    }
    if (Object.prototype.hasOwnProperty.call(updates, 'status')) {
      if (!VEHICLE_STATUSES.includes(updates.status)) {
        return res.status(400).json({ error: 'Invalid vehicle status.' });
      }
    }
    if (Object.prototype.hasOwnProperty.call(updates, 'currency')) {
      const currency = requiredText(updates.currency).toUpperCase();
      if (!/^[A-Z]{3}$/.test(currency)) {
        return res.status(400).json({ error: 'Currency must be a three-letter code.' });
      }
      updates.currency = currency;
    }
    if (Object.prototype.hasOwnProperty.call(updates, 'dutyPaid')) {
      updates.dutyPaid = Boolean(updates.dutyPaid);
    }
    for (const field of ['description', 'transmission', 'fuelType', 'location', 'videoUrl', 'slug']) {
      if (Object.prototype.hasOwnProperty.call(updates, field)) {
        updates[field] = typeof updates[field] === 'string' && updates[field].trim()
          ? updates[field].trim()
          : null;
      }
    }

    // Block publishing without photos
    if (updates.status === 'available' && vehicle.images.length === 0) {
      return res.status(400).json({
        error: 'You must upload at least one photo before publishing this vehicle.',
      });
    }

    const updatedVehicle = await prisma.vehicle.update({
      where: { id },
      data: updates,
      include: { dealer: true, images: true },
    });

    // Create audit log
    await prisma.auditLog.create({
      data: {
        actorId: req.session.userId,
        dealerId: vehicle.dealerId,
        entityType: 'vehicle',
        entityId: vehicle.id,
        action: 'update',
        details: updates,
      },
    });

    return res.json(updatedVehicle);
  } catch (error) {
    console.error('Update vehicle error:', error);
    return res.status(500).json({ error: 'Failed to update vehicle' });
  }
};
