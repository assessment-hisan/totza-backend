import Vendor from '../../models/Vendor.js';

export const addVendor = async (req, res) => {
  try {
    const { name, description } = req.body;
    const newVendor = await Vendor.create({
      name,
      description,
      addedBy: req.user.id,
      collaborators: [req.user.id]
    });
    res.status(201).json(newVendor);
  } catch (err) {
    res.status(500).json({ error: 'Failed to add vendor' });
  }
};

export const getVendors = async (req, res) => {
  try {
    const vendors = await Vendor.find();
    res.json(vendors);
  } catch {
    res.status(500).json({ error: 'Failed to fetch vendors' });
  }
};

export const updateVendor = async (req, res) => {
  try {
    const vendor = await Vendor.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json(vendor);
  } catch {
    res.status(500).json({ error: 'Update failed' });
  }
};

export const deleteVendor = async (req, res) => {
  try {
    await Vendor.findByIdAndDelete(req.params.id);
    res.json({ message: 'Vendor deleted' });
  } catch {
    res.status(500).json({ error: 'Delete failed' });
  }
};
