const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
  name: { type: String, required: true },
  category: { type: String, required: true },
  price: { type: Number, required: true },
  originalPrice: { type: Number, required: true },
  rating: { type: Number, default: 0 },
  reviews: { type: Number, default: 0 },
  stock: { type: Number, required: true },
  image: { type: String, default: '' },
  badge: { type: String, default: '' },
  description: { type: String, default: '' },
  specs: { type: [String], default: [] },
}, { timestamps: true });

module.exports = mongoose.model('Product', productSchema);
