const express = require('express');
const session = require('express-session');
const flash = require('connect-flash');
const passport = require('passport');

module.exports = (app) => {
    app.use(express.urlencoded({ extended: true }));
    app.use(session({ secret: 'your_secret_key', resave: false, saveUninitialized: true }));
    app.use(flash());
    app.use(passport.initialize());
    app.use(passport.session());
};