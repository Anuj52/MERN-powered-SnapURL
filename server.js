const express = require('express');
const mongoose = require('mongoose');
const passport = require('passport');
const session = require('express-session');
const flash = require('connect-flash');
const initializePassport = require('./config/passport-config');
const authRoutes = require('./routes/authRoutes');
const urlRoutes = require('./routes/urlRoutes');
const profileRoutes = require('./routes/profileRoutes'); // Import profile routes
const setupMiddleware = require('./middleware/middleware');
const ShortUrl = require('./models/ShortUrl'); // Import the ShortUrl model
const User = require('./models/User'); // Import the User model
const rateLimit = require('express-rate-limit'); // Import express-rate-limit
const app = express();

// Connect to MongoDB
mongoose.connect('mongodb://localhost:27017/snapurl', {
    useNewUrlParser: true,
    useUnifiedTopology: true
});

// Initialize Passport
initializePassport(passport);

// Setup Middleware
setupMiddleware(app);

// Set view engine
app.set('view engine', 'ejs');

app.use(express.urlencoded({ extended: true }));
app.use(session({
    secret: 'secret',
    resave: false,
    saveUninitialized: false
}));
app.use(flash());

app.use(passport.initialize());
app.use(passport.session());

app.use((req, res, next) => {
    res.locals.errorMessage = req.flash('error');
    next();
});

// Rate Limiter Configuration
const createAccountLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 10, // Limit each IP to 10 requests per windowMs
    message: 'Too many accounts created from this IP, please try again after 15 minutes'
});

// Use Routes
app.use(authRoutes);
app.use(urlRoutes);
app.use(profileRoutes); // Use profile routes

// Authentication middleware
function isAuthenticated(req, res, next) {
    if (req.isAuthenticated()) {
        return next();
    }
    res.redirect('/login');
}

// Root route
app.get('/', isAuthenticated, async (req, res) => {
    const shortUrls = await ShortUrl.find({ user: req.user._id }); // Filter by user
    const now = new Date();
    const expiringUrls = shortUrls.filter(url => (url.expirationDate - now) / (1000 * 60 * 60 * 24) < 3);
    res.render('index', { user: req.user, shortUrls: shortUrls, expiringUrls: expiringUrls });
});

// Apply rate limiter to the short URL creation route
app.use('/shortUrls', isAuthenticated, createAccountLimiter);

// Start the server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});