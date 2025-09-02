const express = require('express');
const Vendor = require('../models/Vendor');
const { auth, requireRole } = require('../middleware/auth');

const router = express.Router();

// Register as a vendor
router.post('/register', auth, async (req, res) => {
  try {
    const {
      businessName,
      businessType,
      address,
      phone,
      website,
      description,
      commissionRate
    } = req.body;

    // Check if user is already a vendor
    const existingVendor = await Vendor.findOne({ user: req.user._id });
    if (existingVendor) {
      return res.status(400).json({ message: 'User is already registered as a vendor' });
    }

    // Create new vendor profile
    const vendor = new Vendor({
      user: req.user._id,
      businessName,
      businessType,
      address,
      phone,
      website,
      description,
      commissionRate: commissionRate || 0.03
    });

    await vendor.save();

    // Update user type to vendor
    await require('../models/User').findByIdAndUpdate(req.user._id, {
      userType: 'vendor'
    });

    res.status(201).json({
      message: 'Vendor registration successful',
      vendor
    });
  } catch (error) {
    console.error('Vendor registration error:', error);
    res.status(500).json({ message: 'Error registering vendor' });
  }
});

// Get vendor profile
router.get('/profile', auth, requireRole(['vendor']), async (req, res) => {
  try {
    const vendor = await Vendor.findOne({ user: req.user._id })
      .populate('user', 'firstName lastName email');

    if (!vendor) {
      return res.status(404).json({ message: 'Vendor profile not found' });
    }

    res.json(vendor);
  } catch (error) {
    console.error('Get vendor profile error:', error);
    res.status(500).json({ message: 'Error fetching vendor profile' });
  }
});

// Update vendor profile
router.put('/profile', auth, requireRole(['vendor']), async (req, res) => {
  try {
    const {
      businessName,
      businessType,
      address,
      phone,
      website,
      description,
      commissionRate
    } = req.body;

    const vendor = await Vendor.findOneAndUpdate(
      { user: req.user._id },
      {
        businessName,
        businessType,
        address,
        phone,
        website,
        description,
        commissionRate
      },
      { new: true, runValidators: true }
    );

    res.json(vendor);
  } catch (error) {
    console.error('Update vendor profile error:', error);
    res.status(500).json({ message: 'Error updating vendor profile' });
  }
});

// Get all vendors (for admin purposes)
router.get('/', auth, requireRole(['admin']), async (req, res) => {
  try {
    const vendors = await Vendor.find()
      .populate('user', 'firstName lastName email')
      .sort({ createdAt: -1 });

    res.json(vendors);
  } catch (error) {
    console.error('Get vendors error:', error);
    res.status(500).json({ message: 'Error fetching vendors' });
  }
});

// Get vendor statistics
router.get('/stats', auth, requireRole(['vendor']), async (req, res) => {
  try {
    const vendor = await Vendor.findOne({ user: req.user._id });
    
    if (!vendor) {
      return res.status(404).json({ message: 'Vendor profile not found' });
    }

    // Get total leads and commission data
    const stats = {
      totalLeads: vendor.totalLeads,
      totalCommissionPaid: vendor.totalCommissionPaid,
      commissionRate: vendor.commissionRate
    };

    res.json(stats);
  } catch (error) {
    console.error('Get vendor stats error:', error);
    res.status(500).json({ message: 'Error fetching vendor statistics' });
  }
});

module.exports = router;
