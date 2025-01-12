const express = require('express');
const User = require('../models/User');
const passport = require('passport');
const router = express.Router();

// Render signup page
router.get('/signup', (req, res) => {
    res.render('signup', { user: req.user, errorMessage: null });
});

// Handle signup form submission
router.post('/signup', async (req, res) => {
    const { firstName, lastName, email, username, password, confirmPassword } = req.body;
    if (password !== confirmPassword) {
        return res.render('signup', { user: req.user, errorMessage: 'Passwords do not match' });
    }
    const user = new User({ firstName, lastName, email, username });
    try {
        await User.register(user, password);
        res.redirect('/login');
    } catch (error) {
        let errorMessage = 'An error occurred during registration';
        if (error.name === 'UserExistsError') {
            errorMessage = 'A user with the given username is already registered';
        } else if (error.errors) {
            errorMessage = Object.values(error.errors).map(err => err.message).join(', ');
        }
        return res.render('signup', { user: req.user, errorMessage });
    }
});

// Render login page
router.get('/login', (req, res) => {
    res.render('login', { user: req.user, errorMessage: req.flash('error') });
});

// Handle login form submission
router.post('/login', passport.authenticate('local', {
    successRedirect: '/',
    failureRedirect: '/login',
    failureFlash: true
}));

// Handle logout
router.get('/logout', (req, res, next) => {
    req.logout((err) => {
        if (err) { return next(err); }
        req.session.destroy((err) => {
            if (err) { return next(err); }
            res.redirect('/');
        });
    });
});

module.exports = router;