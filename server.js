// BASE SETUP
// =============================================================================
if (process.env.NODE_ENV === "staging" || process.env.NODE_ENV === "qa" || process.env.NODE_ENV === "prod" || process.env.NODE_ENV === "production")
    require('./apm-app').apm
const express = require('express')
const bodyParser = require('body-parser')
const session = require('express-session')
// const sharedsession = require('express-socket.io-session')
// const helmet = require('helmet')
const uuid = require('uuid')
const MongoStore = require('connect-mongo')(session)
const cors = require('cors')
const swaggerUi = require('swagger-ui-express')
const swaggerDocument = require('./swagger.json')
let swaggerJSDoc = require('swagger-jsdoc');
const os = require('os');
let path = require('path');
const requestIp = require('request-ip');

//  DATABASE CONNECTION
/* eslint no-unused-vars: ["error", { "varsIgnorePattern": "[iI]gnored" }]*/
const dbIgnored = require(`${__dirname}/./database/connect`)
//  CONFIG
const config = require(`${__dirname}/./config/config`)

//  ROUTES
const router = require(`${__dirname}/./routes/router`)
//  DEFINE OUR APP USING EXPRESS
const app = express()


//  Socket Connect
const server = require('http').Server(app);
const socket = require('socket.io')(server, {
    path: config.socketPath
});

const redis = require('redis');
const redisAdapter = require('socket.io-redis');
const pub = redis.createClient(config.redis);
const sub = redis.createClient(config.redis);
socket.adapter(redisAdapter({ pubClient: pub, subClient: sub, prefix: config.socketPath }));

//  let whitelist = ['http://localhost:5005']
let whitelist = config.cors.whitelist
let corsOptions = {
    origin: function (origin, callback) {
        if (whitelist.indexOf(origin) !== -1 || !origin) {
            callback(null, true)
        } else {
            callback(new Error('Not allowed by CORS'))
        }
    },
    credentials: true,
    preflightContinue: false,
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Total-Count', 'x-access-token', 'Content-Range', 'vendorcode'],
}

//  CORS Options
//  app.options(cors())

//  BODYPARSER
//  Node.js body parsing middleware.
//  Parse incoming request bodies in a middleware before your handlers, available under the req.body property.
app.use(bodyParser.urlencoded({
    extended: true,
}))
app.use(bodyParser.json())
//  HELMET
//  Helmet helps you secure your Express apps by setting various HTTP headers
//  let helmetOpts = {
//    frameguard: false,
//  }
//  app.use(helmet(helmetOpts))

// Use Mongo Store for Session data storage
const store = new MongoStore({
    url: config.db.mongodb_session_store_url,
    ttl: config.cookie.validity,
    autoRemove: 'native', // Default
})

//  EXPRESS-SESSION && MONGOSTORE
//  MongoDB session store for Express and Connect
//  Simple session middleware for Express
const sess = {
    key: config.cookie.name,
    secret: config.app.secret,
    cookie: {
        path: config.cookie.path,
        maxAge: config.cookie.validity * 1000,
        httpOnly: true,
        secure: true
    },
    resave: false,
    saveUninitialized: false,
    store: store,
    name: config.cookie.name,
    genid: function () {
        return uuid() // use UUIDs for session IDs
    },
}

// const socketSession = {
//     secret: config.app.secret,
//     resave: true,
//     saveUninitialized: true,
//     store: store,
// }
app.use(requestIp.mw());

// Use session
app.use(session(sess))

//Pass Socket
require('./socket').storeSocket(socket);

//  session management
session.Session.prototype.login = (req, user, cb) => {
    try {
        req.session.userInfo = user
        req.session.user = user.email
        cb()
    } catch (error) {
        cb(error)
    }
}

// SWAGGER
// swagger definition
let swaggerDefinition = {
    info: {
        title: 'eAuction Bids APIs',
        version: '1.0.0',
        description: 'API Documentation for eAuction bids',
    },
    //host: os.hostname,
    basePath: config.app.prefix,
};



// options for the swagger docs
let options = {
    // import swaggerDefinitions
    swaggerDefinition: swaggerDefinition,
    // path to the API docs
    apis: ['./routes/*.js'],
};


let swaggerSpec = swaggerJSDoc(options);

app.get(config.app.prefix + '/swagger.json', function (req, res) {
    res.setHeader('Content-Type', 'application/json');
    res.send(swaggerSpec);
});
//app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));
app.use(express.static(path.join(`${__dirname}`, 'public')));
app.use(config.app.prefix + '/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// REGISTER OUR ROUTES -------------------------------
// all of our routes will be prefixed with prefix defined in config
if (process.env.NODE_ENV === 'test' || process.env.NODE_ENV === 'dev' || !process.env.NODE_ENV)
    app.use(config.app.prefix, cors(), router)
else
    app.use(config.app.prefix, cors(corsOptions), router)

// START THE SERVER
server.listen((process.env.PORT || config.server.port)).on('error', (err) => {
    console.log('Server error ', err);
}).on('listening', () => {
    console.log('Server listening on', (process.env.PORT || config.server.port));
});
// app.listen((process.env.PORT || config.server.port))

module.exports = server // for testing