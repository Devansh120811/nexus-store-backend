const mongoose = require('mongoose');

const orderSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  date: { type: String, required: true },
  status: { type: String, default: 'Processing' },
  items: [{
    productId: String,
    name: String,
    qty: Number,
    price: Number,
  }],
  total: { type: Number, required: true },
  tracking: { type: String, default: null },
  estimatedDelivery: { type: String, default: null },
  deliveredOn: { type: String, default: null },
  cancelledOn: { type: String, default: null },
  refundStatus: { type: String, default: null },
  address: { type: String, default: '' },
}, { timestamps: true });

module.exports = mongoose.model('Order', orderSchema);
