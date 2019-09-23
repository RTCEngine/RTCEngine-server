import * as dotenv from 'dotenv'

const ip = require('ip')

import MediaServer from './medianode/server'

dotenv.config()

const yargs = require('yargs')

const localhost = ip.address()

const argv = yargs.usage(`Usage: ts-node $0 -p 6001 -h 127.0.0.1 -e {localhost}`)
    .help('help').alias('help','-h')
    .default({
        endpoint:localhost,
        host:'127.0.0.1',
        port:6001
    })
    .options({
        endpoint: {
            alias: 'e',
            description: 'endpoint, default 127.0.0.1'
        },
        host: {
            alias: 'h',
            description: 'host, default 127.0.0.1'
        },
        port: {
            alias: 'p',
            description: 'port, default 6001'
        }
    }).argv


const port = argv.port as number
const host = argv.host as string

let endpoint = localhost

const media01 = new MediaServer({
    endpoint: endpoint
})


media01.start(port, host, () => {
    console.log(`media server start on ${port}  endpoint ${endpoint}`)
})









