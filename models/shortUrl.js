const mongoose = require('mongoose');

const shortUrlSchema = new mongoose.Schema({
    full: {
        type: String,
        required: true
    },
    short: {
        type: String,
        required: true,
        unique: true
    },
    clicks: {
        type: Number,
        required: true,
        default: 0
    },
    expirationDate: {
        type: Date,
        required: false
    },
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    qrCode: {
        type: String,
        required: false
    },
    theme: {
        type: String,
        required: true,
        default: 'default'
    }
});

module.exports = mongoose.model('ShortUrl', shortUrlSchema);