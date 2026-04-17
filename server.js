require('dotenv').config();
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');

const User = require('./models/User');
const Product = require('./models/Product');
const Order = require('./models/Order');

const app = express();
app.use(cors());
app.use(express.json());

// ── DB CONNECTION ─────────────────────────────────────────
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('✅ MongoDB Atlas connected'))
  .catch(err => console.error('MongoDB error:', err));

// ── AUTH MIDDLEWARE ───────────────────────────────────────
const protect = async (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ success: false, message: 'Not authorized' });
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = await User.findById(decoded.id).select('-password');
    next();
  } catch {
    res.status(401).json({ success: false, message: 'Token invalid' });
  }
};

const generateToken = (id) => jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: '7d' });

// ── AUTH ROUTES ───────────────────────────────────────────
app.post('/auth/register', async (req, res) => {
  const { name, email, password } = req.body;
  if (!name || !email || !password)
    return res.status(400).json({ success: false, message: 'All fields required' });
  try {
    const exists = await User.findOne({ email });
    if (exists) return res.status(400).json({ success: false, message: 'Email already registered' });
    const user = await User.create({ name, email, password });
    res.json({ success: true, token: generateToken(user._id), user: { id: user._id, name: user.name, email: user.email, loyaltyPoints: user.loyaltyPoints } });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

app.post('/auth/login', async (req, res) => {
  const { email, password } = req.body;
  try {
    const user = await User.findOne({ email });
    if (!user || !(await user.matchPassword(password)))
      return res.status(401).json({ success: false, message: 'Invalid email or password' });
    res.json({ success: true, token: generateToken(user._id), user: { id: user._id, name: user.name, email: user.email, loyaltyPoints: user.loyaltyPoints, avatar: user.avatar } });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

app.get('/auth/me', protect, (req, res) => {
  res.json({ success: true, user: req.user });
});

// ── PRODUCTS ──────────────────────────────────────────────
app.get('/products', async (req, res) => {
  try {
    const { category, search } = req.query;
    const query = {};
    if (category && category !== 'All') query.category = category;
    if (search) query.$or = [
      { name: { $regex: search, $options: 'i' } },
      { category: { $regex: search, $options: 'i' } },
      { description: { $regex: search, $options: 'i' } },
    ];
    const data = await Product.find(query).sort({ createdAt: -1 });
    res.json({ success: true, data, total: data.length });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

app.get('/product/:id', async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) return res.status(404).json({ success: false, message: 'Product not found' });
    res.json({ success: true, data: product });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

app.post('/products', protect, async (req, res) => {
  try {
    const { name, category, price, originalPrice, stock, image, badge, description, specs } = req.body;
    if (!name || !category || !price || !originalPrice || !stock)
      return res.status(400).json({ success: false, message: 'Name, category, price, original price and stock are required' });
    const product = await Product.create({
      name, category, price, originalPrice, stock,
      image: image || '',
      badge: badge || '',
      description: description || '',
      specs: specs || [],
    });
    res.status(201).json({ success: true, data: product });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

app.put('/products/:id', protect, async (req, res) => {
  try {
    const product = await Product.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!product) return res.status(404).json({ success: false, message: 'Product not found' });
    res.json({ success: true, data: product });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

app.delete('/products/:id', protect, async (req, res) => {
  try {
    const product = await Product.findByIdAndDelete(req.params.id);
    if (!product) return res.status(404).json({ success: false, message: 'Product not found' });
    res.json({ success: true, message: 'Product deleted' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ── ORDERS ────────────────────────────────────────────────
app.get('/orders', protect, async (req, res) => {
  try {
    const orders = await Order.find({ userId: req.user._id }).sort({ createdAt: -1 });
    res.json({ success: true, data: orders, total: orders.length });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

app.post('/orders/checkout', protect, async (req, res) => {
  try {
    const { items, total, address } = req.body;
    if (!items || items.length === 0)
      return res.status(400).json({ success: false, message: 'Cart is empty' });
    const orderId = 'ORD-' + Date.now();
    const order = await Order.create({
      id: orderId,
      userId: req.user._id,
      date: new Date().toISOString().split('T')[0],
      status: 'Processing',
      items,
      total,
      address: address || 'Address not provided',
      estimatedDelivery: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    });
    // Add loyalty points (1 point per ₹10 spent)
    await User.findByIdAndUpdate(req.user._id, {
      $inc: { loyaltyPoints: Math.floor(total / 10) }
    });
    res.status(201).json({ success: true, data: order, message: 'Order placed successfully!' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ── USER ──────────────────────────────────────────────────
app.get('/user', protect, async (req, res) => {
  const user = await User.findById(req.user._id).select('-password');
  res.json({ success: true, data: user });
});

app.put('/user', protect, async (req, res) => {
  const { name, phone, address } = req.body;
  const user = await User.findByIdAndUpdate(req.user._id, { name, phone, address }, { new: true }).select('-password');
  res.json({ success: true, data: user });
});

// ── CONFIG ────────────────────────────────────────────────
app.get('/config', (req, res) => {
  res.json({ success: true, data: { appName: 'Nexus Store', currency: 'INR', currencySymbol: '₹' } });
});

// ── BOTPRESS ACTION APIs ─────────────────────────────────
// These are called by Botpress cloud — no JWT, uses email to identify user

const getBotpressUser = async (email) => {
  if (!email) return null;
  return await User.findOne({ email: email.toLowerCase() });
};

app.post('/botpress/get-orders', async (req, res) => {
  try {
    const user = await getBotpressUser(req.body.userEmail);
    if (!user) return res.json({ result: 'User not found. Please make sure you are logged in.' });
    const orders = await Order.find({ userId: user._id }).sort({ createdAt: -1 });
    if (!orders.length) return res.json({ result: 'You have no orders yet.' });
    const summary = orders.map(o =>
      `• ${o.id} | ${o.status} | ₹${o.total.toLocaleString('en-IN')} | ${o.date}`
    ).join('\n');
    res.json({ result: `You have ${orders.length} order(s):\n${summary}`, count: orders.length });
  } catch (err) {
    res.status(500).json({ result: 'Error fetching orders.' });
  }
});

app.post('/botpress/track-order', async (req, res) => {
  try {
    const { userEmail, orderId } = req.body;
    const user = await getBotpressUser(userEmail);
    if (!user) return res.json({ result: 'User not found.' });
    const order = await Order.findOne({ id: orderId, userId: user._id });
    if (!order) return res.json({ result: `Order ${orderId} not found on your account.` });
    res.json({
      result: `Order ${order.id} is ${order.status}. Tracking: ${order.tracking || 'Not assigned yet'}. Estimated delivery: ${order.estimatedDelivery || order.deliveredOn || 'N/A'}.`
    });
  } catch (err) {
    res.status(500).json({ result: 'Error tracking order.' });
  }
});

app.post('/botpress/cancel-order', async (req, res) => {
  try {
    const { userEmail, orderId, reason } = req.body;
    const user = await getBotpressUser(userEmail);
    if (!user) return res.json({ result: 'User not found.' });
    const order = await Order.findOne({ id: orderId, userId: user._id });
    if (!order) return res.json({ result: `Order ${orderId} not found on your account.` });
    if (['Delivered', 'Cancelled'].includes(order.status))
      return res.json({ result: `Order cannot be cancelled. Current status: ${order.status}.` });
    order.status = 'Cancelled';
    order.cancelledOn = new Date().toISOString().split('T')[0];
    order.refundStatus = 'Initiated';
    await order.save();
    res.json({ result: `Order ${orderId} has been cancelled. Refund will be processed in 5–7 business days.` });
  } catch (err) {
    res.status(500).json({ result: 'Error cancelling order.' });
  }
});

app.post('/botpress/return-order', async (req, res) => {
  try {
    const { userEmail, orderId, reason } = req.body;
    const user = await getBotpressUser(userEmail);
    if (!user) return res.json({ result: 'User not found.' });
    const order = await Order.findOne({ id: orderId, userId: user._id });
    if (!order) return res.json({ result: `Order ${orderId} not found on your account.` });
    if (order.status !== 'Delivered')
      return res.json({ result: `Returns are only for delivered orders. Current status: ${order.status}.` });
    order.status = 'Return Requested';
    order.refundStatus = 'Pending';
    await order.save();
    res.json({ result: `Return initiated for ${orderId}. Pickup will be scheduled within 48 hours.` });
  } catch (err) {
    res.status(500).json({ result: 'Error initiating return.' });
  }
});

app.post('/botpress/refund-status', async (req, res) => {
  try {
    const user = await getBotpressUser(req.body.userEmail);
    if (!user) return res.json({ result: 'User not found.' });
    const refunds = await Order.find({ userId: user._id, refundStatus: { $ne: null } });
    if (!refunds.length) return res.json({ result: 'No refunds found on your account.' });
    const summary = refunds.map(r =>
      `• ${r.id} | Refund: ${r.refundStatus} | ₹${r.total.toLocaleString('en-IN')}`
    ).join('\n');
    res.json({ result: summary });
  } catch (err) {
    res.status(500).json({ result: 'Error fetching refund status.' });
  }
});

app.post('/botpress/get-user', async (req, res) => {
  try {
    const user = await getBotpressUser(req.body.userEmail);
    if (!user) return res.json({ result: 'User not found.' });
    res.json({
      result: `Name: ${user.name}\nEmail: ${user.email}\nPhone: ${user.phone || 'Not set'}\nAddress: ${user.address?.line1 ? `${user.address.line1}, ${user.address.city} – ${user.address.pincode}` : 'Not set'}\nMember Since: ${user.memberSince}\nLoyalty Points: ${user.loyaltyPoints}`
    });
  } catch (err) {
    res.status(500).json({ result: 'Error fetching user details.' });
  }
});

app.post('/botpress/get-products', async (req, res) => {
  try {
    const { category } = req.body;
    const query = category && category !== 'All' ? { category } : {};
    const products = await Product.find(query).sort({ createdAt: -1 });
    if (!products.length) return res.json({ result: 'No products found.' });
    const summary = products.map(p =>
      `• ${p.name} | ₹${p.price.toLocaleString('en-IN')} | ${p.category} | Stock: ${p.stock}`
    ).join('\n');
    res.json({ result: summary, count: products.length });
  } catch (err) {
    res.status(500).json({ result: 'Error fetching products.' });
  }
});

// ── START ─────────────────────────────────────────────────
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`✅ Nexus Store API running on http://localhost:${PORT}`));
