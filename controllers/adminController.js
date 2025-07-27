// controllers/adminController.js
import crypto from 'crypto';
import Admin from '../models/Admin.js';
import Newsletter from '../models/Newsletter.js';
import sendEmail from '../utils/sendEmail.js';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
const generateToken = (id) => {
    return jwt.sign({ id }, process.env.JWT_SECRET, {
        expiresIn: '7d',
    });
};

export const login = async (req, res) => {
    const { username, password } = req.body;

    if (!username || !password)
        return res.status(400).json({ error: 'Kullanıcı adı ve şifre gerekli' });

    try {
        const admin = await Admin.findOne({ username: username.toLowerCase() });

        if (!admin)
            return res.status(401).json({ error: 'Geçersiz kullanıcı adı' });
        const isMatch = await bcrypt.compare(password, admin.password);
        if (!isMatch)
            return res.status(401).json({ error: 'Geçersiz kullanıcı adı veya şifre2' });

        const token = generateToken(admin._id);
        res.status(200).json({
            _id: admin._id,
            username: admin.username,
            email: admin.email,
            token,
        });
    } catch (err) {
        console.error('Login error:', err);
        res.status(500).json({ error: 'Sunucu hatası' });
    }
};

export const getProfile = (req, res) => {
    if (!req.admin) return res.status(404).json({ error: 'Admin bulunamadı' });
    res.status(200).json(req.admin); // Zaten select('-password') ile geldi
};

export const changePassword = async (req, res) => {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword)
        return res.status(400).json({ error: 'Tüm alanlar zorunludur' });

    try {
        const admin = await Admin.findById(req.admin._id);
        if (!admin) return res.status(404).json({ error: 'Admin bulunamadı' });

        const isMatch = await bcrypt.compare(currentPassword, admin.password);
        if (!isMatch)
            return res.status(401).json({ error: 'Mevcut şifre hatalı' });

        const salt = await bcrypt.genSalt(10);
        admin.password = await bcrypt.hash(newPassword, salt);
        await admin.save();

        res.status(200).json({ message: 'Şifre başarıyla güncellendi' });
    } catch (err) {
        res.status(500).json({ error: 'Sunucu hatası' });
    }
};

const resetTokens = new Map(); // { email: { code, expiresAt } }

export const forgotPassword = async (req, res) => {
    const { email } = req.body;

    if (!email) return res.status(400).json({ error: 'Email gerekli' });

    try {
        const admin = await Admin.findOne({ email });
        if (!admin) return res.status(404).json({ error: 'Email bulunamadı' });

        const code = crypto.randomInt(100000, 999999).toString();
        const expiresAt = Date.now() + 15 * 60 * 1000; // 15 dk geçerli

        resetTokens.set(email, { code, expiresAt });
        await sendEmail({
            to: email,
            subject: 'Şifre Sıfırlama Kodu',
            html: `Kodunuz: ${code}`
        });

        res.json({ message: 'Şifre sıfırlama kodu gönderildi' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Sunucu hatası' });
    }
    console.log(resetTokens);
};
export const verifyResetCode = (req, res) => {
    const { email, code } = req.body;
    const tokenData = resetTokens.get(email);

    if (!tokenData) return res.status(400).json({ error: 'Kod bulunamadı veya süresi doldu' });

    const { code: validCode, expiresAt } = tokenData;

    if (Date.now() > expiresAt)
        return res.status(400).json({ error: 'Kodun süresi dolmuş' });

    if (code !== validCode)
        return res.status(400).json({ error: 'Kod geçersiz' });

    res.json({ message: 'Kod doğrulandı' });
};

export const resetPassword = async (req, res) => {
    const { email, code, newPassword } = req.body;

    const tokenData = resetTokens.get(email);
    if (!tokenData) return res.status(400).json({ error: 'Kod bulunamadı veya süresi doldu' });

    if (tokenData.code !== code || Date.now() > tokenData.expiresAt) {
        return res.status(400).json({ error: 'Geçersiz veya süresi geçmiş kod' });
    }

    try {
        const admin = await Admin.findOne({ email });
        if (!admin) return res.status(404).json({ error: 'Admin bulunamadı' });

        admin.password = await bcrypt.hash(newPassword, 10);
        await admin.save();
        resetTokens.delete(email);

        res.json({ message: 'Şifre başarıyla sıfırlandı' });
    } catch (err) {
        res.status(500).json({ error: 'Sunucu hatası' });
    }
};

export const sendNewsletterToAll = async (req, res) => {
    const { subject, html } = req.body;
    if (!subject || !html) return res.status(400).json({ error: 'Subject ve içerik gerekli' });

    try {
        const allSubscribers = await Newsletter.find({}, 'email');
        const emails = allSubscribers.map(sub => sub.email);

        // Basit toplu gönderim (dikkat spam olmasın, gerçek projede queue/batch kullan)
        for (const email of emails) {
            await sendEmail({ to: email, subject: subject, html: html });
        }

        res.json({ message: `${emails.length} email gönderildi.` });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Sunucu hatası' });
    }
};