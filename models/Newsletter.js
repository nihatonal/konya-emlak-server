// models/Newsletter.js
import mongoose from 'mongoose';

const newsletterSchema = new mongoose.Schema({
    email: { type: String, required: true, unique: true },
    createdAt: { type: Date, default: Date.now }
});

export default mongoose.model('Newsletter', newsletterSchema);
