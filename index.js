// Dependencies
var express = require('express');
var app = require('express')();
var http = require('http').createServer(app);
var io = require('socket.io')(http);
const fs = require("fs");
var admin = require('firebase-admin');
const Joi = require('@hapi/joi');
var bodyParser = require('body-parser');

// Middleware
app.use(express.json());
app.use(bodyParser.urlencoded({
    extended: false
}));

// Firebase Authentication
var serviceAccount = require("./config/firebaseKey.json");

// Init Firebase
admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    databaseURL: "https://blaze-37ca6.firebaseio.com"
});
var db = admin.database();
var ref = db.ref("/");

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

app.get('/sign-up', (req, res) => {
    res.render('signup', {
        error: 'none'
    });
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
    console.log(req.body);
    const {
        error
    } = validateUser(req.body);
    if (error) return res.status(400).send(error.details[0].message);
    if (req.body.password != req.body.confirmpassword) return res.status(400).send('The passwords do not match.');

    admin.auth().createUser({
            email: req.body.email,
            emailVerified: false,
            password: req.body.password,
            username: req.body.username,
            disabled: false
        })
        .then(function (userRecord) {
            res.send('Account registered.');
        })
        .catch(function (error) {
            res.status(400).send(err);
        });
});

app.post('/sign-up', (req, res) => {
    const {
        error
    } = validateUser(req.body);
    if (error) return res.status(400).render('signup', {
        error: error.details[0].message
    });
    if (req.body.password != req.body.confirmpassword) return res.status(400).render('signup', {
        error: 'The passwords do not match.'
    });

    admin.auth().createUser({
            email: req.body.email,
            emailVerified: false,
            password: req.body.password,
            username: req.body.username,
            disabled: false
        })
        .then(function (userRecord) {
            res.redirect('/login')
        })
        .catch(function (error) {
            res.status(400).render('signup', {
                error: error
            });
        });
});

app.post('/api/v1/guilds/create', (req, res) => {
    const {
        error
    } = validateGuild(req.body);
    if (error) return res.status(400).send(error.details[0].message);

    var guildName = req.body.guildName;
    var isVerified = req.body.isVerified;

    var idToken = req.body.guildOwnerToken;
    admin.auth().verifyIdToken(idToken)
        .then(function (decodedToken) {
            let uid = decodedToken.uid;
            console.log(uid);
            res.send('Woohoo! It works :D')

            var guildsRef = ref.child(`guilds/` + req.body.guildName);
            guildsRef.set({
                    guildName: req.body.guildName,
                    guildOwner: uid,
                    isVerified: req.body.isVerified
            });

        }).catch(function(error) {
            res.status(400).send(error);
          });
          

});

// Functions
function validateUser(validateContent) {
    const schema = Joi.object({
        email: Joi.string().email().required(),
        username: Joi.string().required(),
        password: Joi.string().min(8).required(),
        confirmpassword: Joi.string().min(8).required()
    });

    return schema.validate(validateContent);
}

function validateGuild(validateContent) {
    const schema = Joi.object({
        guildName: Joi.string().required(),
        guildOwnerToken: Joi.string().required(),
        isVerified: Joi.bool().required()
    });

    return schema.validate(validateContent);
}


// Start Express
const port = process.env.PORT || 3000;
app.listen(port);
console.log(`Blaze is running on port ${port}.`);