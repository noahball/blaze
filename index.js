// Dependencies
var express = require('express');
var app = require('express')();
var http = require('http').createServer(app);
var io = require('socket.io')(http);
const fs = require("fs");
var admin = require('firebase-admin');
const Joi = require('@hapi/joi');

// Middleware
app.use(express.json());

// Firebase Authentication
var serviceAccount = require("./config/firebaseKey.json");

// Init Firebase
admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    databaseURL: "https://blaze-37ca6.firebaseio.com"
});
var db = admin.database();

// Use ejs to render pages
app.set('view engine', 'ejs');

// Serve static files from the static directory
app.use('/static', express.static('static'))

// Routing
app.get('/', (req, res) => {
    res.render('splash', {
        title: 'Blaze',
        text: 'The future of instant messaging.'
    });
});

app.get('/login', (req, res) => {
    res.render('login');
});

app.get('/api', (req, res) => {
    res.status(400).render('splash', {
        title: 'Blaze api', // Purposely lowercase due to the font
        text: 'Please define an API version.'
    });
});

app.get('/api/v1', (req, res) => {
    res.status(400).render('splash', {
        title: 'Blaze api v1', // Purposely lowercase due to the font
        text: 'Please define an endpoint.'
    });
});

app.post('/api/v1/users/create', (req, res) => {
    const { error } = validateUser(req.body);
    if(error) return res.status(400).send(error.details[0].message);

    admin.auth().createUser({
        email: req.body.email,
        emailVerified: false,
        password: req.body.password,
        username: req.body.username,
        disabled: false
      })
      .then(function(userRecord) {
        res.send("Account registered.")
      })
      .catch(function(error) {
        res.status(400).send(error);
      });
});

// Functions
function validateUser(validateContent) {
    const schema = Joi.object({
        email: Joi.string().email().required(),
        username: Joi.string().required(),
        password: Joi.string().min(8).required()
    });

    return schema.validate(validateContent);
}

// Start Express
const port = process.env.PORT || 3000;
app.listen(port);
console.log(`Blaze is running on port ${port}.`);