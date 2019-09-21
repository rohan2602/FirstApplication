const fs = require('fs')
const path = require('path')
const NODE_ENV = process.env.NODE_ENV
let configBuffer = null

// Init config_buffer according to the NODE_ENV
switch (NODE_ENV) {
    case 'production':
    case 'prod':
        configBuffer = fs.readFileSync(path.resolve(__dirname, 'production.json'), 'utf-8')
        break
    case 'staging':
    case 'stage':
    case 'qa':
        configBuffer = fs.readFileSync(path.resolve(__dirname, 'staging.json'), 'utf-8')
        break
    case 'dev':
    case 'development':
        configBuffer = fs.readFileSync(path.resolve(__dirname, 'development.json'), 'utf-8')
        break
    case 'test':
        configBuffer = fs.readFileSync(path.resolve(__dirname, 'test.json'), 'utf-8')
        break
    default:
        configBuffer = fs.readFileSync(path.resolve(__dirname, 'development.json'), 'utf-8')
}

let config = JSON.parse(configBuffer)
module.exports = config