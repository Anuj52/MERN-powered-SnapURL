const express = require('express');
const shortid = require('shortid');
const ShortUrl = require('../models/ShortUrl');
const multer = require('multer');
const csv = require('csv-parser');
const fs = require('fs');
const rateLimit = require('express-rate-limit'); // Import express-rate-limit
const validator = require('validator'); // Import validator library
const QRCode = require('qrcode'); // Import QRCode library
const router = express.Router();

const upload = multer({ dest: 'uploads/' });

// Rate Limiter Configuration for URL creation
const createUrlLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 10, // Limit each IP to 10 requests per windowMs
    message: 'Too many URLs created from this IP, please try again after 15 minutes'
});

// Authentication middleware
function isAuthenticated(req, res, next) {
    if (req.isAuthenticated()) {
        return next();
    }
    res.redirect('/login');
}

// Create short URL
router.post('/shortUrls', isAuthenticated, createUrlLimiter, async (req, res) => {
    const customSlug = req.body.customSlug || null;
    const fullUrl = req.body.fullUrl;
    const expirationDays = req.body.expirationDays || 10; // Default to 10 days if not specified
    const theme = req.body.theme || 'default'; // Default theme

    // Validate the full URL
    if (!validator.isURL(fullUrl)) {
        return res.status(400).send('Invalid URL format');
    }

    // Check if custom slug already exists
    if (customSlug) {
        const existingUrl = await ShortUrl.findOne({ short: customSlug });
        if (existingUrl) {
            return res.send('This custom slug is already taken!');
        }
    }

    const expirationDate = new Date();
    expirationDate.setDate(expirationDate.getDate() + parseInt(expirationDays)); // Set expiration date

    const shortUrl = new ShortUrl({ 
        full: fullUrl, 
        short: customSlug || shortid.generate(),
        user: req.user._id, // Save the user reference
        expirationDate: expirationDate, // Set the expiration date
        theme: theme // Save the selected theme
    });
    await shortUrl.save();

    // Generate QR code
    const qrCodeUrl = await QRCode.toDataURL(`${req.protocol}://${req.headers.host}/${shortUrl.short}`);
    shortUrl.qrCode = qrCodeUrl;
    await shortUrl.save();

    res.redirect('/');
});

// Bulk URL Shortening
router.post('/bulkShorten', isAuthenticated, upload.single('csvFile'), async (req, res) => {
    const filePath = req.file.path;
    const expirationDays = req.body.expirationDays || 10; // Default to 10 days if not specified
    const shortUrls = [];

    fs.createReadStream(filePath)
        .pipe(csv())
        .on('data', async (row) => {
            const fullUrl = row['fullUrl'];
            const customSlug = row['customSlug'] || null;
            const theme = row['theme'] || 'default'; // Default theme

            // Validate the full URL
            if (!validator.isURL(fullUrl)) {
                return res.status(400).send(`Invalid URL format: ${fullUrl}`);
            }

            // Check if custom slug already exists
            if (customSlug) {
                const existingUrl = await ShortUrl.findOne({ short: customSlug });
                if (existingUrl) {
                    return res.send(`Custom slug ${customSlug} is already taken!`);
                }
            }

            const expirationDate = new Date();
            expirationDate.setDate(expirationDate.getDate() + parseInt(expirationDays)); // Set expiration date

            const shortUrl = new ShortUrl({ 
                full: fullUrl, 
                short: customSlug || shortid.generate(),
                user: req.user._id, // Save the user reference
                expirationDate: expirationDate, // Set the expiration date
                theme: theme // Save the selected theme
            });
            await shortUrl.save();

            // Generate QR code
            const qrCodeUrl = await QRCode.toDataURL(`${req.protocol}://${req.headers.host}/${shortUrl.short}`);
            shortUrl.qrCode = qrCodeUrl;
            await shortUrl.save();

            shortUrls.push(shortUrl);
        })
        .on('end', () => {
            fs.unlinkSync(filePath); // Remove the uploaded file
            res.redirect('/');
        });
});

// Search URLs
router.get('/search', isAuthenticated, async (req, res) => {
    const searchTerm = req.query.searchTerm;
    const shortUrls = await ShortUrl.find({
        user: req.user._id,
        $or: [
            { full: { $regex: searchTerm, $options: 'i' } },
            { short: { $regex: searchTerm, $options: 'i' } }
        ]
    });
    res.render('index', { user: req.user, shortUrls: shortUrls });
});

// Delete short URL
router.post('/shortUrls/:shortUrl/delete', isAuthenticated, async (req, res) => {
    await ShortUrl.findOneAndDelete({ short: req.params.shortUrl, user: req.user._id });
    res.redirect('/');
});

// Redirect based on shortened URL and increment clicks
router.get('/:shortUrl', async (req, res) => {
    const shortUrl = await ShortUrl.findOne({ short: req.params.shortUrl });
    if (!shortUrl) return res.sendStatus(404);

    // Check if the URL has expired
    if (new Date() > shortUrl.expirationDate) {
        return res.sendStatus(404); // URL has expired
    }

    shortUrl.clicks++;
    await shortUrl.save();

    res.render('shortUrlPage', { shortUrl: shortUrl });
});

module.exports = router;