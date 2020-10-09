// Dependencies
var express = require('express');
var app = require('express')();
var http = require('http').createServer(app);
var io = require('socket.io')(http);
const fs = require("fs");
var admin = require('firebase-admin');
const Joi = require('@hapi/joi');
var bodyParser = require('body-parser');
const cookieParser = require("cookie-parser");

// Middleware
app.use(express.json());
app.use(bodyParser.urlencoded({
    extended: false
}));
app.use(cookieParser());

// Firebase Authentication
var serviceAccount = require("./config/firebaseKey.json");
const {
    render
} = require('ejs');

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
    res.render('login'); // Render login page (authentication handled frontend)
});

app.get('/sign-up', (req, res) => {
    res.render('signup', { // Render signup
        error: 'none' // Signup page is also used as an endpoint. Error is returned when there is an issue with the user's credentials
    });
});

app.get('/servers', (req, res) => { // Render servers page
    var idToken = req.cookies['sessionid']; // Get user's Firebase ID token from cookies (set manually using frontend firebase on page load)
    if (idToken == null) { // If no cookie is set (user hasn't logged in)
        return res.status(403).send('<script>window.location = \'/login\'</script>'); // Return JS redirect response
    }

    admin.auth().verifyIdToken(idToken) // Firebase function to decode the token to reveal the user's UID
        .then(function (decodedToken) { // Pass the token
            let uid = decodedToken.uid;  // Get decoded token
            var userServersRef = db.ref(`users/` + uid + `/guilds`); // Set ref
            userServersRef.once("value", function (data) { // Use ref to get data
                var userServers = data.val(); // Server IDs stored in an ""array"" in Firebase

                var serverNames = []; // Set blank since data isn't retrieved - if all else fails and crashes
                var isVerified = []; // ..
                var memberCount = [];// ..
                try { // Try this because errors occur
                    for (var i = 0; i < userServers.length; i++) { // For every single server in the array. Server array ID is equal to i.
                        var allServersRef = db.ref(`guilds/` + userServers[i]); // Get specific server's info ref.

                        allServersRef.once("value", function (data) { // Get data
                            serverNames.push(data.val().guildName); // Update array
                            isVerified.push(data.val().isVerified);// ..
                            memberCount.push(data.val().memberCount);// ..

                            if (serverNames.length == userServers.length) { // If locally stored array is the same length as Firebase array length
                                res.render('servers', { // Render
                                    userServers: userServers, // Return arrays that are then handled via EJS
                                    serverNames: serverNames,
                                    isVerified: isVerified,
                                    memberCount: memberCount,
                                    noServers: false
                                });
                            }
                        });
                    }
                } catch (err) { // If error - most likely user is in no servers
                    var userServers = []; // Set arrays blank so that it knows the user is in no servers
                    var serverNames = [];
                    var isVerified = [];
                    var memberCount = [];
                    res.render('servers', {
                        userServers: userServers,
                        serverNames: serverNames,
                        isVerified: isVerified,
                        memberCount: memberCount,
                        noServers: true // Oh wait wtf is this... so it finds out this way? Can't be stuffed to check
                    });
                }
            });

        }).catch(function (error) {
            res.redirect('/login'); // reee we made an oopsie... redirect to login
        });
});

app.get('/server/:serverID', (req, res) => {
    var idToken = req.cookies['sessionid'];
    if (idToken == null) {
        return res.status(403).send('<script>window.location = \'/login\'</script>');
    }

    admin.auth().verifyIdToken(idToken)
    .then(function (decodedToken) {
        let uid = decodedToken.uid;
        res.render('server');
    }).catch(function (error) {
        res.redirect('/login');
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

    var idToken = req.body.guildOwnerToken;
    admin.auth().verifyIdToken(idToken)
        .then(function (decodedToken) {
            let uid = decodedToken.uid;

            var guildID = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
            var guildsRef = ref.child(`guilds/` + guildID);
            guildsRef.set({
                guildName: req.body.guildName,
                guildOwner: uid,
                isVerified: false,
                memberCount: 1
            });

            var usersRef = ref.child(`users/` + uid);
            usersRef.once("value", function (data) {
                var currentID = data.val().currentID;
                var newID = currentID + 1;
                var usersRef = ref.child(`users/` + uid);
                usersRef.update({
                    [`guilds/` + currentID]: guildID,
                    currentID: newID
                });
            });

            res.send(`Guild with ID: ` + guildID + ` created!`)

        }).catch(function (error) {
            console.log(error);
            res.send(error);
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
        guildOwnerToken: Joi.string().required()
    });

    return schema.validate(validateContent);
}


// Start Express
const port = process.env.PORT || 3000;
app.listen(port);
console.log(`Blaze is running on port ${port}.`);