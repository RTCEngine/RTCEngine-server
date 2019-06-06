import * as dotenv from 'dotenv'

import MediaServer from './medianode/server'

dotenv.config()

const yargs = require('yargs')


const argv = yargs.usage('Usage: ts-node $0 -p 6002 -h 127.0.0.1 -e 127.0.0.1')
    .help('help').alias('help','-h')
    .default({
        endpoint:'127.0.0.1',
        host:'127.0.0.1',
        port:6002
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
            description: 'port, default 6002'
        }
    }).argv


const port = argv.port as number
const host = argv.host as string
const endpoint = argv.endpoint as string 

const media02 = new MediaServer({
    endpoint: endpoint
})

media02.start(port, host, () => {
    console.log(`media server start on ${port}  endpoint ${endpoint}`)
})
