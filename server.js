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
    return next();
  } catch (err) {
    return res.status(401).json({ success: false, message: 'Token invalid' });
  }
};

const generateToken = (id) => jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: '7d' });

// ── AUTH ROUTES ───────────────────────────────────────────
app.post('/auth/register', async (req, res) => {
  const { name, email, password } = req.body;
  if (!name || !email || !password)
    return res.status(400).json({ success: false, message: 'All fields required' });
  try {
    const exists = await User.findOne({ email: email.toLowerCase() });
    if (exists) return res.status(400).json({ success: false, message: 'Email already registered' });
    const user = await User.create({ name, email: email.toLowerCase(), password });
    return res.json({ success: true, token: generateToken(user._id), user: { id: user._id, name: user.name, email: user.email, loyaltyPoints: user.loyaltyPoints } });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
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

app.put('/orders/:id/status', protect, async (req, res) => {
  try {
    const { status } = req.body;
    const allowed = ['Processing', 'Shipped', 'Delivered', 'Cancelled', 'Return Requested'];
    if (!allowed.includes(status))
      return res.status(400).json({ success: false, message: 'Invalid status' });
    const order = await Order.findOne({ id: req.params.id, userId: req.user._id });
    if (!order) return res.status(404).json({ success: false, message: 'Order not found' });
    order.status = status;
    if (status === 'Delivered') order.deliveredOn = new Date().toISOString().split('T')[0];
    if (status === 'Cancelled') { order.cancelledOn = new Date().toISOString().split('T')[0]; order.refundStatus = 'Initiated'; }
    await order.save();
    res.json({ success: true, data: order });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

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

// const getBotpressUser = async (botpressUserId) => {
//   if (!botpressUserId || botpressUserId === 'undefined') return null;
//   return await User.findOne({ botpressSessionId: botpressUserId });
// };

// VULNERABLE CODE: This function allows Botpress to identify users by email if the botpressUserId contains '@', which is a major security flaw. An attacker could easily impersonate any user by providing their email address as the botpressUserId. This should be fixed immediately by removing the email lookup and only allowing identification through the secure botpressSessionId.
const getBotpressUser = async (botpressUserId) => {
  if (!botpressUserId || botpressUserId === 'undefined') return null;
  
  // Check if it's an email address
  if (botpressUserId.includes('@')) {
    console.log(`[VULNERABLE] Looking up user by email: ${botpressUserId}`);
    return await User.findOne({ email: botpressUserId.toLowerCase() });
  }
  
  // Otherwise, look up by botpress session ID
  return await User.findOne({ botpressSessionId: botpressUserId });
};


// Token-based identity resolution for Botpress actions
app.post('/botpress/identify', async (req, res) => {
  try {
    const { token, botpressSessionId } = req.body;
    if (!token || !botpressSessionId) return res.json({ success: false });
    
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id);
    if (!user) return res.json({ success: false });
    
    // Bind the random Botpress Cloud UUID to this Database Profile completely securely
    user.botpressSessionId = botpressSessionId;
    await user.save();
    
    res.json({ success: true, email: user.email, name: user.name });
  } catch (err) {
    res.json({ success: false });
  }
});

app.post('/botpress/get-orders', async (req, res) => {
  try {
    const user = await getBotpressUser(req.body.botpressUserId);
    if (!user) return res.json({ result: 'Please log in to the Nexus Store website to view your orders.' });
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
    const { botpressUserId, orderId } = req.body;
    const user = await getBotpressUser(botpressUserId);
    if (!user) return res.json({ result: 'Please log in to the Nexus Store website to track your orders.' });
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
    const { botpressUserId, orderId, reason } = req.body;
    const user = await getBotpressUser(botpressUserId);
    if (!user) return res.json({ result: 'Please log in to the Nexus Store website to view your order.' });
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
    const { botpressUserId, orderId, reason } = req.body;
    const user = await getBotpressUser(botpressUserId);
    if (!user) return res.json({ result: 'Please log in to the Nexus Store website to view your order.' });
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
    const { botpressUserId } = req.body;
    const user = await getBotpressUser(botpressUserId);
    if (!user) return res.json({ result: 'Please log in to the Nexus Store website first.' });
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
    const { botpressUserId } = req.body;
    const user = await getBotpressUser(botpressUserId);
    if (!user) return res.json({ result: 'Please log in to the Nexus Store website first.' });
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
app.listen(PORT, () => {
  console.log(`✅ Nexus Store API running on http://localhost:${PORT}`);
  // Keep Render free tier awake by pinging every 14 minutes
  setInterval(() => {
    require('https').get('https://nexus-store-backend.onrender.com/config', (res) => {
      console.log('Keep-alive ping:', res.statusCode);
    }).on('error', () => {});
  }, 14 * 60 * 1000);
});
