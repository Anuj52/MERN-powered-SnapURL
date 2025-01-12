const express = require('express');
const User = require('../models/User');
const router = express.Router();

// Profile page
router.get('/profile', (req, res) => {
    res.render('profile', { user: req.user, messages: req.flash('error') });
});

// Update custom domain
router.post('/profile', async (req, res) => {
    const { customDomain } = req.body;
    try {
        req.user.customDomain = customDomain;
        await req.user.save();
        res.redirect('/profile');
    } catch (err) {
        console.error(err);
        req.flash('error', 'An error occurred while updating the custom domain');
        res.redirect('/profile');
    }
});

module.exports = router;