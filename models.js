const mongoose = require('mongoose');

const PokemonSchema = new mongoose.Schema({
  name:      { type: String, default: 'Unknown' },
  type:      { type: String, default: 'Normal' },
  nickname:  { type: String, default: '' },
  level:     { type: Number, default: 1 },
  url:       { type: String, default: null },
  createdAt: { type: Date, default: Date.now }
});

const GallerySchema = new mongoose.Schema({
  url:       { type: String, required: true },
  caption:   { type: String, default: '' },
  createdAt: { type: Date, default: Date.now }
});

const PostSchema = new mongoose.Schema({
  title:     { type: String, required: true },
  body:      { type: String, required: true },
  mediaUrl:  { type: String, default: null },
  mediaType: { type: String, default: null },
  createdAt: { type: Date, default: Date.now }
});

const UserSchema = new mongoose.Schema({
  username:     { type: String, required: true, unique: true, lowercase: true },
  displayName:  { type: String, required: true },
  avatar:       { type: String, default: '🐱' },
  color:        { type: String, default: '#3D7DCA' },
  role:         { type: String, default: 'friend' },
  school:       { type: String, default: '' },
  age:          { type: Number, default: null },
  failedLogins: { type: Number, default: 0 },
  locked:       { type: Boolean, default: false },
  passwordHash: { type: String, required: true },
  lastLogin:    { type: Date, default: null },
  lastIP:       { type: String, default: null },
  createdAt:    { type: Date, default: Date.now }
});

const PendingSchema = new mongoose.Schema({
  displayName:   { type: String, required: true },
  username:      { type: String, required: true, lowercase: true },
  dob:           String,
  age:           Number,
  school:        { type: String, default: '' },
  parentName:    { type: String, default: '' },
  parentEmail:   { type: String, default: '' },
  parentConsent: { type: Boolean, default: null },
  selfConsent:   { type: Boolean, default: null },
  status:        { type: String, default: 'pending' },
  flagged:       { type: Boolean, default: false },
  flagReason:    { type: String, default: '' },
  ip:            String,
  createdAt:     { type: Date, default: Date.now },
  approvedAt:    { type: Date, default: null },
  deniedAt:      { type: Date, default: null }
});

const ActivitySchema = new mongoose.Schema({
  type:        String,
  userId:      { type: Number, default: null },
  username:    { type: String, default: 'anonymous' },
  displayName: { type: String, default: '' },
  ip:          String,
  detail:      { type: String, default: '' },
  severity:    { type: String, default: 'info' },
  timestamp:   { type: Date, default: Date.now }
});

const ReportSchema = new mongoose.Schema({
  reporterName: { type: String, default: 'Anonymous' },
  description:  { type: String, required: true },
  aboutUser:    { type: String, default: '' },
  ip:           String,
  status:       { type: String, default: 'open' },
  createdAt:    { type: Date, default: Date.now },
  closedAt:     { type: Date, default: null }
});

module.exports = {
  Pokemon:       mongoose.model('Pokemon',  PokemonSchema),
  GalleryItem:   mongoose.model('Gallery',  GallerySchema),
  Post:          mongoose.model('Post',     PostSchema),
  User:          mongoose.model('User',     UserSchema),
  PendingRequest:mongoose.model('Pending',  PendingSchema),
  ActivityLog:   mongoose.model('Activity', ActivitySchema),
  Report:        mongoose.model('Report',   ReportSchema),
};
